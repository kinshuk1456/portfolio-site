// renderers/project-detail.js
// Responsibilities:
// - Read ?slug
// - Load project.json (+ the projects index, for prev/next navigation)
// - Optionally load and render the case-study markdown
// - Render an editorial case-study page: facts grid, sticky section nav,
//   problem/approach/outcome, tools, gallery, and prev/next projects.

import { fetchJSON, fetchText } from '../content-api.js';
import { getSlug } from '../router.js';
import { markdownToHtml } from '../shared/markdown.js';
import { escapeHtml, formatDate, renderTags } from '../shared/ui.js';
import { vizorArchitecture } from '../shared/graphics.js';

// Inline-SVG architecture diagrams keyed by slug (case-study visual storytelling).
const ARCHITECTURES = {
  vizor: {
    title: 'System architecture',
    note: 'The agent only ever proposes a neutral change spec — it never sees or edits Tableau XML. A deterministic compiler applies the approved change and runs schema, field, zone and fidelity validation, so the output is a valid, versioned workbook or nothing at all.',
    svg: vizorArchitecture
  }
};

export async function renderProjectDetail() {
  const slug = getSlug();
  const base = `/data/projects/items/${slug}`;

  const [project, index] = await Promise.all([
    fetchJSON(`${base}/project.json`),
    fetchJSON('/content/projects/index.json').catch(() => [])
  ]);

  let caseStudyHtml = '';
  if (project?.caseStudy?.enabled && project?.caseStudy?.path) {
    const md = await fetchText(`${base}/${project.caseStudy.path}`);
    caseStudyHtml = markdownToHtml(md);
  }

  // Prev/next within the published, date-sorted index.
  const list = Array.isArray(index) ? index : [];
  const pos = list.findIndex((p) => p.slug === slug);
  const prev = pos > 0 ? list[pos - 1] : null;
  const next = pos >= 0 && pos < list.length - 1 ? list[pos + 1] : null;

  // Facts: only render rows that exist.
  const facts = [
    ['Focus', (project.disciplines || []).join(' · ')],
    ['Role', project.role],
    ['Team', project.team],
    ['Timeline', project.duration],
    ['Date', project.date ? formatDate(project.date) : '']
  ].filter(([, v]) => v);

  const factsHtml = facts.length ? `
    <dl class="article-facts">
      ${facts.map(([k, v]) => `
        <div class="fact">
          <dt class="label">${escapeHtml(k)}</dt>
          <dd>${escapeHtml(v)}</dd>
        </div>`).join('')}
    </dl>` : '';

  const links = (project.links || []).filter(l => l?.url).map(l =>
    `<a class="btn btn-ghost" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label || 'Link')}</a>`
  ).join('');

  const gallery = (project?.images?.gallery || []).map(img => {
    const src = `data/projects/items/${slug}/${img}`;
    const alt = project?.images?.alt?.[img] || '';
    // The visible <figcaption> is the accessible description; the <img> is
    // marked decorative (alt="") so screen readers don't announce it twice.
    return `<figure class="gallery-item"><img class="gallery-img" src="/${escapeHtml(src)}" alt="" loading="lazy" />${alt ? `<figcaption class="label">${escapeHtml(alt)}</figcaption>` : ''}</figure>`;
  }).join('');

  const coverSrc = project?.images?.cover
    ? `data/projects/items/${slug}/${project.images.cover}`
    : '';

  // Metric tiles (animated count-up, wired in app.js setupCounters).
  const metrics = Array.isArray(project.metrics) ? project.metrics : [];
  const metricsHtml = metrics.length ? `
    <div class="stats" role="list">
      ${metrics.map((m) => {
        const attrs = [
          `data-count-to="${Number(m.value) || 0}"`,
          m.prefix ? `data-prefix="${escapeHtml(String(m.prefix))}"` : '',
          m.suffix ? `data-suffix="${escapeHtml(String(m.suffix))}"` : '',
          m.plain ? 'data-plain="true"' : ''
        ].filter(Boolean).join(' ');
        // Render the real value as initial text (not "0"): if the count-up never
        // runs — reduced motion, printing before the tile scrolls into view — the
        // correct number is already there. setupCounters still animates 0→value
        // when the tile enters the viewport.
        const body = m.plain ? escapeHtml(String(m.value)) : (Number(m.value) || 0).toLocaleString();
        const unit = m.suffix ? `<span class="stat-unit">${escapeHtml(String(m.suffix))}</span>` : '';
        const initial = (m.prefix ? escapeHtml(String(m.prefix)) : '') + body + unit;
        return `
        <div class="stat" role="listitem">
          <div class="stat-num" ${attrs}>${initial}</div>
          <div class="stat-cap">${escapeHtml(m.label || '')}</div>
        </div>`;
      }).join('')}
    </div>` : '';

  // Step Player — an interactive build-story progression (e.g. Vizor). All step
  // content is in the DOM; app.js setupStepPlayer turns it into a tablist.
  const steps = Array.isArray(project.steps) ? project.steps : [];
  const stepPlayerHtml = steps.length ? `
    <section class="section step-player" id="build-story" data-step-player>
      <h2>How it was built</h2>
      <div class="stepper">
        <ol class="stepper-rail" role="tablist" aria-label="Build story">
          ${steps.map((s, i) => `
            <li role="presentation">
              <button class="stepper-tab" role="tab" id="step-tab-${i}" data-step="${i}"
                aria-controls="step-panel-${i}" aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}">
                <span class="step-n">${escapeHtml(s.n || String(i + 1).padStart(2, '0'))}</span>
                <span class="step-t">${escapeHtml(s.title || '')}</span>
              </button>
            </li>`).join('')}
        </ol>
        <div class="stepper-panels">
          ${steps.map((s, i) => `
            <div class="stepper-panel" id="step-panel-${i}" role="tabpanel" aria-labelledby="step-tab-${i}" data-panel="${i}">
              <div class="step-panel-n label">${escapeHtml(s.n || '')}</div>
              <h3 class="step-panel-title">${escapeHtml(s.title || '')}</h3>
              <p class="prose">${escapeHtml(s.body || '')}</p>
            </div>`).join('')}
        </div>
      </div>
    </section>` : '';

  // Inline architecture diagram (case-study visual storytelling), if defined.
  const arch = ARCHITECTURES[slug];
  const architectureHtml = arch ? `
    <section class="section" id="architecture">
      <h2>${escapeHtml(arch.title)}</h2>
      <div class="arch">${arch.svg()}</div>
      ${arch.note ? `<p class="prose" style="margin-top:var(--space-4)">${escapeHtml(arch.note)}</p>` : ''}
    </section>` : '';

  // Build the in-page section nav from the sections that actually render.
  const sections = [
    slug === 'habitpact' ? ['demo', 'Try the demo'] : null,
    project.problem || project.approach ? ['overview', 'Overview'] : null,
    (project.outcome || metrics.length) ? ['outcome', 'Outcome'] : null,
    stepPlayerHtml ? ['build-story', 'How it was built'] : null,
    architectureHtml ? ['architecture', 'Architecture'] : null,
    (project.tools || []).length ? ['tools', 'Tools'] : null,
    gallery ? ['gallery', 'Gallery'] : null,
    caseStudyHtml ? ['case-study', 'Case study'] : null
  ].filter(Boolean);

  const sectionNav = sections.length > 1 ? `
    <nav class="section-nav" data-section-nav aria-label="Sections">
      ${sections.map(([id, label]) => `<a href="#${id}" data-nav-target="${id}">${escapeHtml(label)}</a>`).join('')}
    </nav>` : '';

  const pager = (prev || next) ? `
    <nav class="project-pager" aria-label="More projects">
      ${prev ? `
        <a class="project-pager-link project-pager-prev" href="/project.html?slug=${encodeURIComponent(prev.slug)}">
          <span class="label">← Previous</span>
          <span class="project-pager-title">${escapeHtml(prev.title)}</span>
        </a>` : '<span></span>'}
      ${next ? `
        <a class="project-pager-link project-pager-next" href="/project.html?slug=${encodeURIComponent(next.slug)}">
          <span class="label">Next →</span>
          <span class="project-pager-title">${escapeHtml(next.title)}</span>
        </a>` : '<span></span>'}
    </nav>` : '';

  return {
    pageTitle: project.title || 'Project',
    html: `
      <article class="article article--project">
        <div class="article-nav">
          <a class="link" href="/projects.html">← All projects</a>
        </div>

        <header class="article-head">
          <h1 class="article-title">${escapeHtml(project.title || slug)}</h1>
          ${project.summary ? `<p class="article-summary">${escapeHtml(project.summary)}</p>` : ''}
          ${factsHtml}
          ${(links || slug === 'habitpact') ? `<div class="hero-cta">${slug === 'habitpact' ? '<a class="btn" href="#demo">Try the app ↓</a>' : ''}${links}</div>` : ''}
        </header>

        ${coverSrc && slug !== 'habitpact' ? `
          <div class="article-cover" data-reveal>
            <img src="/${escapeHtml(coverSrc)}" alt="${escapeHtml(project?.images?.alt?.[project.images.cover] || '')}" loading="eager" />
          </div>
        ` : ''}

        ${sectionNav}

        ${slug === 'habitpact' ? `
        <section class="section habitpact-embed" id="demo" aria-labelledby="habitpact-demo-title">
          <div class="habitpact-embed-heading">
            <div><p class="label">Try the product</p><h2 id="habitpact-demo-title">A little accountability goes a long way.</h2></div>
            <a class="link" href="/habitpact-demo.html" target="_blank" rel="noopener">Open full screen ↗</a>
          </div>
          <p class="prose habitpact-embed-intro">Explore the actual HabitPact app with a sample account. Start a pact, find your accountability circle, and see the points behind the promise.</p>
          <iframe class="habitpact-embed-frame" src="/habitpact-demo.html" title="Try the actual HabitPact Flutter app with sample data" loading="lazy"></iframe>
          <p class="habitpact-embed-note">Sample data · No sign-in · Phone tracking, uploads, and payments are unavailable in the browser demo.</p>
        </section>` : ''}

        ${(project.problem || project.approach) ? `
        <section class="section" id="overview">
          <div class="two-col">
            <div>
              <h2>Problem</h2>
              <p class="prose">${escapeHtml(project.problem || '')}</p>
            </div>
            <div>
              <h2>Approach</h2>
              <p class="prose">${escapeHtml(project.approach || '')}</p>
            </div>
          </div>
        </section>` : ''}

        ${(project.outcome || metricsHtml) ? `
        <section class="section" id="outcome">
          <h2>Outcome</h2>
          ${metricsHtml}
          ${project.outcome ? `<p class="prose">${escapeHtml(project.outcome)}</p>` : ''}
        </section>` : ''}

        ${stepPlayerHtml}

        ${architectureHtml}

        ${(project.tools || []).length ? `
        <section class="section" id="tools">
          <h2>Tools</h2>
          ${renderTags(project.tools || [])}
        </section>` : ''}

        ${gallery ? `
          <section class="section" id="gallery">
            <h2>Gallery</h2>
            <div class="gallery">${gallery}</div>
          </section>
        ` : ''}

        ${caseStudyHtml ? `
          <section class="section" id="case-study">
            <h2>Case study</h2>
            <div class="prose">${caseStudyHtml}</div>
          </section>
        ` : ''}

        ${pager}
      </article>
    `
  };
}
