import { h } from '../dom.js';
import { store } from '../store.js';
import { MODULES, TIERS, getModule, filterByLang } from '../content.js';
import { levelFor, currentStreak, dayKey, reviewQueue, moduleMastery } from '../state.js';
import { masteryRing } from '../ui.js';
import { badgeLabel, BADGE_ICONS } from '../progress.js';

const stat = (icon, n, label) =>
  h('div', { class: 'stat' }, h('span', { class: 'stat-n' }, `${icon} ${n}`), h('span', { class: 'stat-l' }, label));

function card(meta, s) {
  const c = getModule(meta.id);
  const num = String(meta.num).padStart(2, '0');
  if (!c || c.missing) {
    return h('div', { class: 'card card-soon' }, h('div', { class: 'card-top' }, h('span', { class: 'num' }, num)),
      h('h3', {}, meta.title), h('p', { class: 'muted' }, 'Coming soon'));
  }
  const lang = s.settings.lang;
  const m = moduleMastery(s, { id: meta.id, quiz: filterByLang(c.quiz, lang), exercises: filterByLang(c.exercises, lang) });
  const badges = s.badges.filter((b) => b.endsWith(`:${meta.id}`));
  return h('a', { class: `card${m.mastered ? ' card-mastered' : ''}`, href: `#/m/${meta.id}/lesson` },
    h('div', { class: 'card-top' }, h('span', { class: 'num' }, num), masteryRing(m.percent)),
    h('h3', {}, meta.title),
    h('p', { class: 'muted' }, meta.summary),
    h('p', { class: 'card-meta' }, meta.final ? `${m.exTotal} capstone labs` : `${m.quizTotal} questions · ${m.exTotal} labs`),
    badges.length ? h('div', { class: 'badges' }, badges.map((b) => h('span', { class: 'badge', title: badgeLabel(b) }, BADGE_ICONS[b.split(':')[0]]))) : null);
}

export function render(root) {
  const s = store.get();
  const lv = levelFor(s.xp);
  const queue = reviewQueue(s).length;
  const resume = typeof s.lastVisited === 'string' && s.lastVisited.startsWith('#/') ? s.lastVisited : null;
  root.append(
    h('section', { class: 'hero' },
      h('div', { class: 'hero-main' },
        h('p', { class: 'eyebrow' }, `Level ${lv.level}`),
        h('h1', {}, lv.title),
        h('div', { class: 'xpbar', role: 'progressbar', 'aria-label': 'Progress to next level', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(lv.progress * 100) },
          h('span', { style: `width:${(lv.progress * 100).toFixed(1)}%` })),
        h('p', { class: 'muted' }, lv.next === null ? `${s.xp} XP: max level reached` : `${s.xp} / ${lv.next} XP to level ${lv.level + 1}`)),
      h('div', { class: 'hero-stats' },
        stat('🔥', currentStreak(s, dayKey()), 'day streak'),
        stat('🏅', s.badges.length, 'badges'),
        stat('🔁', queue, 'to review')),
      h('div', { class: 'hero-actions' },
        h('a', { class: 'btn primary', href: resume ?? '#/m/why-oop/lesson' }, resume ?'Continue where you left off' : 'Start with Module 1'),
        queue ? h('a', { class: 'btn', href: '#/review' }, `Review ${queue} missed question${queue > 1 ? 's' : ''}`) : null)),
    ...TIERS.map((t) => h('section', { class: 'tier' },
      h('h2', {}, t.title),
      h('p', { class: 'muted' }, t.blurb),
      h('div', { class: 'grid' }, MODULES.filter((m) => m.tier === t.id).map((m) => card(m, s))))),
  );
}
