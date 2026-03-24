import os
import re

# 1. Create widgets directory and layout.js
os.makedirs('docs/widgets', exist_ok=True)

layout_js = """(function() {
  function renderWidgets() {
    // Top Links
    const topLinksContainer = document.getElementById("site-top-links");
    if (topLinksContainer) {
      const active = topLinksContainer.getAttribute("data-active") || "home";
      const basepath = topLinksContainer.getAttribute("data-basepath") || ".";
      
      const links = [
        { id: "mrp", text: "MRP", href: `${basepath}/MRP/index.html` },
        { id: "research", text: "Research", href: `${basepath}/research.html` },
        { id: "ai-assisted", text: "AI-Assisted Research", href: `${basepath}/ai-assisted-research.html` },
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
})();"""

with open('docs/widgets/layout.js', 'w', encoding='utf-8') as f:
    f.write(layout_js)

# 2. Refactor HTML files
html_files = []
for root, dirs, files in os.walk('docs'):
    if 'widgets' in root:
        continue
    for file in files:
        if file.endswith('.html'):
            html_files.append(os.path.join(root, file))

for path in html_files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    rel_dir = os.path.relpath(os.path.dirname(path), 'docs')
    if rel_dir == '.':
        basepath = '.'
    else:
        basepath = '/'.join(['..'] * len(rel_dir.split(os.sep)))
        
    if 'MRP' in path:
        active = 'mrp'
        footer_type = 'mrp'
    elif 'research/' in path or path.endswith('research.html'):
        active = 'research'
        footer_type = 'default'
        if path.endswith('research.html'):
            footer_type = 'research-map'
    elif 'ai-assisted' in path:
        active = 'ai-assisted'
        footer_type = 'ai-assisted'
    else:
        active = 'home'
        footer_type = 'default'

    content = re.sub(r'<div class="top-links">.*?</div>', f'<div id="site-top-links" data-active="{active}" data-basepath="{basepath}"></div>', content, flags=re.DOTALL)
    content = re.sub(r'<footer>.*?</footer>', f'<div id="site-footer" data-type="{footer_type}" data-basepath="{basepath}"></div>', content, flags=re.DOTALL)

    if 'widgets/layout.js' not in content:
        content = content.replace('</body>', f'<script src="{basepath}/widgets/layout.js"></script>\\n  </body>')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# 3. Fix mrp-citation.js
cit_path = 'docs/MRP/mrp-citation.js'
if os.path.exists(cit_path):
    with open(cit_path, 'r', encoding='utf-8') as f:
        cit_js = f.read()
    
    pattern = r"const topLinks = document\.querySelector\('\.top-links'\);.*?\}\);\n  \}"
    cit_js = re.sub(pattern, '', cit_js, flags=re.DOTALL)
    with open(cit_path, 'w', encoding='utf-8') as f:
        f.write(cit_js)

# 4. Generate new article
new_article_html = '''<!doctype html>
<html lang="en" data-default-section="why-time-has-come">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="theme-color" content="#f7fbff" />
    <meta name="description" content="Toward the Automation of Scientific Research: Why the time has come for AI-mediated scientific execution." />
    <meta property="og:title" content="Toward the Automation of Scientific Research — AGISystem2" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="https://agisystem2.com/research/automation-of-scientific-research.html" />
    <title>Toward the Automation of Scientific Research — AGISystem2</title>
    <link rel="stylesheet" href="../MRP/mrp-page.css" />
    <link rel="stylesheet" href="../MRP/mrp-citation.css" />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>

    <div class="shell">
      <div class="topbar">
        <div class="brand">
          <nav class="crumbs" aria-label="Breadcrumb">
            <a href="../index.html">AGISystem2</a>
            <span class="crumb-sep">/</span>
            <a href="../research.html">Research</a>
            <span class="crumb-sep">/</span>
            <span class="crumb-current">Automation of Scientific Research</span>
          </nav>
        </div>
        <div id="site-top-links" data-active="research" data-basepath=".."></div>
      </div>

      <header class="hero">
        <div class="kicker"><b>Research Article</b> Scientific Automation</div>
        <h1>Toward the Automation of Scientific Research</h1>
        <p class="subtitle">Why the Time Has Come</p>
        <div class="meta-row">
          <span class="meta-pill">Focus: Automated Science</span>
        </div>
        <div class="citation-box" data-citation-box data-citation-key="AGISystem2-2026">
          <div class="citation-head">
            <strong>Permalink & citation</strong>
            <div class="citation-actions">
              <button class="copy-button" type="button" data-copy-target="link">Copy link</button>
              <button class="copy-button" type="button" data-copy-target="citation">Copy citation</button>
            </div>
          </div>
          <a class="citation-link" data-doc-link href="#"></a>
          <p class="citation-preview" data-citation-preview></p>
          <span class="copy-status" data-copy-status aria-live="polite"></span>
        </div>
      </header>

      <div class="layout" id="main">
        <aside class="toc" aria-label="Article outline">
          <header>
            <strong>Outline</strong>
            <span id="nav-readout">—</span>
          </header>
          <ul class="navlist">
            <li><a href="#why-time-has-come" data-step="01" aria-current="true"><span class="toc-badge">01</span> Why the Time Has Come</a></li>
            <li><a href="#structured-process" data-step="02"><span class="toc-badge">02</span> Research as a Structured Process</a></li>
            <li><a href="#first-wave" data-step="03"><span class="toc-badge">03</span> The First Wave of Automation</a></li>
            <li><a href="#society-of-agents" data-step="04"><span class="toc-badge">04</span> A Society of Scientific Agents</a></li>
            <li><a href="#simulate" data-step="05"><span class="toc-badge">05</span> Simulate Before You Build</a></li>
            <li><a href="#llms-not-enough" data-step="06"><span class="toc-badge">06</span> Why LLMs Are Not Enough</a></li>
            <li><a href="#formal-review" data-step="07"><span class="toc-badge">07</span> Toward More Formal Review</a></li>
            <li><a href="#trustworthy-ai" data-step="08"><span class="toc-badge">08</span> Building Trustworthy Scientific AI</a></li>
            <li><a href="#gradual-path" data-step="09"><span class="toc-badge">09</span> A Gradual Path Forward</a></li>
            <li><a href="#changing-role" data-step="10"><span class="toc-badge">10</span> The Changing Role of Scientists</a></li>
            <li><a href="#new-horizon" data-step="11"><span class="toc-badge">11</span> A New Horizon for Science</a></li>
            <li><a href="#references" data-step="12"><span class="toc-badge">12</span> References</a></li>
          </ul>
        </aside>

        <main class="stack">
          <article class="article">
            <section id="why-time-has-come">
              <h2>Why the Time Has Come</h2>
              <p>The strongest version of the thesis is not that science will suddenly become autonomous. It is that a growing share of scientific work is becoming structured enough to be partially automated. That claim is plausible because several once-separate components are now maturing in parallel: multi-agent systems for hypothesis generation, autonomous experimental platforms, AI systems that remove concrete scientific bottlenecks, and governance frameworks for trustworthy deployment. Google’s 2025 AI co-scientist was explicitly introduced as a multi-agent system intended to help scientists generate hypotheses and research proposals [Gottweis-Natarajan-2025]. Self-driving laboratories are no longer speculative abstractions: recent overviews describe them as systems that automate both experimental tasks and the design and selection of experiments in chemistry and materials science [Canty-2025]. AlphaFold remains the clearest proof that AI can alter the pace of a real scientific subfield by solving a major bottleneck in protein structure prediction [Jumper-2021].</p>
              <p>Taken together, these developments justify a shift in focus. The central question is no longer only whether AI can assist research at the margins through drafting, coding, or search. It is whether parts of the structured work through which science produces knowledge can be made explicit enough to be executed, checked, and improved by machine-mediated systems [Gottweis-Natarajan-2025] [Canty-2025] [Jumper-2021].</p>
            </section>

            <section id="structured-process">
              <h2>Research as a Structured Process</h2>
              <p>Scientific work is often described in terms of intuition, creativity, and discovery. That is true, but it is incomplete. Science also consists of recurrent operations: framing questions, formulating hypotheses, identifying alternatives, designing tests, interpreting evidence, and restricting conclusions to what the evidence actually warrants. These are not incidental features. They are part of what makes scientific practice cumulative.</p>
              <p>This matters because such recurrent operations are precisely the parts most likely to become partially automatable once they are represented more explicitly. At present, much of the structure of research remains fragmented across papers, scripts, notebooks, spreadsheets, conversations, tacit laboratory routines, and human memory. In such a setting, AI can improve surface productivity, but it cannot reliably preserve the dependency structure of a research program. If research questions, assumptions, datasets, protocols, claims, and limitations are instead represented in more explicit and linkable form, machine systems can begin to operate on research as a structured process rather than as an unbounded stream of prose. The broader logic is aligned with the NIST AI Risk Management Framework, which emphasizes that trustworthy AI depends on governance, measurement, and process, not only on model capability [NIST-2023].</p>
            </section>

            <section id="first-wave">
              <h2>The First Wave of Automation</h2>
              <p>The first wave of automation is unlikely to be full scientific autonomy. It is more likely to involve the transfer of semi-formal research labor from loosely coordinated human workflows into more disciplined computational systems.</p>
              <p>This includes literature mapping, extraction of claims from papers, comparison of experimental settings, generation and repair of analysis code, experiment bookkeeping, figure regeneration, statistical sanity checks, and consistency checks between text and results. These tasks may appear secondary, but they consume a substantial fraction of research effort in many fields.</p>
              <p>The reason this claim is credible is that early instances already exist. Google’s AI co-scientist is positioned not as a universal scientist but as a multi-agent collaborator for generating and refining hypotheses and proposals [Gottweis-Natarajan-2025]. In materials science, A-Lab linked literature, computational screening, machine learning, active learning, and robotics into an autonomous loop for inorganic synthesis [Szymanski-2023]. In structural biology, AlphaFold did not automate biology as a whole, but it did automate a scientifically central subtask at unprecedented scale and accuracy [Jumper-2021]. The common lesson is that automation begins not with mythical replacement, but with the systematic capture of high-value scientific subtasks.</p>
            </section>

            <section id="society-of-agents">
              <h2>A Society of Scientific Agents</h2>
              <p>A further implication is that research is unlikely to be automated well by a single monolithic agent. The reason is not merely engineering convenience. Scientific work is epistemically heterogeneous. Exploration, criticism, validation, execution, synthesis, and experimental planning are different activities, and there is little reason to expect one computational regime to be equally good at all of them.</p>
              <p>A more plausible architecture is therefore a society of specialized scientific agents. Some would map literature and unresolved contradictions. Some would generate hypotheses. Some would propose controls and experiments. Some would run code, simulations, or instruments. Some would search for confounders, leakage, weak baselines, or overextended claims. Some would be oriented primarily toward validation rather than novelty. Google’s own description of the AI co-scientist emphasizes a coalition of specialized agents that iteratively generate, evaluate, and refine hypotheses [Gottweis-Natarajan-2025]. That design choice is important because it reflects something true about science itself: progress depends not only on producing candidate ideas, but also on filtering, criticizing, and revising them.</p>
            </section>

            <section id="simulate">
              <h2>Simulate Before You Build</h2>
              <p>One of the strongest drivers of research automation is the growing ability to explore candidate explanations, structures, or designs in silico before committing scarce physical resources. In many domains, simulation is the first practical bridge between reasoning and intervention.</p>
              <p>Here again the evidence is concrete. AlphaFold moved part of structural biology away from slow experimental bottlenecks by making high-accuracy structure prediction computationally accessible [Jumper-2021]. A-Lab was motivated precisely by the need to connect computational selection with experimental realization in materials discovery [Szymanski-2023]. The self-driving lab literature now explicitly treats the automated design and selection of experiments as central to scientific acceleration, not as an optional add-on [Canty-2025].</p>
              <p>The broader point is that science becomes more automatable when candidate worlds can be searched, ranked, and stress-tested before expensive laboratory action. Simulation is therefore not only a performance optimization. It is one of the main ways in which scientific inquiry becomes programmable.</p>
            </section>

            <section id="llms-not-enough">
              <h2>Why LLMs Are Not Enough</h2>
              <p>Large language models are a major advance, but they are not, by themselves, a sufficient substrate for reliable scientific automation. Their strength lies in flexible inference over language and semi-structured context. Their weakness is that they do not natively provide durable provenance, explicit constraint tracking, methodological discipline, or stable epistemic memory.</p>
              <p>That is why a future based only on LLMs risks automating the appearance of science rather than its structure. Such systems can produce plausible summaries, explanations, and manuscripts while remaining fragile with respect to evidence tracing, hidden assumptions, and reproducible validation. This is also why the move toward trustworthy deployment cannot stop at model quality. The NIST framework treats trustworthiness as a property emerging from measurement, governance, documentation, and risk management [NIST-2023]. In scientific settings, that implies a broader architecture in which LLMs help formulate, translate, and synthesize, while statistical procedures, workflow runtimes, simulators, and more explicit validators handle a larger share of checking and constraint enforcement.</p>
            </section>

            <section id="formal-review">
              <h2>Toward More Formal Review</h2>
              <p>One of the most promising areas for partial formalization is scientific review. The claim here should be made carefully. Peer review is not reducible to a checklist, and novelty judgments remain partly irreducible to formal procedure. But a substantial part of review is structural enough to benefit from explicit computational support.</p>
              <p>There are at least two reasons to take this seriously. First, AI is already entering peer review in practice. Nature reported in 2025 that AI was transforming peer review while raising concerns about inconsistent and poorly governed use [Naddaf-2025]. A follow-up Nature report in early 2026 stated that more than half of surveyed researchers had used AI tools while reviewing manuscripts, often despite restrictive guidance [Naddaf-2026]. Second, there is now direct evidence that software tools can assist with some review-relevant criteria. A 2026 comparative study in PLOS One found that combinations of automated tools could outperform individual tools on some rigor and transparency checks [Eckmann-2026].</p>
              <p>The practical implication is not that reviewers disappear. It is that papers, protocols, and reports can increasingly be treated not only as prose, but as structured objects containing claims, evidence relations, assumptions, evaluation choices, and possible contradictions. Review then becomes partly formalizable: a system can ask whether a conclusion exceeds the evidence, whether causal language is justified by design, whether a comparison is fair, or whether a claimed robustness property is actually tested [Eckmann-2026]. Human judgment remains central, but it can be supported by a more explicit technical substrate.</p>
            </section>

            <section id="trustworthy-ai">
              <h2>Building Trustworthy Scientific AI</h2>
              <p>If AI is to participate in the internal mechanics of research, then trustworthy AI is not a cosmetic layer. It is part of the core design problem. The reason is simple: the more influence machine systems have over hypotheses, experiments, interpretations, and review, the more consequential failures of provenance, uncertainty handling, reproducibility, privacy, and accountability become.</p>
              <p>This is precisely the logic of existing governance frameworks. NIST states that understanding and managing AI risks helps enhance trustworthiness [NIST-2023]. The OECD AI Principles describe trustworthy AI as AI that is innovative while also respecting human rights and democratic values [OECD-2019]. In a scientific setting, these general ideas become concrete requirements. Important claims should have inspectable support. Transformations of data or interpretation should leave an audit trail. Systems should distinguish exploratory signals from validated findings and should expose uncertainty when the evidential basis is weak. In high-stakes contexts, they should also know when to abstain and when to escalate to human oversight. Trustworthiness, in that sense, is not a final moderation step. It is a distributed guardrail layer over the entire research process.</p>
            </section>

            <section id="gradual-path">
              <h2>A Gradual Path Forward</h2>
              <p>The path toward automation is likely to be gradual because the current evidence is local and compositional, not universal. AlphaFold automated a major scientific bottleneck, but not biology as a whole [Jumper-2021]. A-Lab demonstrated an autonomous loop for a defined materials workflow, not for all of experimental science [Szymanski-2023]. Self-driving labs are presented in the literature as powerful but still technically and organizationally challenging research infrastructures [Canty-2025]. The Google AI co-scientist is framed as a collaborator for hypothesis generation and proposal support, not as a complete replacement for scientific practice [Gottweis-Natarajan-2025].</p>
              <p>A plausible trajectory therefore consists of cumulative steps: more structured research artefacts, more explicit workflows, clearer separation between generation, execution, critique, and validation, partial formalization of review, and native integration of provenance, uncertainty handling, audit logs, and escalation policies. In some fields, these layers will connect directly to robotic laboratories; in others, they will remain primarily computational. The important point is that no single step needs to solve the whole problem for the trajectory to be real.</p>
            </section>

            <section id="changing-role">
              <h2>The Changing Role of Scientists</h2>
              <p>The role of scientists is unlikely to disappear. It is more likely to change in the direction of problem selection, judgment, interpretation, and governance. This is not merely a philosophical preference; it follows from the structure of the current evidence. The tasks that are easiest to automate first are those that are repetitive, semi-formal, and locally checkable. By contrast, the selection of worthwhile questions, the evaluation of trade-offs, the interpretation of anomalies, and the social and ethical framing of research remain less reducible to routine procedure.</p>
              <p>That is also how leading examples present themselves. Google characterizes its system as a “virtual scientific collaborator,” not as a replacement for scientists [Gottweis-Natarajan-2025]. The self-driving lab literature likewise emphasizes human-machine and human-human collaboration, not the disappearance of human scientific agency [Canty-2025]. The likely outcome is therefore differentiation rather than elimination: less human effort spent on low-level coordination and more effort concentrated on direction, judgment, and responsibility.</p>
            </section>

            <section id="new-horizon">
              <h2>A New Horizon for Science</h2>
              <p>The most defensible conclusion is not that science will be handed over to autonomous machines. It is that the structured work of science is becoming increasingly representable, executable, and checkable in ways that allow machine systems to participate much more deeply than before.</p>
              <p>That conclusion is credible because early examples already exist for multiple parts of the puzzle: AI systems that solve concrete scientific bottlenecks [Jumper-2021], autonomous experimental loops [Szymanski-2023] [Canty-2025], multi-agent systems for hypothesis generation [Gottweis-Natarajan-2025], software support for rigor and transparency checking [Eckmann-2026], and governance frameworks that define trustworthy deployment as more than raw capability [NIST-2023] [OECD-2019].</p>
              <p>The real choice, then, is not whether AI will enter science. It already has. The choice is whether it will remain largely at the level of fluent assistance, or whether it will be integrated into a more rigorous architecture for producing, checking, and revising knowledge. The first path mainly accelerates output. The second has the potential to improve the structure of inquiry itself.</p>
            </section>

            <section id="references">
              <h2>References</h2>
              <ul class="refs">
                <li>[Canty-2025] Canty, J. et al. Self-driving laboratories. Nature Reviews Methods Primers. 2025.</li>
                <li>[Eckmann-2026] Eckmann, P. et al. Use as directed? A comparison of software tools intended to check rigor and transparency of published work. PLOS One. 2026.</li>
                <li>[Gottweis-Natarajan-2025] Gottweis, J.; Natarajan, V. Accelerating scientific breakthroughs with an AI co-scientist. Google Research Blog. 2025.</li>
                <li>[Jumper-2021] Jumper, J. et al. Highly accurate protein structure prediction with AlphaFold. Nature. 2021.</li>
                <li>[Naddaf-2025] Naddaf, M. AI is transforming peer review — and many scientists are worried. Nature. 2025.</li>
                <li>[Naddaf-2026] Naddaf, M. More than half of researchers now use AI for peer review — often against guidance. Nature. 2026.</li>
                <li>[NIST-2023] National Institute of Standards and Technology. Artificial Intelligence Risk Management Framework (AI RMF 1.0). 2023.</li>
                <li>[OECD-2019] OECD. OECD AI Principles overview. 2019.</li>
                <li>[Szymanski-2023] Szymanski, N. J. et al. An autonomous laboratory for the accelerated synthesis of novel materials. Nature. 2023.</li>
              </ul>
            </section>
          </article>
        </main>
      </div>

      <div id="site-footer" data-type="default" data-basepath=".."></div>
    </div>

    <script src="../MRP/mrp-outline.js"></script>
    <script src="../MRP/mrp-citation.js"></script>
    <script src="../widgets/layout.js"></script>
  </body>
</html>'''

with open('docs/research/automation-of-scientific-research.html', 'w', encoding='utf-8') as f:
    f.write(new_article_html)

# 5. Update research.html
with open('docs/research.html', 'r', encoding='utf-8') as f:
    res_html = f.read()

res_html = res_html.replace('38 published articles', '39 published articles')

new_item = """<li>
                  <a href="research/automation-of-scientific-research.html">
                    <span class="entry-label">Strategic Foundations</span>
                    <h3>Toward the Automation of Scientific Research</h3>
                    <p>Why the time has come for structured automation of the scientific process.</p>
                    <div class="entry-note">Strategic foundations track. Published March 24, 2026.</div>
                  </a>
                </li>
                """

pattern = r'(<li>\s*<a href="research/european-research-initiatives.html">)'
res_html = re.sub(pattern, new_item + r'\\1', res_html)

with open('docs/research.html', 'w', encoding='utf-8') as f:
    f.write(res_html)

print("Done")
