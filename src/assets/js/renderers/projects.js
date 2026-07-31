// renderers/projects.js
// Responsibilities:
// - Load /content/projects/index.json
// - Render an editorial page head, discipline filter chips, and the card grid
// - Filtering itself is wired in app.js (setupProjectFilter), which re-renders
//   the grid so CSS counters and edge borders stay correct.

import { fetchJSON } from '../content-api.js';
import { renderProjectCards, projectDisciplines } from '../shared/ui.js';

export async function renderProjects() {
  const index = await fetchJSON('/content/projects/index.json');

  const disciplines = projectDisciplines(index);
  const filters = ['All', ...disciplines];

  const chips = filters.map((label, i) => `
    <button class="filter-chip" type="button" data-filter="${label === 'All' ? '' : label}" data-active="${i === 0 ? 'true' : 'false'}">
      ${label}
    </button>`).join('');

  return {
    pageTitle: 'Projects',
    html: `
      <section class="page-head">
        <h1>Projects</h1>
        <p class="muted">Selected work across product, analytics, and forward-deployed engineering — problem, decision, outcome.</p>
      </section>

      <section class="section" data-project-filter>
        <div class="filter-bar">
          <div class="filter-chips" role="group" aria-label="Filter projects by discipline">${chips}</div>
          <span class="filter-count label" data-filter-count>${index.length} projects</span>
        </div>
        <div class="grid" data-project-grid>${renderProjectCards(index)}</div>
        <script type="application/json" data-projects>${JSON.stringify(index).replace(/</g, '\\u003c')}</script>
      </section>
    `
  };
}
