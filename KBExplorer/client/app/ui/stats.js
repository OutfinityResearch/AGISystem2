export function setKbFactsStat({ $, state }, count) {
  const n = typeof count === 'number' && Number.isFinite(count) ? count : null;
  if (n === null) return;
  state.kb.kbFactCount = n;
  $('kbFactsStat').textContent = `Facts: ${n}`;
}
