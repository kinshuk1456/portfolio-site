// app.js
// Responsibilities:
// - Load site.json (global config)
// - Render shared header/footer
// - Dispatch to the correct page renderer
// - Provide a minimal error boundary

import { fetchJSON } from './content-api.js';
import { mountLayout } from './shared/layout.js';
import { initTheme, bindThemeToggle } from './shared/theme.js';

import { renderProjectGroups, renderProjectGrid } from './shared/ui.js';

import { renderHome } from './renderers/home.js';
import { renderProjects } from './renderers/projects.js';
import { renderProjectDetail } from './renderers/project-detail.js?v=habitpact-flutter-1';
import { renderExperience } from './renderers/experience.js';
import { renderEducation } from './renderers/education.js';
import { renderFeed } from './renderers/feed.js';
import { renderPostDetail } from './renderers/post-detail.js';
import { renderContact } from './renderers/contact.js';

const PAGE_RENDERERS = {
  home: renderHome,
  projects: renderProjects,
  project: renderProjectDetail,
  experience: renderExperience,
  education: renderEducation,
  insights: renderFeed,
  life: renderFeed,
  post: renderPostDetail,
  contact: renderContact
};

function getPageId() {
  return document.body?.dataset?.page || '';
}

function getPagePath() {
  // Used to highlight active nav. Keep it simple: use pathname.
  return window.location.pathname || '';
}

function setPageTitle(site, pageTitle) {
  const base = site?.seo?.siteTitle || site?.person?.name || '';
  document.title = pageTitle ? `${pageTitle} · ${base}` : base;
}

function renderError(err) {
  const msg = err?.message || String(err);
  return {
    pageTitle: 'Error',
    html: `
      <section>
        <h1>Something went wrong</h1>
        <p style="color:var(--muted)">${escapeHtml(msg)}</p>
        <p><a href="/index.html">Go home</a></p>
      </section>
    `
  };
}

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Progressive scroll-reveal. Runs synchronously after innerHTML is set
// (before the browser paints), so the initial hidden state is applied
// without a flash of already-visible content.
function setupReveal(root) {
  const prefersReduced = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || !('IntersectionObserver' in window)) return;

  const targets = root.querySelectorAll(
    '.hero, .section, .card, .timeline-item, .panel, .pager, .article-head, .article-cover, .prose > *, .gallery > *, [data-reveal]'
  );

  targets.forEach((el) => {
    el.setAttribute('data-reveal', '');
    // Stagger siblings that share a grid/gallery/timeline parent.
    const parent = el.parentElement;
    if (parent && /grid|gallery|timeline/.test(parent.className)) {
      const i = Array.prototype.indexOf.call(parent.children, el);
      el.style.setProperty('--reveal-i', String(Math.min(i, 6)));
    }
  });

  const io = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    }
  }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

  targets.forEach((el) => io.observe(el));
}

// Reading-progress hairline for long-form pages (case studies / posts). A thin
// accent bar that tracks scroll depth. Position is an indicator, not motion, so
// it stays on under reduced-motion. Enhancement-only.
function setupScrollProgress(pageId) {
  const longForm = ['project', 'post', 'insights', 'life'];
  if (!longForm.includes(pageId)) return;

  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);

  let ticking = false;
  const update = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0;
    bar.style.width = pct.toFixed(2) + '%';
    ticking = false;
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

// Count-up for case-study metric tiles. Animates [data-count-to] numbers from 0
// when they scroll into view. Honors reduced motion (renders the final value at
// once) and formats prefix/suffix units. Enhancement-only.
function setupCounters(root) {
  const nums = Array.from(root.querySelectorAll('[data-count-to]'));
  if (!nums.length) return;

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const format = (el, val) => {
    const body = el.dataset.plain === 'true' ? '' : Math.round(val).toLocaleString();
    const suffix = el.dataset.suffix ? `<span class="stat-unit">${escapeHtml(el.dataset.suffix)}</span>` : '';
    return (el.dataset.prefix ? escapeHtml(el.dataset.prefix) : '') + body + suffix;
  };

  const play = (el) => {
    const to = parseFloat(el.dataset.countTo) || 0;
    if (reduced || !('requestAnimationFrame' in window)) { el.innerHTML = format(el, to); return; }
    const dur = 1100;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.innerHTML = format(el, to * eased);
      if (t < 1) requestAnimationFrame(tick);
      else el.innerHTML = format(el, to);
    };
    requestAnimationFrame(tick);
  };

  if (reduced || !('IntersectionObserver' in window)) { nums.forEach(play); return; }

  const io = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (entry.isIntersecting) { play(entry.target); obs.unobserve(entry.target); }
    }
  }, { threshold: 0.6 });
  nums.forEach((el) => io.observe(el));
}

// Print readiness: scroll-reveal, count-up and flow-draw all depend on the
// IntersectionObserver firing as the user scrolls. When printing/exporting to
// PDF, off-screen blocks never became visible — so they printed blank, and
// metric tiles printed their initial "0". This forces every progressive state
// to its final value the moment a print is requested (deterministic — no timers),
// so the export never depends on what happened to be scrolled into view.
// CSS (@media print) is the belt; this is the suspenders that also settles the
// JS-driven number counters that CSS cannot reach.
function forcePrintReady(root = document) {
  // 1) Reveal everything.
  root.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
  // 2) Complete every draw-on-scroll diagram.
  root.querySelectorAll('[data-flow-draw]').forEach((el) => el.classList.add('is-drawn'));
  // 3) Settle every count-up to its final formatted value.
  root.querySelectorAll('[data-count-to]').forEach((el) => {
    const to = parseFloat(el.dataset.countTo) || 0;
    const body = el.dataset.plain === 'true' ? '' : Math.round(to).toLocaleString();
    const suffix = el.dataset.suffix ? `<span class="stat-unit">${escapeHtml(el.dataset.suffix)}</span>` : '';
    el.innerHTML = (el.dataset.prefix ? escapeHtml(el.dataset.prefix) : '') + body + suffix;
  });
}

function setupPrintReady() {
  if (typeof window === 'undefined') return;
  const run = () => forcePrintReady(document);
  // Fires for Ctrl/Cmd+P and "Save as PDF" in every modern browser.
  window.addEventListener('beforeprint', run);
  // Safari/WebKit path: react to the print media query going active.
  if (window.matchMedia) {
    const mq = window.matchMedia('print');
    const onChange = (e) => { if (e.matches) run(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
}

// Draw-on-scroll: adds .is-drawn when a [data-flow-draw] diagram enters view, so
// its connector line animates once. Enhancement-only; reduced motion shows it full.
function setupFlowDraw(root) {
  const els = Array.from(root.querySelectorAll('[data-flow-draw]'));
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-drawn')); return; }
  const io = new IntersectionObserver((entries, obs) => {
    for (const e of entries) { if (e.isIntersecting) { e.target.classList.add('is-drawn'); obs.unobserve(e.target); } }
  }, { threshold: 0.4 });
  els.forEach((e) => io.observe(e));
}

// Step Player (Vizor case study): an accessible tablist over the build story.
// All steps are in the DOM (crawlable); with no JS every panel stays visible.
// JS turns it into a tab progression with a keyboard-navigable rail. Enhancement-only.
function setupStepPlayer(root) {
  const wrap = root.querySelector('[data-step-player]');
  if (!wrap) return;
  const tabs = Array.from(wrap.querySelectorAll('[data-step]'));
  const panels = Array.from(wrap.querySelectorAll('[data-panel]'));
  const rail = wrap.querySelector('.stepper-rail');
  if (tabs.length < 2 || panels.length !== tabs.length) return;

  const select = (i, { focus = false } = {}) => {
    tabs.forEach((t, idx) => {
      const on = idx === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p, idx) => { p.hidden = idx !== i; });
    if (rail) rail.style.setProperty('--step-progress', ((i / (tabs.length - 1)) * 100).toFixed(2) + '%');
    if (focus) tabs[i].focus();
  };

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      let n = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = Math.min(tabs.length - 1, i + 1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = Math.max(0, i - 1);
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); select(n, { focus: true }); }
    });
  });

  select(0);
}

// "Building in public" — pulls real GitHub data from the Cloudflare proxy
// (/api/github) and renders top repos + recent activity. Fully graceful: any
// failure falls back to a plain link. Enhancement-only.
async function setupGithubActivity(root) {
  const el = root.querySelector('[data-github]');
  if (!el) return;
  const profile = 'https://github.com/kinshuk1456';
  try {
    const res = await fetch('/api/github', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    if (!data || (!Array.isArray(data.repos) && !Array.isArray(data.events))) throw new Error('empty');
    el.innerHTML = renderGithub(data, profile);
  } catch {
    el.innerHTML = `<p class="muted">See what I'm building on <a class="link" href="${profile}" target="_blank" rel="noopener">github.com/kinshuk1456 →</a></p>`;
  }
}

function relativeTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  const units = [['yr', 31536000], ['mo', 2592000], ['wk', 604800], ['d', 86400], ['h', 3600], ['m', 60]];
  for (const [label, secs] of units) {
    const v = Math.floor(s / secs);
    if (v >= 1) return `${v}${label} ago`;
  }
  return 'just now';
}

function renderGithub(data, profile) {
  const repos = (data.repos || []).slice(0, 4);
  const events = (data.events || []).slice(0, 6);

  const repoCards = repos.map((r) => `
    <a class="gh-repo" href="${escapeHtml(r.url || profile)}" target="_blank" rel="noopener">
      <div class="gh-repo-name">${escapeHtml(r.name || '')}</div>
      ${r.description ? `<div class="gh-repo-desc">${escapeHtml(r.description)}</div>` : ''}
      <div class="gh-repo-meta label">
        ${r.language ? `<span>${escapeHtml(r.language)}</span>` : ''}
        ${typeof r.stars === 'number' && r.stars > 0 ? `<span>★ ${r.stars}</span>` : ''}
        ${r.updated ? `<span>${escapeHtml(relativeTime(r.updated))}</span>` : ''}
      </div>
    </a>`).join('');

  const timeline = events.map((e) => `
    <li class="gh-tl-item">
      <div><span class="gh-tl-verb">${escapeHtml(e.verb || e.type || 'activity')}</span> <span class="gh-tl-repo">${escapeHtml(e.repo || '')}</span></div>
      ${e.when ? `<span class="gh-tl-when">${escapeHtml(relativeTime(e.when))}</span>` : ''}
    </li>`).join('');

  return `
    <div class="gh-grid">
      ${timeline ? `<div class="gh-col"><p class="gh-col-head">Latest activity</p><ul class="gh-timeline">${timeline}</ul></div>` : ''}
      ${repoCards ? `<div class="gh-col"><p class="gh-col-head">Top public builds</p><div class="gh-repos">${repoCards}</div></div>` : ''}
    </div>
    <a class="link gh-all" href="${escapeHtml(profile)}" target="_blank" rel="noopener">All activity on GitHub →</a>
  `;
}

// Projects page: discipline filter. Re-renders the grid (so CSS counters and
// edge borders recompute) and supports ?discipline= deep-linking. Enhancement-only.
function setupProjectFilter(root) {
  const wrap = root.querySelector('[data-project-filter]');
  if (!wrap) return;
  const grid = wrap.querySelector('[data-project-grid]');
  const countEl = wrap.querySelector('[data-filter-count]');
  const chips = Array.from(wrap.querySelectorAll('.filter-chip'));
  const dataEl = wrap.querySelector('script[data-projects]');
  if (!grid || !dataEl) return;

  let items = [];
  try { items = JSON.parse(dataEl.textContent || '[]'); } catch { return; }

  const apply = (filter, { push = true } = {}) => {
    const subset = filter
      ? items.filter((p) => (p.disciplines || []).includes(filter))
      : items;
    // Unfiltered: show the titled tier groups. Filtered: a single flat grid,
    // since a discipline cuts across tiers and the headings would fragment it.
    grid.innerHTML = filter ? renderProjectGrid(subset) : renderProjectGroups(subset);
    if (countEl) countEl.textContent = `${subset.length} project${subset.length === 1 ? '' : 's'}`;
    chips.forEach((c) => c.setAttribute('data-active', String((c.dataset.filter || '') === filter)));
    if (push) {
      const url = new URL(window.location.href);
      if (filter) url.searchParams.set('discipline', filter);
      else url.searchParams.delete('discipline');
      history.replaceState(null, '', url);
    }
  };

  chips.forEach((c) => c.addEventListener('click', () => apply(c.dataset.filter || '')));

  // Honor an incoming ?discipline= (deep link / shared filtered view).
  const initial = new URL(window.location.href).searchParams.get('discipline') || '';
  const valid = chips.some((c) => (c.dataset.filter || '') === initial);
  if (initial && valid) apply(initial, { push: false });
}

// Sticky in-page section nav (project case studies): scroll-spy highlight +
// smooth anchor scroll via Lenis when available. Enhancement-only.
function setupSectionNav(root) {
  const nav = root.querySelector('[data-section-nav]');
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll('a[data-nav-target]'));
  const sections = links
    .map((a) => root.querySelector(`#${CSS.escape(a.dataset.navTarget)}`))
    .filter(Boolean);
  if (!sections.length) return;

  // Smooth-scroll on click (respects the sticky nav offset).
  links.forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = root.querySelector(`#${CSS.escape(a.dataset.navTarget)}`);
      if (!target) return;
      e.preventDefault();
      if (window.__lenis) window.__lenis.scrollTo(target, { offset: -60 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  if (!('IntersectionObserver' in window)) return;
  const setActive = (id) => links.forEach((a) =>
    a.setAttribute('data-active', String(a.dataset.navTarget === id)));

  const io = new IntersectionObserver((entries) => {
    const visible = entries.filter((en) => en.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (visible) setActive(visible.target.id);
  }, { rootMargin: '-25% 0px -60% 0px', threshold: 0 });
  sections.forEach((s) => io.observe(s));
}

// Smooth (inertia) scrolling via Lenis — progressive enhancement, code-split,
// disabled under reduced motion. Exposes window.__lenis for the chat scroll-lock.
function setupSmoothScroll() {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  import('./vendor/lenis.mjs')
    .then(({ default: Lenis }) => {
      const lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1 });
      window.__lenis = lenis;
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    })
    .catch(() => { /* smooth scroll is enhancement-only */ });
}

async function run() {
  // Theme first (minimize flash)
  document.documentElement.classList.add('js');
  initTheme();

  const site = await fetchJSON('/data/site.json');
  const pageId = getPageId();
  const renderer = PAGE_RENDERERS[pageId];

  if (!renderer) throw new Error(`Unknown page renderer for data-page="${pageId}"`);

  // Each renderer returns { html, pageTitle? }
  const result = await renderer({ site, pageId });
  const pageTitle = result?.pageTitle || '';
  const mainHtml = result?.html || '';

  setPageTitle(site, pageTitle);

  // Render full page (header + main + footer) into body
  document.body.innerHTML = mountLayout({
    site,
    pagePath: getPagePath(),
    mainHtml
  });

  // Progressive motion: quiet reveal of blocks on scroll (before first paint).
  setupReveal(document);
  setupScrollProgress(pageId);
  setupCounters(document);
  setupSectionNav(document);
  setupProjectFilter(document);
  setupPrintReady();
  setupSmoothScroll();

  // Hero "Signal" interaction — code-split, only fetched on pages that have it.
  const heroCanvas = document.querySelector('.hero-signal');
  if (heroCanvas) {
    import('./visual/hero-signal.js')
      .then((m) => m.initHeroSignal(heroCanvas))
      .catch(() => { /* canvas is enhancement-only; ignore load failures */ });
  }

  // Hero dimensional depth — pointer parallax + scroll, code-split.
  const heroStage = document.querySelector('.hero-stage');
  if (heroStage) {
    import('./visual/hero-depth.js')
      .then((m) => m.initHeroDepth(heroStage))
      .catch(() => { /* depth is enhancement-only */ });
  }

  // Ask-my-portfolio ambient orb — code-split, only on pages that render it.
  const askOrb = document.querySelector('.ask-orb-canvas');
  if (askOrb) {
    import('./visual/ask-orb.js')
      .then((m) => m.initAskOrb(askOrb))
      .catch(() => { /* orb is enhancement-only */ });
  }

  // Vizor-style Step Player (case studies with a steps array).
  setupStepPlayer(document);

  // Draw-on-scroll connector for horizontal systems diagrams (How I build).
  setupFlowDraw(document);

  // "Building in public" — GitHub activity, fetched from the Cloudflare proxy.
  setupGithubActivity(document);

  // "Ask about my work" assistant — code-split. Opened from the button on the
  // contact page only (no global sidebar entry / shortcut).
  if (site.chat?.enabled && document.querySelector('[data-action="open-chat"], [data-ask]')) {
    import('./chat.js')
      .then((m) => {
        const chat = m.initChat(site.chat);
        document.querySelectorAll('[data-action="open-chat"]').forEach((b) => b.addEventListener('click', chat.open));
        // Orb "Ask my portfolio" prompts open the assistant and send the question.
        document.querySelectorAll('[data-ask]').forEach((b) =>
          b.addEventListener('click', () => chat.ask(b.getAttribute('data-ask') || b.textContent)));
      })
      .catch(() => { /* assistant is enhancement-only */ });
  }

  // Bind interactive navigation/theme actions
  bindThemeToggle(document);

  const navToggles = Array.from(document.querySelectorAll('[data-action="nav-toggle"]'));
  for (const el of navToggles) {
    el.addEventListener('click', () => {
      document.documentElement.toggleAttribute('data-nav-open');
    });
  }

  // Close mobile nav after selecting an item
  document.addEventListener('click', (e) => {
    const a = e.target?.closest?.('a.side-link');
    if (!a) return;
    if (window.matchMedia && window.matchMedia('(max-width: 860px)').matches) {
      document.documentElement.removeAttribute('data-nav-open');
    }
  });

  // Profile image toggle — syncs every portrait on the page (sidebar avatar
  // + hero figure) so real ⇄ stylized flips together and persists.
  const profileBtns = Array.from(document.querySelectorAll('[data-action="profile-toggle"]'));
  if (profileBtns.length) {
    const key = 'profile-image-variant';

    const applyAll = (variant) => {
      localStorage.setItem(key, variant);
      for (const btn of profileBtns) {
        btn.dataset.variant = variant;
        const img = btn.querySelector('img');
        const normal = btn.getAttribute('data-profile-normal');
        const alt = btn.getAttribute('data-profile-alt');
        const src = variant === 'alt' && alt ? alt : normal;
        if (img && src) img.src = src;
      }
    };

    applyAll(localStorage.getItem(key) === 'alt' ? 'alt' : 'normal');

    for (const btn of profileBtns) {
      btn.addEventListener('click', () => {
        const cur = localStorage.getItem(key) === 'alt' ? 'alt' : 'normal';
        applyAll(cur === 'alt' ? 'normal' : 'alt');
      });
    }
  }
}

run().catch((err) => {
  // Try to show a usable error page even if page-specific loading fails.
  fetchJSON('/data/site.json')
    .then((site) => {
      const fallback = renderError(err);
      setPageTitle(site, fallback.pageTitle);
      document.body.innerHTML = mountLayout({ site, pagePath: getPagePath(), mainHtml: fallback.html });
    })
    .catch(() => {
      // worst-case fallback
      document.body.innerHTML = `<pre>${err?.stack || err?.message || String(err)}</pre>`;
    });
});
