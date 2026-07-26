// renderers/contact.js
// Responsibilities:
// - Render contact info from site.json

import { escapeHtml } from '../shared/ui.js';

export async function renderContact({ site }) {
  const email = site.contact?.email || site.person?.email;
  const location = site.contact?.location || site.person?.location;
  const socials = (site.social || []).map(s => `
    <a class="btn btn-ghost" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a>
  `).join('');

  return {
    pageTitle: 'Contact',
    html: `
      <section class="page-head">
        <h1>${escapeHtml(site.contact?.title || 'Contact')}</h1>
        <p class="muted">${escapeHtml(site.contact?.blurb || '')}</p>
      </section>

      <section class="section">
        <div class="panel">
          <div class="stack">
            ${email ? `<div><div class="muted">Email</div><a href="mailto:${email}">${email}</a></div>` : ''}
            ${location ? `<div><div class="muted">Location</div><div>${escapeHtml(location)}</div></div>` : ''}
            ${site.contact?.calendlyUrl ? `<div><a class="btn btn-primary" href="${escapeHtml(site.contact.calendlyUrl)}" target="_blank" rel="noopener">Schedule time</a></div>` : ''}
            ${socials ? `<div><div class="muted" style="margin-bottom:8px;">Social</div><div class="button-row">${socials}</div></div>` : ''}
          </div>
        </div>
      </section>
    `
  };
}
