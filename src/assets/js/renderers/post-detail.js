// renderers/post-detail.js
// Responsibilities:
// - Read ?type and ?slug
// - Load post.json + markdown content
// - Optionally load index for prev/next (later)

import { fetchJSON, fetchText } from '../content-api.js';
import { getPostType, getSlug } from '../router.js';
import { markdownToHtml } from '../shared/markdown.js';
import { escapeHtml, formatDate, renderTags } from '../shared/ui.js';

export async function renderPostDetail() {
  const type = getPostType();
  const slug = getSlug();
  const base = `/data/posts/${type}/${slug}`;

  const [index, post] = await Promise.all([
    fetchJSON(type === 'insights' ? '/content/posts/insights.index.json' : '/content/posts/life.index.json'),
    fetchJSON(`${base}/post.json`)
  ]);

  const md = await fetchText(`${base}/${post.contentPath || 'content.md'}`);
  const contentHtml = markdownToHtml(md);

  const idx = index.findIndex(p => p.slug === slug);
  const prev = idx >= 0 ? index[idx + 1] : null;
  const next = idx > 0 ? index[idx - 1] : null;

  return {
    pageTitle: post.title || 'Post',
    html: `
      <article class="article">
        <div class="article-nav">
          <a class="link" href="/${type}.html">← Back to ${type === 'insights' ? 'Insights' : 'Life'}</a>
        </div>

        <header class="article-head">
          <h1 class="article-title">${escapeHtml(post.title || slug)}</h1>
          <div class="article-meta">
            <span>${escapeHtml(formatDate(post.date))}</span>
            <span class="dot">•</span>
            <span>${escapeHtml(post.category || '')}</span>
          </div>
          ${post.summary ? `<p class="article-summary">${escapeHtml(post.summary)}</p>` : ''}
          ${renderTags(post.tags || [])}
        </header>

        ${post.coverImage ? `
          <div class="article-cover">
            <img src="/${escapeHtml(`data/posts/${type}/${slug}/${post.coverImage}`)}" alt="" loading="eager" />
          </div>
        ` : ''}

        <div class="prose">${contentHtml}</div>

        <footer class="article-footer">
          <div class="pager">
            ${prev ? `<a class="pager-link" href="/post.html?type=${type}&slug=${encodeURIComponent(prev.slug)}">← ${escapeHtml(prev.title)}</a>` : '<span></span>'}
            ${next ? `<a class="pager-link" href="/post.html?type=${type}&slug=${encodeURIComponent(next.slug)}">${escapeHtml(next.title)} →</a>` : '<span></span>'}
          </div>
        </footer>
      </article>
    `
  };
}
