(function injectGlobalNav() {
  function getBasePath() {
    var currentScript = document.currentScript || document.querySelector('script[src$="nav2.js"]');
    if (!currentScript || !currentScript.src) {
      return '/';
    }
    try {
      var scriptUrl = new URL(currentScript.src);
      var path = scriptUrl.pathname.replace(/\/reference\/nav2\.js$/, '/');
      if (!path.endsWith('/')) {
        path += '/';
      }
      return path;
    } catch (error) {
      return '/';
    }
  }

  function buildNavHtml(base) {
    var links = [
      { href: 'index.html', label: 'Home' },
      { href: 'guides/conceptual_spaces.html', label: 'Theory' },
      { href: 'guides/architecture.html', label: 'Architecture' },
      { href: 'api/index.html', label: 'APIs' },
      { href: 'syntax/index.html', label: 'Syntax' },
      { href: 'usage-cli/index.html', label: 'CLI' },
      { href: 'wiki/index.html', label: 'Wiki' },
      { href: 'specs/matrix.html', label: 'Specs' }
    ];
    var parts = [];
    for (var i = 0; i < links.length; i += 1) {
      parts.push('<a href="' + base + links[i].href + '">' + links[i].label + '</a>');
    }
    return parts.join(' · ');
  }

  var basePath = getBasePath();
  var navHtml = buildNavHtml(basePath);

  var header = document.querySelector('.nav-header');
  if (header) {
    var small = header.querySelector('small');
    if (!small) {
      small = document.createElement('small');
      header.appendChild(small);
    }
    small.innerHTML = navHtml;
  }
})(); 

