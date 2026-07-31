// app.js
// Responsibilities:
// - Load site.json (global config)
// - Render shared header/footer
// - Dispatch to the correct page renderer
// - Provide a minimal error boundary

import { fetchJSON } from './content-api.js';
import { mountLayout } from './shared/layout.js';
import { initTheme, bindThemeToggle } from './shared/theme.js';

import { renderProjectCards } from './shared/ui.js';

import { renderHome } from './renderers/home.js';
import { renderProjects } from './renderers/projects.js';
import { renderProjectDetail } from './renderers/project-detail.js';
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
    grid.innerHTML = renderProjectCards(subset);
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
  setupSectionNav(document);
  setupProjectFilter(document);
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

  // "Ask about my work" assistant — code-split. Opened from the button on the
  // contact page only (no global sidebar entry / shortcut).
  if (site.chat?.enabled && document.querySelector('[data-action="open-chat"]')) {
    import('./chat.js')
      .then((m) => {
        const chat = m.initChat(site.chat);
        document.querySelectorAll('[data-action="open-chat"]').forEach((b) => b.addEventListener('click', chat.open));
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
