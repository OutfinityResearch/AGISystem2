(function() {
  function renderWidgets() {
    // Top Links
    const topLinksContainer = document.getElementById("site-top-links");
    if (topLinksContainer) {
      const active = topLinksContainer.getAttribute("data-active") || "home";
      const basepath = topLinksContainer.getAttribute("data-basepath") || ".";
      document.body.setAttribute("data-section", active);
      
      const links = [
        { id: "home", text: "Home", href: `${basepath}/index.html` },
        { id: "mrp", text: "MRP", href: `${basepath}/MRP/index.html` },
        { id: "ruliology", text: "Ruliology", href: `${basepath}/ruliology/index.html` },
        { id: "ai-assisted", text: "AI-Assisted Research", href: `${basepath}/ai-assisted-research.html` },
        { id: "research", text: "Research", href: `${basepath}/research.html` },
        { id: "experiments", text: "Public Experiments", href: `${basepath}/public-experiments.html` }
      ];

      let html = '<div class="top-links" style="justify-content: flex-start;">';
      links.forEach(l => {
        html += `<a class="pill pill-${l.id} ${l.id === active ? 'primary' : ''}" href="${l.href}">${l.text}</a>`;
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
    let footerContainer = document.getElementById("site-footer");
    if (!footerContainer) {
        const shell = document.querySelector(".shell");
        if (shell) {
            footerContainer = document.createElement("div");
            footerContainer.id = "site-footer";
            const topLinks = document.querySelector("[data-basepath]");
            const base = topLinks ? topLinks.getAttribute("data-basepath") : ".";
            const active = topLinks ? topLinks.getAttribute("data-active") : "default";
            footerContainer.setAttribute("data-basepath", base || ".");
            footerContainer.setAttribute("data-type", active || "default");
            shell.appendChild(footerContainer);
        }
    }

    if (footerContainer) {
      const type = footerContainer.getAttribute("data-type") || "default";
      const basepath = footerContainer.getAttribute("data-basepath") || ".";
      let html = '<footer>';
      
      html += `<p>Research conducted by <a href="https://www.axiologic.net/" target="_blank" rel="noopener noreferrer">Axiologic Research</a> as part of the European research project <a href="https://www.achilles-project.eu/" target="_blank" rel="noopener noreferrer">Achilles</a>.</p>
      <p>Commercialization partnership with <a href="https://lydiarx.com/" target="_blank" rel="noopener noreferrer">LydiaRX Venture Studio</a>.</p>`;

      html += `<p class="disclaimer">Disclaimer: This documentation was generated with AI assistance (LLMs) and may contain errors or hallucinations.</p>`;
      html += `<p>&copy; Axiologic Research</p>`;
      
      html += '</footer>';
      footerContainer.innerHTML = html;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderWidgets);
  } else {
    renderWidgets();
  }
})();