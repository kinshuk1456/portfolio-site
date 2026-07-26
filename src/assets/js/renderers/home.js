// renderers/home.js
// Responsibilities:
// - Load featured content manifests
// - Apply featured priority:
//   1) explicit slugs from site.json
//   2) fallback to featured:true
//   3) fallback to latest published

import { fetchJSON } from '../content-api.js';
import { pickFeatured, formatDate, escapeHtml } from '../shared/ui.js';

const enc = encodeURIComponent;
const pad = (n) => String(n).padStart(2, '0');

export async function renderHome({ site }) {
  const [projectsIndex, insightsIndex, lifeIndex] = await Promise.all([
    fetchJSON('/content/projects/index.json'),
    fetchJSON('/content/posts/insights.index.json'),
    fetchJSON('/content/posts/life.index.json')
  ]);

  const featuredProjects = pickFeatured({
    explicitSlugs: site.home?.featuredProjectSlugs || [],
    items: projectsIndex,
    max: 5
  });

  const featuredInsights = pickFeatured({
    explicitSlugs: site.home?.featuredInsightSlugs || [],
    items: insightsIndex,
    max: 4
  });

  const featuredLife = pickFeatured({
    explicitSlugs: site.home?.featuredLifeSlugs || [],
    items: lifeIndex,
    max: 3
  });

  const [feature, ...restProjects] = featuredProjects;

  const workFeature = feature ? `
    <a class="work-feature" href="/project.html?slug=${enc(feature.slug)}" data-reveal>
      <div class="work-feature-media">
        ${feature.coverImage ? `<img src="/${feature.coverImage}" alt="" loading="lazy" />` : ''}
      </div>
      <div class="work-feature-body">
        <span class="work-num">01</span>
        <h3 class="work-feature-title">${escapeHtml(feature.title)}</h3>
        ${feature.summary ? `<p class="work-feature-summary">${escapeHtml(feature.summary)}</p>` : ''}
        <div class="work-feature-foot">
          <span class="label work-disc">${(feature.disciplines || []).map(escapeHtml).join(' · ') || escapeHtml(formatDate(feature.date))}</span>
          <span class="work-cta label">Case study →</span>
        </div>
      </div>
    </a>` : '';

  const workRows = restProjects.map((p, idx) => `
    <a class="work-row" href="/project.html?slug=${enc(p.slug)}">
      <span class="work-index" aria-hidden="true">${pad(idx + 2)}</span>
      <span class="work-row-main">
        <span class="work-row-title">${escapeHtml(p.title)}</span>
        <span class="work-row-meta label work-disc">${(p.disciplines || []).map(escapeHtml).join(' · ') || escapeHtml(formatDate(p.date))}</span>
      </span>
      ${p.coverImage ? `<span class="work-row-thumb"><img src="/${p.coverImage}" alt="" loading="lazy" /></span>` : '<span></span>'}
      <span class="work-row-arrow" aria-hidden="true">→</span>
    </a>`).join('');

  const insightRows = featuredInsights.map((p, i) => `
    <a class="post-row" href="/post.html?type=insights&slug=${enc(p.slug)}">
      <span class="work-index" aria-hidden="true">${pad(i + 1)}</span>
      <span class="post-row-main">
        <span class="post-row-title">${escapeHtml(p.title)}</span>
        <span class="post-row-meta label">${escapeHtml(formatDate(p.date))} · ${escapeHtml(p.category || 'Insights')}</span>
      </span>
      <span class="work-row-arrow" aria-hidden="true">→</span>
    </a>`).join('');

  const lifeChips = featuredLife.map(p => `
    <a class="life-chip" href="/post.html?type=life&slug=${enc(p.slug)}">
      ${p.coverImage ? `<span class="life-chip-thumb"><img src="/${p.coverImage}" alt="" loading="lazy" /></span>` : ''}
      <span class="life-chip-body">
        <span class="life-chip-title">${escapeHtml(p.title)}</span>
        <span class="label">${escapeHtml(p.category || 'Life')}</span>
      </span>
    </a>`).join('');

  const hero = site.home?.hero || {};
  const person = site.person || {};
  const firstName = (person.name || 'there').trim().split(/\s+/)[0];
  const profileNormal = person.profileImage ? `/${person.profileImage}` : '';
  const profileAlt = person.profileImageAlt ? `/${person.profileImageAlt}` : '';
  const toolkit = hero.toolkit || ['SQL', 'Power BI', 'Snowflake', 'Python', 'Tableau', 'Excel'];
  const disciplines = hero.disciplines || ['Product', 'Analytics', 'Forward Deployed'];
  const statusRoles = hero.statusRoles || disciplines;

  return {
    pageTitle: 'Home',
    html: `
      <section class="hero hero-stage" data-hero>
        <canvas class="hero-signal" aria-hidden="true"></canvas>
        <div class="hero-stage-inner">
          <div class="hero-words" aria-hidden="true">
            <span class="hero-word hero-word-1">${escapeHtml(disciplines[0] || 'Product')}</span>
            <span class="hero-word hero-word-2">${escapeHtml(disciplines[1] || 'Analytics')}</span>
            <span class="hero-word hero-word-3">${escapeHtml(disciplines[2] || 'Forward Deployed')}</span>
          </div>

          <div class="hero-portrait-layer">
            <picture>
              <source srcset="/data/assets/headshot-cutout.webp" type="image/webp" />
              <img class="hero-portrait-img" src="/data/assets/headshot-cutout.png" alt="${escapeHtml(person.name || 'Kinshuk Agarwal')}" fetchpriority="high" />
            </picture>
          </div>

          <div class="hero-lede">
            <p class="hero-eyebrow label">${escapeHtml(hero.eyebrow || '')}</p>
            <h1 class="hero-headline">
              ${(hero.headline || ['I turn noise', 'into decisions.']).map(l => `<span class="reveal-line"><span>${escapeHtml(l)}</span></span>`).join('')}
            </h1>
            ${hero.sub ? `<p class="hero-sub">${escapeHtml(hero.sub)}</p>` : ''}
            <div class="hero-cta">
              ${hero.ctaPrimary ? `<a class="btn btn-primary" href="${hero.ctaPrimary.href}">${escapeHtml(hero.ctaPrimary.label)}</a>` : ''}
              ${hero.ctaSecondary ? `<a class="btn btn-ghost" href="${hero.ctaSecondary.href}">${escapeHtml(hero.ctaSecondary.label)}</a>` : ''}
            </div>
            <div class="hero-avail label" aria-label="Open to ${escapeHtml(statusRoles.join(', '))} roles">
              <span aria-hidden="true">Open to&nbsp;</span>
              <span class="role-rotate" aria-hidden="true" style="--n:${statusRoles.length}">
                ${statusRoles.map(r => `<span>${escapeHtml(r)}</span>`).join('')}
              </span>
              <span aria-hidden="true">&nbsp;roles</span>
            </div>
          </div>

          ${hero.metaLeft ? `<div class="hero-meta hero-meta-tr label">${escapeHtml(hero.metaLeft)}</div>` : ''}
          ${hero.metaRight ? `<div class="hero-meta hero-meta-br label">${escapeHtml(hero.metaRight)}</div>` : ''}
        </div>
      </section>

      <div class="trust-row" data-reveal>
        <span class="label">Toolkit</span>
        <div class="trust-items">${toolkit.map(t => `<span>${t}</span>`).join('<i aria-hidden="true">/</i>')}</div>
      </div>

      <section class="section intersect" data-reveal>
        <div class="intersect-head">
          <div class="section-index label">§ 00 — Positioning</div>
          <h2>Where product, data, and implementation meet.</h2>
        </div>
        <div class="intersect-grid">
          <div class="intersect-col">
            <span class="intersect-k label">Product</span>
            <span class="intersect-q">What should we build?</span>
            <span class="intersect-d">Understanding users and problems, defining requirements, and making the call on what ships.</span>
          </div>
          <div class="intersect-col">
            <span class="intersect-k label">Analytics</span>
            <span class="intersect-q">What does the evidence say?</span>
            <span class="intersect-d">SQL, dashboards, and operational analytics that turn data into decisions.</span>
          </div>
          <div class="intersect-col intersect-col--fd">
            <span class="intersect-k label">Forward Deployed Engineering</span>
            <span class="intersect-q">How do we make it work?</span>
            <span class="intersect-d">Translating ambiguous business problems into working technical solutions, deployed into real workflows.</span>
          </div>
        </div>
      </section>

      <section class="section section-split">
        <div class="section-rail">
          <div class="section-index label">§ 01 — Work</div>
          <h2>Selected work</h2>
          <p class="section-note">A few things I've built and shipped — problem, decision, outcome.</p>
          <a class="link" href="/projects.html">All projects →</a>
        </div>
        <div class="section-main">
          ${workFeature}
          <div class="work-list">${workRows}</div>
        </div>
      </section>

      <section class="section section-split section-split--right">
        <div class="section-rail">
          <div class="section-index label">§ 02 — Writing</div>
          <h2>How I think</h2>
          <p class="section-note">Short notes on product, analytics, and turning ambiguity into decisions.</p>
          <a class="link" href="/insights.html">All notes →</a>
        </div>
        <div class="section-main">
          <div class="post-list">${insightRows}</div>
        </div>
      </section>

      <section class="section section-life">
        <div class="section-head">
          <h2>Away from the desk</h2>
          <a class="link" href="/life.html">More</a>
        </div>
        <div class="life-strip">${lifeChips}</div>
      </section>
    `
  };
}
