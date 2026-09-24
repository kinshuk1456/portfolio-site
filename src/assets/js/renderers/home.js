// renderers/home.js
// Responsibilities:
// - Load featured content manifests
// - Apply featured priority:
//   1) explicit slugs from site.json
//   2) fallback to featured:true
//   3) fallback to latest published

import { fetchJSON } from '../content-api.js';
import { pickFeatured, formatDate, escapeHtml, renderMetricChips } from '../shared/ui.js';
import { miniFlow, buildFlow, impactStrip, featureFor } from '../shared/graphics.js';

// A minimal, non-converging vertical node motif. It lives in the narrow channel
// between the headline and the "Product / Analytics" type, above the portrait —
// so it never crosses the text, the words, or the face. Placement is in CSS.
function heroSchematicSvg() {
  return `
  <svg viewBox="0 0 160 520" fill="none" stroke="currentColor" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <g stroke="currentColor" stroke-width="1" opacity="0.55">
      <path d="M95,50 L55,180 L110,305 L70,435"/>
    </g>
    <circle cx="110" cy="305" r="5" fill="#c1440e" stroke="none"/>
    <g stroke="currentColor" stroke-width="1.1" fill="var(--bg)">
      <circle cx="95" cy="50" r="3.5"/><circle cx="55" cy="180" r="3.5"/><circle cx="70" cy="435" r="3.5"/>
    </g>
  </svg>`;
}

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

  const featureGraphic = featureFor(feature?.slug || '');
  const workFeature = feature ? `
    <a class="work-feature" href="/project.html?slug=${enc(feature.slug)}" data-reveal>
      <div class="work-feature-media">
        ${featureGraphic
          ? `<div class="feat-graphic">${featureGraphic}</div>`
          : (feature.coverImage ? `<img src="/${feature.coverImage}" alt="" loading="lazy" />` : '')}
      </div>
      <div class="work-feature-body">
        <span class="work-num">01</span>
        <h3 class="work-feature-title">${escapeHtml(feature.title)}</h3>
        ${feature.summary ? `<p class="work-feature-summary">${escapeHtml(feature.summary)}</p>` : ''}
        ${feature.metrics && feature.metrics.length ? renderMetricChips(feature.metrics) : ''}
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
  const toolkit = hero.toolkit || ['SQL', 'Power BI', 'Snowflake', 'Python', 'Tableau', 'Excel', 'LLM', 'RAG', 'MCP'];
  const disciplines = hero.disciplines || ['Product', 'Analytics', 'Forward Deployed'];
  const statusRoles = hero.statusRoles || disciplines;

  return {
    pageTitle: 'Home',
    html: `
      <section class="hero hero-stage" data-hero>
        <canvas class="hero-signal" aria-hidden="true"></canvas>
        <div class="hero-schematic" data-hero-schematic aria-hidden="true">${heroSchematicSvg()}</div>
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
                ${statusRoles.map((r, i) => `<span style="--i:${i}">${escapeHtml(r)}</span>`).join('')}
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

      <section class="section bg-grid" data-reveal>
        <div class="section-head">
          <div class="section-index label">§ 02 — What I build</div>
          <h2>The same pattern, across every domain.</h2>
        </div>
        <p class="section-note">Different domains, one shape: interpret a messy input, turn it into something structured, and make the correctness provable.</p>
        <div class="sysgrid">
          <div class="syscat"><div class="syscat-k">AI Systems</div>${miniFlow(['prompt', 'model', 'structured output', 'validation'])}</div>
          <div class="syscat"><div class="syscat-k">Data Products</div>${miniFlow(['sources', 'SQL / model', 'metric', 'decision'])}</div>
          <div class="syscat"><div class="syscat-k">Internal Tools</div>${miniFlow(['manual work', 'automation', 'workflow', 'time saved'])}</div>
          <div class="syscat"><div class="syscat-k">Customer Workflows</div>${miniFlow(['problem', 'requirements', 'build', 'adoption'])}</div>
        </div>
      </section>

      <section class="section section-build bg-dots" data-reveal>
        <div class="section-head">
          <div class="section-index label">§ 03 — How I build</div>
          <h2>Understand. Build. Validate. Ship.</h2>
        </div>
        ${buildFlow([
          { key: 'Understand', notes: ['customer', 'workflow', 'constraints'] },
          { key: 'Build', notes: ['prototype', 'data', 'interfaces'] },
          { key: 'Validate', notes: ['tests', 'users', 'failure modes'] },
          { key: 'Ship', notes: ['deployment', 'adoption', 'iteration'] }
        ])}
      </section>

      <section class="section" data-reveal>
        <div class="section-head">
          <div class="section-index label">§ 04 — Impact</div>
          <h2>Outcomes I can stand behind.</h2>
        </div>
        ${impactStrip([
          { value: 167, label: 'automated tests' },
          { value: 120, suffix: '+', label: 'live event check-ins' },
          { value: 15, label: 'analytics products' },
          { value: 10, prefix: '~', suffix: '+ hrs/wk', label: 'recurring reporting eliminated' },
          { value: 25, prefix: '~', suffix: '%', label: 'throughput improvement' }
        ])}
      </section>

      <section class="section section-split" data-reveal>
        <div class="section-rail">
          <div class="section-index label">§ 05 — Building in public</div>
          <h2>What I'm shipping now</h2>
          <p class="section-note">The things I'm experimenting with, shipping, and improving.</p>
          <a class="link" href="https://github.com/kinshuk1456" target="_blank" rel="noopener">GitHub →</a>
        </div>
        <div class="section-main">
          <div class="gh" data-github><p class="muted">Loading recent GitHub activity…</p></div>
        </div>
      </section>

      <section class="section section-split section-split--right">
        <div class="section-rail">
          <div class="section-index label">§ 06 — Writing</div>
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

      <section class="section ask-section section--ink" data-reveal>
        <div class="ask-inner">
          <div class="ask-orb-wrap" aria-hidden="true">
            <canvas class="ask-orb-canvas" width="220" height="220"></canvas>
          </div>
          <div class="ask-copy">
            <div class="section-index label">§ 07 — Ask</div>
            <h2>Ask my portfolio</h2>
            <p class="section-note">Ask about my projects, experience, or how I built something — answered by an assistant grounded in the real work.</p>
            <div class="ai-console">
              <button class="ai-console-bar" type="button" data-action="open-chat" aria-label="Open the portfolio assistant">
                <span class="ai-caret" aria-hidden="true">&gt;</span>
                <span>Ask about my work…</span>
              </button>
              <div class="ask-prompts">
                <button class="ask-chip" type="button" data-ask="Why did you change Vizor's architecture?">Why did you change Vizor's architecture?</button>
                <button class="ask-chip" type="button" data-ask="What did you build at PIM Brands?">What did you build at PIM Brands?</button>
                <button class="ask-chip" type="button" data-ask="Which projects best show customer-facing engineering?">Which projects best show customer-facing engineering?</button>
                <button class="ask-chip" type="button" data-ask="How does your technical background complement your MBA?">How does your technical background complement your MBA?</button>
              </div>
              <div class="ai-status">
                <span>Ask about my projects, experience, or how I built something.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    `
  };
}
