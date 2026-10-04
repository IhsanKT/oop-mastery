import { parseRoute, startRouter } from './router.js';
import { store } from './store.js';
import { loadAllContent } from './content.js';
import { levelFor, currentStreak, dayKey, reviewQueue, setSetting, setLastVisited } from './state.js';
import { h } from './dom.js';
import * as home from './views/home.js';
import * as moduleView from './views/module.js';
import * as review from './views/review.js';
import * as exam from './views/exam.js';
import * as settings from './views/settings.js';

const VIEWS = { home, module: moduleView, review, exam, settings };
const app = document.getElementById('app');
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
let cleanup = null;
let booted = false;

export function applyTheme(theme) {
  const dark = theme === 'dark' || (theme === 'auto' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.getElementById('hljs-light').disabled = dark;
  document.getElementById('hljs-dark').disabled = !dark;
}

function renderHeader(s) {
  const lv = levelFor(s.xp);
  document.getElementById('xp-chip').textContent = `Lv ${lv.level} · ${s.xp} XP`;
  document.getElementById('streak-chip').textContent = `🔥 ${currentStreak(s, dayKey())}`;
  const n = reviewQueue(s).length;
  const pill = document.getElementById('review-count');
  pill.hidden = n === 0;
  pill.textContent = String(n);
  for (const b of document.querySelectorAll('#lang-switch button')) {
    b.setAttribute('aria-checked', String(b.dataset.lang === s.settings.lang));
  }
  document.body.dataset.lang = s.settings.lang;
  applyTheme(s.settings.theme);
}

async function onRoute(route) {
  if (cleanup) { try { cleanup(); } catch { /* view already gone */ } cleanup = null; }
  for (const a of document.querySelectorAll('[data-nav]')) a.classList.toggle('active', a.dataset.nav === route.name);
  if (route.name === 'module') store.update((s) => setLastVisited(s, location.hash));
  const root = h('div', { class: `view view-${route.name}` });
  app.replaceChildren(root);
  window.scrollTo(0, 0);
  const view = VIEWS[route.name];
  if (!view) {
    root.append(h('section', { class: 'empty' }, h('h1', {}, 'Page not found'), h('a', { class: 'btn', href: '#/' }, 'Back to the dashboard')));
    return;
  }
  try {
    const result = await view.render(root, route.params);
    if (typeof result === 'function') {
      if (root.isConnected) cleanup = result; else result();
    }
  } catch (err) {
    console.error(err);
    if (root.isConnected) {
      root.replaceChildren(h('section', { class: 'empty' }, h('h1', {}, 'Something went wrong'),
        h('p', { class: 'muted' }, 'This page failed to load. Try reloading, or go back to the dashboard.'),
        h('a', { class: 'btn', href: '#/' }, 'Back to the dashboard')));
    }
  }
}

async function boot() {
  renderHeader(store.get());
  store.subscribe(renderHeader);
  darkQuery.addEventListener('change', () => applyTheme(store.get().settings.theme));
  document.getElementById('lang-switch').addEventListener('click', (e) => {
    const lang = e.target.closest('button')?.dataset.lang;
    if (!lang || lang === store.get().settings.lang) return;
    store.update((s) => setSetting(s, 'lang', lang));
    if (booted) onRoute(parseRoute(location.hash));
  });
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    store.update((s) => setSetting(s, 'theme', next));
  });
  await loadAllContent();
  booted = true;
  startRouter(onRoute);
}

boot();
