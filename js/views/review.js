import { h } from '../dom.js';
import { store } from '../store.js';
import { reviewQueue } from '../state.js';
import { findQuestion } from '../content.js';
import { runSession, stopKeys } from './quiz.js';
import { shuffle } from '../quiz-session.js';

export function render(root) {
  const missing = reviewQueue(store.get()).filter((id) => !findQuestion(id));
  if (missing.length) {
    store.update((st) => ({ ...st, review: Object.fromEntries(Object.entries(st.review).filter(([id]) => !missing.includes(id))) }));
  }
  const s = store.get();
  const items = reviewQueue(s).map(findQuestion).filter(Boolean).map(({ q, module }) => ({ q, moduleId: module.id }));
  root.append(h('header', { class: 'page-head' },
    h('h1', {}, 'Review'),
    h('p', { class: 'muted' }, 'Questions you missed come back here. Answer each one correctly in two separate review sessions to clear it from the queue.')));
  if (!items.length) {
    root.append(h('div', { class: 'empty' }, h('p', {}, '🎉 Nothing to review right now.'), h('a', { class: 'btn', href: '#/' }, 'Back to the dashboard')));
    return;
  }
  const almost = items.filter(({ q }) => s.review[q.id]?.box === 2).length;
  const body = h('div', { class: 'quiz-intro' },
    h('p', {}, `${items.length} question${items.length > 1 ? 's' : ''} in your queue${almost ? `, ${almost} of them one correct answer away from being cleared` : ''}.`),
    h('button', {
      type: 'button', class: 'btn primary',
      onclick: () => runSession(body, shuffle(items), { mode: 'review', reviewSession: `review-${Date.now()}`, links: [['#/', 'Dashboard']] }),
    }, 'Start review'));
  root.append(body);
  return stopKeys;
}
