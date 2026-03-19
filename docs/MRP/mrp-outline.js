(() => {
  const navLinks = Array.from(document.querySelectorAll(".navlist a"));
  const navReadout = document.getElementById("nav-readout");
  if (!navLinks.length) return;

  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  const setActive = (sectionId) => {
    for (const a of navLinks) {
      const isActive = a.getAttribute("href") === `#${sectionId}`;
      a.setAttribute("aria-current", isActive ? "true" : "false");
      if (isActive && navReadout) {
        navReadout.textContent = `Active: ${a.dataset.step}`;
      }
    }
  };

  const defaultSection =
    document.documentElement.getAttribute("data-default-section") ||
    sections[0]?.id ||
    "";
  if (defaultSection) {
    setActive((location.hash ? location.hash.slice(1) : defaultSection) || defaultSection);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
      if (!visible) return;
      setActive(visible.target.id);
    },
    { rootMargin: "-15% 0px -68% 0px", threshold: [0.08, 0.18, 0.32] }
  );

  for (const section of sections) observer.observe(section);
})();
