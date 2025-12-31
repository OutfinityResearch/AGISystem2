export function setMainTab({ $, state }, tab) {
  state.uiTab = tab;
  const tabIds = ['chat', 'kb', 'dsl', 'nl'];
  for (const t of tabIds) {
    const active = t === tab;
    const btnId = t === 'chat'
      ? 'tabChat'
      : (t === 'kb' ? 'tabKB' : (t === 'dsl' ? 'tabDsl' : 'tabNl'));
    const panelId = t === 'chat'
      ? 'panelChat'
      : (t === 'kb' ? 'panelKB' : (t === 'dsl' ? 'panelDsl' : 'panelNl'));
    $(btnId).classList.toggle('tab--active', active);
    $(btnId).setAttribute('aria-selected', active ? 'true' : 'false');
    $(panelId).classList.toggle('tabs__panel--active', active);
  }
}

export function wireTabs(ctx) {
  const { $ } = ctx;
  $('tabChat').addEventListener('click', () => setMainTab(ctx, 'chat'));
  $('tabKB').addEventListener('click', () => setMainTab(ctx, 'kb'));
  $('tabDsl').addEventListener('click', () => setMainTab(ctx, 'dsl'));
  $('tabNl').addEventListener('click', () => setMainTab(ctx, 'nl'));
}
