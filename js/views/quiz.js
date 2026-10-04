import { h } from '../dom.js';
import { store } from '../store.js';
import { recordAnswer } from '../state.js';
import { gain } from '../progress.js';
import { MODULES } from '../content.js';
import { renderMarkdown, renderInline, codeBlock } from '../markdown.js';
import { langTag, difficultyDots } from '../ui.js';
import { optionOrder, summarize, shuffle } from '../quiz-session.js';

const TYPE_LABEL = { concept: 'Concept', output: 'Predict the output', bug: 'Spot the bug', compare: 'C++ vs Python' };
let activeKey = null;

function setKeyHandler(fn) {
  if (activeKey) document.removeEventListener('keydown', activeKey);
  activeKey = fn;
  if (fn) document.addEventListener('keydown', fn);
}
export const stopKeys = () => setKeyHandler(null);

const excerpt = (md) => md.replace(/[`*_#>~]/g, '').replace(/\s+/g, ' ').trim().slice(0, 140);

export function runSession(root, items, opts) {
  let i = 0;
  let xp = 0;
  let answered = false;
  const answers = [];

  setKeyHandler((e) => {
    if (e.target.closest('input, textarea, select, .CodeMirror') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!answered && /^[1-9]$/.test(e.key)) root.querySelectorAll('.option')[Number(e.key) - 1]?.click();
    else if (answered && (e.key === 'Enter' || e.key === 'ArrowRight')) { e.preventDefault(); next(); }
  });

  function show() {
    answered = false;
    const { q } = items[i];
    const rows = optionOrder(q).map((idx, pos) => {
      const o = q.options[idx];
      const btn = h('button', { type: 'button', class: 'option', dataset: { idx } },
        h('span', { class: 'option-key', 'aria-hidden': 'true' }, String(pos + 1)),
        q.type === 'output'
          ? h('pre', { class: 'option-text option-pre' }, o.text)
          : h('span', { class: 'option-text', html: renderInline(o.text) }));
      btn.addEventListener('click', () => answer(idx));
      return h('div', { class: 'option-row' }, btn);
    });
    const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
    root.replaceChildren(h('section', { class: 'quiz-card' },
      h('div', { class: 'quiz-progress' },
        h('span', {}, `Question ${i + 1} of ${items.length}`),
        h('div', { class: 'bar' }, h('span', { style: `width:${(i / items.length) * 100}%` })),
        h('span', { class: 'xp-session' }, `+${xp} XP`)),
      h('div', { class: 'quiz-meta' }, langTag(q.lang), h('span', { class: 'tag' }, TYPE_LABEL[q.type]), difficultyDots(q.difficulty)),
      renderMarkdown(q.prompt, { className: 'prose quiz-prompt' }),
      q.code ? h('div', { class: 'quiz-code' }, codeBlock(q.code, q.codeLang)) : null,
      h('div', { class: 'options', role: 'group', 'aria-label': 'Answer options' }, rows),
      feedback));
  }

  function answer(chosen) {
    if (answered) return;
    answered = true;
    const { q, moduleId } = items[i];
    const correct = q.options[chosen].correct === true;
    answers.push({ qid: q.id, moduleId, correct });
    xp += gain((s) => recordAnswer(s, q.id, correct, { reviewSession: opts.reviewSession ?? null }));
    for (const btn of root.querySelectorAll('.option')) {
      const idx = Number(btn.dataset.idx);
      const o = q.options[idx];
      btn.disabled = true;
      btn.classList.add(o.correct ? 'correct' : idx === chosen ? 'wrong' : 'other');
      const label = o.correct ? '✓ Why this is right: ' : idx === chosen ? '✗ Why your answer is wrong: ' : '✗ Why not: ';
      btn.parentElement.append(h('div', { class: `why ${o.correct ? 'why-ok' : 'why-bad'}` },
        h('strong', {}, label), h('span', { html: renderInline(o.why) })));
    }
    const feedback = root.querySelector('.feedback');
    const nextBtn = h('button', { type: 'button', class: 'btn primary', onclick: next }, i + 1 < items.length ? 'Next question →' : 'See results');
    feedback.append(
      h('div', { class: `verdict ${correct ? 'verdict-ok' : 'verdict-bad'}` },
        correct ? 'Correct!' : 'Not quite. Read why each option is right or wrong above.',
        !correct && opts.mode !== 'review' ? h('span', { class: 'muted' }, ' This question is now in your review queue.') : null),
      h('div', { class: 'explanation' }, h('h3', {}, 'Explanation'), renderMarkdown(q.explanation)),
      h('div', { class: 'actions' }, nextBtn, h('span', { class: 'muted kbd-hint' }, 'Press Enter to continue')));
    nextBtn.focus({ preventScroll: true });
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function next() {
    if (!answered) return;
    i += 1;
    if (i < items.length) show(); else finish();
  }

  function finish() {
    stopKeys();
    const sum = summarize(answers);
    const missedItems = items.filter((x) => sum.missed.includes(x.q.id));
    const titleOf = (id) => MODULES.find((m) => m.id === id)?.title ?? id;
    root.replaceChildren(h('section', { class: 'quiz-done' },
      h('h2', {}, sum.total && sum.correct === sum.total ? 'Perfect score! 🎯' : 'Session complete'),
      h('p', { class: 'score' }, `${sum.correct} / ${sum.total} correct`),
      h('p', { class: 'muted' }, `+${xp} XP this session`),
      opts.mode === 'exam' ? h('table', { class: 'breakdown' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Module'), h('th', {}, 'Score'), h('th', {}, ''))),
        h('tbody', {}, Object.entries(sum.byModule).map(([id, r]) => h('tr', {},
          h('td', {}, titleOf(id)), h('td', {}, `${r.correct}/${r.total}`),
          h('td', {}, r.correct / r.total < 0.7 ? h('a', { href: `#/m/${id}/lesson` }, 'Revisit →') : '✓'))))) : null,
      missedItems.length ? h('div', { class: 'missed' }, h('h3', {}, 'Questions to revisit'),
        h('ul', {}, missedItems.map((x) => h('li', {}, excerpt(x.q.prompt))))) : null,
      h('div', { class: 'actions' },
        missedItems.length ? h('button', { type: 'button', class: 'btn primary', onclick: () => runSession(root, shuffle(missedItems), opts) }, 'Retry missed questions') : null,
        (opts.links ?? []).map(([href, label]) => h('a', { class: 'btn', href }, label)))));
  }

  if (items.length) show(); else finish();
  return stopKeys;
}

export function render(root, { module, quiz }) {
  if (!quiz.length) {
    root.append(h('div', { class: 'empty' },
      h('p', {}, module.meta.final ? 'This module has no quiz: take the final exam instead.' : 'No questions match your language filter. Switch to "Both" to see them all.'),
      module.meta.final ? h('a', { class: 'btn primary', href: '#/exam' }, 'Final exam') : null));
    return;
  }
  const s = store.get();
  const notYet = quiz.filter((q) => !s.questions[q.id]?.lastCorrect);
  const toItems = (qs) => qs.map((q) => ({ q, moduleId: module.id }));
  const opts = { mode: 'module', links: [[`#/m/${module.id}/lab`, 'Go to the labs →'], [`#/m/${module.id}/lesson`, 'Re-read the lesson']] };
  root.append(h('section', { class: 'quiz-intro' },
    h('h2', {}, `${quiz.length} questions`),
    h('p', {}, 'After every answer you will see why each option is right or wrong, plus a short explanation of the concept. Questions you miss go to your Review queue, so they come back until you have them.'),
    h('p', { class: 'muted' }, 'Shortcuts: 1–5 to answer, Enter for the next question.'),
    h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => runSession(root, toItems(quiz), opts) }, 'Start the quiz'),
      notYet.length && notYet.length < quiz.length
        ? h('button', { type: 'button', class: 'btn', onclick: () => runSession(root, toItems(notYet), opts) }, `Practice the ${notYet.length} I haven't got right yet`)
        : null)));
  return stopKeys;
}
