// renderers/project-detail.js
// Responsibilities:
// - Read ?slug
// - Load project.json
// - Optionally load case study markdown and render it (later)

import { fetchJSON, fetchText } from '../content-api.js';
import { getSlug } from '../router.js';
import { markdownToHtml } from '../shared/markdown.js';
import { escapeHtml, formatDate, renderTags } from '../shared/ui.js';

export async function renderProjectDetail() {
  const slug = getSlug();
  const base = `/data/projects/items/${slug}`;
  const project = await fetchJSON(`${base}/project.json`);

  let caseStudyHtml = '';
  if (project?.caseStudy?.enabled && project?.caseStudy?.path) {
    const md = await fetchText(`${base}/${project.caseStudy.path}`);
    caseStudyHtml = markdownToHtml(md);
  }

  const metaBits = [
    project.role ? project.role : null,
    project.team ? project.team : null,
    project.duration ? project.duration : null
  ].filter(Boolean);

  const links = (project.links || []).filter(l => l?.url).map(l => {
    return `<a class="btn btn-ghost" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label || 'Link')}</a>`;
  }).join('');

  const gallery = (project?.images?.gallery || []).map(img => {
    const src = `data/projects/items/${slug}/${img}`;
    const alt = project?.images?.alt?.[img] || '';
    return `<img class="gallery-img" src="/${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  }).join('');

  const coverSrc = project?.images?.cover
    ? `data/projects/items/${slug}/${project.images.cover}`
    : '';

  return {
    pageTitle: project.title || 'Project',
    html: `
      <article class="article">
        <div class="article-nav">
          <a class="link" href="/projects.html">← Back to Projects</a>
        </div>

        <header class="article-head">
          <h1 class="article-title">${escapeHtml(project.title || slug)}</h1>
          <div class="article-meta">
            <span>${escapeHtml(formatDate(project.date))}</span>
            ${metaBits.length ? `<span class="dot">•</span><span>${escapeHtml(metaBits.join(' · '))}</span>` : ''}
          </div>
          ${project.summary ? `<p class="article-summary">${escapeHtml(project.summary)}</p>` : ''}
          ${renderTags(project.tags || [])}
          ${links ? `<div class="hero-cta">${links}</div>` : ''}
        </header>

        ${coverSrc ? `
          <div class="article-cover">
            <img src="/${escapeHtml(coverSrc)}" alt="${escapeHtml(project?.images?.alt?.[project.images.cover] || '')}" loading="eager" />
          </div>
        ` : ''}

        <section class="section">
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
        </section>

        <section class="section">
          <h2>Outcome</h2>
          <p class="prose">${escapeHtml(project.outcome || '')}</p>
        </section>

        <section class="section">
          <h2>Tools</h2>
          ${renderTags(project.tools || [])}
        </section>

        ${gallery ? `
          <section class="section">
            <h2>Gallery</h2>
            <div class="gallery">${gallery}</div>
          </section>
        ` : ''}

        ${caseStudyHtml ? `
          <section class="section">
            <h2>Case Study</h2>
            <div class="prose">${caseStudyHtml}</div>
          </section>
        ` : ''}
      </article>
    `
  };
}
