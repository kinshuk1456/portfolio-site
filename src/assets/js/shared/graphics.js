// shared/graphics.js
// A small, reusable "visual system" — string builders for the recurring graphic
// motifs used across the portfolio (nodes, connectors, flows, feature graphics,
// architecture diagrams, metric strips, mono fragments). Everything inherits the
// site tokens: inline SVG uses `currentColor` for ink and #c1440e for the rust
// accent, so a diagram reads correctly on bone and inside a dark (ink) section.

import { escapeHtml } from './ui.js';

const RUST = '#c1440e';

// A mono "fragment" — terminal / API / code microcopy used as texture.
export function frag(text, cls = '') {
  return `<span class="frag ${cls}" aria-hidden="true">${escapeHtml(text)}</span>`;
}

// A compact vertical flow: labelled nodes joined by arrows. Used by the
// "Systems I Build" mini-diagrams and feature-card supporting flows.
export function miniFlow(steps = [], { accentLast = true } = {}) {
  const nodes = steps.map((s, i) => {
    const last = i === steps.length - 1;
    const cls = `mini-node${accentLast && last ? ' mini-node--accent' : ''}`;
    return `<li class="${cls}">${escapeHtml(s)}</li>`;
  }).join('<li class="mini-arrow" aria-hidden="true">↓</li>');
  return `<ul class="mini-flow" role="list">${nodes}</ul>`;
}

// The horizontal "How I build" systems diagram (01–04). Draw-on-scroll line is
// handled in CSS/JS via [data-flow-draw].
export function buildFlow(stages = []) {
  const cols = stages.map((st, i) => `
    <div class="bflow-col">
      <span class="bflow-dot" aria-hidden="true"></span>
      <div class="bflow-n">${escapeHtml(String(i + 1).padStart(2, '0'))}</div>
      <div class="bflow-k">${escapeHtml(st.key)}</div>
      <ul class="bflow-notes" role="list">
        ${(st.notes || []).map((n) => `<li>${escapeHtml(n)}</li>`).join('')}
      </ul>
    </div>`).join('');
  return `
    <div class="bflow" data-flow-draw>
      <div class="bflow-track" aria-hidden="true"><span class="bflow-line"></span></div>
      <div class="bflow-cols">${cols}</div>
    </div>`;
}

// Impact strip — verified metrics as typography + hairlines (not KPI boxes).
// rows: [{ value, prefix?, suffix?, label }]
export function impactStrip(rows = []) {
  const items = rows.map((r) => {
    const val = `${r.prefix ? escapeHtml(String(r.prefix)) : ''}${escapeHtml(String(r.value))}${r.suffix ? `<span class="impact-unit">${escapeHtml(String(r.suffix))}</span>` : ''}`;
    return `
      <div class="impact-row">
        <div class="impact-num" data-count-to="${Number(r.value) || 0}"${r.prefix ? ` data-prefix="${escapeHtml(String(r.prefix))}"` : ''}${r.suffix ? ` data-suffix="${escapeHtml(String(r.suffix))}"` : ''}>${val}</div>
        <span class="impact-rule" aria-hidden="true"></span>
        <div class="impact-label">${escapeHtml(r.label)}</div>
      </div>`;
  }).join('');
  return `<div class="impact">${items}</div>`;
}

// ---- Inline-SVG feature graphics (one distinct visual per flagship) --------

// Vizor: natural-language request → agent proposes a spec → deterministic
// compiler applies + validates → versioned workbook. The model never edits XML.
export function featureVizor() {
  return `
  <svg class="feat-svg feat-vizor" viewBox="0 0 320 300" role="img" aria-label="Vizor pipeline: a natural-language request is turned into a proposed change spec by an agent, applied by a deterministic compiler with validation, and written out as a versioned Tableau workbook">
    <g fill="none" stroke="currentColor" stroke-width="1.4">
      <rect x="34" y="24" width="252" height="42" rx="2"/>
      <rect x="70" y="102" width="180" height="40" rx="2"/>
      <rect x="46" y="176" width="228" height="40" rx="2"/>
      <rect x="112" y="248" width="96" height="40" rx="2"/>
    </g>
    <path class="feat-flow-path" d="M160,66 V102 M160,142 V176 M160,216 V248" fill="none" stroke="${RUST}" stroke-width="1.6" stroke-dasharray="3 4"/>
    <g fill="currentColor" font-family="ui-monospace, Menlo, monospace" text-anchor="middle">
      <text x="160" y="41" font-size="9" opacity="0.55">REQUEST</text>
      <text x="160" y="56" font-size="12" font-family="Georgia, serif">"add West revenue KPI"</text>
      <text x="160" y="127" font-size="11" font-weight="600">AGENT → PROPOSED SPEC</text>
      <text x="160" y="201" font-size="11" font-weight="600">DETERMINISTIC COMPILER · VALIDATE</text>
      <text x="160" y="273" font-size="13">.twb v2 ✓</text>
    </g>
  </svg>`;
}

// HabitPact: a stylized phone with a pact + proof + peer-validation states.
export function featureHabitpact() {
  return `
  <svg class="feat-svg feat-habitpact" viewBox="0 0 320 300" role="img" aria-label="HabitPact concept UI: a group pact with a goal, progress, and a proof action, surrounded by accountability states">
    <g fill="none" stroke="currentColor">
      <rect x="112" y="26" width="96" height="200" rx="12" stroke-width="1.6"/>
      <rect x="112" y="26" width="96" height="200" rx="12" fill="var(--surface)" stroke="none"/>
      <rect x="112" y="26" width="96" height="200" rx="12" stroke-width="1.6"/>
      <line x1="146" y1="38" x2="174" y2="38" stroke-width="2"/>
    </g>
    <g font-family="ui-sans-serif, system-ui" fill="currentColor">
      <text x="124" y="66" font-size="8" font-family="ui-monospace, monospace" opacity="0.55">GROUP · PACT</text>
      <text x="124" y="86" font-size="11" font-weight="600">Gym 4×/week</text>
      <g stroke="currentColor">
        <circle cx="128" cy="104" r="5" fill="${RUST}" stroke="none"/>
        <circle cx="144" cy="104" r="5" fill="${RUST}" stroke="none"/>
        <circle cx="160" cy="104" r="5" fill="${RUST}" stroke="none"/>
        <circle cx="176" cy="104" r="5" fill="none" stroke-width="1.4"/>
      </g>
      <rect x="124" y="126" width="72" height="26" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>
      <text x="160" y="143" font-size="10" text-anchor="middle">Submit proof →</text>
      <text x="124" y="176" font-size="8" font-family="ui-monospace, monospace" opacity="0.55">PEER REVIEW</text>
      <text x="124" y="192" font-size="10">2 approved · 1 pending</text>
    </g>
    <g font-family="ui-monospace, Menlo, monospace" font-size="9" fill="currentColor" opacity="0.6">
      <text x="20" y="70">goal</text>
      <text x="20" y="150">proof</text>
      <text x="238" y="70">streak</text>
      <text x="238" y="150">validation</text>
    </g>
    <g stroke="currentColor" stroke-width="1" opacity="0.35">
      <path d="M44,66 H112 M44,146 H112 M208,66 H276 M208,146 H276" fill="none" stroke-dasharray="2 4"/>
    </g>
  </svg>`;
}

// Summit: a compact live-operations board (check-ins, room occupancy, sessions).
export function featureSummit() {
  return `
  <svg class="feat-svg feat-summit" viewBox="0 0 320 300" role="img" aria-label="Summit live operations board: total check-ins, room occupancy bars, and session count">
    <g font-family="ui-monospace, Menlo, monospace" fill="currentColor">
      <text x="24" y="40" font-size="9" opacity="0.55">CHECK-INS</text>
      <text x="24" y="74" font-size="34" font-family="Georgia, serif">120+</text>
      <text x="220" y="40" font-size="9" opacity="0.55">SESSIONS</text>
      <text x="220" y="74" font-size="34" font-family="Georgia, serif">18</text>
    </g>
    <g font-family="ui-sans-serif, system-ui" fill="currentColor">
      <text x="24" y="122" font-size="11">Room A</text>
      <rect x="100" y="112" width="196" height="12" fill="none" stroke="currentColor" stroke-width="1"/>
      <rect x="100" y="112" width="176" height="12" fill="${RUST}"/>
      <text x="24" y="156" font-size="11">Room B</text>
      <rect x="100" y="146" width="196" height="12" fill="none" stroke="currentColor" stroke-width="1"/>
      <rect x="100" y="146" width="80" height="12" fill="currentColor"/>
      <text x="24" y="190" font-size="11">Room C</text>
      <rect x="100" y="180" width="196" height="12" fill="none" stroke="currentColor" stroke-width="1"/>
      <rect x="100" y="180" width="128" height="12" fill="currentColor"/>
    </g>
    <g transform="translate(24,214)" fill="currentColor">
      <rect width="14" height="14"/><rect x="20" width="14" height="14"/><rect x="40" width="14" height="14" opacity="0.4"/>
      <rect y="20" width="14" height="14" opacity="0.4"/><rect x="40" y="20" width="14" height="14"/>
      <text x="72" y="12" font-size="9" font-family="ui-monospace, monospace" opacity="0.6">QR CHECK-IN</text>
      <text x="72" y="30" font-size="9" font-family="ui-monospace, monospace" opacity="0.6">FLOOR HOST · ADMIN</text>
    </g>
  </svg>`;
}

// Per-role workflow visuals for the Experience page. HTML chip-flows (not fixed
// SVG) so they stay legible and wrap cleanly on mobile. Same bone/ink/rust
// language, varied composition per role.
export function roleFlow(slug) {
  const node = (t) => `<span class="rf-node">${escapeHtml(t)}</span>`;
  const arrow = '<span class="rf-arrow" aria-hidden="true">→</span>';
  const chain = (arr) => arr.map(node).join(arrow);
  const wrap = (inner, cls, label) => `<div class="role-flow ${cls}" role="img" aria-label="${escapeHtml(label)}">${inner}</div>`;

  if (slug === 'habitpact') {
    return wrap(chain(['Goal', 'Proof', 'Friend validation', 'Accountability']),
      'rf--product', 'Product loop: goal, then proof, then friend validation, then accountability');
  }
  if (slug === 'pim') {
    const sources = ['Redzone', 'SQL Server', 'SAP HANA', 'Snowflake']
      .map((s) => `<span class="rf-src">${s}</span>`).join('');
    return wrap(`<span class="rf-group" aria-hidden="true">${sources}</span>${arrow}${chain(['SQL · validation', 'Power BI', 'Operations'])}`,
      'rf--data', 'Data pipeline: four source systems reconciled through SQL and validation into Power BI, then operational decisions');
  }
  if (slug === 'flymehigh') {
    return wrap(chain(['Sales / ops', 'JS UI', 'REST API', 'Spring Boot', 'PostgreSQL']),
      'rf--system', 'System: sales and ops needs to a JavaScript UI, REST API, Spring Boot backend, and PostgreSQL');
  }
  if (slug === 'inn4smart') {
    return wrap(`${chain(['Spreadsheet', 'Validate', 'JSON', 'REST API', 'Response check'])}<span class="rf-note" aria-hidden="true">↺ retry &amp; log on failure</span>`,
      'rf--pipe', 'Integration pipeline: spreadsheet, validate, JSON, REST API, response check, with retry and failure logging');
  }
  if (slug === 'srikalyani') {
    return wrap(chain(['Customer need', 'Quality', 'Inventory', 'Production', 'Delivery']),
      'rf--ops', 'Operations chain: customer need, quality, inventory, production, delivery');
  }
  return '';
}

export function featureFor(slug) {
  if (slug === 'vizor') return featureVizor();
  if (slug === 'habitpact') return featureHabitpact();
  if (slug === 'event-checkin-system') return featureSummit();
  return '';
}

// Vizor case-study architecture diagram — the real current apply loop: an agent
// interprets a natural-language request into a proposed change spec; after
// approval a deterministic compiler applies it and runs schema/field/zone/fidelity
// validation, producing a versioned workbook or failing closed. The model never
// edits Tableau XML.
export function vizorArchitecture() {
  return `
  <svg class="arch-svg" viewBox="0 0 344 560" role="img" aria-label="Vizor architecture, top to bottom: a natural-language request is interpreted by an agent into a proposed change spec; you approve it; a deterministic compiler applies it and runs package, schema, field, zone and fidelity validation, producing a versioned .twb, or failing closed. The model never edits Tableau XML.">
    <g class="arch-boxes" fill="none" stroke="currentColor" stroke-width="1.4">
      <rect x="14" y="16" width="238" height="48" rx="2"/>
      <rect x="14" y="92" width="238" height="48" rx="2"/>
      <rect x="14" y="168" width="238" height="48" rx="2"/>
      <rect x="14" y="244" width="238" height="48" rx="2"/>
      <rect x="14" y="320" width="238" height="48" rx="2"/>
      <rect x="268" y="320" width="66" height="48" rx="2"/>
      <rect x="14" y="396" width="238" height="48" rx="2"/>
    </g>
    <g class="arch-lines" fill="none" stroke="${RUST}" stroke-width="1.5">
      <path d="M133,64 V92"/>
      <path d="M133,140 V168"/>
      <path d="M133,216 V244"/>
      <path d="M133,292 V320"/>
      <path d="M252,344 H268"/>
      <path d="M133,368 V396"/>
    </g>
    <g fill="currentColor" font-family="ui-monospace, Menlo, monospace" text-anchor="middle">
      <text x="133" y="40" font-size="15">USER REQUEST</text>
      <text x="133" y="56" font-size="11" opacity="0.55">natural language</text>
      <text x="133" y="116" font-size="15" font-weight="600">AGENT</text>
      <text x="133" y="132" font-size="11" opacity="0.55">interpret &amp; propose</text>
      <text x="133" y="192" font-size="15">PROPOSED SPEC</text>
      <text x="133" y="208" font-size="11" opacity="0.55">you approve</text>
      <text x="133" y="272" font-size="13.5" font-weight="600">DETERMINISTIC COMPILER</text>
      <text x="133" y="342" font-size="15" font-weight="600">VALIDATE</text>
      <text x="133" y="358" font-size="10" opacity="0.55">schema·field·zone·fidelity</text>
      <text x="301" y="342" font-size="13">FAILED</text>
      <text x="301" y="358" font-size="9.5" opacity="0.55">fails closed</text>
      <text x="133" y="420" font-size="14">VERSIONED .TWB</text>
      <text x="133" y="436" font-size="10" opacity="0.55">hash-verified · undoable</text>
    </g>
    <text x="14" y="484" fill="currentColor" font-family="ui-monospace, Menlo, monospace" font-size="11" opacity="0.6">The agent proposes a neutral spec; only deterministic</text>
    <text x="14" y="500" fill="currentColor" font-family="ui-monospace, Menlo, monospace" font-size="11" opacity="0.6">code touches the workbook. The model never edits XML.</text>
  </svg>`;
}
