import { h } from '../dom.js';
import { store } from '../store.js';
import { modulesFor } from '../content.js';
import { runSession, stopKeys } from './quiz.js';
import { pickExam } from '../quiz-session.js';

export function render(root) {
  const mods = modulesFor(store.get().settings.lang);
  const total = mods.reduce((n, m) => n + m.quiz.length, 0);
  root.append(h('header', { class: 'page-head' },
    h('h1', {}, 'Final mastery exam'),
    h('p', { class: 'muted' }, 'Up to 40 questions drawn from every module. Explanations still appear after each answer, because this exam is for learning too. The per-module breakdown at the end shows you what to revisit.')));
  if (!total) {
    root.append(h('div', { class: 'empty' }, 'No questions are available yet.'));
    return;
  }
  const body = h('div', { class: 'quiz-intro' },
    h('p', {}, `${Math.min(40, total)} questions from ${mods.filter((m) => m.quiz.length).length} modules.`),
    h('button', {
      type: 'button', class: 'btn primary',
      onclick: () => runSession(body, pickExam(mods, 40), { mode: 'exam', links: [['#/', 'Dashboard'], ['#/review', 'Review missed questions']] }),
    }, 'Start the exam'));
  root.append(body);
  return stopKeys;
}
