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

export function renderCard({ href, title, meta, summary, coverImage, tags }) {
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

// Render a set of project cards for the grid (shared by initial render and
// the client-side filter re-render so markup stays identical).
export function renderProjectCards(items = []) {
  return items.map((p) => renderCard({
    href: `/project.html?slug=${encodeURIComponent(p.slug)}`,
    title: p.title,
    meta: (p.disciplines || []).join(' · ') || formatDate(p.date),
    summary: p.summary,
    coverImage: p.coverImage,
    tags: p.tags
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
