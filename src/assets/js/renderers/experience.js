// renderers/experience.js
// Responsibilities:
// - Load /content/experience/index.json
// - Render timeline/cards (later)

import { fetchJSON } from '../content-api.js';
import { escapeHtml } from '../shared/ui.js';

function fmtRange(it) {
  const start = it.startDate ? it.startDate.slice(0, 7) : '';
  const end = it.current ? 'Present' : (it.endDate ? it.endDate.slice(0, 7) : '');
  return [start, end].filter(Boolean).join(' — ');
}

export async function renderExperience() {
  const items = await fetchJSON('/content/experience/index.json');

  return {
    pageTitle: 'Experience',
    html: `
      <section class="page-head">
        <h1>Experience</h1>
        <p class="muted">Where I’ve worked, what I owned, and the outcomes I drove.</p>
      </section>

      <section class="section">
        <div class="timeline">
          ${items.map(it => `
            <div class="timeline-item">
              <div class="timeline-meta">
                <div class="timeline-role">${escapeHtml(it.role || '')}</div>
                <div class="muted">${escapeHtml(it.company || '')}${it.location ? ` · ${escapeHtml(it.location)}` : ''}</div>
                <div class="muted">${escapeHtml(fmtRange(it))}</div>
              </div>
              <div class="timeline-body">
                <p>${escapeHtml(it.description || '')}</p>
                ${Array.isArray(it.achievements) && it.achievements.length ? `
                  <ul>
                    ${it.achievements.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `
  };
}
