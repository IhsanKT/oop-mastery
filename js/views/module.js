import { h } from '../dom.js';
import { store } from '../store.js';
import { getModule, filterByLang, MODULES } from '../content.js';
import { moduleMastery } from '../state.js';
import { masteryRing } from '../ui.js';
import * as lesson from './lesson.js';
import * as quiz from './quiz.js';
import * as lab from './lab.js';

const TABS = { lesson, quiz, lab };

export async function render(root, { id, tab, exId }) {
  const c = getModule(id);
  if (!c || c.missing) {
    root.append(h('section', { class: 'empty' }, h('h1', {}, 'This module is not available yet'),
      h('a', { class: 'btn', href: '#/' }, 'Back to the dashboard')));
    return;
  }
  const s = store.get();
  const quizItems = filterByLang(c.quiz, s.settings.lang);
  const exItems = filterByLang(c.exercises, s.settings.lang);
  const m = moduleMastery(s, { id, quiz: quizItems, exercises: exItems });
  const i = MODULES.findIndex((x) => x.id === id);
  const prev = MODULES[i - 1];
  const next = MODULES[i + 1];
  const tabLink = (t, label) => h('a', { class: `tab${t === tab ? ' active' : ''}`, href: `#/m/${id}/${t}`, 'aria-current': t === tab ? 'page' : null }, label);

  root.append(
    h('header', { class: 'module-head' },
      h('div', {},
        h('p', { class: 'eyebrow' }, `Module ${c.meta.num}`),
        h('h1', {}, c.meta.title),
        h('p', { class: 'muted' }, c.meta.summary)),
      h('div', { class: 'module-mastery' }, masteryRing(m.percent, 64),
        h('span', { class: 'muted' }, m.mastered ? 'Mastered!' : `${m.known}/${m.quizTotal} questions · ${m.passed}/${m.exTotal} labs`))),
    h('nav', { class: 'tabs', 'aria-label': 'Module sections' },
      tabLink('lesson', 'Lesson'),
      c.meta.final ? h('a', { class: 'tab', href: '#/exam' }, 'Final exam') : tabLink('quiz', `Quiz (${quizItems.length})`),
      tabLink('lab', `Labs (${exItems.length})`)),
  );
  const body = h('div', { class: 'module-body' });
  root.append(body);
  const cleanup = await TABS[tab].render(body, { module: c, quiz: quizItems, exercises: exItems, exId });
  root.append(h('nav', { class: 'module-pager', 'aria-label': 'Other modules' },
    prev ? h('a', { class: 'btn', href: `#/m/${prev.id}/lesson` }, `← ${prev.num}. ${prev.title}`) : h('span'),
    next ? h('a', { class: 'btn', href: `#/m/${next.id}/lesson` }, `${next.num}. ${next.title} →`) : h('span')));
  return cleanup;
}
