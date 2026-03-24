import re

index_path = 'docs/index.html'

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Current HTML snippet in docs/index.html for AI-Assisted Research:
"""
                <li>
                  <a href="ai-assisted-research.html">
                    <span class="entry-label">Method Article</span>
                    <h3>Toward a Practical System 2 for AI-Assisted Research</h3>
                    <p>
                      Principles, failure modes, and evaluation signals for using AI in serious research workflows
                      without collapsing rigor into surface fluency.
                    </p>
                    <div class="entry-note">
                      Methodological companion for research automation and reviewer-grade control. Published March 19,
                      2026.
                    </div>
                  </a>
                </li>
"""

# New HTML snippet to represent the whole section
new_snippet = """                <li>
                  <a href="ai-assisted-research.html">
                    <span class="entry-label">Research Methodologies</span>
                    <h3>AI-Assisted Research</h3>
                    <p>
                      Methodologies, principles, and architectural requirements for integrating AI into scientific and rigorous analytical workflows.
                    </p>
                    <div class="entry-note">
                      Section for research automation and reviewer-grade control. 2 published articles.
                    </div>
                  </a>
                </li>"""

pattern = r'<li>\s*<a href="ai-assisted-research.html">\s*<span class="entry-label">Method Article</span>\s*<h3>Toward a Practical System 2 for AI-Assisted Research</h3>.*?</div>\s*</a>\s*</li>'

content = re.sub(pattern, new_snippet, content, flags=re.DOTALL)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(content)
    
print("Done")
