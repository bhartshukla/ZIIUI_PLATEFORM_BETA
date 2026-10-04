import { $ } from './dom.js';
import { safeSet } from './storage.js';

export const THEME_KEY = 'ziiui-theme';

export function applyThemeIcon() {
  const toggle = $('themeToggle');
  const icon = $('themeIcon');
  if (!toggle || !icon) return;
  const light = (document.documentElement.getAttribute('data-theme') || 'dark') === 'light';
  const label = light ? 'Switch to dark theme' : 'Switch to light theme';
  icon.className = light ? 'ri-moon-line' : 'ri-sun-line';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', light ? '#f7f8fb' : '#0c0e12');
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  safeSet(THEME_KEY, next);
  applyThemeIcon();
}
