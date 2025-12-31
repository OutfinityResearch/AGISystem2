export function $(id) {
  return document.getElementById(id);
}

export function must(id) {
  const el = $(id);
  if (!el) throw new Error(`Missing element: #${id}`);
  return el;
}

export function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

