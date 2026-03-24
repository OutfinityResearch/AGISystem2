import os
import re

# 1. Update layout.js to change the order of menu items
layout_js_path = 'docs/widgets/layout.js'
with open(layout_js_path, 'r', encoding='utf-8') as f:
    layout_js = f.read()

# Change menu order
old_links = """const links = [
        { id: "mrp", text: "MRP", href: `${basepath}/MRP/index.html` },
        { id: "research", text: "Research", href: `${basepath}/research.html` },
        { id: "ai-assisted", text: "AI-Assisted Research", href: `${basepath}/ai-assisted-research.html` },
        { id: "home", text: "Home", href: `${basepath}/index.html` }
      ];"""

new_links = """const links = [
        { id: "mrp", text: "MRP", href: `${basepath}/MRP/index.html` },
        { id: "ai-assisted", text: "AI-Assisted Research", href: `${basepath}/ai-assisted-research.html` },
        { id: "research", text: "Research", href: `${basepath}/research.html` },
        { id: "home", text: "Home", href: `${basepath}/index.html` }
      ];"""

layout_js = layout_js.replace(old_links, new_links)
with open(layout_js_path, 'w', encoding='utf-8') as f:
    f.write(layout_js)

# 2. Create the directory for the articles
os.makedirs('docs/ai-assisted-research', exist_ok=True)

# 3. Move and update "Automation of Scientific Research"
old_auto_path = 'docs/research/automation-of-scientific-research.html'
new_auto_path = 'docs/ai-assisted-research/automation-of-scientific-research.html'

if os.path.exists(old_auto_path):
    with open(old_auto_path, 'r', encoding='utf-8') as f:
        auto_content = f.read()
    
    # It currently points to basepath="..". We keep basepath=".." but change active to "ai-assisted"
    # Actually, in the Python script from previous step we injected:
    # <div id="site-top-links" data-active="research" data-basepath=".."></div>
    auto_content = auto_content.replace('data-active="research"', 'data-active="ai-assisted"')
    
    # Crumb update
    auto_content = auto_content.replace(
        '<a href="../research.html">Research</a>',
        '<a href="../ai-assisted-research.html">AI-Assisted Research</a>'
    )
    
    # URL in citation
    auto_content = auto_content.replace('/research/automation-of', '/ai-assisted-research/automation-of')
    
    with open(new_auto_path, 'w', encoding='utf-8') as f:
        f.write(auto_content)
    
    os.remove(old_auto_path)

# 4. Extract content of current ai-assisted-research.html into a new article
current_ai_index = 'docs/ai-assisted-research.html'
with open(current_ai_index, 'r', encoding='utf-8') as f:
    ai_index_content = f.read()

# We'll save a copy of this as practical-system-2.html, but fix the paths
sys2_content = ai_index_content
# It was at root, now it's in a subdirectory, so paths go from "MRP/mrp-page.css" to "../MRP/mrp-page.css"
sys2_content = sys2_content.replace('href="MRP/', 'href="../MRP/')
sys2_content = sys2_content.replace('src="MRP/', 'src="../MRP/')
sys2_content = sys2_content.replace('src="widgets/', 'src="../widgets/')
sys2_content = sys2_content.replace('data-basepath="."', 'data-basepath=".."')

# Crumb update: Home / AI-Assisted Research / Toward a Practical System 2
sys2_content = sys2_content.replace(
    '<span class="crumb-current">AI-Assisted Research</span>',
    '<a href="../ai-assisted-research.html">AI-Assisted Research</a>\n            <span class="crumb-sep">/</span>\n            <span class="crumb-current">Toward a Practical System 2</span>'
)
sys2_content = sys2_content.replace('href="index.html"', 'href="../index.html"')

# Save the article
with open('docs/ai-assisted-research/practical-system-2.html', 'w', encoding='utf-8') as f:
    f.write(sys2_content)

# 5. Rewrite docs/ai-assisted-research.html as an index page
new_index_html = """<!doctype html>
<html lang="en" data-default-section="overview">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="theme-color" content="#f7fbff" />
    <meta name="description" content="AI-Assisted Research: methodologies, tools, and workflows for rigorous AI-accelerated science." />
    <meta property="og:title" content="AI-Assisted Research — AGISystem2" />
    <meta property="og:description" content="A research map for integrating AI into scientific and research workflows with rigor." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://agisystem2.com/ai-assisted-research.html" />
    <title>AI-Assisted Research — AGISystem2</title>
    <link rel="stylesheet" href="MRP/mrp-page.css" />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>

    <div class="shell">
      <div class="topbar">
        <div class="brand">
          <nav class="crumbs" aria-label="Breadcrumb">
            <a href="index.html">AGISystem2</a>
            <span class="crumb-sep">/</span>
            <span class="crumb-current">AI-Assisted Research</span>
          </nav>
        </div>
        <div id="site-top-links" data-active="ai-assisted" data-basepath="."></div>
      </div>

      <header class="hero">
        <div class="kicker"><b>Research</b> Methodologies & Automation</div>
        <h1>AI-Assisted Research</h1>
        <p class="subtitle">Toward rigorous and automated scientific workflows.</p>
        <div class="meta-row">
          <span class="meta-pill">Focus: Research automation</span>
          <span class="meta-pill">2 published articles</span>
        </div>
      </header>

      <div class="layout" id="main">
        <aside class="toc" aria-label="Page outline">
          <header>
            <strong>Outline</strong>
            <span id="nav-readout">—</span>
          </header>
          <ul class="navlist">
            <li><a href="#overview" data-step="01" aria-current="true"><span class="toc-badge">01</span> Overview</a></li>
            <li><a href="#articles" data-step="02"><span class="toc-badge">02</span> Published Articles</a></li>
          </ul>
        </aside>

        <main>
          <article class="article">
            <section id="overview">
              <h2>Overview</h2>
              <div class="expandable-wrapper" data-expandable>
                <div class="expandable-content">
                  <p>
                    AI assistance does not merely speed up research; it shifts the dominant bottleneck. When synthesis and generation become cheap and fluent, epistemic control becomes the scarce resource. Synthetic systems can propose artifacts at scale, but science remains dependent on explicit assumptions, adversarial scrutiny, and reproducible validation.
                  </p>
                  <p>
                    This section explores the methodologies, principles, and architectural requirements for integrating AI into scientific and rigorous analytical workflows. The goal is to move beyond superficial "AI co-pilots" toward a Practical System 2 for AI-Assisted Research—where AI accelerates generation, but acceptance is gated through independent validation, explicit semantics, and auditable traces.
                  </p>
                </div>
                <div class="expandable-actions">
                  <button class="view-more-btn" type="button">View more..</button>
                </div>
              </div>
            </section>

            <section id="articles">
              <h2>Published Articles</h2>
              <ol class="entry-list">
                <li>
                  <a href="ai-assisted-research/automation-of-scientific-research.html">
                    <span class="entry-label">Strategic Foundations</span>
                    <h3>Toward the Automation of Scientific Research</h3>
                    <p>Why the time has come for structured automation of the scientific process.</p>
                    <div class="entry-note">Published March 24, 2026.</div>
                  </a>
                </li>
                <li>
                  <a href="ai-assisted-research/practical-system-2.html">
                    <span class="entry-label">Methodology</span>
                    <h3>Toward a Practical System 2 for AI-Assisted Research</h3>
                    <p>Principles, failure modes, and evaluation signals for rigorous, auditable workflows.</p>
                    <div class="entry-note">Published March 19, 2026.</div>
                  </a>
                </li>
              </ol>
            </section>
          </article>
        </main>
      </div>

      <div id="site-footer" data-type="ai-assisted" data-basepath="."></div>
    </div>

    <script src="MRP/mrp-outline.js"></script>
    <script src="widgets/layout.js"></script>
  </body>
</html>"""

with open('docs/ai-assisted-research.html', 'w', encoding='utf-8') as f:
    f.write(new_index_html)

# 6. Remove the "Automation of Scientific Research" article from docs/research.html
with open('docs/research.html', 'r', encoding='utf-8') as f:
    res_html = f.read()

# Decrement count
res_html = res_html.replace('39 published articles', '38 published articles')

# Remove the block
pattern = r'<li>\s*<a href="research/automation-of-scientific-research\.html">.*?</a>\s*</li>'
res_html = re.sub(pattern, '', res_html, flags=re.DOTALL)

with open('docs/research.html', 'w', encoding='utf-8') as f:
    f.write(res_html)

print("Done")
