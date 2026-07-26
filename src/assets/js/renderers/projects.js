// renderers/projects.js
// Responsibilities:
// - Load /content/projects/index.json
// - Render projects card grid + filters (later)

import { fetchJSON } from '../content-api.js';
import { renderCard, formatDate } from '../shared/ui.js';

export async function renderProjects() {
  const index = await fetchJSON('/content/projects/index.json');

  return {
    pageTitle: 'Projects',
    html: `
      <section class="page-head">
        <h1>Projects</h1>
        <p class="muted">A curated selection of work—built with a bias toward clarity and outcomes.</p>
      </section>

      <section class="section">
        <div class="grid">
          ${index.map(p => renderCard({
            href: `/project.html?slug=${encodeURIComponent(p.slug)}`,
            title: p.title,
            meta: (p.disciplines || []).join(' · ') || formatDate(p.date),
            summary: p.summary,
            coverImage: p.coverImage,
            tags: p.tags
          })).join('')}
        </div>
      </section>
    `
  };
}
