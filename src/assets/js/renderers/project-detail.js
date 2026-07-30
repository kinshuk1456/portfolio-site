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

  // Build the in-page section nav from the sections that actually render.
  const sections = [
    project.problem || project.approach ? ['overview', 'Overview'] : null,
    project.outcome ? ['outcome', 'Outcome'] : null,
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
          ${links ? `<div class="hero-cta">${links}</div>` : ''}
        </header>

        ${coverSrc ? `
          <div class="article-cover" data-reveal>
            <img src="/${escapeHtml(coverSrc)}" alt="${escapeHtml(project?.images?.alt?.[project.images.cover] || '')}" loading="eager" />
          </div>
        ` : ''}

        ${sectionNav}

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

        ${project.outcome ? `
        <section class="section" id="outcome">
          <h2>Outcome</h2>
          <p class="prose">${escapeHtml(project.outcome)}</p>
        </section>` : ''}

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
