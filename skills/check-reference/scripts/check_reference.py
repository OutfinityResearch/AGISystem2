#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


CITATION_RE = re.compile(r"\[([A-Za-z0-9][A-Za-z0-9._-]{1,120})\]")
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")
URL_RE = re.compile(r"https?://[^\s<>\"]+")
TITLE_RE = re.compile(r"<title\b[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
SECTION_RE = re.compile(r"<section\b([^>]*)>(.*?)</section>", re.IGNORECASE | re.DOTALL)
PARA_RE = re.compile(r"<p\b[^>]*>(.*?)</p>", re.IGNORECASE | re.DOTALL)
LI_RE = re.compile(r"<li\b[^>]*>(.*?)</li>", re.IGNORECASE | re.DOTALL)
H2_RE = re.compile(r"<h2\b[^>]*>(.*?)</h2>", re.IGNORECASE | re.DOTALL)
ATTR_RE = re.compile(r'([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"')
WORD_RE = re.compile(r"[a-zA-Z][a-zA-Z0-9_-]{3,}")

SKIP_SECTION_IDS = {"references", "internal-references"}
STOPWORDS = {
    "about",
    "above",
    "after",
    "again",
    "against",
    "already",
    "also",
    "among",
    "because",
    "before",
    "being",
    "between",
    "claim",
    "claims",
    "current",
    "different",
    "does",
    "first",
    "form",
    "from",
    "general",
    "gives",
    "have",
    "into",
    "itself",
    "later",
    "many",
    "more",
    "most",
    "other",
    "rather",
    "same",
    "serious",
    "should",
    "shows",
    "such",
    "than",
    "that",
    "their",
    "therefore",
    "these",
    "they",
    "this",
    "those",
    "through",
    "under",
    "use",
    "used",
    "using",
    "what",
    "when",
    "where",
    "which",
    "while",
    "with",
    "within",
    "without",
}


@dataclass
class CitationOccurrence:
    key: str
    section_id: str
    section_title: str
    block_index: int
    context: str


@dataclass
class ReferenceEntry:
    key: str
    entry: str
    url: str | None
    title_guess: str | None
    source: str


@dataclass
class UrlCheck:
    key: str
    url: str
    ok: bool
    status: int | None
    final_url: str | None
    content_type: str | None
    page_title: str | None
    title_match: str | None
    error: str | None
    cache_dir: str | None


@dataclass
class ContentCheck:
    key: str
    has_text: bool
    source_title: str | None
    title_match: str | None
    selected_terms: list[str]
    matched_terms: list[str]
    overlap_ratio: float | None
    best_snippet: str | None
    verdict_hint: str
    cache_dir: str | None


def strip_html(value: str) -> str:
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    value = TAG_RE.sub(" ", value)
    value = (
        value.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&#39;", "'")
        .replace("&quot;", '"')
        .replace("&mdash;", "-")
        .replace("&#8212;", "-")
    )
    return WS_RE.sub(" ", value).strip()


def normalize_ws(value: str) -> str:
    return WS_RE.sub(" ", value).strip()


def parse_html_sections(text: str) -> list[tuple[str, str, str]]:
    sections: list[tuple[str, str, str]] = []
    for match in SECTION_RE.finditer(text):
        attrs_raw = match.group(1)
        html = match.group(2)
        attrs = dict(ATTR_RE.findall(attrs_raw))
        section_id = attrs.get("id", "").strip()
        h2 = H2_RE.search(html)
        title = strip_html(h2.group(1)) if h2 else section_id or "untitled"
        sections.append((section_id, title, html))
    return sections


def extract_html_blocks(text: str) -> tuple[list[CitationOccurrence], dict[str, ReferenceEntry]]:
    sections = parse_html_sections(text)
    occurrences: list[CitationOccurrence] = []
    refs: dict[str, ReferenceEntry] = {}

    if not sections:
        blocks = [strip_html(p) for p in PARA_RE.findall(text)]
        for index, block in enumerate(blocks):
            for key in CITATION_RE.findall(block):
                occurrences.append(CitationOccurrence(key, "", "document", index, block))
        return occurrences, refs

    for section_id, title, html in sections:
        if section_id in SKIP_SECTION_IDS:
            if section_id == "references":
                for raw_item in LI_RE.findall(html):
                    entry = strip_html(raw_item)
                    key_match = CITATION_RE.search(entry)
                    if not key_match:
                        continue
                    key = key_match.group(1)
                    refs[key] = ReferenceEntry(
                        key=key,
                        entry=entry,
                        url=first_url(entry),
                        title_guess=extract_reference_title(entry, key),
                        source="document",
                    )
            continue

        blocks = [strip_html(block) for block in PARA_RE.findall(html)]
        for index, block in enumerate(blocks):
            if not block:
                continue
            for key in CITATION_RE.findall(block):
                occurrences.append(CitationOccurrence(key, section_id, title, index, block))

    return occurrences, refs


def extract_markdown_blocks(text: str) -> tuple[list[CitationOccurrence], dict[str, ReferenceEntry]]:
    occurrences: list[CitationOccurrence] = []
    refs: dict[str, ReferenceEntry] = {}

    current_section_id = ""
    current_title = "document"
    in_references = False
    block_index = 0

    paragraphs = re.split(r"\n\s*\n", text)
    for paragraph in paragraphs:
        raw = paragraph.strip()
        if not raw:
            continue

        heading_match = re.match(r"^(#{1,6})\s+(.+)$", raw, flags=re.MULTILINE)
        if heading_match:
            current_title = normalize_ws(heading_match.group(2))
            current_section_id = slugify(current_title)
            in_references = current_title.lower() == "references"
            continue

        if in_references:
            for line in raw.splitlines():
                key_match = CITATION_RE.search(line)
                if not key_match:
                    continue
                key = key_match.group(1)
                entry = normalize_ws(line)
                refs[key] = ReferenceEntry(
                    key=key,
                    entry=entry,
                    url=first_url(line),
                    title_guess=extract_reference_title(entry, key),
                    source="document",
                )
            continue

        block = normalize_ws(raw)
        for key in CITATION_RE.findall(block):
            occurrences.append(CitationOccurrence(key, current_section_id, current_title, block_index, block))
        block_index += 1

    return occurrences, refs


def extract_plain_blocks(text: str) -> tuple[list[CitationOccurrence], dict[str, ReferenceEntry]]:
    occurrences: list[CitationOccurrence] = []
    refs: dict[str, ReferenceEntry] = {}
    for index, paragraph in enumerate(re.split(r"\n\s*\n", text)):
        block = normalize_ws(paragraph)
        if not block:
            continue
        for key in CITATION_RE.findall(block):
            occurrences.append(CitationOccurrence(key, "", "document", index, block))
    return occurrences, refs


def parse_catalog(text: str, source: str) -> dict[str, ReferenceEntry]:
    refs: dict[str, ReferenceEntry] = {}
    for line in text.splitlines():
        key_match = CITATION_RE.search(line)
        if not key_match:
            continue
        key = key_match.group(1)
        entry = normalize_ws(line)
        refs[key] = ReferenceEntry(
            key=key,
            entry=entry,
            url=first_url(line),
            title_guess=extract_reference_title(entry, key),
            source=source,
        )
    return refs


def first_url(text: str) -> str | None:
    match = URL_RE.search(text)
    return match.group(0) if match else None


def extract_reference_title(entry: str, key: str) -> str | None:
    text = normalize_ws(entry)
    text = re.sub(rf"^\[{re.escape(key)}\]\s*", "", text)
    text = re.sub(r"\bURL:\s*https?://\S+\s*$", "", text, flags=re.IGNORECASE)
    text = re.sub(r"https?://\S+\s*$", "", text)
    year_match = re.search(r"\(\d{4}(?:/\d{4})?\)\.\s*", text)
    if year_match:
        text = text[year_match.end() :]
    parts = [part.strip() for part in text.split(". ") if part.strip()]
    if not parts:
        return None
    return parts[0].rstrip(".") or None


def normalize_title(text: str | None) -> str:
    if not text:
        return ""
    text = strip_html(text).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return normalize_ws(text)


def title_match_status(reference_title: str | None, page_title: str | None) -> str | None:
    ref = normalize_title(reference_title)
    page = normalize_title(page_title)
    if not ref or not page:
        return None
    if ref in page or page in ref:
        return "match"
    ref_tokens = set(ref.split())
    page_tokens = set(page.split())
    overlap = len(ref_tokens & page_tokens) / max(1, len(ref_tokens))
    if overlap >= 0.6:
        return "partial"
    return "mismatch"


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def load_document(path: Path) -> tuple[list[CitationOccurrence], dict[str, ReferenceEntry]]:
    text = path.read_text(encoding="utf-8")
    suffix = path.suffix.lower()
    if suffix in {".html", ".htm"}:
        return extract_html_blocks(text)
    if suffix in {".md", ".markdown"}:
        return extract_markdown_blocks(text)
    return extract_plain_blocks(text)


def hash_url(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]


def read_text_if_exists(path: Path) -> str | None:
    if not path.exists():
        return None
    return path.read_text(encoding="utf-8", errors="ignore")


def get_cache_bundle(cache_root: Path, url: str) -> tuple[Path, Path, Path]:
    bucket = cache_root / hash_url(url)
    return bucket, bucket / "meta.json", bucket / "content.txt"


def detect_pdf(url: str, content_type: str | None) -> bool:
    if content_type and "pdf" in content_type.lower():
        return True
    return url.lower().endswith(".pdf")


def fetch_source(entry: ReferenceEntry, cache_root: Path, timeout: float, refresh: bool = False) -> tuple[UrlCheck, str | None]:
    assert entry.url
    cache_dir, meta_path, content_path = get_cache_bundle(cache_root, entry.url)
    cache_dir.mkdir(parents=True, exist_ok=True)

    if meta_path.exists() and content_path.exists() and not refresh:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        url_check = UrlCheck(
            key=entry.key,
            url=entry.url,
            ok=meta.get("ok", False),
            status=meta.get("status"),
            final_url=meta.get("final_url"),
            content_type=meta.get("content_type"),
            page_title=meta.get("page_title"),
            title_match=meta.get("title_match"),
            error=meta.get("error"),
            cache_dir=str(cache_dir),
        )
        return url_check, read_text_if_exists(content_path)

    session = requests.Session()
    headers = {"User-Agent": "check-reference/1.0"}
    raw_path = cache_dir / "raw.bin"
    try:
        response = session.get(entry.url, headers=headers, timeout=timeout, allow_redirects=True, verify=False)
        content_type = response.headers.get("Content-Type")
        final_url = str(response.url)
        page_title = None
        extracted_text = None

        if detect_pdf(final_url, content_type):
            raw_path = cache_dir / "raw.pdf"
            raw_path.write_bytes(response.content)
            extracted_text = extract_pdf_text(raw_path, content_path)
        elif content_type and ("html" in content_type.lower() or "xml" in content_type.lower()):
            raw_path = cache_dir / "raw.html"
            raw_path.write_text(response.text, encoding="utf-8", errors="ignore")
            title_match = TITLE_RE.search(response.text)
            if title_match:
                page_title = strip_html(title_match.group(1))
            extracted_text = strip_html(response.text)
            content_path.write_text(extracted_text, encoding="utf-8")
        else:
            raw_path.write_bytes(response.content)
            extracted_text = response.text
            content_path.write_text(extracted_text, encoding="utf-8", errors="ignore")

        url_check = UrlCheck(
            key=entry.key,
            url=entry.url,
            ok=response.ok,
            status=response.status_code,
            final_url=final_url,
            content_type=content_type,
            page_title=page_title,
            title_match=title_match_status(entry.title_guess, page_title),
            error=None if response.ok else f"HTTP {response.status_code}",
            cache_dir=str(cache_dir),
        )
        meta_path.write_text(
            json.dumps(
                {
                    "ok": url_check.ok,
                    "status": url_check.status,
                    "final_url": url_check.final_url,
                    "content_type": url_check.content_type,
                    "page_title": url_check.page_title,
                    "title_match": url_check.title_match,
                    "error": url_check.error,
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        return url_check, extracted_text
    except Exception as exc:
        url_check = UrlCheck(
            key=entry.key,
            url=entry.url,
            ok=False,
            status=None,
            final_url=None,
            content_type=None,
            page_title=None,
            title_match=None,
            error=str(exc),
            cache_dir=str(cache_dir),
        )
        meta_path.write_text(
            json.dumps(
                {
                    "ok": False,
                    "status": None,
                    "final_url": None,
                    "content_type": None,
                    "page_title": None,
                    "title_match": None,
                    "error": str(exc),
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        return url_check, None


def extract_pdf_text(raw_pdf: Path, content_path: Path) -> str | None:
    if not shutil_which("pdftotext"):
        return None
    output_txt = content_path
    try:
        subprocess.run(
            ["pdftotext", str(raw_pdf), str(output_txt)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return read_text_if_exists(output_txt)
    except Exception:
        return None


def shutil_which(program: str) -> str | None:
    for path_dir in os.environ.get("PATH", "").split(os.pathsep):
        candidate = Path(path_dir) / program
        if candidate.exists() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


def content_terms(context: str, limit: int = 10) -> list[str]:
    seen: list[str] = []
    for token in WORD_RE.findall(context.lower()):
        if token in STOPWORDS:
            continue
        if token.startswith("http"):
            continue
        if token not in seen:
            seen.append(token)
        if len(seen) >= limit:
            break
    return seen


def split_chunks(text: str, chunk_size: int = 900) -> list[str]:
    chunks: list[str] = []
    normalized = normalize_ws(text)
    if not normalized:
        return chunks
    paras = re.split(r"\n\s*\n", text)
    current = ""
    for para in paras:
        para = normalize_ws(para)
        if not para:
            continue
        if len(current) + len(para) + 1 <= chunk_size:
            current = f"{current} {para}".strip()
        else:
            if current:
                chunks.append(current)
            current = para
    if current:
        chunks.append(current)
    if not chunks:
        chunks = [normalized[i : i + chunk_size] for i in range(0, len(normalized), chunk_size)]
    return chunks


def evaluate_content(occurrence: CitationOccurrence, entry: ReferenceEntry, source_text: str | None, url_check: UrlCheck | None) -> ContentCheck:
    selected_terms = content_terms(occurrence.context)
    if not source_text:
        return ContentCheck(
            key=occurrence.key,
            has_text=False,
            source_title=url_check.page_title if url_check else None,
            title_match=url_check.title_match if url_check else None,
            selected_terms=selected_terms,
            matched_terms=[],
            overlap_ratio=None,
            best_snippet=None,
            verdict_hint="unresolved",
            cache_dir=url_check.cache_dir if url_check else None,
        )

    corpus = f"{entry.title_guess or ''}\n{url_check.page_title or '' if url_check else ''}\n{source_text}"
    corpus_norm = normalize_title(corpus)
    corpus_tokens = set(corpus_norm.split())
    matched_terms = [term for term in selected_terms if term in corpus_tokens]
    overlap_ratio = len(matched_terms) / max(1, len(selected_terms)) if selected_terms else None

    best_snippet = None
    best_score = -1
    for chunk in split_chunks(source_text):
        chunk_norm = normalize_title(chunk)
        score = sum(1 for term in selected_terms if term in chunk_norm.split())
        if score > best_score:
            best_score = score
            best_snippet = chunk

    verdict_hint = "unresolved"
    if overlap_ratio is not None:
        if overlap_ratio >= 0.5 and best_score >= 2:
            verdict_hint = "aligned"
        elif overlap_ratio >= 0.25 or best_score >= 1:
            verdict_hint = "weak"
        else:
            verdict_hint = "mismatch"

    return ContentCheck(
        key=occurrence.key,
        has_text=True,
        source_title=url_check.page_title if url_check else None,
        title_match=url_check.title_match if url_check else None,
        selected_terms=selected_terms,
        matched_terms=matched_terms,
        overlap_ratio=round(overlap_ratio, 3) if overlap_ratio is not None else None,
        best_snippet=truncate(best_snippet or "", 500) if best_snippet else None,
        verdict_hint=verdict_hint,
        cache_dir=url_check.cache_dir if url_check else None,
    )


def build_report(
    doc_path: Path,
    occurrences: list[CitationOccurrence],
    refs: dict[str, ReferenceEntry],
    url_checks: list[UrlCheck] | None = None,
    content_checks: list[dict] | None = None,
) -> dict:
    keys_in_prose = sorted({item.key for item in occurrences})
    ref_keys = sorted(refs.keys())
    missing = [asdict(item) for item in occurrences if item.key not in refs]
    unused = [asdict(refs[key]) for key in ref_keys if key not in {item.key for item in occurrences}]

    report = {
        "document": str(doc_path),
        "occurrence_count": len(occurrences),
        "unique_inline_citation_keys": keys_in_prose,
        "reference_keys": ref_keys,
        "occurrences": [asdict(item) for item in occurrences],
        "references": {key: asdict(value) for key, value in refs.items()},
        "missing_reference_entries": missing,
        "unused_reference_entries": unused,
        "url_checks": [asdict(item) for item in (url_checks or [])],
        "content_checks": content_checks or [],
    }
    return report


def render_human(report: dict) -> str:
    lines: list[str] = []
    lines.append(f"Document: {report['document']}")
    lines.append(f"Citation occurrences: {report['occurrence_count']}")
    lines.append(f"Unique inline citation keys: {len(report['unique_inline_citation_keys'])}")
    lines.append(f"Reference entries: {len(report['reference_keys'])}")
    lines.append("")

    missing = report["missing_reference_entries"]
    if missing:
        lines.append("Missing reference entries:")
        for item in missing:
            lines.append(
                f"- [{item['key']}] in section '{item['section_title']}'"
                f" (block {item['block_index']}): {truncate(item['context'])}"
            )
    else:
        lines.append("Missing reference entries: none")

    unused = report["unused_reference_entries"]
    lines.append("")
    if unused:
        lines.append("Unused reference entries:")
        for item in unused:
            lines.append(f"- [{item['key']}] from {item['source']}")
    else:
        lines.append("Unused reference entries: none")

    lines.append("")
    url_checks = report.get("url_checks", [])
    if url_checks:
        ok_count = sum(1 for item in url_checks if item["ok"])
        lines.append(f"URL checks: {ok_count}/{len(url_checks)} reachable")
        mismatches = [item for item in url_checks if item.get("title_match") == "mismatch"]
        if mismatches:
            lines.append("Title mismatches:")
            for item in mismatches:
                lines.append(f"- [{item['key']}] {item['url']}")
        lines.append("")

    content_checks = report.get("content_checks", [])
    if content_checks:
        grouped = {}
        for item in content_checks:
            grouped.setdefault(item["verdict_hint"], 0)
            grouped[item["verdict_hint"]] += 1
        lines.append(f"Content hints: {grouped}")
        lines.append("")

    lines.append("Citation map:")
    for item in report["occurrences"]:
        lines.append(f"- [{item['key']}] :: {item['section_title']} :: {truncate(item['context'])}")
    return "\n".join(lines)


def truncate(text: str, limit: int = 180) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def merge_refs(base: dict[str, ReferenceEntry], extra: Iterable[ReferenceEntry]) -> dict[str, ReferenceEntry]:
    merged = dict(base)
    for entry in extra:
        if entry.key not in merged:
            merged[entry.key] = entry
            continue
        current = merged[entry.key]
        merged[entry.key] = ReferenceEntry(
            key=current.key,
            entry=current.entry or entry.entry,
            url=current.url or entry.url,
            title_guess=current.title_guess or entry.title_guess,
            source=current.source,
        )
    return merged


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract citations, validate reference links, and compare local citation passages with cached source content.")
    parser.add_argument("document", help="Path to the document to inspect.")
    parser.add_argument("--catalog", action="append", default=[], help="Optional external bibliography or reference catalog file.")
    parser.add_argument("--check-urls", action="store_true", help="Fetch reference URLs when available.")
    parser.add_argument("--validate-content", action="store_true", help="Fetch and cache source content, then compute local content-alignment hints.")
    parser.add_argument("--cache-dir", default=".tmp/cache", help="Cache directory for fetched source artifacts.")
    parser.add_argument("--timeout", type=float, default=10.0, help="Timeout in seconds for URL checks.")
    parser.add_argument("--refresh-cache", action="store_true", help="Ignore existing cache and refetch remote sources.")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of a human-readable report.")
    args = parser.parse_args()

    doc_path = Path(args.document)
    if not doc_path.exists():
        print(f"Document not found: {doc_path}", file=sys.stderr)
        return 2

    occurrences, refs = load_document(doc_path)

    for catalog_path_raw in args.catalog:
        catalog_path = Path(catalog_path_raw)
        if not catalog_path.exists():
            print(f"Catalog not found: {catalog_path}", file=sys.stderr)
            return 2
        catalog_refs = parse_catalog(catalog_path.read_text(encoding="utf-8"), str(catalog_path))
        refs = merge_refs(refs, catalog_refs.values())

    used_keys = {item.key for item in occurrences}
    cache_root = Path(args.cache_dir)
    cache_root.mkdir(parents=True, exist_ok=True)

    url_checks: list[UrlCheck] = []
    fetched_texts: dict[str, str | None] = {}
    url_by_key: dict[str, UrlCheck] = {}

    if args.check_urls or args.validate_content:
        seen_urls = set()
        for key, entry in refs.items():
            if key not in used_keys or not entry.url:
                continue
            if entry.url in seen_urls and key in url_by_key:
                continue
            seen_urls.add(entry.url)
            url_check, extracted_text = fetch_source(entry, cache_root, args.timeout, refresh=args.refresh_cache)
            url_checks.append(url_check)
            fetched_texts[key] = extracted_text
            url_by_key[key] = url_check

    content_checks: list[dict] = []
    if args.validate_content:
        for occ in occurrences:
            entry = refs.get(occ.key)
            if not entry:
                continue
            content_check = evaluate_content(occ, entry, fetched_texts.get(occ.key), url_by_key.get(occ.key))
            payload = asdict(content_check)
            payload["section_title"] = occ.section_title
            payload["context"] = occ.context
            content_checks.append(payload)

    report = build_report(doc_path, occurrences, refs, url_checks=url_checks, content_checks=content_checks)

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(render_human(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
