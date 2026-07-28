// shared/layout.js
// Responsibilities:
// - Render shared header and footer from site.json
// - Keep navigation and global contact/social centrally managed

// Inline SVG icon set (Lucide-style, 24×24, stroke=currentColor).
// SVGs read as crisp, professional marks at any size and inherit theme color.
function svg(paths) {
  return `<svg class="ic-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}

export const ICONS = {
  home: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>'),
  projects: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  experience: svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>'),
  education: svg('<path d="m22 10-10-5L2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"/>'),
  insights: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  life: svg('<path d="m3 20 5.5-9 4 5.5L15 12l6 8Z"/><circle cx="8" cy="6.5" r="2"/>'),
  contact: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'),
  menu: svg('<path d="M3 6h18M3 12h18M3 18h18"/>'),
  chat: svg('<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.9-5.4A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z"/>'),
  dot: svg('<circle cx="12" cy="12" r="3"/>')
};

function iconFor(label) {
  const key = String(label || '').toLowerCase();
  if (key.includes('home')) return ICONS.home;
  if (key.includes('project')) return ICONS.projects;
  if (key.includes('experience')) return ICONS.experience;
  if (key.includes('education')) return ICONS.education;
  if (key.includes('insight')) return ICONS.insights;
  if (key.includes('life')) return ICONS.life;
  if (key.includes('contact')) return ICONS.contact;
  return ICONS.dot;
}

export function renderSidebar(site, { currentPath = '' } = {}) {
  const profileNormal = site.person?.profileImage || '';
  const profileAlt = site.person?.profileImageAlt || '';
  const profileAltLabel = site.person?.profileImageAltLabel || 'Toggle avatar style';

  const identity = profileNormal ? `
    <div class="sidebar-identity">
      <button class="profile" type="button"
        data-action="profile-toggle"
        data-profile-normal="/${profileNormal}"
        data-profile-alt="/${profileAlt}"
        aria-label="${profileAltLabel}">
        <span class="profile-frame profile-avatar" aria-hidden="true"></span>
        <img class="profile-img profile-avatar" src="/${profileNormal}" alt="${site.person?.profileImageAltText || (site.person?.name || 'Profile')}" loading="eager" />
      </button>
      <div class="sidebar-identity-text">
        <div class="sidebar-name">${site.person?.name || ''}</div>
        ${site.person?.headline ? `<div class="sidebar-headline">${site.person.headline}</div>` : ''}
      </div>
    </div>
  ` : '';

  const nav = (site.nav || []).map(item => {
    const isActive = currentPath && item.href === currentPath;
    const icon = iconFor(item.label);
    return `
      <a class="side-link" href="${item.href}" data-active="${isActive ? 'true' : 'false'}">
        <span class="side-ic" aria-hidden="true">${icon}</span>
        <span class="side-label">${item.label}</span>
      </a>
    `;
  }).join('');

  return `
    <aside class="sidebar" aria-label="Sidebar">
      <div class="sidebar-inner">
        <div class="sidebar-top">
          ${identity}
        </div>

        <div class="sidebar-nav" data-role="sidebar-nav">
          <nav class="side-nav" aria-label="Primary">
            ${nav}
          </nav>
        </div>

        <div class="side-actions" data-role="sidebar-utilities">
          <button class="side-btn side-btn-theme" type="button" data-action="theme-toggle" aria-label="Toggle dark mode" aria-pressed="false">
            <span class="side-ic" aria-hidden="true">${ICONS.moon}</span>
            <span class="side-label">Theme</span>
          </button>
        </div>
      </div>
    </aside>
  `;
}

export function renderTopbar(site) {
  // Mobile-only top bar (no hover interactions needed)
  return `
    <header class="topbar" aria-label="Top navigation">
      <div class="topbar-inner">
        <button class="icon-btn" type="button" data-action="nav-toggle" aria-label="Open menu">
          <span class="icon" aria-hidden="true">${ICONS.menu}</span>
        </button>
        <div class="topbar-title">${site.person?.name || ''}</div>
        <button class="icon-btn" type="button" data-action="theme-toggle" aria-label="Toggle dark mode" aria-pressed="false">
          <span class="icon" aria-hidden="true">${ICONS.moon}</span>
        </button>
      </div>
    </header>
  `;
}

export function renderFooter(site) {
  const social = (site.social || []).map(s => `<a href="${s.url}" rel="noopener" target="_blank">${s.label}</a>`).join('');
  const email = site.contact?.email || site.person?.email;
  const location = site.contact?.location || site.person?.location;

  return `
    <footer class="site-footer" data-component="footer">
      <div class="container footer-inner">
        <div class="footer-block">
          <div class="footer-title">Contact</div>
          ${email ? `<a href="mailto:${email}">${email}</a>` : '<span class="muted">Add email in content/site.json</span>'}
          ${location ? `<div class="muted">${location}</div>` : ''}
        </div>
        <div class="footer-block">
          <div class="footer-title">Elsewhere</div>
          <div class="footer-links">
            ${social || '<span class="muted">Add links in content/site.json</span>'}
          </div>
        </div>
        <div class="footer-block footer-meta">
          <div class="muted">© ${new Date().getFullYear()} ${site.person?.name || ''}</div>
        </div>
      </div>
    </footer>
  `;
}

export function mountLayout({ site, pagePath, mainHtml }) {
  const sidebar = renderSidebar(site, { currentPath: pagePath });
  const topbar = renderTopbar(site);
  const footer = renderFooter(site);

  return `
    <div class="app-shell">
      ${sidebar}
      ${topbar}
      <div class="content-column">
        <main id="app" class="container">${mainHtml}</main>
        ${footer}
      </div>
      <div class="sidebar-backdrop" data-action="nav-toggle" aria-hidden="true"></div>
      ${site.chat?.enabled ? `
      <button class="chat-fab" type="button" data-action="open-chat" aria-label="Ask about Kinshuk’s work">
        ${ICONS.chat}
        <span class="chat-fab-label">Ask</span>
      </button>` : ''}
    </div>
  `;
}
