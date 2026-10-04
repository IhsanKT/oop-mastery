import { h } from './dom.js';

export function toast(message, kind = 'info') {
  let host = document.getElementById('toasts');
  if (!host) {
    host = h('div', { id: 'toasts', 'aria-live': 'polite' });
    document.body.append(host);
  }
  const t = h('div', { class: `toast toast-${kind}` }, message);
  host.append(t);
  setTimeout(() => t.classList.add('out'), 2800);
  setTimeout(() => t.remove(), 3200);
}

export function masteryRing(percent, size = 44) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const svg = `<svg viewBox="0 0 44 44" width="${size}" height="${size}" role="img" aria-label="${percent}% mastered">`
    + `<circle cx="22" cy="22" r="${r}" class="ring-track"/>`
    + `<circle cx="22" cy="22" r="${r}" class="ring-fill" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - percent / 100)).toFixed(2)}" transform="rotate(-90 22 22)"/>`
    + `<text x="22" y="26" text-anchor="middle" class="ring-text">${percent}</text></svg>`;
  return h('span', { class: 'ring', html: svg });
}

export const langTag = (lang) =>
  h('span', { class: `tag tag-${lang}` }, lang === 'cpp' ? 'C++' : lang === 'python' ? 'Python' : 'C++ & Python');

export const difficultyDots = (d) =>
  h('span', { class: 'dots', title: `Difficulty ${d} of 3`, 'aria-label': `Difficulty ${d} of 3` }, '●'.repeat(d) + '○'.repeat(3 - d));
