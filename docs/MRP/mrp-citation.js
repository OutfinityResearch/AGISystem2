(() => {
  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  const canonicalUrl =
    document.querySelector('meta[property="og:url"]')?.getAttribute("content") || location.href;

  
  const defaultTitle = document.title.replace(/\s+—\s+AGISystem2$/, "").trim();

  for (const box of document.querySelectorAll("[data-citation-box]")) {
    const docTitle =
      box.getAttribute("data-doc-title") ||
      document.querySelector("header.hero h1")?.textContent.trim() ||
      defaultTitle;
    const citationKey = box.getAttribute("data-citation-key") || "Alboaie-2026";
    const citation = `[${citationKey}] Sînică Alboaie, ${docTitle}, ${canonicalUrl}`;
    const link = box.querySelector("[data-doc-link]");
    const preview = box.querySelector("[data-citation-preview]");
    const status = box.querySelector("[data-copy-status]");

    if (link) {
      link.href = canonicalUrl;
      link.textContent = canonicalUrl;
    }

    if (preview) preview.textContent = citation;

    for (const button of box.querySelectorAll("[data-copy-target]")) {
      button.addEventListener("click", async () => {
        const originalLabel = button.textContent;
        const target = button.getAttribute("data-copy-target");
        const value = target === "citation" ? citation : canonicalUrl;

        try {
          await copyText(value);
          button.textContent = "Copied";
          if (status) status.textContent = target === "citation" ? "Citation copied." : "Link copied.";
        } catch (error) {
          button.textContent = "Copy failed";
          if (status) status.textContent = "Copy failed. You can still select the text manually.";
        }

        window.setTimeout(() => {
          button.textContent = originalLabel;
        }, 1400);
      });
    }
  }
})();
