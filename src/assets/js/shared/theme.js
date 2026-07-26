// shared/theme.js
// Theme management (light/dark) with local persistence.

import { ICONS } from './layout.js';

const STORAGE_KEY = 'site-theme';

export function getPreferredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;

  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  return t;
}

export function setTheme(theme) {
  const t = applyTheme(theme);
  localStorage.setItem(STORAGE_KEY, t);
  return t;
}

export function toggleTheme() {
  const cur = document.documentElement.dataset.theme || getPreferredTheme();
  const next = cur === 'dark' ? 'light' : 'dark';
  return setTheme(next);
}

export function initTheme() {
  // Apply ASAP to reduce theme flash.
  applyTheme(getPreferredTheme());
}

export function bindThemeToggle(root = document) {
  const btns = Array.from(root.querySelectorAll('[data-action="theme-toggle"]'));
  if (!btns.length) return;

  const syncLabel = (btn) => {
    const cur = document.documentElement.dataset.theme || getPreferredTheme();
    btn.setAttribute('aria-pressed', cur === 'dark' ? 'true' : 'false');
    btn.setAttribute('title', cur === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');

    // Show the icon for the mode you'll switch TO: sun in dark, moon in light.
    const ic = btn.querySelector('.icon, .side-ic');
    if (ic) ic.innerHTML = cur === 'dark' ? ICONS.sun : ICONS.moon;
  };

  const onClick = (btn) => {
    toggleTheme();
    for (const b of btns) syncLabel(b);
  };

  for (const btn of btns) {
    // Avoid double-binding if mountLayout is called again
    if (btn.dataset.bound === 'true') continue;
    btn.dataset.bound = 'true';

    btn.addEventListener('click', () => onClick(btn));
    syncLabel(btn);
  }
}
