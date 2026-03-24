(function() {
  function renderWidgets() {
    // Top Links
    const topLinksContainer = document.getElementById("site-top-links");
    if (topLinksContainer) {
      const active = topLinksContainer.getAttribute("data-active") || "home";
      const basepath = topLinksContainer.getAttribute("data-basepath") || ".";
      
      const links = [
        { id: "mrp", text: "MRP", href: `${basepath}/MRP/index.html` },
        { id: "ai-assisted", text: "AI-Assisted Research", href: `${basepath}/ai-assisted-research.html` },
        { id: "research", text: "Research", href: `${basepath}/research.html` },
        { id: "home", text: "Home", href: `${basepath}/index.html` }
      ];

      let html = '<div class="top-links">';
      links.forEach(l => {
        html += `<a class="pill ${l.id === active ? 'primary' : ''}" href="${l.href}">${l.text}</a>`;
      });
      
      if (document.querySelector("[data-citation-box]")) {
        html += `<button class="pill cite-toggle-btn" style="cursor: pointer; background: var(--paper); display: inline-flex; align-items: center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M3 15h6"/><path d="M3 11h6"/></svg> Cite</button>`;
      }
      
      html += '</div>';
      topLinksContainer.outerHTML = html;

      const citeBtn = document.querySelector('.cite-toggle-btn');
      if (citeBtn) {
        citeBtn.addEventListener('click', () => {
          for (const box of document.querySelectorAll("[data-citation-box]")) {
            box.classList.toggle('visible');
          }
        });
      }
    }

    // Footer
    const footerContainer = document.getElementById("site-footer");
    if (footerContainer) {
      const type = footerContainer.getAttribute("data-type") || "default";
      const basepath = footerContainer.getAttribute("data-basepath") || ".";
      let html = '<footer>';
      
      if (type === "mrp") {
        html += '<p>This article is published in the Meta Rational Pragmatics article series of the AGISystem2 documentation site.</p>';
      } else if (type === "research-map") {
        html += `<p>This research map is maintained as part of AGISystem2 and complements the <a href="${basepath}/MRP/index.html">Meta Rational Pragmatics</a> article series.</p>`;
      } else if (type === "ai-assisted") {
        html += `<p>Research conducted by <a href="https://www.axiologic.net/" target="_blank" rel="noopener noreferrer">Axiologic Research</a> as part of the European research project <a href="https://www.achilles-project.eu/" target="_blank" rel="noopener noreferrer">Achilles</a>.</p>
      <p>Commercialization partnership with <a href="https://lydiarx.com/" target="_blank" rel="noopener noreferrer">LydiaRX Venture Studio</a>.</p>
      <p>This documentation was produced with AI assistance. Verify important claims by checking code, evaluation suites, tests, and cited sources directly.</p>`;
      } else {
        html += `<p>Research conducted by <a href="https://www.axiologic.net/" target="_blank" rel="noopener noreferrer">Axiologic Research</a> within the European project <a href="https://www.achilles-project.eu/" target="_blank" rel="noopener noreferrer">Achilles</a>.</p>
      <p>Commercialization partnership with <a href="https://lydiarx.com/" target="_blank" rel="noopener noreferrer">LydiaRX Venture Studio</a>.</p>`;
      }
      
      html += '</footer>';
      footerContainer.outerHTML = html;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderWidgets);
  } else {
    renderWidgets();
  }
})();