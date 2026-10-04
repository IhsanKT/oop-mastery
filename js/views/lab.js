import { h } from '../dom.js';
import { store } from '../store.js';
import { useHint, revealSolution, markPassed } from '../state.js';
import { gain } from '../progress.js';
import { renderMarkdown, renderInline, codeBlock } from '../markdown.js';
import { langTag, difficultyDots } from '../ui.js';
import { runCpp } from '../runners/cpp-runner.js';
import { runPython, warmUpPython } from '../runners/python-runner.js';

const codeKey = (id) => `oop-mastery:code:${id}`;
const readCode = (id) => { try { return localStorage.getItem(codeKey(id)); } catch { return null; } };
const writeCode = (id, code) => { try { localStorage.setItem(codeKey(id), code); } catch { /* storage unavailable */ } };
const removeCode = (id) => { try { localStorage.removeItem(codeKey(id)); } catch { /* storage unavailable */ } };
const PHASE_TITLE = { compile: 'Compile error', runtime: 'Runtime error', timeout: 'Timed out', network: 'Could not run your code' };

function makeEditor(host, value, lang, onRun, onChange) {
  if (window.CodeMirror) {
    const cm = window.CodeMirror(host, {
      value, mode: lang === 'cpp' ? 'text/x-c++src' : 'python', lineNumbers: true, indentUnit: 4, tabSize: 4,
      matchBrackets: true, autoCloseBrackets: true, viewportMargin: Infinity,
      extraKeys: {
        'Ctrl-Enter': onRun, 'Cmd-Enter': onRun,
        Tab: (c) => (c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ', 'end')),
      },
    });
    cm.on('change', onChange);
    return { get: () => cm.getValue(), set: (v) => cm.setValue(v) };
  }
  const ta = h('textarea', { class: 'editor-fallback', spellcheck: 'false', 'aria-label': 'Code editor' });
  ta.value = value;
  ta.addEventListener('input', onChange);
  ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onRun(); });
  host.append(ta);
  return { get: () => ta.value, set: (v) => { ta.value = v; } };
}

export function render(root, { module, exercises, exId }) {
  if (!exercises.length) {
    root.append(h('div', { class: 'empty' }, 'No labs match your language filter. Switch to "Both" to see them all.'));
    return;
  }
  const ex = exercises.find((e) => e.id === exId) ?? exercises[0];
  const idx = exercises.indexOf(ex);
  const nextEx = exercises[idx + 1];
  const st = () => store.get().exercises[ex.id] ?? {};

  const listItem = (e) => h('a', { class: `lab-item${e.id === ex.id ? ' active' : ''}`, href: `#/m/${module.id}/lab/${e.id}`, dataset: { id: e.id } },
    h('span', { class: 'lab-status' }, store.get().exercises[e.id]?.passed ? '✓' : '○'),
    h('span', { class: 'lab-title' }, e.title), langTag(e.lang), difficultyDots(e.difficulty));
  const list = h('nav', { class: 'lab-list', 'aria-label': 'Labs in this module' }, exercises.map(listItem));

  const host = h('div', { class: 'editor' });
  const runBtn = h('button', { type: 'button', class: 'btn primary' }, 'Run tests');
  const hintBtn = h('button', { type: 'button', class: 'btn', title: 'Each hint lowers this lab\'s XP by 10' });
  const revealBtn = h('button', { type: 'button', class: 'btn' }, 'Show solution');
  const resetBtn = h('button', { type: 'button', class: 'btn danger' }, 'Reset');
  const status = h('span', { class: 'muted run-status', 'aria-live': 'polite' });
  const hintsBox = h('div', { class: 'hints' });
  const results = h('div', { class: 'results', 'aria-live': 'polite' });
  const solutionBox = h('section', { class: 'solution', hidden: true });
  const nextBox = h('div', { class: 'actions', hidden: true },
    nextEx ? h('a', { class: 'btn primary', href: `#/m/${module.id}/lab/${nextEx.id}` }, `Next lab: ${nextEx.title} →`)
      : h('a', { class: 'btn primary', href: '#/' }, 'Back to the dashboard'));

  root.append(h('div', { class: 'lab-layout' }, list, h('div', { class: 'lab-main' },
    h('header', { class: 'lab-head' }, h('h2', {}, ex.title), langTag(ex.lang), difficultyDots(ex.difficulty)),
    renderMarkdown(ex.task, { className: 'prose lab-task' }),
    h('p', { class: 'muted run-note' }, ex.lang === 'cpp'
      ? 'C++ is compiled by Wandbox (GCC 13, C++20), so your code is sent to that service. Do not write main(): the tests call your classes.'
      : 'Python runs inside your browser with Pyodide. Code under if __name__ == "__main__": does not run during tests.'),
    host,
    h('div', { class: 'toolbar' }, runBtn, hintBtn, revealBtn, resetBtn, status, h('span', { class: 'muted kbd-hint' }, 'Ctrl/⌘ + Enter runs the tests')),
    hintsBox, results, nextBox, solutionBox)));

  let saveTimer;
  let running = false;
  const editor = makeEditor(host, readCode(ex.id) ?? ex.starter, ex.lang, () => run(), () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => writeCode(ex.id, editor.get()), 400);
  });
  if (ex.lang === 'python') warmUpPython();

  function renderHints() {
    const used = Math.min(st().hintsUsed ?? 0, ex.hints.length);
    hintsBox.replaceChildren(...ex.hints.slice(0, used).map((t, i) =>
      h('div', { class: 'hint' }, h('strong', {}, `Hint ${i + 1}: `), h('span', { html: renderInline(t) }))));
    hintBtn.textContent = used < ex.hints.length ? `Hint (${used}/${ex.hints.length})` : 'No more hints';
    hintBtn.disabled = used >= ex.hints.length;
  }

  function showSolution(earned) {
    solutionBox.replaceChildren(
      h('h3', {}, earned ? 'Compare with the model solution' : 'Model solution'),
      earned ? null : h('p', { class: 'notice notice-warn' }, 'You revealed the solution, so this lab now awards 0 XP. To make it stick, reset the editor and rebuild it from memory.'),
      codeBlock(ex.solution, ex.lang),
      h('h3', {}, 'Walkthrough'),
      renderMarkdown(ex.explanation));
    solutionBox.hidden = false;
  }

  function showResults(r) {
    const passed = r.results.filter((x) => x.status === 'pass').length;
    const verdict = r.ok ? `All ${r.results.length} tests passed! 🎉`
      : r.phase === 'tests' ? `${passed} of ${r.results.length} tests passed` : PHASE_TITLE[r.phase] ?? 'Error';
    results.replaceChildren(
      h('div', { class: `verdict ${r.ok ? 'verdict-ok' : 'verdict-bad'}` }, verdict),
      r.message ? h('pre', { class: 'run-message' }, r.message) : null,
      h('ul', { class: 'test-list' }, r.results.map((t) => h('li', { class: `test test-${t.status}` },
        h('span', { class: 'test-icon', 'aria-hidden': 'true' }, t.status === 'pass' ? '✓' : t.status === 'fail' ? '✗' : '○'),
        h('span', { class: 'test-name' }, t.name),
        t.message ? h('span', { class: 'test-msg' }, t.message) : null))),
      r.stdout ? h('details', { class: 'stdout', open: true }, h('summary', {}, 'Your program printed'), h('pre', {}, r.stdout)) : null);
  }

  async function run() {
    if (running) return;
    running = true;
    runBtn.disabled = true;
    runBtn.textContent = 'Running…';
    const code = editor.get();
    writeCode(ex.id, code);
    const onStatus = (msg) => { status.textContent = msg; };
    let r;
    try {
      r = ex.lang === 'cpp' ? await runCpp(code, ex.tests, { onStatus }) : await runPython(code, ex.tests, { onStatus });
    } catch (err) {
      r = { ok: false, phase: 'runtime', message: String(err?.message ?? err), results: ex.tests.map((t) => ({ name: t.name, status: 'notrun', message: '' })), stdout: '' };
    } finally {
      running = false;
      runBtn.disabled = false;
      runBtn.textContent = 'Run tests';
      status.textContent = '';
    }
    if (!root.isConnected) return;
    showResults(r);
    if (r.ok) {
      const firstPass = !st().passed;
      gain((s) => markPassed(s, ex.id));
      if (firstPass) showSolution(true);
      nextBox.hidden = false;
      list.querySelector(`[data-id="${ex.id}"] .lab-status`).textContent = '✓';
    } else {
      gain((s) => ({ state: s, xpGained: 0 })); // still counts toward the daily streak
    }
  }

  runBtn.addEventListener('click', run);
  hintBtn.addEventListener('click', () => { store.update((s) => useHint(s, ex.id)); renderHints(); });
  revealBtn.addEventListener('click', () => {
    if (st().passed) return showSolution(true);
    if (!window.confirm('Reveal the model solution? This lab will then award 0 XP.')) return;
    store.update((s) => revealSolution(s, ex.id));
    showSolution(false);
  });
  resetBtn.addEventListener('click', () => {
    if (!window.confirm('Reset the editor to the starter code? Your current code will be lost.')) return;
    editor.set(ex.starter);
    removeCode(ex.id);
  });

  renderHints();
  if (st().passed) { showSolution(true); nextBox.hidden = false; } else if (st().solutionRevealed) showSolution(false);

  return () => { clearTimeout(saveTimer); writeCode(ex.id, editor.get()); };
}
