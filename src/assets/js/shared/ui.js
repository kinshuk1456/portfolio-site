// shared/ui.js
// Tiny UI helpers shared across renderers.

export function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatDate(iso) {
  if (!iso) return '';
  // Keep it readable but minimal. (We can improve later with Intl options.)
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

export function renderTag(label) {
  return `<span class="tag">${escapeHtml(label)}</span>`;
}

export function renderTags(tags = []) {
  if (!tags?.length) return '';
  return `<div class="tags">${tags.map(renderTag).join('')}</div>`;
}

// A compact proof row for cards: value + short label, static (not animated —
// counters animate on case-study pages, not on every card).
export function renderMetricChips(metrics = []) {
  if (!metrics?.length) return '';
  const chips = metrics.slice(0, 3).map((m) => {
    const val = `${m.prefix ? escapeHtml(String(m.prefix)) : ''}${escapeHtml(String(m.value ?? ''))}${m.suffix ? escapeHtml(String(m.suffix)) : ''}`;
    const label = escapeHtml(m.short || m.label || '');
    return `<span class="card-metric"><b>${val}</b>${label ? ` ${label}` : ''}</span>`;
  }).join('');
  return `<div class="card-metrics" aria-label="Key outcomes">${chips}</div>`;
}

export function renderCard({ href, title, meta, summary, coverImage, tags, metrics }) {
  return `
    <a class="card" href="${href}">
      ${coverImage ? `<div class="card-media"><img src="/${coverImage}" alt="" loading="lazy" /></div>` : ''}
      <div class="card-body">
        <div class="card-topline">
          <span class="card-index" aria-hidden="true"></span>
          <span class="card-arrow" aria-hidden="true">→</span>
        </div>
        <div class="card-title">${escapeHtml(title)}</div>
        ${meta ? `<div class="card-meta">${escapeHtml(meta)}</div>` : ''}
        ${summary ? `<div class="card-summary">${escapeHtml(summary)}</div>` : ''}
        ${metrics && metrics.length ? renderMetricChips(metrics) : ''}
        ${tags ? renderTags(tags) : ''}
      </div>
    </a>
  `;
}

// Unique disciplines across projects, in a sensible editorial order
// (known ones first, then any extras alphabetically).
export function projectDisciplines(index = []) {
  const order = ['Product', 'Analytics', 'Forward Deployed', 'Strategy', 'Engineering'];
  const seen = new Set();
  for (const p of index) for (const d of (p.disciplines || [])) if (d) seen.add(d);
  const known = order.filter((d) => seen.has(d));
  const extra = [...seen].filter((d) => !order.includes(d)).sort();
  return [...known, ...extra];
}

// The three-level project hierarchy: featured builds, then selected systems /
// client work, then labs. Each tier renders as its own titled sub-section so
// the grid reads as an editorial index rather than one flat wall of cards.
const TIER_META = [
  { key: 'featured', label: 'Featured builds', note: 'The projects I’d point to first — owned end to end.' },
  { key: 'selected', label: 'Selected systems & client work', note: 'Substantial systems, analytics, and consulting engagements.' },
  { key: 'labs', label: 'Labs & the site itself', note: 'Smaller builds and experiments — including this portfolio.' }
];

function tierOf(p) {
  return p.tier || (p.featured ? 'featured' : 'selected');
}

// Grouped view (unfiltered): titled tiers, each its own card grid.
export function renderProjectGroups(items = []) {
  return TIER_META.map(({ key, label, note }) => {
    const group = items.filter((p) => tierOf(p) === key);
    if (!group.length) return '';
    return `
      <section class="project-collection" data-tier="${key}">
        <div class="collection-head">
          <h2 class="collection-title">${escapeHtml(label)}</h2>
          <p class="collection-note muted">${escapeHtml(note)}</p>
        </div>
        <div class="grid">${renderProjectCards(group)}</div>
      </section>`;
  }).join('');
}

// Flat view (a discipline filter is active): a single grid, no tier headings.
export function renderProjectGrid(items = []) {
  return `<div class="grid">${renderProjectCards(items)}</div>`;
}

// Render a set of project cards for the grid (shared by initial render and
// the client-side filter re-render so markup stays identical).
export function renderProjectCards(items = []) {
  return items.map((p) => renderCard({
    href: `/project.html?slug=${encodeURIComponent(p.slug)}`,
    title: p.title,
    meta: (p.disciplines || []).join(' · ') || formatDate(p.date),
    summary: p.summary,
    coverImage: p.coverImage,
    tags: p.tags,
    metrics: p.metrics
  })).join('');
}

export function pickFeatured({
  explicitSlugs = [],
  items = [],
  max = 3
}) {
  // Featured priority:
  // 1) explicit slugs (in given order)
  // 2) items where featured:true
  // 3) latest items

  const bySlug = new Map(items.map(it => [it.slug, it]));
  const selected = [];
  const used = new Set();

  for (const slug of explicitSlugs) {
    const it = bySlug.get(slug);
    if (it && !used.has(it.slug)) {
      selected.push(it);
      used.add(it.slug);
    }
    if (selected.length >= max) return selected;
  }

  for (const it of items) {
    if (it?.featured && !used.has(it.slug)) {
      selected.push(it);
      used.add(it.slug);
    }
    if (selected.length >= max) return selected;
  }

  for (const it of items) {
    if (!used.has(it.slug)) {
      selected.push(it);
      used.add(it.slug);
    }
    if (selected.length >= max) return selected;
  }

  return selected;
}
