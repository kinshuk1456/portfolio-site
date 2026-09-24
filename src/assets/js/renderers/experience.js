// renderers/experience.js
// An editorial career journey (not a resume): a capability-stack thesis, a clean
// CSS-grid timeline where each role is its own chapter with a role-specific
// workflow visual, scoped metrics, a "what it added" label and a case-study CTA,
// a through-line ending, and a small teaching/leadership coda.

import { fetchJSON } from '../content-api.js';
import { escapeHtml } from '../shared/ui.js';
import { roleFlow } from '../shared/graphics.js';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monYear(iso) {
  if (!iso) return '';
  const [y, m] = iso.split('-');
  return `${MON[(+m || 1) - 1]} ${y}`;
}
function readableRange(it) {
  const s = monYear(it.startDate);
  const e = it.current ? 'Present' : monYear(it.endDate);
  return [s, e].filter(Boolean).join(' – ');
}

// The accumulation thesis — each layer kept, not replaced.
const STACK = [
  { year: '2020', cap: 'Operations' },
  { year: '2023', cap: 'Software' },
  { year: '2025', cap: 'Data' },
  { year: '2026', cap: 'Product' },
  { year: '2026', cap: 'AI / Forward deployment' }
];
const VERBS = ['Operate', 'Build', 'Measure', 'Own', 'Deploy'];
const THROUGH = ['Understand the workflow', 'Turn it into a system', 'Validate it', 'Ship it', 'Stay close to the user'];

function chipFlow(nodes, cls, label) {
  const inner = nodes
    .map((t) => `<span class="rf-node">${escapeHtml(t)}</span>`)
    .join('<span class="rf-arrow" aria-hidden="true">→</span>');
  return `<div class="role-flow ${cls}" role="img" aria-label="${escapeHtml(label)}">${inner}</div>`;
}

function roleMetrics(metrics = []) {
  if (!metrics.length) return '';
  return `<div class="xp-metrics">${metrics.map((m) => {
    const suffix = m.suffix ? `<span class="xp-unit">${escapeHtml(String(m.suffix))}</span>` : '';
    const prefix = m.prefix ? escapeHtml(String(m.prefix)) : '';
    // Plain metrics (e.g. a "~3 → 6–7" range) render as static text — no count-up,
    // since animating from 0 would be meaningless for a non-numeric value.
    if (m.plain) {
      return `
      <div class="xp-metric">
        <div class="xp-metric-num">${escapeHtml(String(m.value))}</div>
        <div class="xp-metric-label">${escapeHtml(m.label || '')}</div>
      </div>`;
    }
    return `
      <div class="xp-metric">
        <div class="xp-metric-num" data-count-to="${Number(m.value) || 0}"${m.prefix ? ` data-prefix="${escapeHtml(String(m.prefix))}"` : ''}${m.suffix ? ` data-suffix="${escapeHtml(String(m.suffix))}"` : ''}>${prefix}${escapeHtml(String(m.value))}${suffix}</div>
        <div class="xp-metric-label">${escapeHtml(m.label || '')}</div>
      </div>`;
  }).join('')}</div>`;
}

function renderRole(it) {
  const year = (it.startDate || '').slice(0, 4);
  const cta = (it.links || []).filter((l) => l && l.url).map((l) =>
    `<a class="xp-cta" href="${escapeHtml(l.url)}">${escapeHtml(l.label || 'View case study')} <span aria-hidden="true">↗</span></a>`).join('');
  const tools = (it.tools || []).length
    ? `<div class="xp-tools">${it.tools.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div>` : '';

  return `
    <article class="xp-role" data-reveal>
      <div class="xp-role-date">
        <span class="xp-role-year">${escapeHtml(year)}</span>
        <span class="xp-role-range label">${escapeHtml(readableRange(it))}</span>
      </div>
      <div class="xp-role-rail" aria-hidden="true"><span class="xp-role-node"></span></div>
      <div class="xp-role-content">
        <div class="xp-role-head">
          <div class="xp-role-id">
            <h2 class="xp-role-company">${escapeHtml(it.company || '')}</h2>
            <div class="xp-role-title">${escapeHtml(it.role || '')}${it.location ? ` · <span class="xp-role-loc">${escapeHtml(it.location)}</span>` : ''}</div>
          </div>
          ${it.added ? `<div class="xp-added label"><span>Added</span> → ${escapeHtml(it.added)}</div>` : ''}
        </div>
        <p class="xp-role-context">${escapeHtml(it.context || it.description || '')}</p>
        ${roleFlow(it.visual || '')}
        ${roleMetrics(it.metrics)}
        ${tools}
        ${cta ? `<div class="xp-role-cta">${cta}</div>` : ''}
      </div>
    </article>`;
}

export async function renderExperience() {
  const items = await fetchJSON('/content/experience/index.json');

  const stack = STACK.map((s, i) => `
    <div class="xp-stack-item">
      <span class="xp-stack-year label">${s.year}</span>
      <span class="xp-stack-cap">${escapeHtml(s.cap)}</span>
    </div>${i < STACK.length - 1 ? '<span class="xp-stack-plus" aria-hidden="true">+</span>' : ''}`).join('');

  return {
    pageTitle: 'Experience',
    html: `
      <section class="page-head xp-hero" data-reveal>
        <p class="label">Experience</p>
        <h1>A career that accumulated, not pivoted.</h1>
        <p class="muted xp-hero-sub">Operations, then software, then data, then product, then AI and forward deployment — each layer kept, not replaced.</p>
        <div class="xp-stack" role="img" aria-label="Capability stack that accumulated: 2020 operations, 2023 software, 2025 data, 2026 product, 2026 AI and forward deployment">
          ${stack}
        </div>
        <div class="xp-verbs" aria-hidden="true">${VERBS.map((v) => `<span>${v}</span>`).join('<i>→</i>')}</div>
      </section>

      <section class="section xp-timeline">
        ${items.map(renderRole).join('')}
      </section>

      <section class="section xp-throughline" data-reveal>
        <div class="section-index label">The through-line</div>
        <h2>The tools changed. The operating pattern didn't.</h2>
        ${chipFlow(THROUGH, 'rf--through', 'The through-line: understand the workflow, turn it into a system, validate it, ship it, stay close to the user')}
      </section>

      <section class="section xp-teaching" data-reveal>
        <div class="section-index label">Teaching &amp; leadership</div>
        <div class="xp-teach-grid">
          <div class="xp-teach-item">
            <span class="label">UC Riverside</span>
            <div class="xp-teach-role">Graduate Teaching Assistant</div>
            <div class="muted">BUS 104 · ECON 003 · ECON 103</div>
          </div>
          <div class="xp-teach-item">
            <span class="label">UC Riverside</span>
            <div class="xp-teach-role">Graduate Student Ambassador</div>
          </div>
          <div class="xp-teach-item">
            <span class="label">Programming Club · UC Riverside</span>
            <div class="xp-teach-role">Vice President → President</div>
          </div>
        </div>
      </section>
    `
  };
}
