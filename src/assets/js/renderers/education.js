// renderers/education.js
// Responsibilities:
// - Load /content/education/index.json
// - Render education cards (later)

import { fetchJSON } from '../content-api.js';
import { escapeHtml } from '../shared/ui.js';

function renderLinks(links) {
  const arr = Array.isArray(links) ? links.filter(l => l?.url) : [];
  if (!arr.length) return '';
  return `
    <div class="button-row" style="margin-top:10px">
      ${arr.map(l => `<a class="btn btn-ghost" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label || 'Link')}</a>`).join('')}
    </div>
  `;
}

function renderBullets(details) {
  const arr = Array.isArray(details) ? details.filter(Boolean) : [];
  if (!arr.length) return '';
  return `
    <ul>
      ${arr.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
    </ul>
  `;
}

function section(title, subtitle, innerHtml) {
  return `
    <section class="section">
      <div class="section-head">
        <div>
          <h2 style="margin:0">${escapeHtml(title)}</h2>
          ${subtitle ? `<div class="muted" style="margin-top:6px">${escapeHtml(subtitle)}</div>` : ''}
        </div>
      </div>
      ${innerHtml}
    </section>
  `;
}

export async function renderEducation() {
  const data = await fetchJSON('/content/education/index.json');

  // Support both:
  // - new schema: { degrees, campusRoles, achievements, leadership }
  // - old schema: [items]
  const isNew = data && typeof data === 'object' && (data.degrees || data.campusRoles || data.achievements || data.leadership);
  const degrees = isNew ? (Array.isArray(data.degrees) ? data.degrees : []) : (Array.isArray(data) ? data : []);
  const campusRoles = isNew ? (Array.isArray(data.campusRoles) ? data.campusRoles : []) : [];
  const achievements = isNew ? (Array.isArray(data.achievements) ? data.achievements : []) : [];
  const leadership = isNew ? (Array.isArray(data.leadership) ? data.leadership : []) : [];

  const degreesHtml = `
    <div class="grid">
      ${degrees.map(it => `
        <div class="card">
          <div class="card-body">
            <div>
              <div style="font-weight:750; letter-spacing:-0.01em">${escapeHtml(it.degree || '')}</div>
              <div class="muted">${escapeHtml(it.university || '')}${it.location ? ` · ${escapeHtml(it.location)}` : ''}</div>
              ${it.duration ? `<div class="muted" style="margin-top:4px">${escapeHtml(it.duration)}</div>` : ''}
            </div>
            ${renderBullets(it.details)}
            ${renderLinks(it.links)}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const roleCard = (it) => `
    <div class="panel">
      <div class="panel-head">
        <div>
          <div class="panel-title">${escapeHtml(it.title || '')}</div>
          <div class="muted">${escapeHtml(it.organization || '')}${it.location ? ` · ${escapeHtml(it.location)}` : ''}</div>
        </div>
        <div class="muted">${escapeHtml(it.duration || '')}</div>
      </div>
      ${it.description ? `<p class="muted" style="margin-top:8px">${escapeHtml(it.description)}</p>` : ''}
      ${renderBullets(it.details)}
      ${renderLinks(it.links)}
    </div>
  `;

  const campusRolesHtml = campusRoles.length
    ? `<div class="stack">${campusRoles.map(roleCard).join('')}</div>`
    : '<div class="muted">No on-campus roles added yet.</div>';

  const achievementsHtml = achievements.length
    ? `<div class="stack">${achievements.map(it => `
        <div class="panel">
          <div class="panel-head">
            <div>
              <div class="panel-title">${escapeHtml(it.title || '')}</div>
              <div class="muted">${escapeHtml(it.organization || '')}</div>
            </div>
            <div class="muted">${escapeHtml(it.date || '')}</div>
          </div>
          ${it.description ? `<p class="muted" style="margin-top:8px">${escapeHtml(it.description)}</p>` : ''}
          ${renderLinks(it.links)}
        </div>
      `).join('')}</div>`
    : '<div class="muted">No achievements added yet.</div>';

  const leadershipHtml = leadership.length
    ? `<div class="stack">${leadership.map(roleCard).join('')}</div>`
    : '<div class="muted">No leadership items added yet.</div>';

  return {
    pageTitle: 'Education',
    html: `
      <section class="page-head">
        <h1>Education</h1>
        <p class="muted">Academic programs, campus roles, achievements, and leadership.</p>
      </section>

      ${section('Education', 'Degrees and programs.', degreesHtml)}
      ${section('On-Campus Roles', 'Teaching, ambassador roles, and campus jobs.', campusRolesHtml)}
      ${section('Achievements', 'Awards, scholarships, case competitions, recognitions.', achievementsHtml)}
      ${section('Leadership', 'Student organizations and campus leadership.', leadershipHtml)}
    `
  };
}
