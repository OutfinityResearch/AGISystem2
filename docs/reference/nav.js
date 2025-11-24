(function injectGlobalNav() {
  function computeRelPrefix() {
    try {
      var path = window.location.pathname || '';
      var marker = '/docs/';
      var idx = path.lastIndexOf(marker);
      if (idx === -1) {
        return '';
      }
      var rest = path.slice(idx + marker.length);
      // rest like "index.html" or "guides/conceptual_spaces.html"
      var segments = rest.split('/');
      if (segments.length <= 1) {
        return '';
      }
      var depth = segments.length - 1; // number of directories below docs/
      var prefix = '';
      for (var i = 0; i < depth; i += 1) {
        prefix += '../';
      }
      return prefix;
    } catch (e) {
      return '';
    }
  }

  function buildNavHtml(prefix) {
    var links = [
      { href: prefix + 'index.html', label: 'Home' },
      { href: prefix + 'guides/conceptual_spaces.html', label: 'Theory' },
      { href: prefix + 'guides/architecture.html', label: 'Architecture' },
      { href: prefix + 'reference/api.html', label: 'APIs' },
      { href: prefix + 'reference/syntax.html', label: 'Syntax' },
      { href: prefix + 'usage/cli.html', label: 'CLI' },
      { href: prefix + 'concepts/quick_wiki.html', label: 'Quick Wiki' }
    ];
    var parts = [];
    for (var i = 0; i < links.length; i += 1) {
      parts.push('<a href="' + links[i].href + '">' + links[i].label + '</a>');
    }
    return parts.join(' · ');
  }

  var rel = computeRelPrefix();
  var navHtml = buildNavHtml(rel);

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
