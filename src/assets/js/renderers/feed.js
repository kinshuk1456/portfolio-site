// renderers/feed.js
// Responsibilities:
// - Render shared feed UI for insights + life
// - Page is determined by body[data-page] ("insights" or "life")

import { fetchJSON } from '../content-api.js';
import { renderCard, formatDate } from '../shared/ui.js';

export async function renderFeed({ pageId }) {
  const isInsights = pageId === 'insights';
  const type = isInsights ? 'insights' : 'life';
  const indexPath = isInsights
    ? '/content/posts/insights.index.json'
    : '/content/posts/life.index.json';

  const items = await fetchJSON(indexPath);

  return {
    pageTitle: isInsights ? 'Insights' : 'Life Outside Work',
    html: `
      <section class="page-head">
        <h1>${isInsights ? 'Insights' : 'Life Outside Work'}</h1>
        <p class="muted">${isInsights
          ? 'Case studies, product analysis, strategy notes, and lessons learned.'
          : 'Travel, training, daily life—things that keep me human.'}
        </p>
      </section>

      <section class="section">
        <div class="grid">
          ${items.map(p => renderCard({
            href: `/post.html?type=${type}&slug=${encodeURIComponent(p.slug)}`,
            title: p.title,
            meta: `${formatDate(p.date)} · ${p.category || (isInsights ? 'Insights' : 'Life')}`,
            summary: p.summary,
            coverImage: p.coverImage,
            tags: p.tags
          })).join('')}
        </div>
      </section>
    `
  };
}
