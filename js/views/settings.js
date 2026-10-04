import { h } from '../dom.js';
import { store } from '../store.js';
import { setSetting, exportState, importState, defaultState } from '../state.js';
import { toast } from '../ui.js';

const section = (title, blurb, ...body) =>
  h('section', { class: 'settings-section' }, h('h2', {}, title), blurb ? h('p', { class: 'muted' }, blurb) : null, ...body);

function exportFile() {
  const blob = new Blob([exportState(store.get())], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `oop-mastery-progress-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function resetAll() {
  if (!window.confirm('Reset ALL progress (XP, badges, review queue and saved lab code)? This cannot be undone.')) return;
  store.set({ ...defaultState(), settings: store.get().settings });
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('oop-mastery:code:')) localStorage.removeItem(k);
  } catch { /* storage unavailable */ }
  toast('Progress reset');
}

export function render(root) {
  const s = store.get();
  const radios = (name, choices) => h('div', { class: 'radios', role: 'radiogroup' }, choices.map(([value, label]) =>
    h('label', { class: 'radio' },
      h('input', { type: 'radio', name, value, checked: s.settings[name] === value, onchange: () => store.update((st) => setSetting(st, name, value)) }),
      label)));
  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', hidden: true,
    onchange: async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const next = importState(await file.text());
        if (!window.confirm('Replace your current progress with this file?')) return;
        store.set(next);
        toast('Progress imported');
        location.hash = '#/';
      } catch (err) {
        toast(`Import failed: ${err.message}`);
      }
    },
  });

  root.append(
    h('header', { class: 'page-head' }, h('h1', {}, 'Settings')),
    section('Language focus', 'Show C++, Python, or both side by side. Quizzes, labs and mastery follow this choice.',
      radios('lang', [['both', 'Both, side by side'], ['cpp', 'C++ only'], ['python', 'Python only']])),
    section('Theme', null, radios('theme', [['auto', 'Match my system'], ['light', 'Light'], ['dark', 'Dark']])),
    section('Your progress', 'Progress is stored only in this browser. Export it to back it up or move it to another device.',
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn', onclick: exportFile }, 'Export progress (.json)'),
        h('button', { type: 'button', class: 'btn', onclick: () => fileInput.click() }, 'Import progress'),
        fileInput,
        h('button', { type: 'button', class: 'btn danger', onclick: resetAll }, 'Reset all progress'))),
    section('How your code runs', null, h('ul', {},
      h('li', {}, 'Python runs entirely in your browser using Pyodide (CPython compiled to WebAssembly). Nothing is uploaded.'),
      h('li', {}, 'C++ code is sent to the free Wandbox compiler service (or Compiler Explorer if Wandbox is down) to be compiled and run. Do not put secrets in lab code.'),
      h('li', {}, "Progress and saved lab code live in this browser's local storage."))),
  );
}
