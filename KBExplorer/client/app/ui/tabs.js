export function setMainTab({ $, state }, tab) {
  state.uiTab = tab;
  const tabIds = ['chat', 'kb', 'docs'];
  for (const t of tabIds) {
    const active = t === tab;
    const btnId = t === 'chat' ? 'tabChat' : (t === 'kb' ? 'tabKB' : 'tabDocs');
    const panelId = t === 'chat' ? 'panelChat' : (t === 'kb' ? 'panelKB' : 'panelDocs');
    $(btnId).classList.toggle('tab--active', active);
    $(btnId).setAttribute('aria-selected', active ? 'true' : 'false');
    $(panelId).classList.toggle('tabs__panel--active', active);
  }
}

export function setDocsTab({ $, state }, tab) {
  const isDsl = tab === 'dsl';
  state.docsTab = tab;
  $('docsTabDsl').classList.toggle('docsTab--active', isDsl);
  $('docsTabNl').classList.toggle('docsTab--active', !isDsl);
  $('docsTabDsl').setAttribute('aria-selected', isDsl ? 'true' : 'false');
  $('docsTabNl').setAttribute('aria-selected', isDsl ? 'false' : 'true');
  $('docsPanelDsl').classList.toggle('docsPanel--active', isDsl);
  $('docsPanelNl').classList.toggle('docsPanel--active', !isDsl);
}

export function wireTabs(ctx) {
  const { $ } = ctx;
  $('tabChat').addEventListener('click', () => setMainTab(ctx, 'chat'));
  $('tabKB').addEventListener('click', () => setMainTab(ctx, 'kb'));
  $('tabDocs').addEventListener('click', () => setMainTab(ctx, 'docs'));

  $('docsTabDsl').addEventListener('click', () => setDocsTab(ctx, 'dsl'));
  $('docsTabNl').addEventListener('click', () => setDocsTab(ctx, 'nl'));
}

