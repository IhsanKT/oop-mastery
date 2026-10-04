# OOP Mastery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static GitHub Pages site that teaches OOP in C++ and Python side by side, using lessons, MCQs that explain every option, and coding labs that really run your code. It is gamified with XP, levels, streaks, badges and a review queue.

**Architecture:**
- No build step: plain HTML, CSS and ES modules, with a hash router.
- Pure logic modules (`state.js`, `harness.js`, `router.js`) are unit-tested with `node:test`. The browser and the Node content checker share the same harness code.
- Python runs in Pyodide inside a Web Worker. C++ runs on Wandbox, falling back to Compiler Explorer.
- Content is plain ES-module data plus Markdown. CI runs every solution, starter and output MCQ before deploying.

**Tech Stack:**
- Vanilla JS (ES2022) and CSS custom properties.
- marked 18.0.14, highlight.js 11.11.2 and CodeMirror 5.65.16 (cdnjs); Pyodide 0.29.5 (jsdelivr).
- Node 22 built-ins (`node:test`, `node:child_process`), g++ (C++20), Python 3.13.
- GitHub Actions and GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-04-oop-mastery-design.md`

## Global Constraints

- No build step and no npm runtime dependencies. `package.json` exists only for `"type": "module"` and its scripts. Node scripts import only `node:*` built-ins.
- All asset and content paths are **relative** (the site is served under `/oop-mastery/`). Routing uses hashes: `#/`, `#/m/:id/lesson|quiz|lab[/:exId]`, `#/review`, `#/exam`, `#/settings`.
- CDN URLs, exactly:
  - `https://cdnjs.cloudflare.com/ajax/libs/marked/18.0.14/lib/marked.umd.min.js`
  - `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.2/highlight.min.js` (+ `languages/cpp.min.js`, `languages/python.min.js`, `styles/github.min.css`, `styles/github-dark.min.css`)
  - `https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js` (+ `codemirror.min.css`, `mode/clike/clike.min.js`, `mode/python/python.min.js`, `addon/edit/matchbrackets.min.js`, `addon/edit/closebrackets.min.js`)
  - `https://cdn.jsdelivr.net/pyodide/v0.29.5/full/` (Python 3.13.2)
- C++:
  - Standard is `-std=c++20` everywhere.
  - Wandbox: `POST https://wandbox.org/api/compile.json`, compiler `gcc-13.2.0`.
  - Godbolt fallback: `POST https://godbolt.org/api/compiler/g132/compile` with `-fdiagnostics-color=never`.
  - Godbolt returns `stdout` and `buildResult.stderr` as arrays of `{text}`.
- Python 3.13 in CI. Locally, the interpreter is `process.env.PYTHON || (win32 ? 'python' : 'python3')` and the compiler is `process.env.CXX || 'g++'`.
- Every `localStorage` access is wrapped in try/catch, and the app must work when storage throws.
- Content code fences use `~~~` (never triple backticks), and content strings are JS template literals.
- Content files and anything containing backslash escapes are written with the **Write tool**, never Bash heredocs (the Bash tool mangles `\\n`).
- Line endings are LF (`.gitattributes`: `* text=auto eol=lf`).
- XP rules:
  - MCQ: 10 on first try, 5 when correct after a miss. Awarded once per question.
  - Exercise: `max(0, 50 − 10×hints)`, and 0 if the solution was revealed. Awarded once.
- Mastery = 50% × (questions whose latest answer is correct ÷ total) + 50% × (exercises passed ÷ total). "Mastered" means ≥ 90% with all exercises passed.
- Review queue: a miss puts the question in box 1. A correct answer in a *different* review session moves box 1 → box 2, and box 2 → removed.
- Content minimums for each module 01–20:
  - lesson ≥ 6000 chars, with `## Key takeaways` and `## Common pitfalls`, at least one `~~~cpp` and one `~~~python` fence
  - ≥ 15 MCQs, of which ≥ 3 are `type:'output'`
  - ≥ 4 exercises (≥ 2 cpp, ≥ 2 python)
  - Module 21: lesson ≥ 2000 chars, quiz `[]` allowed, ≥ 6 exercises (3 capstones × 2 languages)
- Commit after every task, ending the message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **User code that never terminates** (`while True:` / `for(;;);`). Expected: Python is stopped after 10 s with a clear "timed out" message and a fresh worker, so the next run works. C++ shows the remote timeout or kill as a crash/timeout, not as silent failures. *Pinned in Task 3 (local timeout tests) and the Task 10 manual check of the browser runners.*
2. **User output that mimics test markers, or has no trailing newline.** Expected: a user `print("@@TEST|x|PASS")` can't fake a pass, and unterminated output doesn't swallow the first marker. Markers carry a per-run nonce and start on a fresh line. *Pinned in Task 2 tests.*
3. **Corrupt, old or unavailable localStorage** (invalid JSON, missing fields, a getItem that throws). Expected: the app loads with defaults merged and never crashes. *Pinned in Task 1 tests.*
4. **Compile errors** whose line numbers point into the generated program (prelude + tests). Expected: diagnostics are rewritten to `your code:L:C` / `test code` / `harness`, so the learner sees their own line numbers. *Pinned in Task 2 tests.*
5. **Compiler service unreachable** (Wandbox 403/5xx or offline). Expected: fall back to Godbolt. If both fail, show a "network" result and never lose the learner's code. *Pinned in Task 4 fake-fetch tests (adapter tests in Task 2) and the Task 10 offline check.*

---

## File Map

| Path | Responsibility |
|---|---|
| `package.json`, `.gitattributes`, `.gitignore` | ESM flag + scripts; LF endings |
| `index.html` | App shell, header, CDN tags, `<main id="app">` |
| `css/styles.css` | Tokens, light/dark, layout, components, CodeMirror/hljs theming |
| `js/state.js` | **Pure** progress logic + `load`/`save`/`exportState`/`importState` |
| `js/store.js` | Runtime singleton around state (get/update/subscribe) |
| `js/router.js` | **Pure** `parseRoute(hash)` + `startRouter(cb)` |
| `js/dom.js` | `h()` element helper, `clear()` |
| `js/markdown.js` | `renderMarkdown(md)` → element (marked + hljs + compare widget + callouts) |
| `js/ui.js` | `toast()`, `masteryRing()`, `langTag()` |
| `js/content.js` | Module registry access, `loadModule`, `loadAllContent`, `filterByLang` |
| `js/app.js` | Bootstrap: theme, header bindings, router → views |
| `js/views/home.js`, `module.js`, `lesson.js`, `quiz.js`, `lab.js`, `review.js`, `exam.js`, `settings.js` | Pages |
| `js/runners/harness.js` | **Pure**, shared by browser & Node: program assembly, marker parsing, result normalization, API adapters, `PY_HARNESS` |
| `js/runners/python-worker.js` | Classic worker: Pyodide + run harness |
| `js/runners/python-runner.js` | Worker lifecycle, 10 s timeout, respawn |
| `js/runners/cpp-runner.js` | Wandbox → Godbolt fallback |
| `scripts/lib/proc.mjs` | `runProcess()` promise wrapper with timeout |
| `scripts/lib/local-runners.mjs` | `runPythonLocal`, `runCppLocal`, `runProgramLocal` (same normalized results as browser) |
| `scripts/lib/validate.mjs` | `validateModule(meta, lesson, quiz, exercises) → string[]` |
| `scripts/validate-content.mjs` | CLI over all modules |
| `scripts/test-solutions.mjs` | CLI: solutions pass, starters fail, output MCQs match |
| `content/index.js` | `TIERS`, `MODULES` registry |
| `content/NN-slug/lesson.md`, `quiz.js`, `exercises.js` | Content |
| `tests/*.test.mjs` | Unit + integration tests |
| `.github/workflows/deploy.yml` | check → deploy Pages |
| `README.md` | What it is, run locally, content format |

**Shared result shape** (returned by every runner, browser or local):
```js
// RunResult
{ ok: boolean,                                   // every test passed
  phase: 'tests'|'compile'|'runtime'|'timeout'|'network',
  message: string,                               // compile/runtime/network text, '' when phase==='tests'
  results: [{ name: string, status: 'pass'|'fail'|'notrun', message: string }],
  stdout: string }                               // learner's own program output (markers removed)
```

### Task 1: Project scaffold + progress model (`state.js`)

**Files:**
- Create: `package.json`, `.gitattributes`, `.gitignore`, `js/state.js`
- Test: `tests/state.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces (all pure except `load`/`save`):
  - `STORAGE_KEY`, `LEVEL_XP: number[]`, `LEVEL_TITLES: string[]`, `BADGE_LABELS`
  - `defaultState() → State`, `mergeState(raw) → State`
  - `levelFor(xp) → {level, title, floor, next|null, progress}`
  - `dayKey(date?) → 'YYYY-MM-DD'`, `touchStreak(state, day) → State`, `currentStreak(state, day) → number`
  - `recordAnswer(state, qid, correct, {reviewSession?}) → {state, xpGained}`, `reviewQueue(state) → string[]`
  - `useHint(state, exid) → State`, `revealSolution(state, exid) → State`, `markPassed(state, exid) → {state, xpGained}`
  - `moduleMastery(state, mod) → {percent, known, quizTotal, passed, exTotal, mastered}` where `mod = {id, quiz:[{id}], exercises:[{id, lang}]}`
  - `earnedBadges(state, mods) → string[]`, `awardBadges(state, mods) → {state, newBadges}` (badge ids look like `mastered:<moduleId>`, `perfect:…`, `nohints:…`, `polyglot:…`)
  - `setSetting(state, key, value) → State`, `setLastVisited(state, hash) → State`
  - `load(storage?) → State`, `save(state, storage?) → boolean`, `exportState(state) → string`, `importState(json) → State` (throws on invalid input)

- [ ] **Step 1: Scaffold the repo files**

`package.json`:
```json
{
  "name": "oop-mastery",
  "private": true,
  "type": "module",
  "description": "Master object-oriented programming in C++ and Python",
  "scripts": {
    "test": "node --test \"tests/*.test.mjs\"",
    "validate": "node scripts/validate-content.mjs",
    "check": "node scripts/test-solutions.mjs",
    "serve": "python -m http.server 8000"
  }
}
```
`.gitattributes`:
```
* text=auto eol=lf
```
`.gitignore`:
```
node_modules/
_site/
*.exe
.DS_Store
```

- [ ] **Step 2: Write the failing tests** — `tests/state.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/state.js';

const mod = {
  id: 'm',
  quiz: [{ id: 'm-q1' }, { id: 'm-q2' }],
  exercises: [{ id: 'm-e1', lang: 'cpp' }, { id: 'm-e2', lang: 'python' }],
};

test('mergeState survives garbage and old shapes', () => {
  assert.deepEqual(S.mergeState(null), S.defaultState());
  assert.deepEqual(S.mergeState('x'), S.defaultState());
  const m = S.mergeState({ xp: -5, settings: { lang: 'rust' }, badges: ['a', 3], streak: { count: 'x' } });
  assert.equal(m.xp, 0);
  assert.equal(m.settings.lang, 'both');
  assert.equal(m.settings.theme, 'auto');
  assert.deepEqual(m.badges, ['a']);
  assert.equal(m.streak.count, 0);
});

test('load falls back to defaults on bad JSON and throwing storage', () => {
  assert.deepEqual(S.load({ getItem: () => '{not json' }), S.defaultState());
  assert.deepEqual(S.load({ getItem: () => { throw new Error('denied'); } }), S.defaultState());
  assert.deepEqual(S.load({ getItem: () => null }), S.defaultState());
  assert.equal(S.save(S.defaultState(), { setItem: () => { throw new Error('quota'); } }), false);
});

test('save/load round trip', () => {
  const mem = {};
  const storage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  const s = { ...S.defaultState(), xp: 42 };
  assert.equal(S.save(s, storage), true);
  assert.equal(S.load(storage).xp, 42);
});

test('levelFor maps XP to levels', () => {
  assert.equal(S.levelFor(0).level, 1);
  assert.equal(S.levelFor(99).level, 1);
  assert.equal(S.levelFor(100).level, 2);
  assert.equal(S.levelFor(175).progress, 0.5);
  const top = S.levelFor(1e9);
  assert.equal(top.level, S.LEVEL_XP.length);
  assert.equal(top.next, null);
  assert.equal(top.progress, 1);
});

test('streak increments on consecutive days and resets after a gap', () => {
  let s = S.defaultState();
  s = S.touchStreak(s, '2026-10-01');
  s = S.touchStreak(s, '2026-10-01');
  assert.equal(s.streak.count, 1);
  s = S.touchStreak(s, '2026-10-02');
  assert.equal(s.streak.count, 2);
  assert.equal(S.currentStreak(s, '2026-10-03'), 2);
  assert.equal(S.currentStreak(s, '2026-10-04'), 0);
  s = S.touchStreak(s, '2026-10-05');
  assert.equal(s.streak.count, 1);
  // month boundary
  let t = S.touchStreak(S.defaultState(), '2026-09-30');
  t = S.touchStreak(t, '2026-10-01');
  assert.equal(t.streak.count, 2);
});

test('recordAnswer awards XP once: 10 first try, 5 after a miss', () => {
  let r = S.recordAnswer(S.defaultState(), 'q', true);
  assert.equal(r.xpGained, 10);
  r = S.recordAnswer(r.state, 'q', true);
  assert.equal(r.xpGained, 0);
  let w = S.recordAnswer(S.defaultState(), 'q', false);
  assert.equal(w.xpGained, 0);
  w = S.recordAnswer(w.state, 'q', true);
  assert.equal(w.xpGained, 5);
  assert.equal(w.state.xp, 5);
  assert.equal(w.state.questions.q.firstTryCorrect, false);
});

test('review queue: miss → box 1, two different review sessions clear it', () => {
  let s = S.recordAnswer(S.defaultState(), 'q', false).state;
  assert.deepEqual(S.reviewQueue(s), ['q']);
  s = S.recordAnswer(s, 'q', true, { reviewSession: 'r1' }).state;
  assert.equal(s.review.q.box, 2);
  s = S.recordAnswer(s, 'q', true, { reviewSession: 'r1' }).state; // same session: no progress
  assert.equal(s.review.q.box, 2);
  s = S.recordAnswer(s, 'q', true, { reviewSession: 'r2' }).state;
  assert.deepEqual(S.reviewQueue(s), []);
  // a miss in review resets to box 1
  s = S.recordAnswer(s, 'q', false, { reviewSession: 'r3' }).state;
  assert.equal(s.review.q.box, 1);
  // correct outside review does not advance
  s = S.recordAnswer(s, 'q', true).state;
  assert.equal(s.review.q.box, 1);
});

test('markPassed XP: 50 minus 10 per hint, 0 when revealed, once only', () => {
  let s = S.useHint(S.useHint(S.defaultState(), 'e'), 'e');
  let r = S.markPassed(s, 'e');
  assert.equal(r.xpGained, 30);
  assert.equal(S.markPassed(r.state, 'e').xpGained, 0);
  const rev = S.markPassed(S.revealSolution(S.defaultState(), 'e'), 'e');
  assert.equal(rev.xpGained, 0);
  assert.equal(rev.state.exercises.e.passed, true);
  let many = S.defaultState();
  for (let i = 0; i < 7; i++) many = S.useHint(many, 'e');
  assert.equal(S.markPassed(many, 'e').xpGained, 0);
});

test('moduleMastery is 50/50 and mastered needs >=90 and all exercises', () => {
  let s = S.defaultState();
  assert.equal(S.moduleMastery(s, mod).percent, 0);
  s = S.recordAnswer(s, 'm-q1', true).state;
  s = S.recordAnswer(s, 'm-q2', true).state;
  s = S.markPassed(s, 'm-e1').state;
  const m = S.moduleMastery(s, mod);
  assert.equal(m.percent, 75);
  assert.equal(m.mastered, false);
  s = S.markPassed(s, 'm-e2').state;
  assert.equal(S.moduleMastery(s, mod).mastered, true);
  // latest wrong answer lowers mastery
  s = S.recordAnswer(s, 'm-q1', false).state;
  assert.equal(S.moduleMastery(s, mod).percent, 75);
  // empty quiz (final module) uses exercises only
  assert.equal(S.moduleMastery(s, { id: 'f', quiz: [], exercises: mod.exercises }).percent, 100);
});

test('awardBadges returns only new badges', () => {
  let s = S.defaultState();
  s = S.recordAnswer(s, 'm-q1', true).state;
  s = S.recordAnswer(s, 'm-q2', true).state;
  s = S.markPassed(s, 'm-e1').state;
  s = S.markPassed(s, 'm-e2').state;
  const r = S.awardBadges(s, [mod]);
  assert.deepEqual(r.newBadges.sort(), ['mastered:m', 'nohints:m', 'perfect:m', 'polyglot:m']);
  assert.deepEqual(S.awardBadges(r.state, [mod]).newBadges, []);
});

test('importState validates and exportState round-trips', () => {
  const s = { ...S.defaultState(), xp: 7 };
  assert.equal(S.importState(S.exportState(s)).xp, 7);
  assert.throws(() => S.importState('nope'));
  assert.throws(() => S.importState('{"foo":1}'), /progress file/);
});

test('setSetting and setLastVisited', () => {
  const s = S.setSetting(S.defaultState(), 'lang', 'cpp');
  assert.equal(s.settings.lang, 'cpp');
  assert.equal(S.setLastVisited(s, '#/m/x/quiz').lastVisited, '#/m/x/quiz');
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '.../js/state.js'`.

- [ ] **Step 4: Implement** — `js/state.js`

```js
// Progress model. Everything except load/save is pure: (state, ...) -> new state.
export const STORAGE_KEY = 'oop-mastery:v1';
export const LEVEL_XP = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 6500, 8500, 11000];
export const LEVEL_TITLES = ['Novice', 'Apprentice', 'Object Wrangler', 'Class Crafter', 'Encapsulator',
  'Inheritor', 'Polymorph', 'Abstractionist', 'RAII Ranger', 'MRO Navigator', 'Pattern Smith',
  'SOLID Architect', 'OOP Master'];
export const BADGE_LABELS = {
  mastered: 'Mastered', perfect: 'Perfect quiz', nohints: 'No hints needed', polyglot: 'Polyglot',
};

export function defaultState() {
  return {
    version: 1,
    xp: 0,
    settings: { lang: 'both', theme: 'auto' },
    streak: { count: 0, lastDay: null },
    questions: {}, // qid -> {attempts, lastCorrect, everCorrect, firstTryCorrect}
    exercises: {}, // exid -> {passed, hintsUsed, solutionRevealed, xpAwarded}
    review: {}, // qid -> {box: 1|2, lastSession}
    badges: [],
    lastVisited: null,
  };
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function mergeState(raw) {
  const d = defaultState();
  if (!isObj(raw)) return d;
  return {
    version: 1,
    xp: Number.isFinite(raw.xp) && raw.xp >= 0 ? raw.xp : 0,
    settings: {
      lang: ['both', 'cpp', 'python'].includes(raw.settings?.lang) ? raw.settings.lang : d.settings.lang,
      theme: ['auto', 'light', 'dark'].includes(raw.settings?.theme) ? raw.settings.theme : d.settings.theme,
    },
    streak: {
      count: Number.isInteger(raw.streak?.count) && raw.streak.count >= 0 ? raw.streak.count : 0,
      lastDay: typeof raw.streak?.lastDay === 'string' ? raw.streak.lastDay : null,
    },
    questions: isObj(raw.questions) ? raw.questions : {},
    exercises: isObj(raw.exercises) ? raw.exercises : {},
    review: isObj(raw.review) ? raw.review : {},
    badges: Array.isArray(raw.badges) ? raw.badges.filter((b) => typeof b === 'string') : [],
    lastVisited: typeof raw.lastVisited === 'string' ? raw.lastVisited : null,
  };
}

export function levelFor(xp) {
  let i = 0;
  while (i + 1 < LEVEL_XP.length && xp >= LEVEL_XP[i + 1]) i++;
  const floor = LEVEL_XP[i];
  const next = LEVEL_XP[i + 1] ?? null;
  return {
    level: i + 1, title: LEVEL_TITLES[i], floor, next,
    progress: next === null ? 1 : (xp - floor) / (next - floor),
  };
}

export function dayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function prevDay(day) {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

export function touchStreak(state, day) {
  const { count, lastDay } = state.streak;
  if (lastDay === day) return state;
  return { ...state, streak: { count: lastDay === prevDay(day) ? count + 1 : 1, lastDay: day } };
}

export function currentStreak(state, day) {
  const { count, lastDay } = state.streak;
  return lastDay === day || lastDay === prevDay(day) ? count : 0;
}

export function recordAnswer(state, qid, correct, { reviewSession = null } = {}) {
  const prev = state.questions[qid] ?? { attempts: 0, lastCorrect: false, everCorrect: false, firstTryCorrect: false };
  const firstTry = prev.attempts === 0;
  const xpGained = correct && !prev.everCorrect ? (firstTry ? 10 : 5) : 0;
  const q = {
    attempts: prev.attempts + 1,
    lastCorrect: correct,
    everCorrect: prev.everCorrect || correct,
    firstTryCorrect: firstTry ? correct : prev.firstTryCorrect,
  };
  const review = { ...state.review };
  const entry = review[qid];
  if (!correct) {
    review[qid] = { box: 1, lastSession: reviewSession };
  } else if (entry && reviewSession && entry.lastSession !== reviewSession) {
    if (entry.box >= 2) delete review[qid];
    else review[qid] = { box: 2, lastSession: reviewSession };
  }
  return {
    state: { ...state, xp: state.xp + xpGained, questions: { ...state.questions, [qid]: q }, review },
    xpGained,
  };
}

export const reviewQueue = (state) => Object.keys(state.review);

const EX_DEFAULT = { passed: false, hintsUsed: 0, solutionRevealed: false, xpAwarded: false };
const exOf = (state, id) => ({ ...EX_DEFAULT, ...(state.exercises[id] ?? {}) });
const withEx = (state, id, patch) =>
  ({ ...state, exercises: { ...state.exercises, [id]: { ...exOf(state, id), ...patch } } });

export const useHint = (state, exid) => withEx(state, exid, { hintsUsed: exOf(state, exid).hintsUsed + 1 });
export const revealSolution = (state, exid) => withEx(state, exid, { solutionRevealed: true });

export function markPassed(state, exid) {
  const e = exOf(state, exid);
  const xpGained = e.xpAwarded || e.solutionRevealed ? 0 : Math.max(0, 50 - 10 * e.hintsUsed);
  const next = withEx(state, exid, { passed: true, xpAwarded: true });
  return { state: { ...next, xp: next.xp + xpGained }, xpGained };
}

export function moduleMastery(state, mod) {
  const quizTotal = mod.quiz.length;
  const exTotal = mod.exercises.length;
  const known = mod.quiz.filter((q) => state.questions[q.id]?.lastCorrect).length;
  const passed = mod.exercises.filter((e) => state.exercises[e.id]?.passed).length;
  let percent = 0;
  if (quizTotal && exTotal) percent = (50 * known) / quizTotal + (50 * passed) / exTotal;
  else if (quizTotal) percent = (100 * known) / quizTotal;
  else if (exTotal) percent = (100 * passed) / exTotal;
  percent = Math.round(percent);
  return { percent, known, quizTotal, passed, exTotal, mastered: percent >= 90 && passed === exTotal };
}

export function earnedBadges(state, mods) {
  const out = [];
  for (const m of mods) {
    if (moduleMastery(state, m).mastered) out.push(`mastered:${m.id}`);
    if (m.quiz.length && m.quiz.every((q) => state.questions[q.id]?.firstTryCorrect)) out.push(`perfect:${m.id}`);
    const ex = m.exercises.map((e) => state.exercises[e.id]);
    if (ex.length && ex.every((e) => e?.passed && !e.hintsUsed && !e.solutionRevealed)) out.push(`nohints:${m.id}`);
    const langs = new Set(m.exercises.filter((e) => state.exercises[e.id]?.passed).map((e) => e.lang));
    if (langs.has('cpp') && langs.has('python')) out.push(`polyglot:${m.id}`);
  }
  return out;
}

export function awardBadges(state, mods) {
  const have = new Set(state.badges);
  const newBadges = earnedBadges(state, mods).filter((b) => !have.has(b));
  return { state: newBadges.length ? { ...state, badges: [...state.badges, ...newBadges] } : state, newBadges };
}

export const setSetting = (state, key, value) => ({ ...state, settings: { ...state.settings, [key]: value } });
export const setLastVisited = (state, hash) => ({ ...state, lastVisited: hash });

export function load(storage) {
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(STORAGE_KEY);
    return raw ? mergeState(JSON.parse(raw)) : defaultState();
  } catch {
    return defaultState();
  }
}

export function save(state, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export const exportState = (state) => JSON.stringify(state, null, 2);

export function importState(json) {
  const raw = JSON.parse(json);
  if (!isObj(raw) || raw.version !== 1) throw new Error('Not an OOP Mastery progress file');
  return mergeState(raw);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: all `state.test.mjs` tests PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json .gitattributes .gitignore js/state.js tests/state.test.mjs
git commit -m "feat: project scaffold and progress model"
```

### Task 2: Shared test harness (`harness.js`)

**Files:**
- Create: `js/runners/harness.js`
- Test: `tests/harness.test.mjs`

**Interfaces:**
- Consumes: nothing (pure module, no DOM, no Node APIs).
- Produces:
  - `makeNonce() → string`, `notRun(tests, message?) → Result[]`, `cppString(s) → string` (C++ string literal)
  - `cppHasMain(code) → boolean`
  - `cppPrelude(nonce) → string`. It defines `EXPECT(cond)`, `EXPECT_EQ(a,b)`, `EXPECT_NEAR(a,b,eps)`, `EXPECT_THROWS(expr, ExType)` and `captureCout(fn) → std::string`.
  - `buildCppProgram(userCode, tests, nonce) → {program, userStartLine}`
  - `mapCppDiagnostics(text, userStartLine, userLineCount) → string`, `hasCompileError(text) → boolean`
  - `parseCppOutput(stdout, nonce) → {markers:[{name,status,message}], userOutput}`
  - `normalizeCppResult(raw, tests, nonce, userStartLine, userLineCount) → RunResult`, where `raw = {compiled, compilerOutput, stdout, stderr, exitCode, signal, timedOut}`
  - `wandboxToRaw(json) → raw`, `godboltToRaw(json) → raw`
  - `mainNotAllowed(tests) → RunResult`
  - `PY_HARNESS: string`. This Python source defines `run_all(payload_json) → json`, where the payload is `{code, tests:[{name, code}]}`, and it provides `capture(fn, *a, **kw) → str` to test code.
  - `normalizePythonResult(jsonOrObj, tests) → RunResult`

**How exercise tests are written (contract for all content):**
- **C++:** each `tests[i].code` is the *body* of a lambda that runs inside `main()`, after the learner's code. It uses the `EXPECT*` macros, and `captureCout([&]{ ... })` to check printed output. Compare strings as `std::string`, never as `const char*`.
- **Python:** each `tests[i].code` is a script that runs in a fresh namespace after the learner's code has executed. It uses `assert cond, "message"`, and `capture(fn)` to check printed output. Blocks guarded by `if __name__ == "__main__":` do **not** run during tests (the module name is `solution`).

- [ ] **Step 1: Write the failing tests** — `tests/harness.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../js/runners/harness.js';

const tests = [{ name: 'a', code: 'EXPECT(1 == 1);' }, { name: 'b|c "q"', code: 'EXPECT(2 == 2);' }, { name: 'd', code: '' }];

test('cppString escapes quotes, backslashes and newlines', () => {
  assert.equal(H.cppString('a"b\\c\nd'), '"a\\"b\\\\c\\nd"');
});

test('cppHasMain detects a main function', () => {
  assert.equal(H.cppHasMain('int main() { return 0; }'), true);
  assert.equal(H.cppHasMain('int  main (void){}'), true);
  assert.equal(H.cppHasMain('int domain() { return 1; } // main idea'), false);
});

test('buildCppProgram: userStartLine points at the first user line and names are embedded', () => {
  const nonce = 'n0nce';
  const { program, userStartLine } = H.buildCppProgram('class Dog {};\nint x = 1;', tests, nonce);
  const lines = program.split('\n');
  assert.equal(lines[userStartLine - 1], 'class Dog {};');
  assert.equal(lines[userStartLine], 'int x = 1;');
  assert.match(program, /::oopm::run\("b\|c \\"q\\"", \[&\] \{/);
  assert.match(program, /@@TEST:n0nce\|/);
  assert.match(program, /int main\(\) \{/);
});

test('parseCppOutput ignores fake markers and keeps user output', () => {
  const out = 'hello\n@@TEST|fake|PASS|\nno newline\n@@TEST:N|a|PASS|\n\n@@TEST:N|b c  q |FAIL|expected: x\n';
  const { markers, userOutput } = H.parseCppOutput(out, 'N');
  assert.equal(markers.length, 2);
  assert.deepEqual(markers[1], { name: 'b c  q ', status: 'fail', message: 'expected: x' });
  assert.equal(userOutput, 'hello\n@@TEST|fake|PASS|\nno newline');
});

test('normalizeCppResult: all pass', () => {
  const raw = { compiled: true, compilerOutput: '', stdout: '\n@@TEST:N|a|PASS|\n\n@@TEST:N|b|PASS|\n\n@@TEST:N|d|PASS|\n', stderr: '', exitCode: 0, signal: '', timedOut: false };
  const r = H.normalizeCppResult(raw, tests, 'N', 40, 2);
  assert.equal(r.ok, true);
  assert.equal(r.phase, 'tests');
  assert.deepEqual(r.results.map((x) => x.status), ['pass', 'pass', 'pass']);
  assert.equal(r.results[1].name, tests[1].name); // names come from the test list, not the marker
});

test('normalizeCppResult: compile error remaps line numbers', () => {
  const raw = { compiled: false, compilerOutput: "prog.cc:42:5: error: 'Dog' has no member 'bark'\nprog.cc:10:1: note: in harness\nprog.cc:50:3: error: in tests\nprog.cc: In function 'int main()':", stdout: '', stderr: '', exitCode: 1, signal: '', timedOut: false };
  const r = H.normalizeCppResult(raw, tests, 'N', 40, 5);
  assert.equal(r.phase, 'compile');
  assert.equal(r.ok, false);
  assert.match(r.message, /your code:3:5: error/);
  assert.match(r.message, /harness:10/);
  assert.match(r.message, /test code: error: in tests/);
  assert.match(r.message, /your program: In function/);
  assert.deepEqual(r.results.map((x) => x.status), ['notrun', 'notrun', 'notrun']);
});

test('normalizeCppResult: crash marks remaining tests not run', () => {
  const raw = { compiled: true, compilerOutput: '', stdout: '\n@@TEST:N|a|PASS|\n', stderr: '', exitCode: 139, signal: 'Segmentation fault', timedOut: false };
  const r = H.normalizeCppResult(raw, tests, 'N', 40, 2);
  assert.equal(r.ok, false);
  assert.equal(r.phase, 'runtime');
  assert.match(r.message, /crashed during "b\|c "q""/);
  assert.match(r.message, /Segmentation fault/);
  assert.deepEqual(r.results.map((x) => x.status), ['pass', 'notrun', 'notrun']);
});

test('normalizeCppResult: timeout', () => {
  const raw = { compiled: true, compilerOutput: '', stdout: '', stderr: '', exitCode: null, signal: '', timedOut: true };
  const r = H.normalizeCppResult(raw, tests, 'N', 40, 2);
  assert.equal(r.phase, 'timeout');
  assert.match(r.message, /infinite loop/);
});

test('wandboxToRaw and godboltToRaw adapt real response shapes', () => {
  const ok = H.wandboxToRaw({ status: '0', signal: '', compiler_error: 'prog.cc:3:7: warning: unused variable', program_output: 'hi\n', program_error: '' });
  assert.deepEqual(ok, { compiled: true, compilerOutput: 'prog.cc:3:7: warning: unused variable', stdout: 'hi\n', stderr: '', exitCode: 0, signal: '', timedOut: false });
  const bad = H.wandboxToRaw({ status: '1', compiler_error: "prog.cc:4:26: error: expected ';'", program_output: '' });
  assert.equal(bad.compiled, false);
  const link = H.wandboxToRaw({ status: '1', compiler_error: 'collect2: error: ld returned 1 exit status' });
  assert.equal(link.compiled, false);
  const gb = H.godboltToRaw({ code: 0, didExecute: true, stdout: [{ text: '@@TEST:N|a|PASS|' }, { text: '1' }], stderr: [], buildResult: { code: 0, stderr: [] }, timedOut: false });
  assert.equal(gb.compiled, true);
  assert.equal(gb.stdout, '@@TEST:N|a|PASS|\n1');
  const gbBad = H.godboltToRaw({ code: -1, stdout: [], stderr: [{ text: 'Build failed' }], buildResult: { code: 1, stderr: [{ text: '<source>:2:26: error: x' }] } });
  assert.equal(gbBad.compiled, false);
  assert.equal(gbBad.compilerOutput, '<source>:2:26: error: x');
});

test('mainNotAllowed explains the rule', () => {
  const r = H.mainNotAllowed(tests);
  assert.equal(r.phase, 'compile');
  assert.match(r.message, /main\(\)/);
});

test('normalizePythonResult maps the harness JSON', () => {
  const pt = [{ name: 'x', code: '' }, { name: 'y', code: '' }];
  const syntax = H.normalizePythonResult({ compileError: 'SyntaxError: bad', runtimeError: null, results: [], stdout: '' }, pt);
  assert.equal(syntax.phase, 'compile');
  assert.deepEqual(syntax.results.map((r) => r.status), ['notrun', 'notrun']);
  const rt = H.normalizePythonResult(JSON.stringify({ compileError: null, runtimeError: 'NameError: q', results: [], stdout: 'partial' }), pt);
  assert.equal(rt.phase, 'runtime');
  assert.equal(rt.stdout, 'partial');
  const mixed = H.normalizePythonResult({ compileError: null, runtimeError: null, stdout: '', results: [{ name: 'x', status: 'pass', message: '' }, { name: 'y', status: 'fail', message: 'boom' }] }, pt);
  assert.equal(mixed.ok, false);
  assert.equal(mixed.phase, 'tests');
  const all = H.normalizePythonResult({ compileError: null, runtimeError: null, stdout: '', results: [{ name: 'x', status: 'pass', message: '' }, { name: 'y', status: 'pass', message: '' }] }, pt);
  assert.equal(all.ok, true);
});

test('PY_HARNESS defines run_all and capture', () => {
  assert.match(H.PY_HARNESS, /def run_all\(payload_json\):/);
  assert.match(H.PY_HARNESS, /def capture\(fn/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '.../js/runners/harness.js'`.

- [ ] **Step 3: Implement** — `js/runners/harness.js` (write it with the Write tool, since it is full of escapes)

```js
// Pure helpers shared by the browser runners and the Node content checker.
// No DOM and no Node APIs in this file.

export function makeNonce() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const notRun = (tests, message = '') => tests.map((t) => ({ name: t.name, status: 'notrun', message }));

export const cppString = (s) =>
  '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';

export const cppHasMain = (code) => /\bint\s+main\s*\(/.test(code);

export function mainNotAllowed(tests) {
  return {
    ok: false, phase: 'compile', results: notRun(tests), stdout: '',
    message: 'Remove your main() function: the test runner supplies its own main() and calls your classes directly.',
  };
}

export function cppPrelude(nonce) {
  return [
    '#include <iostream>',
    '#include <sstream>',
    '#include <string>',
    '#include <functional>',
    '#include <stdexcept>',
    '#include <type_traits>',
    '#include <cmath>',
    'namespace oopm {',
    'struct Failure { std::string msg; };',
    'template <class T> std::string show(const T& v) {',
    '  if constexpr (requires(std::ostream& o, const T& x) { o << x; }) { std::ostringstream s; s << v; return s.str(); }',
    '  else return "<value>";',
    '}',
    'inline std::string captureCout(const std::function<void()>& fn) {',
    '  std::ostringstream buf; auto* old = std::cout.rdbuf(buf.rdbuf());',
    '  try { fn(); } catch (...) { std::cout.rdbuf(old); throw; }',
    '  std::cout.rdbuf(old); return buf.str();',
    '}',
    "inline std::string clean(std::string s) { for (char& c : s) if (c == '\\n' || c == '\\r' || c == '|') c = ' '; return s; }",
    'inline void run(const char* name, const std::function<void()>& fn) {',
    '  std::string status = "PASS", msg;',
    '  try { fn(); }',
    '  catch (const Failure& f) { status = "FAIL"; msg = f.msg; }',
    '  catch (const std::exception& e) { status = "FAIL"; msg = std::string("uncaught exception: ") + e.what(); }',
    '  catch (...) { status = "FAIL"; msg = "uncaught non-standard exception"; }',
    `  std::cout << "\\n@@TEST:${nonce}|" << clean(name) << "|" << status << "|" << clean(msg) << std::endl;`,
    '}',
    '} // namespace oopm',
    '#define EXPECT(cond) do { if (!(cond)) throw ::oopm::Failure{"expected: " #cond}; } while (0)',
    '#define EXPECT_EQ(a, b) do { auto&& oopm_a = (a); auto&& oopm_b = (b); if (!(oopm_a == oopm_b)) throw ::oopm::Failure{std::string("expected " #a " == " #b ", got ") + ::oopm::show(oopm_a) + " vs " + ::oopm::show(oopm_b)}; } while (0)',
    '#define EXPECT_NEAR(a, b, eps) do { double oopm_a = (a), oopm_b = (b); if (std::fabs(oopm_a - oopm_b) > (eps)) throw ::oopm::Failure{std::string("expected " #a " ~= " #b ", got ") + std::to_string(oopm_a) + " vs " + std::to_string(oopm_b)}; } while (0)',
    '#define EXPECT_THROWS(expr, ExType) do { bool oopm_t = false; try { (void)(expr); } catch (const ExType&) { oopm_t = true; } catch (...) {} if (!oopm_t) throw ::oopm::Failure{"expected " #expr " to throw " #ExType}; } while (0)',
    'using ::oopm::captureCout;',
  ].join('\n');
}

export function buildCppProgram(userCode, tests, nonce) {
  const head = `${cppPrelude(nonce)}\n// ---- your code ----\n`;
  const userStartLine = head.split('\n').length;
  const body = tests.map((t) => `  ::oopm::run(${cppString(t.name)}, [&] {\n${t.code}\n  });`).join('\n');
  const program = `${head}${userCode}\n// ---- tests ----\nint main() {\n${body}\n  return 0;\n}\n`;
  return { program, userStartLine };
}

const FILE_RE = '(?:prog\\.cc|<source>|main\\.cpp|example\\.cpp)';

export function mapCppDiagnostics(text, userStartLine, userLineCount) {
  return text
    .replace(new RegExp(`${FILE_RE}:(\\d+)(?::(\\d+))?`, 'g'), (_, l, c) => {
      const line = Number(l);
      if (line < userStartLine) return `harness:${line}`;
      if (line >= userStartLine + userLineCount) return 'test code';
      return `your code:${line - userStartLine + 1}${c ? `:${c}` : ''}`;
    })
    .replace(new RegExp(`${FILE_RE}:(?=\\s)`, 'g'), 'your program:');
}

export const hasCompileError = (text) => /(^|[\s:])(fatal )?error:/m.test(text || '');

export function parseCppOutput(stdout, nonce) {
  const tag = `@@TEST:${nonce}|`;
  const markers = [];
  const user = [];
  for (const line of stdout.replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith(tag)) {
      const [name, status, ...rest] = line.slice(tag.length).split('|');
      markers.push({ name, status: status === 'PASS' ? 'pass' : 'fail', message: rest.join('|') });
      if (user.length && user[user.length - 1] === '') user.pop(); // separator newline emitted by the harness
    } else {
      user.push(line);
    }
  }
  return { markers, userOutput: user.join('\n').replace(/\n+$/, '') };
}

export function normalizeCppResult(raw, tests, nonce, userStartLine, userLineCount) {
  if (!raw.compiled) {
    const message = mapCppDiagnostics(raw.compilerOutput || '', userStartLine, userLineCount).trim();
    return { ok: false, phase: 'compile', message: message || 'Compilation failed.', results: notRun(tests), stdout: '' };
  }
  const { markers, userOutput } = parseCppOutput(raw.stdout || '', nonce);
  const results = tests.map((t, i) => (markers[i]
    ? { name: t.name, status: markers[i].status, message: markers[i].message }
    : { name: t.name, status: 'notrun', message: '' }));
  let phase = 'tests';
  let message = '';
  if (markers.length < tests.length) {
    const at = tests[markers.length].name;
    if (raw.timedOut) {
      phase = 'timeout';
      message = `Your program ran too long and was stopped during "${at}". Look for an infinite loop or unbounded recursion.`;
      results[markers.length].message = 'timed out here';
    } else {
      phase = 'runtime';
      const why = raw.signal ? ` (${raw.signal})` : raw.exitCode ? ` (exit code ${raw.exitCode})` : '';
      message = `Your program crashed during "${at}"${why}. Common causes: dereferencing a null or dangling pointer, deleting twice, or out-of-range access.`;
      if (raw.stderr && raw.stderr.trim()) message += `\n${raw.stderr.trim()}`;
      results[markers.length].message = 'crashed here';
    }
  }
  const ok = phase === 'tests' && results.length > 0 && results.every((r) => r.status === 'pass');
  return { ok, phase, message, results, stdout: userOutput };
}

export function wandboxToRaw(d) {
  const compilerOutput = d.compiler_error || '';
  return {
    compiled: !hasCompileError(compilerOutput),
    compilerOutput,
    stdout: d.program_output || '',
    stderr: d.program_error || '',
    exitCode: Number(d.status ?? 0),
    signal: d.signal || '',
    timedOut: /time ?out|killed/i.test(d.signal || ''),
  };
}

export function godboltToRaw(d) {
  const b = d.buildResult ?? d;
  const text = (arr) => (arr || []).map((x) => x.text).join('\n');
  return {
    compiled: b.code === 0,
    compilerOutput: text(b.stderr),
    stdout: text(d.stdout),
    stderr: text(d.stderr),
    exitCode: d.code,
    signal: '',
    timedOut: !!d.timedOut,
  };
}

export const PY_HARNESS = String.raw`
import json, io, sys, types, traceback, contextlib

def _fresh_namespace():
    # A real module in sys.modules, so dataclasses/typing can resolve cls.__module__.
    mod = types.ModuleType('solution')
    sys.modules['solution'] = mod
    return mod.__dict__

def capture(fn, *args, **kwargs):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        fn(*args, **kwargs)
    return buf.getvalue()

def _where(exc, sources):
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename in sources]
    if not frames:
        return ''
    f = frames[-1]
    lines = sources[f.filename].splitlines()
    text = lines[f.lineno - 1].strip() if f.lineno and 0 < f.lineno <= len(lines) else ''
    label = 'your code' if f.filename == '<your code>' else 'test'
    return label + ' line ' + str(f.lineno) + ': ' + text

def run_all(payload_json):
    payload = json.loads(payload_json)
    code, tests = payload['code'], payload['tests']
    out = {'compileError': None, 'runtimeError': None, 'results': [], 'stdout': ''}
    try:
        compiled = compile(code, '<your code>', 'exec')
    except SyntaxError as e:
        out['compileError'] = type(e).__name__ + ': ' + str(e.msg) + ' (your code line ' + str(e.lineno) + ')'
        return json.dumps(out)
    first = io.StringIO()
    try:
        with contextlib.redirect_stdout(first):
            exec(compiled, _fresh_namespace())
    except BaseException as e:
        out['stdout'] = first.getvalue()
        where = _where(e, {'<your code>': code})
        out['runtimeError'] = (type(e).__name__ + ': ' + str(e) + '\n' + where).strip()
        return json.dumps(out)
    out['stdout'] = first.getvalue()
    for t in tests:
        sources = {'<your code>': code, '<test>': t['code']}
        ns = _fresh_namespace()
        ns['capture'] = capture
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                exec(compiled, ns)
                exec(compile(t['code'], '<test>', 'exec'), ns)
            out['results'].append({'name': t['name'], 'status': 'pass', 'message': ''})
        except AssertionError as e:
            msg = str(e) or 'assertion failed'
            out['results'].append({'name': t['name'], 'status': 'fail', 'message': msg + ' (' + _where(e, sources) + ')'})
        except BaseException as e:
            out['results'].append({'name': t['name'], 'status': 'fail',
                                   'message': type(e).__name__ + ': ' + str(e) + ' (' + _where(e, sources) + ')'})
    return json.dumps(out)
`;

export function normalizePythonResult(json, tests) {
  const r = typeof json === 'string' ? JSON.parse(json) : json;
  if (r.compileError) return { ok: false, phase: 'compile', message: r.compileError, results: notRun(tests), stdout: '' };
  if (r.runtimeError) return { ok: false, phase: 'runtime', message: r.runtimeError, results: notRun(tests), stdout: r.stdout || '' };
  const results = tests.map((t, i) => (r.results[i]
    ? { name: t.name, status: r.results[i].status, message: r.results[i].message }
    : { name: t.name, status: 'notrun', message: '' }));
  const ok = results.length > 0 && results.every((x) => x.status === 'pass');
  return { ok, phase: 'tests', message: '', results, stdout: r.stdout || '' };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: `state.test.mjs` and `harness.test.mjs` all PASS.

- [ ] **Step 5: Commit**

```bash
git add js/runners/harness.js tests/harness.test.mjs
git commit -m "feat: shared C++/Python test harness with result normalization"
```

### Task 3: Local runners for Node (g++ / CPython)

**Files:**
- Create: `scripts/lib/proc.mjs`, `scripts/lib/local-runners.mjs`
- Test: `tests/local-runners.test.mjs`

**Interfaces:**
- Consumes (from `js/runners/harness.js`): `makeNonce`, `buildCppProgram`, `normalizeCppResult`, `cppHasMain`, `mainNotAllowed`, `PY_HARNESS`, `normalizePythonResult`, `notRun`.
- Produces:
  - `runProcess(cmd, args, {cwd?, input?, timeoutMs?, env?}) → Promise<{code, signal, stdout, stderr, timedOut, error?}>`. Stdout is capped at 1 MB; past that the process is killed.
  - `PYTHON`, `CXX` (resolved executables)
  - `runCppLocal(code, tests, {timeoutMs?}) → Promise<RunResult>`
  - `runPythonLocal(code, tests, {timeoutMs?}) → Promise<RunResult>`
  - `runProgramLocal(lang, code, {timeoutMs?}) → Promise<{ok, stdout, stderr}>`. Runs a complete program; used for output MCQs.

- [ ] **Step 1: Write the failing tests** — `tests/local-runners.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCppLocal, runPythonLocal, runProgramLocal } from '../scripts/lib/local-runners.mjs';

const pyTests = [
  { name: 'speak', code: 'assert Dog("Rex").speak() == "Rex says woof", "speak() text"' },
  { name: 'prints', code: 'out = capture(Dog("A").announce)\nassert out == "A is here\\n", repr(out)' },
];
const pyGood = 'class Dog:\n    def __init__(self, name):\n        self.name = name\n    def speak(self):\n        return f"{self.name} says woof"\n    def announce(self):\n        print(f"{self.name} is here")\nprint("top-level output")\nif __name__ == "__main__":\n    raise SystemExit("main guard must not run")\n';

test('python: passing solution', async () => {
  const r = await runPythonLocal(pyGood, pyTests);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.stdout, 'top-level output\n');
});

test('python: assertion failure reports message and test line', async () => {
  const bad = pyGood.replace('says woof', 'says meow');
  const r = await runPythonLocal(bad, pyTests);
  assert.equal(r.ok, false);
  assert.equal(r.results[0].status, 'fail');
  assert.match(r.results[0].message, /speak\(\) text \(test line 1/);
  assert.equal(r.results[1].status, 'pass');
});

test('python: syntax error, top-level error, sys.exit', async () => {
  assert.equal((await runPythonLocal('class Dog(:\n  pass', pyTests)).phase, 'compile');
  const rt = await runPythonLocal('x = undefined_name', pyTests);
  assert.equal(rt.phase, 'runtime');
  assert.match(rt.message, /NameError/);
  assert.equal((await runPythonLocal('import sys\nsys.exit(1)', pyTests)).phase, 'runtime');
});

test('python: dataclasses work inside the harness namespace', async () => {
  const code = 'from dataclasses import dataclass, field\n@dataclass(order=True)\nclass P:\n    x: int\n    tags: list = field(default_factory=list)\n';
  const r = await runPythonLocal(code, [{ name: 'eq', code: 'assert P(1) == P(1)' }, { name: 'order', code: 'assert P(1) < P(2)' }]);
  assert.equal(r.ok, true, JSON.stringify(r));
});

test('python: infinite loop times out', async () => {
  const r = await runPythonLocal('while True:\n    pass', pyTests, { timeoutMs: 2000 });
  assert.equal(r.phase, 'timeout');
});

const cppTests = [
  { name: 'speak', code: 'Dog d("Rex");\nEXPECT_EQ(d.speak(), std::string("Rex says woof"));' },
  { name: 'prints', code: 'Dog d("A");\nEXPECT_EQ(captureCout([&]{ d.announce(); }), std::string("A is here\\n"));' },
];
const cppGood = '#include <iostream>\n#include <string>\nclass Dog {\n  std::string name_;\npublic:\n  explicit Dog(std::string n) : name_(std::move(n)) {}\n  std::string speak() const { return name_ + " says woof"; }\n  void announce() const { std::cout << name_ << " is here\\n"; }\n};\n';

test('cpp: passing solution', async () => {
  const r = await runCppLocal(cppGood, cppTests);
  assert.equal(r.ok, true, JSON.stringify(r));
});

test('cpp: failing test shows expected vs got', async () => {
  const r = await runCppLocal(cppGood.replace('says woof', 'says meow'), cppTests);
  assert.equal(r.ok, false);
  assert.equal(r.phase, 'tests');
  assert.match(r.results[0].message, /got Rex says meow vs Rex says woof/);
  assert.equal(r.results[1].status, 'pass');
});

test('cpp: compile error is mapped to the learner line', async () => {
  const r = await runCppLocal('class Dog {\n  int x\n};\n', cppTests);
  assert.equal(r.phase, 'compile');
  assert.match(r.message, /your code:\d+/);
});

test('cpp: crash and timeout', async () => {
  const crash = await runCppLocal(cppGood + '#include <cstdlib>\n', [{ name: 'ok', code: 'EXPECT(true);' }, { name: 'boom', code: 'std::abort();' }, { name: 'after', code: 'EXPECT(true);' }]);
  assert.equal(crash.phase, 'runtime');
  assert.deepEqual(crash.results.map((x) => x.status), ['pass', 'notrun', 'notrun']);
  const loop = await runCppLocal(cppGood, [{ name: 'spin', code: 'volatile int x = 0; while (true) { x = x + 1; }' }], { timeoutMs: 2000 });
  assert.equal(loop.phase, 'timeout');
});

test('cpp: main() is rejected with a friendly message', async () => {
  const r = await runCppLocal(cppGood + 'int main() { return 0; }\n', cppTests);
  assert.equal(r.phase, 'compile');
  assert.match(r.message, /Remove your main\(\)/);
});

test('runProgramLocal runs whole programs in both languages', async () => {
  const py = await runProgramLocal('python', 'print("hi")\nprint(1 + 1)\n');
  assert.deepEqual([py.ok, py.stdout.replace(/\r\n/g, '\n')], [true, 'hi\n2\n']);
  const cpp = await runProgramLocal('cpp', '#include <iostream>\nint main() { std::cout << "hi\\n" << 2 << "\\n"; }\n');
  assert.deepEqual([cpp.ok, cpp.stdout], [true, 'hi\n2\n']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/local-runners.test.mjs`
Expected: FAIL with `Cannot find module '.../scripts/lib/local-runners.mjs'`.

- [ ] **Step 3: Implement** — `scripts/lib/proc.mjs`

```js
import { spawn } from 'node:child_process';

const MAX_OUTPUT = 1_000_000;

// Spawns a process, feeds optional stdin, and resolves (never rejects) with its outcome.
export function runProcess(cmd, args, { cwd, input, timeoutMs = 20000, env } = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    const finish = (res) => { if (!settled) { settled = true; clearTimeout(timer); resolve(res); } };
    let child;
    try {
      child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, windowsHide: true });
    } catch (error) {
      resolve({ code: null, signal: null, stdout, stderr: String(error), timedOut, error });
      return;
    }
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    child.stdout.setEncoding('utf8').on('data', (d) => {
      stdout += d;
      if (stdout.length > MAX_OUTPUT) { stdout = stdout.slice(0, MAX_OUTPUT); child.kill('SIGKILL'); }
    });
    child.stderr.setEncoding('utf8').on('data', (d) => { if (stderr.length < MAX_OUTPUT) stderr += d; });
    child.on('error', (error) => finish({ code: null, signal: null, stdout, stderr: stderr + String(error), timedOut, error }));
    child.on('close', (code, signal) => finish({ code, signal, stdout, stderr, timedOut }));
    child.stdin.on('error', () => {});
    child.stdin.end(input ?? '');
  });
}
```

- [ ] **Step 4: Implement** — `scripts/lib/local-runners.mjs`

```js
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runProcess } from './proc.mjs';
import {
  makeNonce, buildCppProgram, normalizeCppResult, cppHasMain, mainNotAllowed,
  PY_HARNESS, normalizePythonResult, notRun,
} from '../../js/runners/harness.js';

export const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
export const CXX = process.env.CXX || 'g++';
const EXE = process.platform === 'win32' ? 'main.exe' : 'main';
const PY_ENV = { PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' };

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'oopm-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
  }
}

async function compileAndRun(dir, source, timeoutMs) {
  await writeFile(join(dir, 'main.cpp'), source);
  const c = await runProcess(CXX, ['-std=c++20', '-Wall', '-O1', '-fdiagnostics-color=never', 'main.cpp', '-o', EXE],
    { cwd: dir, timeoutMs: 120000 });
  if (c.code !== 0) {
    return { compiled: false, compilerOutput: c.stderr || c.stdout, stdout: '', stderr: '', exitCode: c.code, signal: '', timedOut: false };
  }
  const r = await runProcess(join(dir, EXE), [], { cwd: dir, timeoutMs });
  const abnormal = r.code !== null && (r.code < 0 || r.code > 255);
  return {
    compiled: true, compilerOutput: c.stderr, stdout: r.stdout, stderr: r.stderr, exitCode: r.code,
    signal: r.signal || (abnormal ? `exit status ${r.code}` : ''), timedOut: r.timedOut,
  };
}

export async function runCppLocal(code, tests, { timeoutMs = 10000 } = {}) {
  if (cppHasMain(code)) return mainNotAllowed(tests);
  const nonce = makeNonce();
  const { program, userStartLine } = buildCppProgram(code, tests, nonce);
  const raw = await withTempDir((dir) => compileAndRun(dir, program, timeoutMs));
  return normalizeCppResult(raw, tests, nonce, userStartLine, code.split('\n').length);
}

export async function runPythonLocal(code, tests, { timeoutMs = 10000 } = {}) {
  return withTempDir(async (dir) => {
    await writeFile(join(dir, 'harness.py'), `${PY_HARNESS}\nimport sys\nsys.stdout.write(run_all(sys.stdin.read()))\n`);
    const r = await runProcess(PYTHON, ['harness.py'], { cwd: dir, input: JSON.stringify({ code, tests }), timeoutMs, env: PY_ENV });
    if (r.timedOut) {
      return { ok: false, phase: 'timeout', message: 'Your code ran longer than the time limit and was stopped. Look for an infinite loop.', results: notRun(tests), stdout: '' };
    }
    try {
      return normalizePythonResult(r.stdout, tests);
    } catch {
      return { ok: false, phase: 'runtime', message: (r.stderr || r.stdout || 'Python harness failed').trim(), results: notRun(tests), stdout: '' };
    }
  });
}

// Runs a complete program, e.g. the code of a "predict the output" MCQ.
export async function runProgramLocal(lang, code, { timeoutMs = 10000 } = {}) {
  return withTempDir(async (dir) => {
    if (lang === 'python') {
      await writeFile(join(dir, 'main.py'), code);
      const r = await runProcess(PYTHON, ['main.py'], { cwd: dir, timeoutMs, env: PY_ENV });
      return { ok: r.code === 0 && !r.timedOut, stdout: r.stdout.replace(/\r\n/g, '\n'), stderr: r.stderr };
    }
    const raw = await compileAndRun(dir, code, timeoutMs);
    return {
      ok: raw.compiled && raw.exitCode === 0 && !raw.timedOut,
      stdout: raw.stdout.replace(/\r\n/g, '\n'),
      stderr: raw.compiled ? raw.stderr : raw.compilerOutput,
    };
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: all three test files PASS. If the Windows exe can't find `libstdc++-6.dll`, put the MSYS2 `bin` directory on PATH; don't change the code.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib tests/local-runners.test.mjs
git commit -m "feat: local g++/CPython runners sharing the browser harness"
```

### Task 4: Browser runners (Pyodide worker, Wandbox → Godbolt)

**Files:**
- Create: `js/runners/cpp-runner.js`, `js/runners/python-runner.js`, `js/runners/python-worker.js`
- Test: `tests/cpp-runner.test.mjs` (with an injected fake `fetch`). The Python runner needs a real browser and is checked manually in Task 10.

**Interfaces:**
- Consumes: `harness.js` exports listed in Task 2.
- Produces:
  - `runCpp(code, tests, {onStatus?, fetchImpl?}) → Promise<RunResult>`, plus `WANDBOX_URL`, `GODBOLT_URL`
  - `runPython(code, tests, {onStatus?}) → Promise<RunResult>`, `warmUpPython() → Promise<void>` (never rejects)
  - Worker message protocol:
    - main → worker: `{id, harness, payload}`
    - worker → main: `{type:'ready'}`, `{type:'load-error', error}`, `{id, ok:true, json}`, or `{id, ok:false, error}`

- [ ] **Step 1: Write the failing tests** — `tests/cpp-runner.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCpp, WANDBOX_URL, GODBOLT_URL } from '../js/runners/cpp-runner.js';

const tests = [{ name: 't1', code: 'EXPECT(true);' }, { name: 't2', code: 'EXPECT(true);' }];
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const nonceOf = (init) => /@@TEST:([a-z0-9]+)\|/.exec(JSON.parse(init.body).code ?? JSON.parse(init.body).source)[1];
const passing = (nonce) => tests.map((t) => `\n@@TEST:${nonce}|${t.name}|PASS|`).join('\n') + '\n';

test('uses Wandbox when it answers', async () => {
  const calls = [];
  const statuses = [];
  let body;
  const fetchImpl = async (url, init) => {
    calls.push(url);
    body = JSON.parse(init.body);
    return json({ status: '0', compiler_error: '', program_output: passing(nonceOf(init)), program_error: '', signal: '' });
  };
  const r = await runCpp('struct A {};', tests, { fetchImpl, onStatus: (s) => statuses.push(s) });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(calls, [WANDBOX_URL]);
  assert.match(statuses[0], /Wandbox/);
  assert.equal(body.compiler, 'gcc-13.2.0');
  assert.equal(body['compiler-option-raw'], '-std=c++20');
});

test('falls back to Godbolt on HTTP 403 from Wandbox', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(url);
    if (url === WANDBOX_URL) return json({}, 403);
    const n = nonceOf(init);
    return json({ code: 0, buildResult: { code: 0, stderr: [] }, stdout: passing(n).split('\n').map((text) => ({ text })), stderr: [] });
  };
  const r = await runCpp('struct A {};', tests, { fetchImpl });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(calls, [WANDBOX_URL, GODBOLT_URL]);
});

test('falls back when Wandbox throws (offline / CORS)', async () => {
  const fetchImpl = async (url, init) => {
    if (url === WANDBOX_URL) throw new TypeError('Failed to fetch');
    return json({ code: 0, buildResult: { code: 0, stderr: [] }, stdout: passing(nonceOf(init)).split('\n').map((text) => ({ text })) });
  };
  assert.equal((await runCpp('struct A {};', tests, { fetchImpl })).ok, true);
});

test('both services down → network phase, tests not run', async () => {
  const r = await runCpp('struct A {};', tests, { fetchImpl: async () => { throw new TypeError('offline'); } });
  assert.equal(r.phase, 'network');
  assert.match(r.message, /your code is saved/);
  assert.deepEqual(r.results.map((x) => x.status), ['notrun', 'notrun']);
});

test('main() is rejected before any request', async () => {
  let called = false;
  const r = await runCpp('int main() {}', tests, { fetchImpl: async () => { called = true; } });
  assert.equal(r.phase, 'compile');
  assert.equal(called, false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/cpp-runner.test.mjs`
Expected: FAIL with `Cannot find module '.../js/runners/cpp-runner.js'`.

- [ ] **Step 3: Implement** — `js/runners/cpp-runner.js`

```js
import {
  makeNonce, buildCppProgram, normalizeCppResult, cppHasMain, mainNotAllowed,
  wandboxToRaw, godboltToRaw, notRun,
} from './harness.js';

export const WANDBOX_URL = 'https://wandbox.org/api/compile.json';
export const GODBOLT_URL = 'https://godbolt.org/api/compiler/g132/compile';
const REQUEST_TIMEOUT_MS = 45000;

async function postJson(fetchImpl, url, body, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`${url} answered HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const viaWandbox = async (source, fetchImpl) => wandboxToRaw(await postJson(fetchImpl, WANDBOX_URL, {
  compiler: 'gcc-13.2.0', code: source, options: 'warning', 'compiler-option-raw': '-std=c++20', save: false,
}));

const viaGodbolt = async (source, fetchImpl) => godboltToRaw(await postJson(fetchImpl, GODBOLT_URL, {
  source,
  options: {
    userArguments: '-std=c++20 -O1 -fdiagnostics-color=never',
    executeParameters: { args: [], stdin: '' },
    compilerOptions: { executorRequest: true },
    filters: { execute: true },
    tools: [],
    libraries: [],
  },
  lang: 'c++',
  allowStoreCodeDebug: false,
}, { Accept: 'application/json' }));

export async function runCpp(code, tests, { onStatus = () => {}, fetchImpl = (...a) => globalThis.fetch(...a) } = {}) {
  if (cppHasMain(code)) return mainNotAllowed(tests);
  const nonce = makeNonce();
  const { program, userStartLine } = buildCppProgram(code, tests, nonce);
  let raw;
  try {
    onStatus('Compiling on Wandbox (GCC 13, C++20)…');
    raw = await viaWandbox(program, fetchImpl);
  } catch {
    try {
      onStatus('Wandbox is unavailable — trying Compiler Explorer…');
      raw = await viaGodbolt(program, fetchImpl);
    } catch {
      return {
        ok: false, phase: 'network', results: notRun(tests), stdout: '',
        message: 'Could not reach an online C++ compiler (Wandbox and Compiler Explorer both failed). Check your internet connection and try again — your code is saved.',
      };
    }
  }
  return normalizeCppResult(raw, tests, nonce, userStartLine, code.split('\n').length);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Implement the Pyodide worker** — `js/runners/python-worker.js` (classic worker, *not* a module)

```js
/* Classic worker: loads Pyodide once, then runs the test harness on request. */
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.29.5/full/';
let pyodide = null;
let harnessLoaded = false;

const boot = (async () => {
  importScripts(PYODIDE_URL + 'pyodide.js');
  pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
})();

boot.then(
  () => self.postMessage({ type: 'ready' }),
  (err) => self.postMessage({ type: 'load-error', error: String((err && err.message) || err) }),
);

self.onmessage = async (e) => {
  const { id, harness, payload } = e.data;
  try {
    await boot;
    if (!harnessLoaded) {
      pyodide.runPython(harness);
      harnessLoaded = true;
    }
    const runAll = pyodide.globals.get('run_all');
    const json = runAll(payload);
    runAll.destroy();
    self.postMessage({ id, ok: true, json });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
```

- [ ] **Step 6: Implement the Python runner** — `js/runners/python-runner.js`

```js
import { PY_HARNESS, normalizePythonResult, notRun } from './harness.js';

const RUN_TIMEOUT_MS = 10000;
const LOAD_TIMEOUT_MS = 90000;
let worker = null;
let ready = null;
let seq = 0;

function kill() {
  if (worker) worker.terminate();
  worker = null;
  ready = null;
}

function spawn() {
  const w = new Worker(new URL('./python-worker.js', import.meta.url));
  worker = w;
  ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Python took too long to load')), LOAD_TIMEOUT_MS);
    w.addEventListener('message', (e) => {
      if (e.data?.type === 'ready') { clearTimeout(timer); resolve(); }
      if (e.data?.type === 'load-error') { clearTimeout(timer); reject(new Error(e.data.error)); }
    });
    w.addEventListener('error', (e) => { clearTimeout(timer); reject(new Error(e.message || 'Python worker failed to start')); });
  });
  ready.catch(() => { if (worker === w) kill(); });
}

// Start downloading Pyodide early (e.g. when a Python exercise opens).
export function warmUpPython() {
  if (!worker) spawn();
  return ready.catch(() => {});
}

export async function runPython(code, tests, { onStatus = () => {} } = {}) {
  if (!worker) spawn();
  const w = worker;
  try {
    onStatus('Loading Python in your browser (the first run downloads about 10 MB)…');
    await ready;
  } catch (err) {
    return {
      ok: false, phase: 'network', results: notRun(tests), stdout: '',
      message: `Could not start Python: ${err.message}. Check your internet connection and try again — your code is saved.`,
    };
  }
  onStatus('Running tests…');
  const id = ++seq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      w.removeEventListener('message', onMsg);
      if (worker === w) kill(); // a fresh worker is spawned on the next run
      resolve({
        ok: false, phase: 'timeout', results: notRun(tests), stdout: '',
        message: 'Your code ran longer than 10 seconds and was stopped. Look for an infinite loop or recursion without a base case.',
      });
    }, RUN_TIMEOUT_MS);
    function onMsg(e) {
      if (e.data?.id !== id) return;
      clearTimeout(timer);
      w.removeEventListener('message', onMsg);
      resolve(e.data.ok
        ? normalizePythonResult(e.data.json, tests)
        : { ok: false, phase: 'runtime', message: e.data.error, results: notRun(tests), stdout: '' });
    }
    w.addEventListener('message', onMsg);
    w.postMessage({ id, harness: PY_HARNESS, payload: JSON.stringify({ code, tests }) });
  });
}
```

- [ ] **Step 7: Commit**

```bash
git add js/runners tests/cpp-runner.test.mjs
git commit -m "feat: browser runners (Pyodide worker, Wandbox with Godbolt fallback)"
```

### Task 5: Content registry, schema validator, solution checker

**Files:**
- Create: `content/index.js`, `scripts/lib/validate.mjs`, `scripts/validate-content.mjs`, `scripts/test-solutions.mjs`
- Test: `tests/validate.test.mjs`

**Interfaces:**
- Consumes: `runCppLocal`, `runPythonLocal`, `runProgramLocal` (Task 3).
- Produces:
  - `TIERS: [{id, title, blurb}]`, `MODULES: [{id, num, dir, tier, title, summary, final?}]`
  - `validateModule(meta, lessonText, quiz, exercises) → string[]` (an empty array means valid)
  - CLIs `npm run validate [-- --module <id>]` and `npm run check [-- --module <id>]`. Both exit 1 on any problem.

**Content schema** (the validator enforces it; authors follow it):
```js
// content/NN-slug/quiz.js
export default [{
  id: '<moduleId>-q01',            // must start with `${module.id}-`, unique
  lang: 'cpp' | 'python' | 'both',
  type: 'concept' | 'output' | 'bug' | 'compare',
  difficulty: 1 | 2 | 3,
  prompt: `Markdown`,               // ≥10 chars
  code: `optional snippet`,         // required for type 'output'
  codeLang: 'cpp' | 'python',       // required when code present
  options: [{ text, correct, why }],// 3–5 options, exactly one correct:true, every why ≥20 chars
  explanation: `Markdown, ≥80 chars — the concept behind the answer`,
}];
// type 'output': `code` is a COMPLETE program (C++ has main()), it must compile and exit 0,
// and the correct option's text is exactly its stdout (trailing whitespace ignored).
// No wrong option may equal the real output.

// content/NN-slug/exercises.js
export default [{
  id: '<moduleId>-e01', lang: 'cpp' | 'python', title, difficulty: 1 | 2 | 3,
  task: `Markdown ≥100 chars: what to build, exact class/method names and signatures`,
  starter: `code shown in the editor (C++: no main)`,
  tests: [{ name, code }],          // ≥3, unique names (contract in Task 2)
  hints: [`…`, `…`],                // ≥2, progressively more specific
  solution: `reference solution (C++: no main)`,
  explanation: `Markdown ≥150 chars: walkthrough of the solution and the OOP idea it demonstrates`,
}];
```

- [ ] **Step 1: Write `content/index.js`**

```js
export const TIERS = [
  { id: 'foundations', title: 'Foundations', blurb: 'Classes, objects, lifetime and encapsulation.' },
  { id: 'pillars', title: 'The Pillars', blurb: 'Inheritance, polymorphism, abstraction and operators.' },
  { id: 'deep', title: 'Deep Dive', blurb: "Copy and move, memory, MRO, and each language's object model." },
  { id: 'design', title: 'Design Mastery', blurb: 'Composition, SOLID and design patterns.' },
  { id: 'final', title: 'Final', blurb: 'Capstone projects and the mastery exam.' },
];

export const MODULES = [
  { id: 'why-oop', num: 1, dir: '01-why-oop', tier: 'foundations', title: 'Why OOP?', summary: 'Procedural vs object-oriented thinking, the four pillars, and how objects live in memory.' },
  { id: 'classes', num: 2, dir: '02-classes', tier: 'foundations', title: 'Classes & Objects', summary: 'Members, methods, this vs self, instance vs class attributes.' },
  { id: 'lifetime', num: 3, dir: '03-lifetime', tier: 'foundations', title: 'Constructors, Destructors & Lifetime', summary: 'Initializer lists, delegating and explicit constructors, destruction order, __init__ vs __new__.' },
  { id: 'encapsulation', num: 4, dir: '04-encapsulation', tier: 'foundations', title: 'Encapsulation', summary: 'Access control, invariants, friend, name mangling and @property.' },
  { id: 'inheritance', num: 5, dir: '05-inheritance', tier: 'pillars', title: 'Inheritance', summary: 'Constructor chaining, super(), overriding, inheritance access modes and object slicing.' },
  { id: 'polymorphism', num: 6, dir: '06-polymorphism', tier: 'pillars', title: 'Runtime Polymorphism', summary: 'virtual, override, final, vtables, virtual destructors and duck typing.' },
  { id: 'abstraction', num: 7, dir: '07-abstraction', tier: 'pillars', title: 'Abstraction & Interfaces', summary: 'Pure virtual functions, abstract classes, abc.ABC and typing.Protocol.' },
  { id: 'operators', num: 8, dir: '08-operators', tier: 'pillars', title: 'Operator Overloading & Dunders', summary: 'Member vs free operators, <=>, streams, and Python special methods.' },
  { id: 'static-members', num: 9, dir: '09-static-members', tier: 'pillars', title: 'Static & Class-level Members', summary: 'static data and functions, @classmethod alternate constructors, @staticmethod.' },
  { id: 'copy-move', num: 10, dir: '10-copy-move', tier: 'deep', title: 'Copy & Move Semantics', summary: 'Shallow vs deep copies, Rule of 3/5/0, move semantics, copy and deepcopy.' },
  { id: 'memory', num: 11, dir: '11-memory', tier: 'deep', title: 'Memory & RAII', summary: 'Smart pointers, ownership, reference counting, weakref and context managers.' },
  { id: 'multiple-inheritance', num: 12, dir: '12-multiple-inheritance', tier: 'deep', title: 'Multiple Inheritance & MRO', summary: 'The diamond, virtual inheritance, C3 linearization, cooperative super() and mixins.' },
  { id: 'cpp-toolbox', num: 13, dir: '13-cpp-toolbox', tier: 'deep', title: 'The C++ Class Toolbox', summary: 'const-correctness, mutable, constexpr, nested classes, conversions and explicit.' },
  { id: 'python-object-model', num: 14, dir: '14-python-object-model', tier: 'deep', title: 'The Python Object Model', summary: '__slots__, descriptors, attribute hooks, dataclasses and metaclasses.' },
  { id: 'generics', num: 15, dir: '15-generics', tier: 'deep', title: 'Templates & Generics', summary: 'Class templates, specialization, CRTP, concepts, TypeVar and Generic.' },
  { id: 'exceptions', num: 16, dir: '16-exceptions', tier: 'deep', title: 'Exceptions & OOP', summary: 'Exception hierarchies, exception safety, catching by reference, raise from.' },
  { id: 'composition', num: 17, dir: '17-composition', tier: 'design', title: 'Composition & Relationships', summary: 'Has-a vs is-a, delegation, aggregation and UML class diagrams.' },
  { id: 'solid', num: 18, dir: '18-solid', tier: 'design', title: 'SOLID Principles', summary: 'Five principles, each refactored from bad to good in both languages.' },
  { id: 'patterns-1', num: 19, dir: '19-patterns-1', tier: 'design', title: 'Design Patterns I', summary: 'Singleton, Factory Method, Builder, Adapter, Decorator, Composite.' },
  { id: 'patterns-2', num: 20, dir: '20-patterns-2', tier: 'design', title: 'Design Patterns II', summary: 'Strategy, Observer, Command, Template Method, State, Iterator.' },
  { id: 'mastery', num: 21, dir: '21-mastery', tier: 'final', final: true, title: 'Mastery Capstones', summary: 'Three capstone projects in both languages, plus the final exam.' },
];
```

- [ ] **Step 2: Write the failing tests** — `tests/validate.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateModule } from '../scripts/lib/validate.mjs';

const meta = { id: 'demo', dir: '99-demo' };
const why = 'Because this is the reason it is right or wrong.';
const q = (i, extra = {}) => ({
  id: `demo-q${i}`, lang: 'both', type: i < 3 ? 'output' : 'concept', difficulty: 1,
  prompt: 'What does this print?', code: i < 3 ? '#include <iostream>\nint main(){ std::cout << 1; }' : undefined,
  codeLang: i < 3 ? 'cpp' : undefined,
  options: [{ text: '1', correct: true, why }, { text: '2', correct: false, why }, { text: '3', correct: false, why }],
  explanation: 'x'.repeat(80), ...extra,
});
const ex = (i, lang) => ({
  id: `demo-e${i}`, lang, title: 'T', difficulty: 1, task: 't'.repeat(100), starter: '// start',
  tests: [{ name: 'a', code: 'x' }, { name: 'b', code: 'y' }, { name: 'c', code: 'z' }],
  hints: ['h1', 'h2'], solution: '// solution', explanation: 'e'.repeat(150),
});
const lesson = `# Demo\n${'Lorem ipsum. '.repeat(500)}\n~~~cpp\nint x;\n~~~\n~~~python\nx = 1\n~~~\n## Key takeaways\n- a\n## Common pitfalls\n- b\n`;
const good = () => ({
  quiz: Array.from({ length: 15 }, (_, i) => q(i)),
  exercises: [ex(1, 'cpp'), ex(2, 'cpp'), ex(3, 'python'), ex(4, 'python')],
});

test('a complete module validates', () => {
  const { quiz, exercises } = good();
  assert.deepEqual(validateModule(meta, lesson, quiz, exercises), []);
});

test('flags each schema violation', () => {
  const { quiz, exercises } = good();
  quiz[5].options[1].correct = true;          // two correct
  quiz[6].options[0].why = 'short';           // weak why
  quiz[7].id = 'other-q7';                    // wrong prefix
  quiz[8].id = quiz[9].id;                    // duplicate id
  exercises[0].solution = 'int main() { return 0; }';
  exercises[2].tests = [{ name: 'a', code: 'x' }];
  const errs = validateModule(meta, lesson.replace('~~~python\nx = 1\n~~~\n', '```python\nx=1\n```\n'), quiz, exercises).join('\n');
  assert.match(errs, /exactly one option/);
  assert.match(errs, /option 0 needs a "why"/);
  assert.match(errs, /id must start with "demo-"/);
  assert.match(errs, /duplicate id/);
  assert.match(errs, /must not define main/);
  assert.match(errs, /needs ≥3 tests/);
  assert.match(errs, /~~~ fences/);
  assert.match(errs, /~~~python block/);
});

test('minimum counts are enforced, final module relaxes quiz rules', () => {
  const errs = validateModule(meta, lesson, [], []).join('\n');
  assert.match(errs, /≥15 questions/);
  assert.match(errs, /≥4 exercises/);
  const finalMeta = { id: 'demo', dir: '21-demo', final: true };
  const six = [1, 2, 3].map((i) => ex(i, 'cpp')).concat([4, 5, 6].map((i) => ex(i, 'python')));
  assert.deepEqual(validateModule(finalMeta, 'x'.repeat(2000), [], six), []);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test tests/validate.test.mjs`
Expected: FAIL with `Cannot find module '.../scripts/lib/validate.mjs'`.

- [ ] **Step 4: Implement** — `scripts/lib/validate.mjs`

```js
const Q_LANGS = ['cpp', 'python', 'both'];
const EX_LANGS = ['cpp', 'python'];
const TYPES = ['concept', 'output', 'bug', 'compare'];
const HAS_MAIN = /\bint\s+main\s*\(/;
const text = (s, min = 1) => typeof s === 'string' && s.trim().length >= min;

export function validateModule(meta, lesson, quiz, exercises) {
  const errs = [];
  const err = (where, msg) => errs.push(`${meta.dir}${where ? ` › ${where}` : ''}: ${msg}`);
  const final = !!meta.final;
  const ids = new Set();
  const checkId = (where, id) => {
    if (!text(id) || !id.startsWith(`${meta.id}-`)) err(where, `id must start with "${meta.id}-"`);
    if (ids.has(id)) err(where, `duplicate id ${id}`);
    ids.add(id);
  };

  lesson = typeof lesson === 'string' ? lesson : '';
  const minLesson = final ? 2000 : 6000;
  if (lesson.length < minLesson) err('lesson.md', `must be at least ${minLesson} characters (has ${lesson.length})`);
  if (lesson.includes('```')) err('lesson.md', 'use ~~~ fences, not backticks');
  if (!final) {
    for (const h of ['## Key takeaways', '## Common pitfalls']) if (!lesson.includes(h)) err('lesson.md', `missing heading "${h}"`);
    if (!/^~~~cpp\s*$/m.test(lesson)) err('lesson.md', 'needs at least one ~~~cpp block');
    if (!/^~~~python\s*$/m.test(lesson)) err('lesson.md', 'needs at least one ~~~python block');
  }

  if (!Array.isArray(quiz)) { err('quiz.js', 'default export must be an array'); quiz = []; }
  if (!final && quiz.length < 15) err('quiz.js', `needs ≥15 questions (has ${quiz.length})`);
  if (!final && quiz.filter((q) => q?.type === 'output').length < 3) err('quiz.js', 'needs ≥3 output questions');
  quiz.forEach((q, i) => {
    const w = `quiz[${i}] ${q?.id ?? ''}`.trim();
    checkId(w, q?.id);
    if (!Q_LANGS.includes(q.lang)) err(w, `lang must be one of ${Q_LANGS.join('|')}`);
    if (!TYPES.includes(q.type)) err(w, `type must be one of ${TYPES.join('|')}`);
    if (![1, 2, 3].includes(q.difficulty)) err(w, 'difficulty must be 1, 2 or 3');
    if (!text(q.prompt, 10)) err(w, 'prompt must be ≥10 chars');
    if (!text(q.explanation, 80)) err(w, 'explanation must be ≥80 chars');
    if (q.code !== undefined && !['cpp', 'python'].includes(q.codeLang)) err(w, 'code needs codeLang cpp|python');
    if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 5) {
      err(w, 'needs 3–5 options');
    } else {
      if (q.options.filter((o) => o.correct === true).length !== 1) err(w, 'exactly one option must have correct: true');
      q.options.forEach((o, j) => {
        if (!text(o.text)) err(w, `option ${j} text is empty`);
        if (!text(o.why, 20)) err(w, `option ${j} needs a "why" of ≥20 chars`);
      });
      if (new Set(q.options.map((o) => o.text)).size !== q.options.length) err(w, 'duplicate option text');
    }
    if (q.type === 'output') {
      if (!text(q.code)) err(w, 'output questions need code');
      if (q.codeLang === 'cpp' && !HAS_MAIN.test(q.code ?? '')) err(w, 'C++ output questions must be complete programs with main()');
    }
  });

  if (!Array.isArray(exercises)) { err('exercises.js', 'default export must be an array'); exercises = []; }
  const perLang = final ? 3 : 2;
  if (exercises.length < perLang * 2) err('exercises.js', `needs ≥${perLang * 2} exercises (has ${exercises.length})`);
  for (const lang of EX_LANGS) {
    const n = exercises.filter((e) => e?.lang === lang).length;
    if (n < perLang) err('exercises.js', `needs ≥${perLang} ${lang} exercises (has ${n})`);
  }
  exercises.forEach((e, i) => {
    const w = `exercises[${i}] ${e?.id ?? ''}`.trim();
    checkId(w, e?.id);
    if (!EX_LANGS.includes(e.lang)) err(w, 'lang must be cpp|python');
    if (!text(e.title)) err(w, 'title is empty');
    if (![1, 2, 3].includes(e.difficulty)) err(w, 'difficulty must be 1, 2 or 3');
    if (!text(e.task, 100)) err(w, 'task must be ≥100 chars');
    if (!text(e.starter)) err(w, 'starter is empty');
    if (!text(e.solution)) err(w, 'solution is empty');
    if (!text(e.explanation, 150)) err(w, 'explanation must be ≥150 chars');
    if (!Array.isArray(e.hints) || e.hints.length < 2 || !e.hints.every((h) => text(h))) err(w, 'needs ≥2 non-empty hints');
    if (!Array.isArray(e.tests) || e.tests.length < 3) {
      err(w, 'needs ≥3 tests');
    } else {
      if (!e.tests.every((t) => text(t.name) && text(t.code))) err(w, 'every test needs a name and code');
      if (new Set(e.tests.map((t) => t.name)).size !== e.tests.length) err(w, 'test names must be unique');
    }
    if (e.lang === 'cpp' && (HAS_MAIN.test(e.solution ?? '') || HAS_MAIN.test(e.starter ?? ''))) {
      err(w, 'C++ starter/solution must not define main (the harness provides it)');
    }
  });
  return errs;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Implement the CLIs**

`scripts/validate-content.mjs`:
```js
import { readFile } from 'node:fs/promises';
import { MODULES } from '../content/index.js';
import { validateModule } from './lib/validate.mjs';

const argv = process.argv.slice(2);
const only = argv.includes('--module') ? argv[argv.indexOf('--module') + 1] : null;
const errors = [];
const rows = [];

for (const meta of MODULES) {
  if (only && meta.id !== only) continue;
  const base = new URL(`../content/${meta.dir}/`, import.meta.url);
  let lesson = '';
  let quiz = [];
  let exercises = [];
  try { lesson = await readFile(new URL('lesson.md', base), 'utf8'); } catch { errors.push(`${meta.dir}: lesson.md missing`); }
  try { quiz = (await import(new URL('quiz.js', base))).default; } catch (e) { errors.push(`${meta.dir}: quiz.js failed to load: ${e.message}`); }
  try { exercises = (await import(new URL('exercises.js', base))).default; } catch (e) { errors.push(`${meta.dir}: exercises.js failed to load: ${e.message}`); }
  errors.push(...validateModule(meta, lesson, quiz, exercises));
  rows.push({
    module: meta.dir, lessonChars: lesson.length, mcqs: quiz.length ?? 0,
    output: Array.isArray(quiz) ? quiz.filter((q) => q.type === 'output').length : 0,
    exercises: exercises.length ?? 0,
  });
}

console.table(rows);
if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s).`);
  process.exit(1);
}
console.log('Content OK');
```

`scripts/test-solutions.mjs`:
```js
import { cpus } from 'node:os';
import { MODULES } from '../content/index.js';
import { runCppLocal, runPythonLocal, runProgramLocal } from './lib/local-runners.mjs';

const argv = process.argv.slice(2);
const only = argv.includes('--module') ? argv[argv.indexOf('--module') + 1] : null;
const run = (lang, code, tests) => (lang === 'cpp' ? runCppLocal : runPythonLocal)(code, tests);
const norm = (s) => s.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();
const failing = (r) => r.results.filter((x) => x.status !== 'pass').map((x) => `[${x.name}: ${x.status} ${x.message}]`).join(' ');

const jobs = [];
for (const meta of MODULES) {
  if (only && meta.id !== only) continue;
  const base = new URL(`../content/${meta.dir}/`, import.meta.url);
  let quiz;
  let exercises;
  try {
    quiz = (await import(new URL('quiz.js', base))).default;
    exercises = (await import(new URL('exercises.js', base))).default;
  } catch (e) {
    console.error(`${meta.dir}: cannot load content (${e.message})`);
    process.exitCode = 1;
    continue;
  }
  for (const ex of exercises) {
    jobs.push(async () => {
      const r = await run(ex.lang, ex.solution, ex.tests);
      if (!r.ok) return `${ex.id}: reference solution fails (${r.phase}) ${r.message} ${failing(r)}`;
    });
    jobs.push(async () => {
      const r = await run(ex.lang, ex.starter, ex.tests);
      if (r.ok) return `${ex.id}: starter already passes every test, so the tests are too weak`;
    });
  }
  for (const q of quiz.filter((x) => x.type === 'output')) {
    jobs.push(async () => {
      const r = await runProgramLocal(q.codeLang, q.code);
      if (!r.ok) return `${q.id}: output program failed: ${r.stderr.slice(0, 800)}`;
      const actual = norm(r.stdout);
      const correct = q.options.find((o) => o.correct);
      if (norm(correct.text) !== actual) return `${q.id}: correct option is ${JSON.stringify(correct.text)} but the program printed ${JSON.stringify(actual)}`;
      if (q.options.some((o) => !o.correct && norm(o.text) === actual)) return `${q.id}: a wrong option also matches the real output`;
    });
  }
}

const problems = [];
let next = 0;
let done = 0;
const workers = Math.max(2, Math.min(8, cpus().length));
await Promise.all(Array.from({ length: workers }, async () => {
  while (next < jobs.length) {
    const job = jobs[next++];
    const p = await job();
    if (p) problems.push(p);
    if (++done % 10 === 0 || done === jobs.length) console.log(`  ${done}/${jobs.length} checks`);
  }
}));

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}
if (process.exitCode) process.exit(process.exitCode);
console.log('All reference solutions pass, all starters fail, all output MCQs verified.');
```

- [ ] **Step 7: Smoke-run the CLIs**

Run: `npm run validate` (no content yet)
Expected: exit 1, with every module reporting `lesson.md missing`. This shows the CLI walks the registry.

- [ ] **Step 8: Commit**

```bash
git add content/index.js scripts tests/validate.test.mjs
git commit -m "feat: content registry, schema validator and solution checker"
```

### Task 6: Pilot content — Module 05 Inheritance (sets the quality bar)

**Files:**
- Create: `content/05-inheritance/lesson.md`, `content/05-inheritance/quiz.js`, `content/05-inheritance/exercises.js`

**Interfaces:**
- Consumes: the content schema and test contract (Tasks 2 and 5).
- Produces: a module that passes `npm run validate -- --module inheritance` and `npm run check -- --module inheritance`. Tasks 7–11 use it for manual browser checks.

**Content quality bar (applies to every module, Tasks 6 and 12–17):**
- **Lesson** (6000–15000 chars):
  - Open with *why the concept exists*, using a concrete problem.
  - Every concept shows a `~~~cpp` block immediately followed by a `~~~python` block. The renderer pairs them side by side.
  - Use callouts as blockquotes that begin with `**Note:**`, `**Pitfall:**`, `**C++ vs Python:**` or `**Under the hood:**`.
  - End with `## Key takeaways` (5–8 bullets) and `## Common pitfalls` (4–6 bullets).
- **MCQs:**
  - Distractors are *real misconceptions*. Each `why` names the misconception and corrects it.
  - `explanation` teaches the underlying rule in 2–6 sentences and may include a `~~~` code block.
  - Mix the types: concept, output (≥3, deterministic: no addresses, no unordered iteration, no UB), bug and compare. Order them easy → hard.
- **Exercises:**
  - The task names exact classes, methods and signatures, and shows an example of usage.
  - Starters compile and run but fail tests (stub bodies that return wrong defaults; Python uses `raise NotImplementedError`). That way learners see red tests, not syntax errors.
  - Tests check behavior *and* structure (C++ `std::is_base_of_v`, `std::is_abstract_v`, … / Python `issubclass`, `isinstance`).
  - Hints go from a nudge to near-solution.
  - The explanation walks through the solution and names the OOP principle it demonstrates.

- [ ] **Step 1: Write `lesson.md`** with these sections, in order:
  1. *Why inheritance?* Modelling **is-a**, reuse vs subtyping, and when *not* to use it.
  2. *Syntax side by side:* `class Dog : public Animal` / `class Dog(Animal):`.
  3. *Constructor chaining.*
     - C++: the base constructor goes in the member-initializer list. Order: base → members in declaration order → derived body. Destruction runs in reverse. If the base has no default constructor, the code doesn't compile.
     - Python: `super().__init__(...)`. If you forget it, the base attributes are missing and you get an `AttributeError` later.
  4. *Overriding and reusing base behavior:* `Base::describe()` vs `super().describe()`.
     - Name hiding in C++: a derived `f(int)` hides `Base::f(double)`, and `using Base::f;` fixes it.
     - A non-virtual function is *hidden*, not overridden (this previews Module 06).
  5. *Access:* `protected`; a table of public/protected/private inheritance; `struct` defaults to public inheritance and `class` to private; Python's `_name` convention.
  6. *Object slicing* (C++ pass/assign by value). Why Python cannot slice (names are references).
  7. *Checking relationships:* `std::is_base_of_v` and `dynamic_cast` (preview) / `isinstance`, `issubclass`, and why `type(x) is` differs from them.
  8. *Stopping inheritance:* `class X final` / `typing.final` (advisory only).
  9. *Designing hierarchies:* keep them shallow, the Liskov preview (Square/Rectangle), and "a Stack is not a list" → composition (previews Module 17).
  10. `## Key takeaways`, `## Common pitfalls`.

- [ ] **Step 2: Write `quiz.js`** — at least these 16 questions (ids `inheritance-q01`…`q16`), easy → hard:
  1. concept/both: what inheritance models (is-a vs has-a).
  2. **output/cpp**: construction and destruction order of a Base, a member and a Derived (full sample below).
  3. **output/python**: forgetting `super().__init__` → the program catches the `AttributeError` and prints its type name.
  4. **output/python**: a `describe()` chain where each override calls `super().describe()` and appends text.
  5. bug/cpp: the base has no default constructor and the derived class doesn't call it. What is the fix?
  6. concept/cpp: what an outside function can access under `protected` inheritance.
  7. compare/both: C++ `protected` vs Python `_name`.
  8. **output/cpp**: a `Dog` passed **by value** to `void show(Animal a)` (slicing). The function prints `a.describe()`, where `describe` is non-virtual.
  9. **output/cpp**: name hiding. `Derived d; d.f(1.5);` calls `Derived::f(int)` and prints the truncated value.
  10. concept/python: `isinstance(d, Animal)` vs `type(d) is Animal`.
  11. bug/python: a mutable class attribute (a list) shared by all subclasses.
  12. concept/cpp: what `class Shape final` prevents.
  13. compare/cpp: `struct D : B` vs `class D : B` default inheritance access.
  14. concept/cpp: base constructor vs member constructors. Which runs first?
  15. **output/python**: `print(issubclass(bool, int), isinstance(True, int))`.
  16. concept/both: why `class Stack(list)` is a poor design, and what to use instead.

Full sample for question 2 (the format every MCQ follows):
```js
{
  id: 'inheritance-q02', lang: 'cpp', type: 'output', difficulty: 2,
  prompt: 'What does this program print?',
  codeLang: 'cpp',
  code: `#include <iostream>
struct Engine { Engine() { std::cout << "Engine "; } ~Engine() { std::cout << "~Engine "; } };
struct Vehicle { Vehicle() { std::cout << "Vehicle "; } ~Vehicle() { std::cout << "~Vehicle "; } };
struct Car : Vehicle {
    Engine engine;
    Car() { std::cout << "Car "; }
    ~Car() { std::cout << "~Car "; }
};
int main() { Car c; }`,
  options: [
    { text: 'Vehicle Engine Car ~Car ~Engine ~Vehicle', correct: true, why: 'Base subobject first, then members in declaration order, then the constructor body — destruction is the exact reverse.' },
    { text: 'Car Engine Vehicle ~Vehicle ~Engine ~Car', correct: false, why: 'The derived constructor body runs last, not first: it may use the base and members, so they must already exist.' },
    { text: 'Engine Vehicle Car ~Car ~Vehicle ~Engine', correct: false, why: 'Members are built after the base class, even though they appear inside Car — the base is part of Car\'s foundation.' },
    { text: 'Vehicle Engine Car ~Vehicle ~Engine ~Car', correct: false, why: 'Destruction is not in construction order; it is reversed so nothing is destroyed while something built on top of it still exists.' },
  ],
  explanation: `C++ builds an object from the inside out: **base classes**, then **data members in declaration order**, then the **constructor body**. Destruction runs in exactly the reverse order. This guarantees that when \`Car\`'s body runs, its \`Vehicle\` part and \`engine\` are fully usable, and when \`~Car\` runs they still exist.

The order in the member-initializer list does **not** change this — GCC warns with \`-Wreorder\` if your list is written in a different order.`,
},
```

- [ ] **Step 3: Write `exercises.js`**, with at least these 4 exercises (ids `inheritance-e01`…`e04`):
  1. **cpp, diff 1, "Animal → Dog".**
     - `class Animal`: constructor `Animal(std::string name)`, `std::string name() const`, `std::string describe() const` → `"<name> is an animal"`.
     - `class Dog : public Animal`: constructor `Dog(std::string name, std::string breed)`, `std::string breed() const`, `std::string describe() const` → `Animal::describe() + " (a <breed> dog)"`.
     - Tests: `std::is_base_of_v<Animal, Dog>`, `Dog("Rex","beagle").describe() == "Rex is an animal (a beagle dog)"`, `name()` is inherited, and `Animal` keeps working alone.
  2. **cpp, diff 2, "Savings account".**
     - `class Account`: `protected: double balance_`; `explicit Account(double initial)`, `void deposit(double)`, `bool withdraw(double)` (false when the amount exceeds the balance), `double balance() const`.
     - `class SavingsAccount : public Account`: `SavingsAccount(double initial, double rate, double minimum)`, `void addInterest()` (balance += balance × rate), `bool withdraw(double)` which refuses if the result would fall below `minimum` and otherwise delegates to `Account::withdraw`.
     - Tests: `is_base_of`, deposit/withdraw rules, the minimum rule, interest via `EXPECT_NEAR`, and that the base `withdraw` still rejects overdrafts.
  3. **python, diff 1, "Employees and managers"** (full sample below).
  4. **python, diff 2, "Shape family".**
     - `Shape.__init__(self, name)` and `describe()` → `f"{self.name} with area {self.area():.2f}"`. `Shape.area()` raises `NotImplementedError`.
     - `Rectangle(Shape)` with `(width, height)`; `Square(Rectangle)` with `(side)`, which calls `super().__init__(side, side)` and sets `name = "Square"`.
     - Tests: `issubclass(Square, Rectangle)`, `isinstance(Square(2), Shape)`, `Square(3).describe() == "Square with area 9.00"`, `Rectangle(2, 5).area() == 10`, and `Shape("x").area()` raising `NotImplementedError`.

Full sample for exercise 3 (the format every exercise follows):
```js
{
  id: 'inheritance-e03', lang: 'python', title: 'Employees and managers', difficulty: 1,
  task: `Create a small payroll hierarchy.

- \`Employee(name, salary)\` stores \`name\` and \`salary\`. \`pay()\` returns the monthly pay: \`salary / 12\`, rounded to 2 decimals. \`__repr__\` returns \`Employee('Ada', 120000)\`.
- \`Manager(Employee)\` takes \`(name, salary, bonus)\`. It must reuse \`Employee.__init__\` via \`super()\`. Its \`pay()\` is the employee pay **plus** \`bonus / 12\` (rounded to 2 decimals) and must call \`super().pay()\`. \`__repr__\` returns \`Manager('Grace', 150000, 24000)\`.

~~~python
m = Manager("Grace", 150000, 24000)
m.pay()      # 14500.0
repr(m)      # "Manager('Grace', 150000, 24000)"
~~~`,
  starter: `class Employee:
    def __init__(self, name, salary):
        raise NotImplementedError

    def pay(self):
        raise NotImplementedError

    def __repr__(self):
        raise NotImplementedError


class Manager(Employee):
    def __init__(self, name, salary, bonus):
        raise NotImplementedError

    def pay(self):
        raise NotImplementedError

    def __repr__(self):
        raise NotImplementedError
`,
  tests: [
    { name: 'Manager is an Employee', code: `assert issubclass(Manager, Employee), "Manager must inherit from Employee"` },
    { name: 'employee pay', code: `assert Employee("Ada", 120000).pay() == 10000.0` },
    { name: 'manager pay adds bonus', code: `assert Manager("Grace", 150000, 24000).pay() == 14500.0` },
    { name: 'manager reuses Employee.__init__', code: `m = Manager("Grace", 150000, 24000)
assert m.name == "Grace" and m.salary == 150000, "name/salary should be set by Employee.__init__"` },
    { name: 'reprs', code: `assert repr(Employee("Ada", 120000)) == "Employee('Ada', 120000)"
assert repr(Manager("Grace", 150000, 24000)) == "Manager('Grace', 150000, 24000)"` },
  ],
  hints: [
    'In Manager.__init__, call super().__init__(name, salary) first, then store the bonus.',
    'Manager.pay() can start with base = super().pay() and then add round(self.bonus / 12, 2).',
    'For __repr__, an f-string with !r quotes the name for you: f"Manager({self.name!r}, {self.salary}, {self.bonus})".',
  ],
  solution: `class Employee:
    def __init__(self, name, salary):
        self.name = name
        self.salary = salary

    def pay(self):
        return round(self.salary / 12, 2)

    def __repr__(self):
        return f"Employee({self.name!r}, {self.salary})"


class Manager(Employee):
    def __init__(self, name, salary, bonus):
        super().__init__(name, salary)
        self.bonus = bonus

    def pay(self):
        return round(super().pay() + self.bonus / 12, 2)

    def __repr__(self):
        return f"Manager({self.name!r}, {self.salary}, {self.bonus})"
`,
  explanation: `**Reuse through \`super()\`.** \`Manager.__init__\` delegates the shared setup to \`Employee.__init__\`, so the rules for \`name\` and \`salary\` live in exactly one place. If \`Employee\` later validates the salary, managers get that check for free.

**Extend, don't copy.** \`Manager.pay()\` calls \`super().pay()\` and adds to it, instead of re-implementing the salary formula. This is the core of inheritance done well: the subclass *specializes* behavior while the base keeps the common part.

In C++ the same idea is written \`Employee::pay()\` inside \`Manager::pay()\`, and the base constructor is called in the member-initializer list: \`Manager(std::string n, double s, double b) : Employee(std::move(n), s), bonus_(b) {}\`.`,
},
```

- [ ] **Step 4: Validate and check the module**

Run: `npm run validate -- --module inheritance` then `npm run check -- --module inheritance`
Expected: `Content OK`, then `All reference solutions pass, all starters fail, all output MCQs verified.` Fix the content (never the checker) until both are green.

- [ ] **Step 5: Commit**

```bash
git add content/05-inheritance
git commit -m "content: module 05 inheritance (pilot)"
```

### Task 7: App shell, router, store, content loader, dashboard

**Files:**
- Create: `index.html`, `css/styles.css`, `js/router.js`, `js/dom.js`, `js/ui.js`, `js/store.js`, `js/content.js`, `js/progress.js`, `js/app.js`, `js/views/home.js`
- Create (stubs so the router resolves; they are replaced in Tasks 8–11): `js/views/module.js`, `js/views/review.js`, `js/views/exam.js`, `js/views/settings.js`, each with `export function render(root) { root.append('Coming in a later task'); }`
- Test: `tests/router.test.mjs`

**Interfaces:**
- Consumes: `state.js` (Task 1), `content/index.js` (Task 5).
- Produces:
  - `parseRoute(hash) → {name: 'home'|'module'|'review'|'exam'|'settings'|'notfound', params}`. For `module`, params are `{id, tab: 'lesson'|'quiz'|'lab', exId|null}`. `startRouter(onRoute, win?)`
  - `h(tag, attrs, ...children) → HTMLElement`. The `html` attribute is for **trusted** content only, `on*` attributes are listeners, and `dataset` is supported. `clear(el)`
  - `store.get()`, `store.set(next)`, `store.update(fn)`, `store.subscribe(fn) → unsubscribe`
  - `loadAllContent()`, `getModule(id) → {id, meta, quiz, exercises, missing}|null`, `modulesFor(lang) → [{id, quiz, exercises}]` (filtered by language), `loadLesson(id) → string|null`, `filterByLang(items, lang)`, `findQuestion(qid) → {q, module}|null`, `MODULES`, `TIERS`
  - `gain(fn) → xpGained`. `fn(state) → {state, xpGained}`. It updates the streak, awards badges, and shows XP / level-up / badge toasts. Also `badgeLabel(id)` and `BADGE_ICONS`.
  - `toast(msg, kind)`, `masteryRing(percent, size?)`, `langTag(lang)`, `difficultyDots(d)`
  - **View contract:** every `js/views/*.js` exports `render(root, params) → void | cleanupFn | Promise<…>`.

- [ ] **Step 1: Write the failing test** — `tests/router.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute } from '../js/router.js';

test('parseRoute', () => {
  assert.deepEqual(parseRoute(''), { name: 'home', params: {} });
  assert.deepEqual(parseRoute('#/'), { name: 'home', params: {} });
  assert.deepEqual(parseRoute('#/m/inheritance'), { name: 'module', params: { id: 'inheritance', tab: 'lesson', exId: null } });
  assert.deepEqual(parseRoute('#/m/inheritance/quiz'), { name: 'module', params: { id: 'inheritance', tab: 'quiz', exId: null } });
  assert.deepEqual(parseRoute('#/m/inheritance/lab/inheritance-e02'), { name: 'module', params: { id: 'inheritance', tab: 'lab', exId: 'inheritance-e02' } });
  assert.deepEqual(parseRoute('#/m/inheritance/bogus'), { name: 'module', params: { id: 'inheritance', tab: 'lesson', exId: null } });
  assert.deepEqual(parseRoute('#/review'), { name: 'review', params: {} });
  assert.deepEqual(parseRoute('#/exam'), { name: 'exam', params: {} });
  assert.deepEqual(parseRoute('#/settings'), { name: 'settings', params: {} });
  assert.equal(parseRoute('#/nope').name, 'notfound');
  assert.equal(parseRoute('#/m/%E0%A4%A').name, 'notfound'); // malformed escape must not throw
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/router.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** — `js/router.js`

```js
export function parseRoute(hash) {
  let parts;
  try {
    parts = (hash || '').replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return { name: 'notfound', params: {} };
  }
  if (parts.length === 0) return { name: 'home', params: {} };
  if (parts[0] === 'm' && parts[1]) {
    const tab = ['lesson', 'quiz', 'lab'].includes(parts[2]) ? parts[2] : 'lesson';
    return { name: 'module', params: { id: parts[1], tab, exId: tab === 'lab' ? parts[3] ?? null : null } };
  }
  if (parts.length === 1 && ['review', 'exam', 'settings'].includes(parts[0])) return { name: parts[0], params: {} };
  return { name: 'notfound', params: {} };
}

export function startRouter(onRoute, win = window) {
  const fire = () => onRoute(parseRoute(win.location.hash));
  win.addEventListener('hashchange', fire);
  fire();
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Implement the DOM helpers** — `js/dom.js`, `js/ui.js`

`js/dom.js`:
```js
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v; // trusted, author-written content only
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

export const clear = (el) => { el.replaceChildren(); return el; };
```

`js/ui.js`:
```js
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
```

- [ ] **Step 6: Implement the store, content loader and progress helper**

`js/store.js`:
```js
import { load, save } from './state.js';

let state = load();
const listeners = new Set();

export const store = {
  get: () => state,
  set(next) {
    if (next === state) return;
    state = next;
    save(state);
    for (const fn of listeners) fn(state);
  },
  update(fn) {
    store.set(fn(state));
    return state;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
```

`js/content.js`:
```js
import { MODULES, TIERS } from '../content/index.js';

export { MODULES, TIERS };
const loaded = new Map();
const lessons = new Map();
const base = (meta) => new URL(`../content/${meta.dir}/`, import.meta.url);

export async function loadAllContent() {
  await Promise.all(MODULES.map(async (meta) => {
    if (loaded.has(meta.id)) return;
    try {
      const [quiz, exercises] = await Promise.all([
        import(new URL('quiz.js', base(meta))).then((m) => m.default),
        import(new URL('exercises.js', base(meta))).then((m) => m.default),
      ]);
      loaded.set(meta.id, { id: meta.id, meta, quiz, exercises, missing: false });
    } catch {
      loaded.set(meta.id, { id: meta.id, meta, quiz: [], exercises: [], missing: true });
    }
  }));
}

export const getModule = (id) => loaded.get(id) ?? null;

export const filterByLang = (items, lang) =>
  (lang === 'both' ? items : items.filter((i) => i.lang === lang || i.lang === 'both'));

export const modulesFor = (lang) => MODULES.map((m) => loaded.get(m.id)).filter((m) => m && !m.missing)
  .map((m) => ({ id: m.id, quiz: filterByLang(m.quiz, lang), exercises: filterByLang(m.exercises, lang) }));

export async function loadLesson(id) {
  const meta = MODULES.find((m) => m.id === id);
  if (!meta) return null;
  if (!lessons.has(id)) {
    try {
      const res = await fetch(new URL('lesson.md', base(meta)));
      lessons.set(id, res.ok ? await res.text() : null);
    } catch {
      return null; // offline: don't cache the failure
    }
  }
  return lessons.get(id);
}

export function findQuestion(qid) {
  for (const m of loaded.values()) {
    const q = m.quiz.find((x) => x.id === qid);
    if (q) return { q, module: m.meta };
  }
  return null;
}
```

`js/progress.js`:
```js
import { store } from './store.js';
import { awardBadges, touchStreak, dayKey, levelFor, BADGE_LABELS } from './state.js';
import { MODULES, modulesFor } from './content.js';
import { toast } from './ui.js';

export const BADGE_ICONS = { mastered: '🏆', perfect: '🎯', nohints: '🧠', polyglot: '🌐' };

export function badgeLabel(id) {
  const [kind, modId] = id.split(':');
  const m = MODULES.find((x) => x.id === modId);
  return `${BADGE_LABELS[kind] ?? kind}: ${m ? m.title : modId}`;
}

// Apply an XP-returning state change, then streak, badges and celebration toasts.
export function gain(fn) {
  const before = store.get();
  const { state, xpGained } = fn(touchStreak(before, dayKey()));
  const { state: next, newBadges } = awardBadges(state, modulesFor(state.settings.lang));
  store.set(next);
  if (xpGained) toast(`+${xpGained} XP`, 'xp');
  const lv = levelFor(next.xp);
  if (lv.level > levelFor(before.xp).level) toast(`Level up! Level ${lv.level}: ${lv.title}`, 'level');
  for (const b of newBadges) toast(`${BADGE_ICONS[b.split(':')[0]] ?? '🏅'} Badge earned: ${badgeLabel(b)}`, 'badge');
  return xpGained;
}
```

- [ ] **Step 7: Write `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OOP Mastery</title>
  <meta name="description" content="Master object-oriented programming in C++ and Python with lessons, explained MCQs and coding labs that run your code.">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%235b4dd6'/%3E%3Ctext x='32' y='42' font-size='28' text-anchor='middle' fill='white' font-family='monospace'%3E%7B%7D%3C/text%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css">
  <link id="hljs-light" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.2/styles/github.min.css">
  <link id="hljs-dark" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.2/styles/github-dark.min.css" disabled>
  <link rel="stylesheet" href="css/styles.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/18.0.14/lib/marked.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.2/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.2/languages/cpp.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.2/languages/python.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/clike/clike.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/python/python.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/matchbrackets.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/closebrackets.min.js"></script>
  <script type="module" src="js/app.js"></script>
</head>
<body>
  <a class="skip" href="#app">Skip to content</a>
  <header class="topbar">
    <a class="brand" href="#/"><span class="brand-mark">{ }</span><span>OOP Mastery</span></a>
    <nav class="nav" aria-label="Main">
      <a href="#/" data-nav="home">Dashboard</a>
      <a href="#/review" data-nav="review">Review <span id="review-count" class="pill" hidden></span></a>
      <a href="#/exam" data-nav="exam">Final exam</a>
      <a href="#/settings" data-nav="settings">Settings</a>
    </nav>
    <div class="topbar-right">
      <div class="seg" role="radiogroup" aria-label="Language focus" id="lang-switch">
        <button type="button" role="radio" data-lang="both">Both</button>
        <button type="button" role="radio" data-lang="cpp">C++</button>
        <button type="button" role="radio" data-lang="python">Python</button>
      </div>
      <span class="chip" id="streak-chip" title="Daily streak">🔥 0</span>
      <span class="chip chip-xp" id="xp-chip" title="Level and XP">Lv 1 · 0 XP</span>
      <button type="button" class="icon-btn" id="theme-toggle" aria-label="Toggle dark mode">◐</button>
    </div>
  </header>
  <main id="app" tabindex="-1"><p class="loading">Loading…</p></main>
  <footer class="footer">
    Built for learning. Python runs in your browser (Pyodide). C++ is compiled by Wandbox, with Compiler Explorer as a fallback.
  </footer>
  <noscript><p class="loading">This site needs JavaScript to run the quizzes and code labs.</p></noscript>
</body>
</html>
```

- [ ] **Step 8: Write `js/app.js`**

```js
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
  const result = await view.render(root, route.params);
  if (typeof result === 'function') {
    if (root.isConnected) cleanup = result; else result();
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
    onRoute(parseRoute(location.hash));
  });
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    store.update((s) => setSetting(s, 'theme', next));
  });
  await loadAllContent();
  startRouter(onRoute);
}

boot();
```

- [ ] **Step 9: Write `js/views/home.js`**

```js
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
        h('a', { class: 'btn primary', href: s.lastVisited ?? '#/m/why-oop/lesson' }, s.lastVisited ? 'Continue where you left off' : 'Start with Module 1'),
        queue ? h('a', { class: 'btn', href: '#/review' }, `Review ${queue} missed question${queue > 1 ? 's' : ''}`) : null)),
    ...TIERS.map((t) => h('section', { class: 'tier' },
      h('h2', {}, t.title),
      h('p', { class: 'muted' }, t.blurb),
      h('div', { class: 'grid' }, MODULES.filter((m) => m.tier === t.id).map((m) => card(m, s))))),
  );
}
```

- [ ] **Step 10: Write `css/styles.css`** (the full stylesheet; later tasks only append view-specific rules)

```css
:root {
  --bg: #f6f6fb; --surface: #ffffff; --surface-2: #eef0f7; --border: #dfe2ee;
  --text: #1b1d2a; --muted: #5b6074; --accent: #5b4dd6; --accent-soft: #ece9ff; --accent-ink: #ffffff;
  --ok: #12804c; --ok-bg: #e5f5ec; --bad: #c0362f; --bad-bg: #fcebea; --warn: #9a5b00; --warn-bg: #fff3dd;
  --cpp: #2463a6; --py: #2c7a4f; --xp: #a86d0b;
  --radius: 14px; --radius-sm: 9px;
  --shadow: 0 1px 2px rgba(20, 20, 50, .06), 0 6px 20px rgba(20, 20, 50, .06);
  --font: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, 'Cascadia Code', Consolas, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --bg: #0f1117; --surface: #171a23; --surface-2: #1f2330; --border: #2b3040;
    --text: #e8eaf3; --muted: #9ba1b5; --accent: #8f85ff; --accent-soft: #262245; --accent-ink: #0f1117;
    --ok: #4fd18b; --ok-bg: #11301f; --bad: #ff7b72; --bad-bg: #3a1716; --warn: #f1b75e; --warn-bg: #33260f;
    --cpp: #79b6ff; --py: #6fd39c; --xp: #f6c453;
    --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 6px 20px rgba(0, 0, 0, .3);
    color-scheme: dark;
  }
}
:root[data-theme='dark'] {
  --bg: #0f1117; --surface: #171a23; --surface-2: #1f2330; --border: #2b3040;
  --text: #e8eaf3; --muted: #9ba1b5; --accent: #8f85ff; --accent-soft: #262245; --accent-ink: #0f1117;
  --ok: #4fd18b; --ok-bg: #11301f; --bad: #ff7b72; --bad-bg: #3a1716; --warn: #f1b75e; --warn-bg: #33260f;
  --cpp: #79b6ff; --py: #6fd39c; --xp: #f6c453;
  --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 6px 20px rgba(0, 0, 0, .3);
  color-scheme: dark;
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 var(--font); min-height: 100vh; display: flex; flex-direction: column; }
a { color: var(--accent); }
code, pre, kbd { font-family: var(--mono); }
h1, h2, h3 { line-height: 1.25; }
.muted { color: var(--muted); }
.skip { position: absolute; left: -999px; }
.skip:focus { left: 16px; top: 8px; z-index: 10; background: var(--surface); padding: 8px 12px; border-radius: var(--radius-sm); }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

/* top bar */
.topbar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
  padding: 10px 24px; background: color-mix(in srgb, var(--surface) 88%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; color: var(--text); text-decoration: none; }
.brand-mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: var(--accent); color: var(--accent-ink); font-family: var(--mono); font-size: 14px; }
.nav { display: flex; gap: 4px; flex-wrap: wrap; }
.nav a { padding: 6px 12px; border-radius: 999px; color: var(--muted); text-decoration: none; font-weight: 500; }
.nav a:hover { color: var(--text); background: var(--surface-2); }
.nav a.active { color: var(--accent); background: var(--accent-soft); }
.topbar-right { margin-left: auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pill { display: inline-block; min-width: 20px; padding: 0 6px; border-radius: 999px; background: var(--bad); color: #fff; font-size: 12px; text-align: center; }
.chip { padding: 4px 10px; border-radius: 999px; background: var(--surface-2); font-size: 14px; font-weight: 600; white-space: nowrap; }
.chip-xp { color: var(--xp); }
.seg { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--surface-2); }
.seg button { border: 0; background: transparent; color: var(--muted); padding: 4px 10px; border-radius: 999px; font: 600 13px var(--font); cursor: pointer; }
.seg button[aria-checked='true'] { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }
.icon-btn { border: 1px solid var(--border); background: var(--surface); color: var(--text); width: 34px; height: 34px; border-radius: 50%; cursor: pointer; font-size: 16px; }

main { flex: 1; width: 100%; max-width: 1180px; margin: 0 auto; padding: 28px 24px 64px; outline: none; }
.footer { text-align: center; color: var(--muted); font-size: 13px; padding: 24px 16px; border-top: 1px solid var(--border); }
.loading { text-align: center; color: var(--muted); padding: 48px 0; }

/* buttons */
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 10px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text); font: 600 15px var(--font); text-decoration: none; cursor: pointer; }
.btn:hover { border-color: var(--accent); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.btn.small { padding: 6px 12px; font-size: 14px; }
.btn.danger { color: var(--bad); }

/* dashboard */
.hero { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px 32px; align-items: center; padding: 28px; border-radius: var(--radius);
  background: linear-gradient(135deg, var(--accent-soft), var(--surface)); border: 1px solid var(--border); box-shadow: var(--shadow); }
.hero h1 { margin: 0 0 12px; font-size: 32px; }
.eyebrow { margin: 0; text-transform: uppercase; letter-spacing: .08em; font-size: 12px; font-weight: 700; color: var(--accent); }
.xpbar { height: 10px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.xpbar span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), var(--xp)); border-radius: inherit; }
.hero-stats { display: flex; gap: 12px; flex-wrap: wrap; }
.stat { flex: 1; min-width: 90px; padding: 12px; border-radius: var(--radius-sm); background: var(--surface); border: 1px solid var(--border); display: flex; flex-direction: column; }
.stat-n { font-size: 22px; font-weight: 700; }
.stat-l { font-size: 13px; color: var(--muted); }
.hero-actions { grid-column: 1 / -1; display: flex; gap: 10px; flex-wrap: wrap; }
.tier { margin-top: 36px; }
.tier h2 { margin: 0; }
.tier > .muted { margin: 4px 0 14px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
.card { display: flex; flex-direction: column; gap: 6px; padding: 16px; border-radius: var(--radius); background: var(--surface);
  border: 1px solid var(--border); box-shadow: var(--shadow); color: var(--text); text-decoration: none; transition: transform .12s, border-color .12s; }
a.card:hover { transform: translateY(-2px); border-color: var(--accent); }
.card h3 { margin: 4px 0 0; font-size: 17px; }
.card p { margin: 0; font-size: 14px; }
.card-top { display: flex; justify-content: space-between; align-items: center; }
.card-meta { color: var(--muted); font-size: 13px !important; margin-top: auto !important; padding-top: 6px; }
.card-mastered { border-color: var(--ok); }
.card-soon { opacity: .6; }
.num { font-family: var(--mono); font-weight: 600; color: var(--muted); }
.badges { display: flex; gap: 4px; }
.badge { font-size: 18px; }
.ring-track { fill: none; stroke: var(--surface-2); stroke-width: 4; }
.ring-fill { fill: none; stroke: var(--accent); stroke-width: 4; stroke-linecap: round; transition: stroke-dashoffset .4s; }
.card-mastered .ring-fill { stroke: var(--ok); }
.ring-text { font: 700 11px var(--font); fill: var(--text); }
.tag { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; background: var(--surface-2); }
.tag-cpp { color: var(--cpp); }
.tag-python { color: var(--py); }
.dots { color: var(--accent); letter-spacing: 2px; font-size: 11px; }
.empty { text-align: center; padding: 48px 16px; }

/* toasts */
#toasts { position: fixed; right: 16px; bottom: 16px; z-index: 20; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.toast { padding: 10px 14px; border-radius: 10px; background: var(--text); color: var(--bg); font-weight: 600; box-shadow: var(--shadow); transition: opacity .4s, transform .4s; }
.toast-xp { background: var(--xp); color: #1b1d2a; }
.toast-level, .toast-badge { background: var(--accent); color: var(--accent-ink); }
.toast.out { opacity: 0; transform: translateY(8px); }

@media (max-width: 760px) {
  .topbar { padding: 10px 16px; gap: 10px; }
  .topbar-right { margin-left: 0; width: 100%; }
  main { padding: 20px 16px 48px; }
  .hero { grid-template-columns: 1fr; padding: 20px; }
  .hero h1 { font-size: 26px; }
}
```

- [ ] **Step 11: Manual check in the browser**

Run: `npm run serve`, then open `http://localhost:8000/`.
Expected:
- The dashboard shows five tiers. Module 05 is a live card (16 questions · 4 labs, 0%) and the other modules show "Coming soon".
- Language and theme toggles work, and the theme persists after a reload.
- `#/nope` shows "Page not found".
- At a 375 px width there is no horizontal scroll.

- [ ] **Step 12: Commit**

```bash
git add index.html css js tests/router.test.mjs
git commit -m "feat: app shell, router, store, content loader and dashboard"
```

### Task 8: Module page + lesson renderer

**Files:**
- Create: `js/markdown.js`, `js/views/lesson.js`
- Replace stub: `js/views/module.js`
- Create stubs (replaced in Tasks 9 and 10): `js/views/quiz.js`, `js/views/lab.js`, each exporting `render(root)` that appends "Coming in a later task".
- Modify: `css/styles.css` (append the module/lesson rules below)

**Interfaces:**
- Consumes: `getModule`, `filterByLang`, `loadLesson`, `MODULES` (Task 7); `moduleMastery` (Task 1).
- Produces:
  - `renderMarkdown(md, {className?}) → HTMLDivElement` (trusted Markdown only), `pairCompareBlocks(root)`, `codeBlock(code, lang) → HTMLPreElement`
  - **Tab view contract:** `js/views/{lesson,quiz,lab}.js` export `render(root, {module, quiz, exercises, exId}) → void | cleanup | Promise`. `quiz` and `exercises` are already filtered by the language setting, and `module` is `getModule(id)`.

- [ ] **Step 1: Implement** — `js/markdown.js`

```js
// Renders author-written (trusted) Markdown: syntax highlighting, C++/Python compare panes, callouts.
const CALLOUTS = { 'Note:': 'note', 'Tip:': 'note', 'Pitfall:': 'pitfall', 'C++ vs Python:': 'compare', 'Under the hood:': 'deep' };

export function renderMarkdown(md, { className = 'prose' } = {}) {
  const el = document.createElement('div');
  el.className = className;
  el.innerHTML = window.marked.parse(md ?? '', { gfm: true });
  for (const code of el.querySelectorAll('pre code')) {
    const lang = /language-(\w+)/.exec(code.className)?.[1];
    if (lang === 'cpp' || lang === 'python') code.parentElement.dataset.lang = lang;
    if (window.hljs && lang && window.hljs.getLanguage(lang)) window.hljs.highlightElement(code);
  }
  pairCompareBlocks(el);
  for (const bq of el.querySelectorAll('blockquote')) {
    const strong = bq.querySelector('p:first-child > strong:first-child');
    const kind = strong && CALLOUTS[strong.textContent.trim()];
    if (kind) bq.classList.add('callout', `callout-${kind}`);
  }
  for (const a of el.querySelectorAll('a[href^="http"]')) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  return el;
}

// Adjacent ```cpp + ```python blocks (either order) become one side-by-side widget.
export function pairCompareBlocks(root) {
  for (const pre of [...root.querySelectorAll('pre[data-lang]')]) {
    if (pre.parentElement?.classList.contains('pane')) continue;
    const next = pre.nextElementSibling;
    if (!next || next.tagName !== 'PRE' || !next.dataset.lang || next.dataset.lang === pre.dataset.lang) continue;
    const wrap = document.createElement('div');
    wrap.className = 'compare';
    pre.before(wrap);
    for (const p of [pre, next]) {
      const pane = document.createElement('div');
      pane.className = `pane pane-${p.dataset.lang}`;
      const label = document.createElement('div');
      label.className = 'pane-label';
      label.textContent = p.dataset.lang === 'cpp' ? 'C++' : 'Python';
      pane.append(label, p);
      wrap.append(pane);
    }
  }
}

export function codeBlock(code, lang) {
  const pre = document.createElement('pre');
  const el = document.createElement('code');
  el.className = `language-${lang}`;
  el.textContent = code;
  pre.append(el);
  if (window.hljs?.getLanguage(lang)) window.hljs.highlightElement(el);
  return pre;
}
```

- [ ] **Step 2: Implement** — `js/views/module.js` (replaces the stub)

```js
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
```

- [ ] **Step 3: Implement** — `js/views/lesson.js`

```js
import { h } from '../dom.js';
import { loadLesson } from '../content.js';
import { renderMarkdown } from '../markdown.js';

export async function render(root, { module }) {
  root.append(h('p', { class: 'loading' }, 'Loading lesson…'));
  const md = await loadLesson(module.id);
  root.replaceChildren();
  if (md == null) {
    root.append(h('div', { class: 'notice notice-bad' }, 'Could not load this lesson. Check your connection and reload the page.'));
    return;
  }
  const article = renderMarkdown(md);
  const heads = [...article.querySelectorAll('h2')];
  heads.forEach((el, i) => { el.id = `sec-${i}`; });
  // Hash routing owns location.hash, so TOC entries scroll instead of navigating.
  const toc = h('nav', { class: 'toc', 'aria-label': 'On this page' },
    h('p', { class: 'eyebrow' }, 'On this page'),
    heads.map((el) => h('button', { type: 'button', onclick: () => el.scrollIntoView({ behavior: 'smooth' }) }, el.textContent)));
  root.append(
    h('div', { class: 'lesson-layout' }, toc, h('article', { class: 'lesson' }, article)),
    h('div', { class: 'lesson-next' },
      h('p', {}, 'Ready to check your understanding?'),
      module.meta.final
        ? h('a', { class: 'btn primary', href: '#/exam' }, 'Take the final exam →')
        : h('a', { class: 'btn primary', href: `#/m/${module.id}/quiz` }, 'Take the quiz →'),
      h('a', { class: 'btn', href: `#/m/${module.id}/lab` }, 'Go to the labs')),
  );
}
```

- [ ] **Step 4: Append the module/lesson styles** to `css/styles.css`

```css
/* module page */
.module-head { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
.module-head h1 { margin: 2px 0 6px; font-size: 30px; }
.module-head .muted { margin: 0; }
.module-mastery { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 13px; text-align: center; }
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin: 20px 0 24px; overflow-x: auto; }
.tab { padding: 10px 16px; color: var(--muted); text-decoration: none; font-weight: 600; border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; }
.tab:hover { color: var(--text); }
.tab.active { color: var(--accent); border-color: var(--accent); }
.module-pager { display: flex; justify-content: space-between; gap: 12px; margin-top: 40px; flex-wrap: wrap; }
.notice { padding: 12px 16px; border-radius: var(--radius-sm); }
.notice-bad { background: var(--bad-bg); color: var(--bad); }
.notice-warn { background: var(--warn-bg); color: var(--warn); }
.notice-ok { background: var(--ok-bg); color: var(--ok); }

/* lesson */
.lesson-layout { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 36px; }
.toc { position: sticky; top: 84px; align-self: start; font-size: 14px; max-height: calc(100vh - 100px); overflow: auto; }
.toc button { display: block; width: 100%; padding: 4px 0; border: 0; background: none; color: var(--muted); font: inherit; text-align: left; cursor: pointer; }
.toc button:hover { color: var(--accent); }
.prose { max-width: 860px; }
.prose h1 { font-size: 28px; margin-top: 0; }
.prose h2 { margin-top: 2em; padding-top: .6em; border-top: 1px solid var(--border); }
.prose h3 { margin-top: 1.6em; }
.prose :not(pre) > code { background: var(--surface-2); padding: .1em .35em; border-radius: 5px; font-size: .88em; }
.prose pre, .quiz-code pre, .solution pre { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); margin: 1em 0; overflow: auto; }
pre code.hljs, pre code { display: block; padding: 14px 16px; font-size: 14px; line-height: 1.55; background: transparent !important; }
.prose table { border-collapse: collapse; display: block; overflow-x: auto; }
.prose th, .prose td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; vertical-align: top; }
.prose th { background: var(--surface-2); }
.prose blockquote { margin: 1.2em 0; padding: 10px 16px; border-left: 4px solid var(--border); background: var(--surface); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
.prose blockquote p { margin: .4em 0; }
.prose .callout-note { border-left-color: var(--accent); background: var(--accent-soft); }
.prose .callout-pitfall { border-left-color: var(--bad); background: var(--bad-bg); }
.prose .callout-compare { border-left-color: var(--py); }
.prose .callout-deep { border-left-color: var(--xp); background: var(--warn-bg); }
.compare { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 1em 0; }
.pane { min-width: 0; display: flex; flex-direction: column; }
.pane pre { margin: 0 !important; flex: 1; }
.pane-label { font: 700 12px var(--font); text-transform: uppercase; letter-spacing: .06em; padding: 0 2px 6px; }
.pane-cpp .pane-label { color: var(--cpp); }
.pane-python .pane-label { color: var(--py); }
body[data-lang='cpp'] .compare, body[data-lang='python'] .compare { grid-template-columns: 1fr; }
body[data-lang='cpp'] .pane-python, body[data-lang='python'] .pane-cpp { display: none; }
.lesson-next { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 36px; padding: 20px; border-radius: var(--radius); background: var(--accent-soft); }
.lesson-next p { margin: 0 auto 0 0; font-weight: 600; }
@media (max-width: 960px) { .lesson-layout { grid-template-columns: 1fr; } .toc { position: static; max-height: none; } }
@media (max-width: 760px) { .compare { grid-template-columns: 1fr; } }
```

- [ ] **Step 5: Manual check in the browser**

Open `http://localhost:8000/#/m/inheritance/lesson`.
Expected:
- C++/Python blocks appear side by side, are highlighted, and stack on narrow screens.
- Switching to C++ only hides the Python panes.
- Callouts are colored, and TOC links scroll to the right section.
- The pager links to modules 04 and 06 (which show "not available yet" for now).
- Dark mode: code and callouts are readable.

- [ ] **Step 6: Commit**

```bash
git add js/markdown.js js/views css/styles.css
git commit -m "feat: module page and lesson renderer with C++/Python compare panes"
```

### Task 9: Quiz engine (module quiz, review, final exam)

**Files:**
- Create: `js/quiz-session.js`
- Replace stubs: `js/views/quiz.js`, `js/views/review.js`, `js/views/exam.js`
- Modify: `js/markdown.js` (add `renderInline`), `css/styles.css` (append quiz rules)
- Test: `tests/quiz-session.test.mjs`

**Interfaces:**
- Consumes: `recordAnswer`, `reviewQueue` (Task 1); `gain` (Task 7); `findQuestion`, `modulesFor`, `MODULES` (Task 7); `renderMarkdown`, `codeBlock` (Task 8).
- Produces:
  - `mulberry32(seed) → rng`, `shuffle(arr, rng?) → new array`, `optionOrder(q, rng?) → number[]` (a permutation of option indexes)
  - `pickExam(modules, n = 40, rng?) → [{q, moduleId}]`. It picks round-robin across modules so each one is represented.
  - `summarize(answers) → {total, correct, missed: qid[], byModule: {[id]: {correct, total}}}`
  - `runSession(root, items, {mode: 'module'|'review'|'exam', reviewSession?, links?: [href, label][]}) → stopKeys`
  - `stopKeys()`
  - `renderInline(md) → string` (HTML, trusted content)

- [ ] **Step 1: Write the failing tests** — `tests/quiz-session.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, shuffle, optionOrder, pickExam, summarize } from '../js/quiz-session.js';

test('shuffle is a deterministic permutation for a seeded rng', () => {
  const a = [1, 2, 3, 4, 5, 6, 7, 8];
  const s1 = shuffle(a, mulberry32(42));
  const s2 = shuffle(a, mulberry32(42));
  assert.deepEqual(s1, s2);
  assert.deepEqual([...s1].sort((x, y) => x - y), a);
  assert.deepEqual(a, [1, 2, 3, 4, 5, 6, 7, 8]); // input untouched
});

test('optionOrder is a permutation of option indexes', () => {
  const order = optionOrder({ options: [{}, {}, {}, {}] }, mulberry32(1));
  assert.deepEqual([...order].sort(), [0, 1, 2, 3]);
});

test('pickExam spreads across modules and never repeats', () => {
  const mods = ['a', 'b', 'c'].map((id) => ({ id, quiz: Array.from({ length: 20 }, (_, i) => ({ id: `${id}-q${i}` })) }));
  const picked = pickExam(mods, 9, mulberry32(7));
  assert.equal(picked.length, 9);
  assert.equal(new Set(picked.map((p) => p.q.id)).size, 9);
  for (const id of ['a', 'b', 'c']) assert.equal(picked.filter((p) => p.moduleId === id).length, 3);
  const small = pickExam([{ id: 'x', quiz: [{ id: 'x-q1' }] }, { id: 'y', quiz: [] }], 40);
  assert.equal(small.length, 1);
});

test('summarize counts per module and lists misses', () => {
  const s = summarize([
    { qid: 'a1', moduleId: 'a', correct: true },
    { qid: 'a2', moduleId: 'a', correct: false },
    { qid: 'b1', moduleId: 'b', correct: true },
  ]);
  assert.deepEqual(s, { total: 3, correct: 2, missed: ['a2'], byModule: { a: { correct: 1, total: 2 }, b: { correct: 1, total: 1 } } });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/quiz-session.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** — `js/quiz-session.js`

```js
export function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const optionOrder = (q, rng = Math.random) => shuffle(q.options.map((_, i) => i), rng);

export function pickExam(modules, n = 40, rng = Math.random) {
  const pools = modules.filter((m) => m.quiz.length).map((m) => ({ id: m.id, qs: shuffle(m.quiz, rng) }));
  const out = [];
  for (let i = 0; out.length < n && pools.some((p) => p.qs.length); i++) {
    const p = pools[i % pools.length];
    if (p.qs.length) out.push({ q: p.qs.pop(), moduleId: p.id });
  }
  return shuffle(out, rng);
}

export function summarize(answers) {
  const byModule = {};
  for (const a of answers) {
    const m = (byModule[a.moduleId] ??= { correct: 0, total: 0 });
    m.total++;
    if (a.correct) m.correct++;
  }
  return {
    total: answers.length,
    correct: answers.filter((a) => a.correct).length,
    missed: answers.filter((a) => !a.correct).map((a) => a.qid),
    byModule,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Add `renderInline`** to `js/markdown.js` (append)

```js
export const renderInline = (md) => window.marked.parseInline(md ?? '');
```

- [ ] **Step 6: Implement** — `js/views/quiz.js` (replaces the stub)

```js
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
```

- [ ] **Step 7: Implement** — `js/views/review.js` and `js/views/exam.js` (replace the stubs)

`js/views/review.js`:
```js
import { h } from '../dom.js';
import { store } from '../store.js';
import { reviewQueue } from '../state.js';
import { findQuestion } from '../content.js';
import { runSession, stopKeys } from './quiz.js';
import { shuffle } from '../quiz-session.js';

export function render(root) {
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
```

`js/views/exam.js`:
```js
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
```

- [ ] **Step 8: Append the quiz styles** to `css/styles.css`

```css
/* quiz */
.page-head h1 { margin: 0 0 6px; }
.quiz-intro, .quiz-card, .quiz-done { max-width: 860px; padding: 24px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow); }
.quiz-intro h2, .quiz-done h2 { margin-top: 0; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 16px; }
.quiz-progress { display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--muted); }
.quiz-progress .bar { flex: 1; height: 6px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.quiz-progress .bar span { display: block; height: 100%; background: var(--accent); }
.xp-session { color: var(--xp); font-weight: 700; }
.quiz-meta { display: flex; gap: 8px; align-items: center; margin: 14px 0 4px; flex-wrap: wrap; }
.quiz-prompt { font-size: 17px; }
.quiz-prompt p:first-child { margin-top: 8px; }
.options { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.option { display: flex; gap: 12px; align-items: flex-start; width: 100%; text-align: left; padding: 12px 14px; border-radius: 10px;
  border: 2px solid var(--border); background: var(--surface); color: var(--text); font: 15px/1.5 var(--font); cursor: pointer; }
.option:hover:not(:disabled) { border-color: var(--accent); }
.option:disabled { cursor: default; }
.option-key { flex: none; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; background: var(--surface-2); font-weight: 700; font-size: 13px; }
.option-text { min-width: 0; }
.option-text code { background: var(--surface-2); padding: .05em .3em; border-radius: 4px; }
.option-pre { margin: 0; padding: 0; white-space: pre-wrap; font-size: 14px; background: none; border: 0; }
.option.correct { border-color: var(--ok); background: var(--ok-bg); }
.option.wrong { border-color: var(--bad); background: var(--bad-bg); }
.option.other { opacity: .75; }
.why { margin: 6px 0 4px 40px; font-size: 14px; }
.why-ok strong { color: var(--ok); }
.why-bad strong { color: var(--bad); }
.verdict { margin-top: 18px; padding: 12px 14px; border-radius: 10px; font-weight: 700; }
.verdict .muted { font-weight: 400; }
.verdict-ok { background: var(--ok-bg); color: var(--ok); }
.verdict-bad { background: var(--bad-bg); color: var(--bad); }
.explanation { margin-top: 14px; padding: 4px 16px 8px; border-left: 4px solid var(--accent); background: var(--accent-soft); border-radius: 0 10px 10px 0; }
.explanation h3 { margin: 10px 0 0; font-size: 15px; }
.kbd-hint { font-size: 13px; }
.score { font-size: 28px; font-weight: 700; margin: 4px 0; }
.breakdown { border-collapse: collapse; width: 100%; margin: 12px 0; }
.breakdown th, .breakdown td { padding: 6px 10px; border-bottom: 1px solid var(--border); text-align: left; }
.missed ul { padding-left: 20px; }
@media (max-width: 760px) { .quiz-intro, .quiz-card, .quiz-done { padding: 16px; } .why { margin-left: 8px; } }
```

- [ ] **Step 9: Manual check in the browser**

Open `#/m/inheritance/quiz`.
Expected:
- Options are shuffled.
- After answering, every option shows its "why" and the explanation appears.
- Keys 1–4 and Enter work, and XP toasts appear (+10 on a first-try correct, +5 when correct after a miss).
- Answer one question wrong on purpose. The header Review pill shows 1, `#/review` lists it, and answering it right in review moves it to box 2 (a second review session clears it).
- `#/exam` draws from module 05.
- After a reload, XP and the Review pill are unchanged.

- [ ] **Step 10: Commit**

```bash
git add js/quiz-session.js js/views js/markdown.js css/styles.css tests/quiz-session.test.mjs
git commit -m "feat: quiz engine with per-option explanations, review queue and final exam"
```

### Task 10: Coding lab

**Files:**
- Replace stub: `js/views/lab.js`
- Modify: `css/styles.css` (append lab rules)

**Interfaces:**
- Consumes: `runCpp` and `runPython`/`warmUpPython` (Task 4); `useHint`, `revealSolution`, `markPassed` (Task 1); `gain` (Task 7); `renderMarkdown`, `renderInline`, `codeBlock` (Tasks 8–9).
- Produces: the lab tab view (tab view contract). Code autosaves to `localStorage` key `oop-mastery:code:<exerciseId>`.

- [ ] **Step 1: Implement** — `js/views/lab.js`

```js
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
```

- [ ] **Step 2: Append the lab styles** to `css/styles.css`

```css
/* lab */
.lab-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 24px; }
.lab-list { display: flex; flex-direction: column; gap: 6px; align-self: start; position: sticky; top: 84px; }
.lab-item { display: grid; grid-template-columns: 20px 1fr; gap: 2px 8px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text); text-decoration: none; font-size: 14px; }
.lab-item .tag, .lab-item .dots { grid-column: 2; justify-self: start; }
.lab-item.active { border-color: var(--accent); background: var(--accent-soft); }
.lab-status { color: var(--ok); font-weight: 700; grid-row: span 3; }
.lab-title { font-weight: 600; }
.lab-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.lab-head h2 { margin: 0; }
.run-note { font-size: 13px; }
.editor { border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.editor .CodeMirror { height: auto; min-height: 260px; font: 14px/1.55 var(--mono); background: var(--surface); color: var(--text); }
.editor .CodeMirror-gutters { background: var(--surface-2); border-right: 1px solid var(--border); }
.editor .CodeMirror-linenumber { color: var(--muted); }
.editor .CodeMirror-cursor { border-left-color: var(--text); }
.editor .CodeMirror-selected, .editor .CodeMirror-focused .CodeMirror-selected { background: var(--accent-soft); }
:root[data-theme='dark'] .cm-keyword { color: #ff7b72; }
:root[data-theme='dark'] .cm-def, :root[data-theme='dark'] .cm-variable-2 { color: #d2a8ff; }
:root[data-theme='dark'] .cm-string { color: #a5d6ff; }
:root[data-theme='dark'] .cm-number, :root[data-theme='dark'] .cm-atom { color: #79c0ff; }
:root[data-theme='dark'] .cm-comment { color: #8b949e; }
:root[data-theme='dark'] .cm-type, :root[data-theme='dark'] .cm-builtin, :root[data-theme='dark'] .cm-meta { color: #ffa657; }
.editor-fallback { width: 100%; min-height: 320px; border: 0; padding: 12px; font: 14px/1.55 var(--mono); background: var(--surface); color: var(--text); resize: vertical; }
.toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin: 12px 0; }
.run-status { font-size: 14px; }
.hint { margin: 8px 0; padding: 10px 14px; border-radius: 10px; background: var(--warn-bg); color: var(--text); }
.hint strong { color: var(--warn); }
.run-message { white-space: pre-wrap; padding: 12px; border-radius: 10px; background: var(--surface-2); font-size: 13px; overflow-x: auto; }
.test-list { list-style: none; padding: 0; margin: 10px 0; display: flex; flex-direction: column; gap: 6px; }
.test { display: flex; gap: 10px; flex-wrap: wrap; align-items: baseline; padding: 8px 12px; border-radius: 8px; background: var(--surface); border: 1px solid var(--border); }
.test-icon { font-weight: 700; }
.test-pass .test-icon { color: var(--ok); }
.test-fail .test-icon { color: var(--bad); }
.test-notrun { opacity: .7; }
.test-name { font-weight: 600; }
.test-msg { flex-basis: 100%; font: 13px/1.5 var(--mono); color: var(--muted); white-space: pre-wrap; }
.stdout pre { padding: 12px; border-radius: 10px; background: var(--surface-2); white-space: pre-wrap; }
.solution { margin-top: 24px; padding: 4px 20px 16px; border-radius: var(--radius); border: 1px solid var(--ok); background: var(--surface); }
@media (max-width: 960px) { .lab-layout { grid-template-columns: 1fr; } .lab-list { position: static; flex-direction: row; overflow-x: auto; } .lab-item { min-width: 200px; } }
```

- [ ] **Step 3: Manual check in the browser** (this also covers the Task 4 runners and Review Focus items 1, 4 and 5)

Open `#/m/inheritance/lab`.
- **Python lab (`inheritance-e03`):**
  - Run the starter → red tests with `NotImplementedError` messages.
  - Paste the solution → "All 5 tests passed! 🎉", a +50 XP toast, then the solution and walkthrough appear.
  - Replace the code with `while True: pass` → "Timed out" after about 10 s. Run again: it works (the worker respawned).
- **C++ lab (`inheritance-e01`):**
  - Run the starter → failing tests with "expected … got …".
  - Delete a `;` → "Compile error" with `your code:L:C`.
  - Add `int main(){}` → the "Remove your main()" message.
  - Paste the solution → all tests pass.
- **Hints and solution:** the hint button reveals hints one at a time. Show solution on an unpassed lab warns, then shows the solution and the 0-XP note.
- **Persistence:** reload → the code persists and the list shows ✓ for passed labs.
- **Offline:** DevTools → Network offline → Run C++ → "Could not run your code" with the network message, and the code is still there.

- [ ] **Step 4: Commit**

```bash
git add js/views/lab.js css/styles.css
git commit -m "feat: coding lab with real test runs, hints and model solutions"
```

### Task 11: Settings (language, theme, export/import/reset)

**Files:**
- Replace stub: `js/views/settings.js`
- Modify: `css/styles.css` (append settings rules)

**Interfaces:**
- Consumes: `setSetting`, `exportState`, `importState`, `defaultState` (Task 1); `store` and `toast` (Task 7).
- Produces: the `#/settings` view.

- [ ] **Step 1: Implement** — `js/views/settings.js`

```js
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
```

- [ ] **Step 2: Append the settings styles** to `css/styles.css`

```css
/* settings */
.settings-section { max-width: 760px; margin-bottom: 18px; padding: 20px 24px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); }
.settings-section h2 { margin: 0 0 4px; font-size: 18px; }
.radios { display: flex; gap: 8px 20px; flex-wrap: wrap; margin-top: 10px; }
.radio { display: flex; gap: 8px; align-items: center; cursor: pointer; }
.radio input { accent-color: var(--accent); width: 18px; height: 18px; }
```

- [ ] **Step 3: Manual check in the browser**

Open `#/settings`.
Expected:
- Switching the theme and language updates the header immediately and persists after a reload.
- Export downloads a JSON file. Reset clears XP. Import of that file restores the XP.
- Importing a random `.json` shows "Import failed: Not an OOP Mastery progress file".

- [ ] **Step 4: Commit**

```bash
git add js/views/settings.js css/styles.css
git commit -m "feat: settings with language, theme and progress export/import/reset"
```

---

## Content tasks (12–17)

Every content task follows the **same steps for each module** in its batch, and uses the quality bar and samples from Task 6:

- [ ] Write `content/<dir>/lesson.md` covering the listed sections in order, then `## Key takeaways` and `## Common pitfalls`.
- [ ] Write `content/<dir>/quiz.js` with at least the listed questions. Ids are `<moduleId>-q01…`; **output** questions are marked in bold.
- [ ] Write `content/<dir>/exercises.js` with at least the listed exercises. Ids are `<moduleId>-e01…`.
- [ ] Run `npm run validate -- --module <id>` and `npm run check -- --module <id>`. Fix the **content** until both are green.

At the end of the batch, commit with `git add content && git commit -m "content: modules NN–MM (<tier>)"`.

### Task 12: Content — Foundations (modules 01–04)

**Files:** `content/01-why-oop/*`, `content/02-classes/*`, `content/03-lifetime/*`, `content/04-encapsulation/*`
**Interfaces:** Consumes the Task 5 schema; produces four modules that pass both content checkers.

**01 Why OOP? (`why-oop`)**
- **Lesson:**
  1. A procedural bank program (parallel arrays / dicts) and its pain: scattered invariants, and data separated from behavior.
  2. Objects = state + behavior + identity.
  3. Class vs object (a first class side by side).
  4. The four pillars, with a paragraph and a tiny example each, pointing to their modules.
  5. Memory model: C++ objects are values (stack vs heap, `new`, copies); Python names are references to heap objects (`is`, `id`, aliasing).
  6. Methods as messages; a preview of `this`/`self`.
  7. When OOP is the wrong tool; multi-paradigm code.
- **MCQs:**
  1. what an object bundles
  2. class vs object
  3. which pillar hides state
  4. polymorphism in one sentence
  5. **python list aliasing `b = a; b.append(4); print(a)`**
  6. **cpp struct copy `Point b = a; b.x = 9;` → prints `a.x`**
  7. **python `==` vs `is` on equal lists**
  8. compare: `Point p;` in C++ vs `p = Point()` in Python
  9. identity vs equality
  10. bug/python: a function silently mutates the caller's list
  11. the procedural pitfall of scattered invariants
  12. **cpp locals destroyed at scope end (print order)**
  13. abstraction vs encapsulation
  14. compare: where objects live
  15. when OOP is not ideal
  16. **cpp pass by value vs by reference**
- **Exercises:**
  - cpp `Counter`: `increment()`, `reset()`, `int value() const`.
  - cpp `BankAccount`, refactored from procedural code: `bool deposit(double)` / `bool withdraw(double)` reject non-positive amounts and overdrafts; `double balance() const`.
  - python `Counter`: the same API.
  - python `Rectangle(width, height)`: `area()`, `perimeter()`, `is_square()`.

**02 Classes & Objects (`classes`)**
- **Lesson:**
  1. Anatomy of a class: members and methods.
  2. `this` vs explicit `self`; `Dog.speak(d)` is the same call as `d.speak()`.
  3. Defining methods inside vs outside the class (`Dog::speak`); the header/source split.
  4. Instance vs class attributes. Python lookup order (instance → class) and shadowing on assignment; `__dict__`/`vars`.
  5. `struct` vs `class` (default access only).
  6. Python's dynamic attributes vs C++'s fixed layout.
  7. Printing objects: `__str__`/`__repr__` vs `operator<<` (preview).
  8. Objects as arguments: by value / reference / const reference vs Python's call by sharing.
- **MCQs:**
  1. what `self` is
  2. **python `Dog.speak(d)`**
  3. **python class attribute shadowing `a.count = 5; print(A.count, a.count, b.count)`**
  4. **python mutable class-level list shared between instances**
  5. **cpp method chaining by returning `*this` by reference**
  6. bug/python: missing `self` → TypeError
  7. struct vs class
  8. compare: adding attributes at runtime
  9. `this` inside a const member function
  10. bug/cpp: defining `speak()` without `Dog::`
  11. **python `print(p)` vs `print([p])` (`__str__` vs `__repr__`)**
  12. `vars(obj)`
  13. bug/cpp: chaining breaks when returning by value
  14. compare: a function modifies its object argument (C++ by value vs Python)
  15. method vs free function
  16. **cpp modify through a reference parameter**
- **Exercises:**
  - cpp `Vector2`: `x`, `y`, `double length() const`, `Vector2 add(const Vector2&) const`, `Vector2& scale(double)` (chainable).
  - cpp `Playlist`: `addSong(std::string)`, `size()`, `contains(name)`, `toString()` → `"a, b, c"`.
  - python `Book`: title/author/pages, `__repr__`, `__str__`, `is_long()` (> 300 pages), class attribute `count` of books created.
  - python "fix the shared list": the starter `ShoppingCart` has a class-level `items = []`. The tests require two carts to be independent.

**03 Constructors, Destructors & Lifetime (`lifetime`)**
- **Lesson:**
  1. Constructors exist so that no object is ever in an invalid state.
  2. Default and parameterized constructors, `= default`, default member initializers.
  3. The member-initializer list: it isn't assignment (const members, references, members without a default constructor), and its order is the declaration order (`-Wreorder`).
  4. Delegating constructors.
  5. `explicit` and implicit conversions.
  6. Destructors: when they run (scope end, `delete`, temporaries), in reverse order; a preview of RAII.
  7. Python `__new__` vs `__init__`.
  8. Why not to rely on `__del__`, and why to use `with` (`__enter__`/`__exit__`) as Python's RAII.
  9. A lifetime summary table (stack, heap, temporaries, static vs refcount + GC).
- **MCQs:**
  1. what constructors are for
  2. **cpp members built in declaration order even though the init list is written in reverse**
  3. bug/cpp: a const member assigned in the constructor body
  4. **cpp destruction order of locals**
  5. **cpp a temporary destroyed at the end of the full expression**
  6. what `explicit` prevents
  7. **cpp delegating constructor print order**
  8. `__new__` vs `__init__` order
  9. **python `__new__` and `__init__` prints**
  10. **python with-block enter/body/exit order**
  11. why not to rely on `__del__`
  12. compare: RAII vs `with`
  13. bug/python: `__init__` returns a value
  14. when the implicit default constructor disappears
  15. **cpp `new` without `delete` → the destructor never prints**
  16. members are destroyed after the destructor body
- **Exercises:**
  - cpp `Range`: `Range(int lo, int hi)` swaps if `lo > hi`; `Range()` delegates to `Range(0,0)`; `explicit Range(int hi)` delegates to `Range(0,hi)`; `contains`, `length`. Tests include `!std::is_convertible_v<int, Range>`.
  - cpp `ScopedLogger`: prints `enter <name>\n` / `exit <name>\n`. Tests use `captureCout`: nested scopes, and the exit still printed when an exception leaves the scope.
  - python `Timer(clock=time.perf_counter)`: a context manager that sets `elapsed` and doesn't suppress exceptions. Tests inject a fake clock.
  - python `Fraction`: normalizes in `__init__` (gcd, sign carried by the numerator; denominator 0 → `ValueError`), `__repr__`, `@classmethod from_string("3/4")`.

**04 Encapsulation (`encapsulation`)**
- **Lesson:**
  1. Invariants, and what goes wrong with a public `balance`.
  2. public/private/protected; privacy is per class, not per object.
  3. Getters/setters done right: tell-don't-ask, validate, return const references.
  4. `friend`, when it's legitimate.
  5. Python's `_x` convention and `__x` mangling (`_Class__x`). Its purpose is avoiding subclass clashes, not security.
  6. `@property`: computed values, validation, read-only properties, turning an attribute into a property without breaking callers.
  7. Defensive copies and immutability.
  8. Encapsulation vs abstraction.
- **MCQs:**
  1. what an invariant is
  2. bug/cpp: touching a private member from `main`
  3. can a method read another object's privates?
  4. **python mangling `hasattr(a, '__secret'), a._A__secret`**
  5. **python property setter rejects bad input (try/except prints)**
  6. **python computed property after mutation**
  7. what `friend` is
  8. compare: C++ private vs Python `__x`
  9. bug/python: a property setter recursing into itself
  10. **cpp a non-const reference getter leaks internals (size after an outside push_back)**
  11. tell, don't ask
  12. protected
  13. **python returning the internal list vs a copy**
  14. why Python skips getters/setters
  15. the `const` getter
  16. default access in a `class`
- **Exercises:**
  - cpp `BankAccount`: private balance; `deposit`/`withdraw` throw `std::invalid_argument` for non-positive amounts or overdrafts; the balance is unchanged after a failure; `transactionCount()`.
  - cpp `Temperature`: stores kelvin privately; `setCelsius`/`setFahrenheit` throw `std::out_of_range` below absolute zero; `celsius()`/`fahrenheit()` getters (`EXPECT_NEAR`).
  - python `BankAccount`: read-only `balance` property (assigning raises `AttributeError`); `deposit`/`withdraw` raise `ValueError`; `history()` returns a copy.
  - python `Temperature`: validated `celsius` property, a `fahrenheit` property with getter and setter, read-only `kelvin`.

### Task 13: Content — Pillars (modules 06–09)

**Files:** `content/06-polymorphism/*`, `content/07-abstraction/*`, `content/08-operators/*`, `content/09-static-members/*`
**Interfaces:** Consumes the Task 5 schema; produces four modules that pass both content checkers.

**Test-writing note** (applies from here on):
- C++ tests in one exercise share a single process, so **static state persists across tests**. Assert on deltas, e.g. `int before = User::count(); { User a; EXPECT_EQ(User::count(), before + 1); }`.
- Python tests re-run the learner's code for every test, so classes start fresh each time.

**06 Runtime Polymorphism (`polymorphism`)**
- **Lesson:**
  1. One interface, many behaviors; the pain of type switches.
  2. Static vs dynamic binding; `virtual`; calling through base pointers and references.
  3. `override` (catches signature typos) and `final`.
  4. *Under the hood:* vptr/vtable, the cost of a virtual call, why constructors can't be virtual, virtual calls inside constructors/destructors.
  5. Virtual destructors (deleting through a base pointer); the rule for polymorphic bases.
  6. Slicing revisited.
  7. In Python every method is "virtual"; duck typing; EAFP.
  8. Replacing type switches with polymorphism.
  9. `dynamic_cast` / `isinstance` checks as a smell.
- **MCQs:**
  1. dynamic dispatch
  2. **cpp virtual vs non-virtual through a base reference**
  3. **cpp slicing by value with virtual functions**
  4. bug/cpp: a missing `const` silently overloads instead of overriding
  5. what `override` checks
  6. **cpp virtual call in a base constructor prints the base version**
  7. a missing virtual destructor
  8. **cpp `delete` through a base pointer with a virtual destructor prints `~Derived ~Base`**
  9. **python duck typing across unrelated classes**
  10. are Python methods virtual?
  11. **python base method calling an overridden hook**
  12. vtable per class, vptr per object
  13. compare: inheritance needed for polymorphism in C++ but not in Python
  14. bug/cpp: `std::vector<Animal>` slicing → `vector<unique_ptr<Animal>>`
  15. `final` on a method
  16. why polymorphism beats switching on type
- **Exercises:**
  - cpp shapes:
    - `Shape` with `virtual double area() const`, `virtual std::string name() const` and a virtual destructor; subclasses `Circle` and `Rectangle`.
    - `double totalArea(const std::vector<std::unique_ptr<Shape>>&)` and `std::string describe(const Shape&)` → `"Circle: 3.14"`.
    - Tests include `std::has_virtual_destructor_v<Shape>`.
  - cpp payroll:
    - `Employee::monthlyPay()` is virtual; subclasses `SalariedEmployee`, `HourlyEmployee(hours, rate)` (1.5× pay above 160 h) and `Contractor`.
    - `double payroll(const std::vector<const Employee*>&)`.
  - python `render_all(items)`:
    - Works with unrelated `Button`, `Label` and `Image` classes.
    - Raises `TypeError("<Type> cannot be rendered")` for objects without `render`.
  - python notifier with a template hook:
    - `Notifier.send(msg)` returns `self.format(msg)`.
    - `EmailNotifier` → `"Email: msg"`; `SmsNotifier` truncates to 20 chars.
    - `notify_all(notifiers, msg)`.

**07 Abstraction & Interfaces (`abstraction`)**
- **Lesson:**
  1. Abstraction = exposing *what* and hiding *how*.
  2. Pure virtual `= 0` and abstract classes; a derived class stays abstract until it implements everything.
  3. Interface-style classes (only pure virtuals + a virtual destructor); pure virtual functions with a body.
  4. Python `abc.ABC`, `@abstractmethod`, abstract properties.
  5. `typing.Protocol` and `@runtime_checkable`.
  6. Nominal vs structural typing; C++20 concepts (preview).
  7. Designing small, role-based interfaces and depending on them: a `Logger` injected into a service for testability (previews ISP and DIP).
- **MCQs:**
  1. abstraction
  2. bug/cpp: instantiating an abstract class
  3. a derived class missing one override
  4. **python instantiating an incomplete ABC subclass prints `TypeError`**
  5. **python a complete ABC subclass works**
  6. **cpp calling through interface pointers**
  7. compare: ABC vs Protocol
  8. **python runtime_checkable Protocol `isinstance` on an unrelated class**
  9. why interfaces need a virtual destructor
  10. can a pure virtual function with a body be called?
  11. **cpp derived override calling `Base::f()` on a pure virtual with a body**
  12. spotting a leaky abstraction
  13. abstract property
  14. compare: C++ concepts vs Protocol
  15. depending on an interface makes testing easy
  16. bug/python: `@abstractmethod` without inheriting `ABC` has no effect
- **Exercises:**
  - cpp abstract `Shape`:
    - pure virtual `area`, `perimeter` and `name`; subclasses `Circle` and `Square`.
    - `std::unique_ptr<Shape> makeShape(const std::string& kind, double size)` returns `nullptr` for an unknown kind.
    - Tests check `std::is_abstract_v`.
  - cpp `Logger` interface with `MemoryLogger` (`lines()`) and `ConsoleLogger` (prints `[log] msg\n`):
    - `OrderService(Logger&)::placeOrder(item, qty)` logs `placed <qty> x <item>` or `rejected <item>`.
  - python `PaymentMethod(ABC)`:
    - abstract `pay(amount) -> str` and abstract property `name`; subclasses `CreditCard(last4)` and `PayPal(email)`.
    - `checkout(method, amount)` raises `ValueError` for amount ≤ 0.
    - Tests check that an incomplete subclass can't be instantiated.
  - python `Drawable` (runtime_checkable Protocol with `draw() -> str`):
    - `draw_all(items)` joins the lines and raises `TypeError` for non-drawables.
    - Tests assert that `Drawable` is not in `Circle.__mro__`.

**08 Operator Overloading & Dunders (`operators`)**
- **Lesson:**
  1. Making types feel built in, and restraint.
  2. Member vs non-member operators and symmetry (`2 * v`).
  3. Implement `+` via `+=`.
  4. `==` and defaulted `<=>`.
  5. `operator<<`.
  6. `[]` (const and non-const), `()` functors, pre/post `++`.
  7. Python:
     - `__add__`/`__radd__`/`__iadd__` and `NotImplemented`
     - the `__eq__`/`__hash__` contract
     - `total_ordering`
     - `__repr__`/`__str__`/`__format__`
     - the container protocol (`__len__`, `__getitem__`, `__contains__`, `__iter__`)
     - `__call__`, `__bool__`
  8. Pitfalls: overloading `&&`/`||`, inconsistent equality and hash, mutating inside `+`.
- **MCQs:**
  1. when to overload
  2. bug/cpp: `2 * v` fails with a member-only `operator*`
  3. **cpp `+` built on `+=`**
  4. **cpp pre vs post increment**
  5. **cpp defaulted `<=>` used by `std::sort`**
  6. **python `1 + Money(5)` via `__radd__`**
  7. **python `sum()` needs `__radd__`**
  8. **python `__eq__` without `__hash__` → unhashable**
  9. the hash/eq contract
  10. **python `total_ordering` supplies `>=`**
  11. why `operator<<` is a non-member
  12. compare: symmetric operators in C++ vs Python
  13. **python an empty container is falsy via `__len__`**
  14. `__getitem__` alone enables iteration and `in`
  15. const and non-const `operator[]`
  16. bug/python: `__eq__` returning `False` instead of `NotImplemented`
- **Exercises:**
  - cpp `Money`:
    - stores int64 cents; constructor `(dollars, cents)`.
    - `+`, `-`, `+=`, `*` with an int in both orders; defaulted `==`/`<=>`.
    - `<<` prints `$12.05` / `-$3.50`.
  - cpp `Matrix2`: `operator()(r, c)`, `*` (matrix product), `==`, `<<` prints `[[1, 2], [3, 4]]`.
  - python `Vector`:
    - `__init__(*components)`, `__repr__`.
    - `+`/`-` (`ValueError` when dimensions differ), `*`/`__rmul__` with a scalar.
    - `__eq__`/`__hash__`, `__len__`, `__iter__`, `__getitem__`, `__abs__`, `__bool__`.
  - python `Money` with `@total_ordering`:
    - comparing different currencies returns `NotImplemented`, so `<` raises `TypeError`.
    - `__add__`/`__radd__` so that `sum()` works; `__str__` → `12.05 USD`; `__hash__`.

**09 Static & Class-level Members (`static-members`)**
- **Lesson:**
  1. Data that belongs to the class, not to an instance.
  2. Static data: declaration vs definition, `inline static`, `static constexpr`.
  3. Static member functions (no `this`).
  4. Python class attributes, and the `self.count += 1` shadowing bug vs `type(self).count`.
  5. `@classmethod` alternate constructors that respect subclasses.
  6. `@staticmethod` vs a module-level function.
  7. Function-local statics; the static initialization order fiasco (brief).
  8. Instance counting done right (don't forget the copy constructor).
- **MCQs:**
  1. what a static member is
  2. **cpp static counter shared across instances**
  3. bug/cpp: a static function touching a non-static member
  4. **python `self.count += 1` creates an instance attribute**
  5. **python a classmethod alternate constructor on a subclass returns the subclass**
  6. staticmethod vs classmethod
  7. **cpp a live-instance counter that forgot the copy constructor prints -1**
  8. `inline static`
  9. **cpp function-local static initialized once**
  10. compare: C++ static vs Python class attribute
  11. class attribute read through an instance
  12. **python changing the class attribute shows through instances**
  13. bug/python: a classmethod hardcodes the class name
  14. module function vs staticmethod
  15. `static constexpr`
  16. **python `type(self).count += 1` in a hierarchy**
- **Exercises:**
  - cpp `User`: a unique `id()` from a static counter; `static int count()` of live users (constructor and copy constructor increment, destructor decrements). Tests use deltas.
  - cpp `Temperature`, named-constructor idiom:
    - private constructor; `static fromCelsius/fromFahrenheit/fromKelvin`, which throw `std::out_of_range` below absolute zero.
    - `static constexpr double AbsoluteZeroC`.
    - Tests check `!std::is_constructible_v<Temperature, double>`.
  - python `Pizza`:
    - `@classmethod margherita(cls)`, `@classmethod from_string(cls, "ham,cheese")`.
    - `@staticmethod is_valid_topping(t)` checked against a class-level `ALLOWED`.
    - `GlutenFreePizza.margherita()` returns a `GlutenFreePizza`.
  - python `Config`:
    - class-level defaults; `@classmethod from_dict(cls, d)` ignores unknown keys; `@staticmethod parse_bool("yes"/"no"/…)`.
    - Overriding a default on one instance must not change the class.

### Task 14: Content — Deep dive I (modules 10–12)

**Files:** `content/10-copy-move/*`, `content/11-memory/*`, `content/12-multiple-inheritance/*`
**Interfaces:** Consumes the Task 5 schema; produces three modules that pass both content checkers.

**10 Copy & Move Semantics (`copy-move`)**
- **Lesson:**
  1. What copying an object means; shallow vs deep (an owning raw pointer → double free).
  2. Copy constructor and copy assignment; self-assignment; copy-and-swap.
  3. Rule of Three.
  4. Move semantics: rvalues, `std::move` is just a cast, move constructor/assignment, the moved-from state, `noexcept` and vector reallocation.
  5. Rule of Five vs Rule of Zero.
  6. `= default` / `= delete` (non-copyable types).
  7. Copy elision and guaranteed RVO (C++17).
  8. Python:
     - assignment never copies
     - `copy.copy` vs `copy.deepcopy`, `__copy__`/`__deepcopy__` with `memo`
     - `[:]` is shallow
     - the mutable default argument trap
     - a tuple holding a list
- **MCQs:**
  1. shallow vs deep
  2. **cpp `A b = a;` vs `c = a;` print copy-ctor vs assign**
  3. bug/cpp: a raw-pointer class without a copy constructor → double delete
  4. Rule of Three
  5. **cpp `auto w = std::move(v); w.size()`**
  6. **cpp `return A();` prints only `ctor` (guaranteed elision)**
  7. what `std::move` really does
  8. why a `noexcept` move matters to `std::vector`
  9. what `= delete` is for
  10. **python a shallow copy shares nested lists**
  11. **python deepcopy is independent**
  12. **python mutable default argument accumulates**
  13. compare: what `b = a` means in each language
  14. Rule of Zero
  15. bug/cpp: a naive `operator=` breaks on self-assignment
  16. **python mutating a list inside a tuple**
- **Exercises:**
  - cpp `IntBuffer` (owns an `int*` and a size):
    - constructor(size), deep copy constructor, copy-and-swap assignment, destructor, `size()`, `operator[]`.
    - Tests: copies are independent, self-assignment is safe.
  - cpp `IntBuffer` with moves:
    - The starter is the previous solution without moves; add `noexcept` move constructor and assignment.
    - The moved-from buffer has size 0.
    - Tests: `std::is_nothrow_move_constructible_v`, pushing many into a `std::vector`.
  - python `Document(title, tags, metadata, owner)`:
    - `__deepcopy__` copies the content but keeps the same `owner` (via `memo`); `clone()`.
    - Tests: copied tags are independent and the owner's identity is preserved.
  - python "fix the mutable defaults": `Team(name, members=None)` with `add()`, and `append_log(entry, log=None)`. Tests require independence.

**11 Memory & RAII (`memory`)**
- **Lesson:**
  1. Ownership: who deletes? Leaks, double delete, dangling pointers, exception paths.
  2. RAII (with `lock_guard` / `fstream` examples).
  3. `unique_ptr`: move-only, `make_unique`, custom deleters, sink-by-value vs borrow-by-reference.
  4. `shared_ptr`/`make_shared`, `use_count`, cost; `weak_ptr` for breaking cycles (parent/child) and `lock()`.
  5. Guidelines: values > `unique_ptr` > `shared_ptr`; never own through a raw pointer.
  6. Python:
     - reference counting and the cyclic GC
     - `del` removes a name, not an object
     - `weakref.ref`, `WeakValueDictionary`, `weakref.finalize`
  7. Context managers in depth: the `__exit__` signature, suppressing exceptions, `contextlib.contextmanager`, `ExitStack`.
- **MCQs:**
  1. RAII
  2. **cpp `unique_ptr` destroyed at scope end (`start ~Res end`)**
  3. bug/cpp: copying a `unique_ptr`
  4. **cpp `use_count` 1 2 1**
  5. **cpp a shared_ptr cycle never destructs vs the weak_ptr fix**
  6. `weak_ptr::lock` on an expired object
  7. **cpp `expired()` before and after reset**
  8. `make_unique` vs `new`
  9. compare: shared_ptr refcount vs Python refcount
  10. **python `del a` while `b` still refers to the object**
  11. **python a weakref becomes `None` after the last reference goes**
  12. **python `__exit__` returning True suppresses**
  13. **python `@contextmanager` setup/body/teardown order**
  14. why Python also has a cycle GC
  15. bug/cpp: returning a reference to a local
  16. a sink parameter `void take(std::unique_ptr<T>)`
- **Exercises:**
  - cpp `ResourceGuard`:
    - RAII, non-copyable, movable; records `open:<name>` / `close:<name>` into a static log.
    - Tests: closed at scope exit, on an exception, and exactly once after a move. Use log deltas.
  - cpp tree:
    - `Node{name, children (shared_ptr), parent (weak_ptr)}`, `makeNode`, `addChild`, `path(node)` → `"root/a/b"`.
    - Tests: the root is destroyed when the last owner resets (`weak_ptr` to the root is `expired()`).
  - python `Cache` backed by `WeakValueDictionary`: `get_or_create(key, factory)` returns the same object while it is referenced, and the entry disappears after `del`.
  - python `Transaction(log)` context manager: commits on success, rolls back on an exception and re-raises it. Plus a `@contextmanager` version, `transaction(log)`, with the same behavior.

**12 Multiple Inheritance & MRO (`multiple-inheritance`)**
- **Lesson:**
  1. Why combine roles, and the risks.
  2. C++ multiple-inheritance syntax, ambiguous names, qualification.
  3. The diamond: duplicate base subobjects vs `virtual` inheritance; the most-derived class initializes the virtual base.
  4. Interface-style multiple inheritance is safe and common.
  5. Python's C3 linearization by hand, `__mro__`, inconsistent-MRO errors.
  6. Cooperative `super()` ("next in the MRO", not "parent") and the `**kwargs` pattern.
  7. Mixins, with guidelines.
  8. Advice: prefer interfaces and composition.
- **MCQs:**
  1. a good use case
  2. bug/cpp: an ambiguous `f()` from two bases
  3. **cpp a diamond without `virtual` constructs `A` twice**
  4. **cpp with virtual inheritance, `A` once**
  5. who constructs the virtual base
  6. **python `[c.__name__ for c in D.__mro__]`**
  7. **python a cooperative super chain prints in MRO order**
  8. **python direct `Base.__init__` calls run `A` twice**
  9. what `super()` really means
  10. **python an inconsistent MRO raises `TypeError` at class creation**
  11. what a mixin is
  12. **python a mixin using its host's attribute**
  13. compare: virtual inheritance vs the Python MRO
  14. interfaces through multiple inheritance in C++
  15. **python the leftmost base wins**
  16. what C3 guarantees
- **Exercises:**
  - cpp `Printable` + `Serializable` interfaces:
    - `Invoice` implements both; `printAll(const std::vector<const Printable*>&)` and `saveAll(...)`.
    - Tests: `is_base_of` for both interfaces.
  - cpp diamond:
    - `Device(int id)`, `Scanner`/`Printer` derive from `virtual public Device`, and `Copier(int id)` initializes `Device`.
    - `c.id() == 7` is unambiguous, and `Device::instances` increments once per `Copier` (delta).
  - python cooperative `__init__`:
    - `Base`, `Timestamped(Base)`, `Tagged(Base)` and `Article(Timestamped, Tagged)`, all using `**kwargs` + `super().__init__`.
    - Tests: all fields are set, the MRO order, and `Base.__init__` runs exactly once.
  - python mixins:
    - `JsonMixin.to_json()` (sorted keys), `EqualityMixin` (same type and same `__dict__`), `ReprMixin` → `Point(x=1, y=2)`.
    - `Point(JsonMixin, EqualityMixin, ReprMixin)`.

### Task 15: Content — Deep dive II (modules 13–16)

**Files:** `content/13-cpp-toolbox/*`, `content/14-python-object-model/*`, `content/15-generics/*`, `content/16-exceptions/*`
**Interfaces:** Consumes the Task 5 schema; produces four modules that pass both content checkers.

**13 The C++ Class Toolbox (`cpp-toolbox`)**. This module is C++-focused, but every section ends with a "In Python…" comparison block, and at least 2 Python exercises are still required.
- **Lesson:**
  1. Const-correctness: const member functions, const objects, const references, overloading on const.
  2. `mutable` for caches and mutexes (logical vs bitwise constness).
  3. `constexpr` constructors and members; `consteval` (brief).
  4. Nested classes and the iterator-as-nested-class idiom.
  5. Conversion constructors, `explicit`, conversion operators, `explicit operator bool`.
  6. `friend` classes and the "hidden friend" idiom.
  7. `= delete` for unwanted overloads (`void set(double) = delete;`).
  8. `[[nodiscard]]` on accessors and factories.
  9. Python counterparts: `__bool__`, `__index__`, `__int__`; read-only views via `property`/`MappingProxyType`; `functools.cached_property`.
- **MCQs:**
  1. what a const member function promises
  2. bug/cpp: calling a non-const method on a const reference
  3. **cpp overload resolution picks the const vs non-const overload**
  4. `mutable` for a cache
  5. **cpp an implicit conversion via a converting constructor**
  6. bug/cpp: an `explicit` constructor blocks copy-initialization
  7. **cpp `explicit operator bool` in an `if`**
  8. what `constexpr` construction gives you
  9. `= delete` on an overload
  10. a nested class's access to the outer class's privates
  11. **cpp counting calls through a mutable counter in a const method**
  12. compare: `explicit operator bool` vs `__bool__`
  13. **python `cached_property` computes once**
  14. **python `MappingProxyType` is read-only (prints `TypeError`)**
  15. `[[nodiscard]]`
  16. the hidden friend idiom
- **Exercises:**
  - cpp `Polygon`:
    - `const`-correct accessors.
    - `double perimeter() const` cached through `mutable std::optional<double>` and invalidated by `addPoint()`.
    - `mutable int computeCount`.
    - Tests: calls work on a `const Polygon&`, and the computation runs once until invalidated.
  - cpp `Meters` / `Feet`:
    - `explicit` constructors from `double`; `explicit operator double()`.
    - `Feet toFeet(Meters)`; `constexpr` everywhere.
    - Tests: `!std::is_convertible_v<double, Meters>`, `static_assert`-able values reported via `EXPECT`.
  - cpp `IntList` with a nested `Iterator` (`begin`/`end`, `++`, `*`, `!=`) so range-for works. Tests: a range-for sum, plus iteration over a const list via `const_iterator`.
  - python `Matrix`: a read-only `shape` property, `__bool__` (non-empty), `cached_property` `determinant` for 2×2, and `rows` exposed as tuples (immutable view).
  - python `Settings`: exposes a `MappingProxyType` view; mutating through the view raises `TypeError`, and `update()` validates keys.

**14 The Python Object Model (`python-object-model`)**. This module is Python-focused, and every section compares how C++ achieves (or cannot achieve) the same thing. At least 2 C++ exercises are still required.
- **Lesson:**
  1. Everything is an object: classes are objects, and `type` is the class of classes.
  2. Attribute lookup order: data descriptors → instance `__dict__` → non-data descriptors/class.
  3. Descriptors (`__get__`/`__set__`/`__set_name__`); how `property` and methods are built from them.
  4. `__getattr__` vs `__getattribute__`, `__setattr__` (delegation and proxies).
  5. `__slots__`: memory, no `__dict__`, inheritance caveats.
  6. `dataclasses`: `field`, `frozen`, `order`, `__post_init__`, `slots=True`.
  7. `__init_subclass__` (plugin registries) and class decorators.
  8. Metaclasses, a gentle intro: when not to use them.
  9. Enums.
  10. C++ comparisons: fixed layout and compile-time members; reflection is absent; CRTP/registration via static initializers.
- **MCQs:**
  1. `type(type)`
  2. **python the lookup order (a data descriptor beats the instance `__dict__`)**
  3. **python `__getattr__` only runs for missing attributes**
  4. bug/python: `__getattribute__` recursion
  5. **python `__slots__` blocks new attributes (prints `AttributeError`)**
  6. what `__set_name__` receives
  7. **python a frozen dataclass assignment prints `FrozenInstanceError`**
  8. dataclass `field(default_factory=list)` vs `= []`
  9. **python `order=True` sorting**
  10. what `__init_subclass__` is for
  11. metaclass vs class decorator
  12. **python an Enum member's `.name` and `.value`**
  13. compare: `__slots__` vs a C++ struct layout
  14. how a bound method is created (descriptor)
  15. `__post_init__` validation
  16. compare: can C++ add members at runtime?
- **Exercises:**
  - python `Typed` descriptor:
    - `Typed(int)` enforces the type on set (raising `TypeError`) and uses `__set_name__` for its storage name.
    - `Product` uses `name = Typed(str)` and `price = Typed(float)`.
  - python `@dataclass(frozen=True, order=True) Version(major, minor, patch)`:
    - `__post_init__` validates that values are non-negative; `Version.parse("1.2.3")`; sorting works.
  - python plugin registry via `__init_subclass__(cls, key=...)`: `Exporter.registry["csv"] is CsvExporter`, and `Exporter.create("csv")`.
  - cpp `Product` with validated setters, emulating the descriptor: a `Typed<T>`-like template wrapper `Checked<T>` with a predicate that throws on an invalid set.
  - cpp `Registry` via static self-registration: `ExporterRegistry::add(name, factory)`, a `REGISTER_EXPORTER`-style helper object, `create(name)` → `std::unique_ptr<Exporter>`. Tests use deltas.

**15 Templates & Generics (`generics`)**
- **Lesson:**
  1. Why generics (a `Stack` of anything).
  2. Function and class templates, instantiation, templates in headers.
  3. Full and partial specialization.
  4. Static polymorphism vs virtual functions (cost and flexibility).
  5. CRTP (counters, comparison mixins).
  6. C++20 concepts and `requires`: readable errors.
  7. Python: duck typing is already generic; `TypeVar`, `Generic[T]`, PEP 695 `class Stack[T]:` syntax; bounded TypeVars; `Protocol` as a constraint; type hints are not enforced at runtime.
  8. Variance (brief).
- **MCQs:**
  1. what a template is
  2. **cpp `max` template with explicit vs deduced arguments**
  3. bug/cpp: a template defined in a .cpp file (link error) — concept
  4. **cpp full specialization `Printer<bool>`**
  5. **cpp CRTP static dispatch output**
  6. what concepts improve
  7. **cpp `if constexpr` branch per type**
  8. compare: templates vs Python duck typing
  9. **python `Stack[int]` accepts a str at runtime (hints are not enforced)**
  10. a bounded TypeVar
  11. Protocol vs ABC as a generic bound
  12. virtual vs CRTP trade-off
  13. what a template instantiates
  14. **cpp `std::is_same_v` in a template**
  15. PEP 695 syntax meaning
  16. bug/cpp: a requires-clause rejects a type (which call fails?)
- **Exercises:**
  - cpp `template <typename T> class Stack`:
    - `push`, `pop` (throws `std::out_of_range` when empty), `top`, `size`, `empty`.
    - Tests with `int` and `std::string`.
  - cpp `template <std::totally_ordered T> std::vector<T> clampAll(std::vector<T> values, T lo, T hi)`: clamps every value into `[lo, hi]` and throws `std::invalid_argument` if `lo > hi`. Tests use `int`, `double` and `std::string`.
  - cpp CRTP `Comparable<Derived>`: provides `!=`, `>`, `<=`, `>=` from `==` and `<`; `Version : Comparable<Version>`.
  - python `class Stack(Generic[T])`: `push`, `pop` (`IndexError` with a message), `peek`, `__len__`, `__iter__` (top first).
  - python `def largest(items: Iterable[T], key=None) -> T` with a bounded TypeVar; raises `ValueError` on empty input; works for numbers, strings and custom objects with `__lt__`.

**16 Exceptions & OOP (`exceptions`)**
- **Lesson:**
  1. Why exceptions; errors as objects.
  2. Designing exception hierarchies (`AppError` → `ValidationError`, …) and catching specific → general.
  3. C++: throw by value, catch by const reference (slicing again!), `std::exception` and `what()`, rethrow with `throw;`, `noexcept`.
  4. Exception safety guarantees (none, basic, strong, nothrow); copy-and-swap delivers strong.
  5. Constructors that throw (members already built are destroyed; the destructor doesn't run); never throw from a destructor.
  6. Python: custom exceptions with extra fields, `raise … from …`, `__cause__`/`__context__`, `finally`, `else`, `ExceptionGroup`/`except*` (brief), exceptions and `__exit__`.
  7. When *not* to use exceptions.
- **MCQs:**
  1. why a hierarchy helps
  2. **cpp catching by value slices: `what()` prints the base message**
  3. **cpp catch order (the first matching handler wins)**
  4. bug/cpp: `catch (std::exception)` placed before `catch (MyError&)`
  5. **cpp a constructor throws: the members' destructors run, the class's own destructor does not**
  6. the strong guarantee
  7. why never throw from a destructor
  8. **python `raise … from` sets `__cause__`**
  9. **python `try`/`except`/`else`/`finally` order**
  10. **python `except` order with a subclass**
  11. a custom exception with fields
  12. compare: `noexcept` vs Python
  13. `throw;` vs `throw e;`
  14. bug/python: a bare `except:` swallows `KeyboardInterrupt`
  15. `except*` purpose
  16. exceptions vs return codes
- **Exercises:**
  - cpp hierarchy:
    - `BankError : std::runtime_error`; `InsufficientFunds : BankError` (holds `needed()`); `AccountLocked : BankError`.
    - `Account::withdraw` throws the right one.
    - Tests use `EXPECT_THROWS` with the specific type and check `what()` text.
  - cpp strong guarantee:
    - `Inventory::addAll(std::vector<Item>)` either adds every item or none; it throws `std::invalid_argument` on a bad item and leaves the state unchanged.
  - python hierarchy:
    - `ValidationError(field, message)` with `.field`; `UserService.register(name, age)` raises the right subclass.
    - A wrapper converts `ValueError` into `ValidationError` using `raise … from`. Tests check `__cause__`.
  - python `retry(func, attempts, exceptions=(IOError,))`: retries only the listed exceptions, re-raises the last one, and returns the result on success. Tests use a flaky callable.

### Task 16: Content — Design mastery (modules 17–20)

**Files:** `content/17-composition/*`, `content/18-solid/*`, `content/19-patterns-1/*`, `content/20-patterns-2/*`
**Interfaces:** Consumes the Task 5 schema; produces four modules that pass both content checkers.

**Pattern lesson format** (modules 19–20): for each pattern, cover the *intent*, a *problem* snippet, the *structure* (ASCII diagram in a `~~~text` block), C++ then Python implementations, "In Python this often collapses to…", and *when not to use it*.

**17 Composition & Relationships (`composition`)**
- **Lesson:**
  1. Relationships: association, aggregation, composition, dependency, generalization.
  2. Reading UML class diagrams: visibility `+ - #`, the arrow and diamond kinds, multiplicity. Use ASCII diagrams.
  3. Composition over inheritance: Stack vs list, Car has-an Engine; delegation and forwarding; Python `__getattr__` delegation and its special-method gap.
  4. Ownership: C++ owning members (by value / `unique_ptr`) vs non-owning (references, raw pointers); Python ownership by convention.
  5. Liskov: Square/Rectangle, behavioral subtyping, contracts.
  6. Swapping behavior at runtime through a composed strategy.
  7. Refactoring a class explosion (`ColoredBorderedScrollableWindow`) into composition.
- **MCQs:**
  1. is-a vs has-a
  2. composition vs aggregation lifetimes
  3. UML filled diamond
  4. UML hollow triangle
  5. **cpp composed member destroyed after the owner's destructor body (`~Car ~Engine`)**
  6. **python `len()` on a `__getattr__` delegator prints `TypeError` (special methods bypass `__getattr__`)**
  7. **python a composed strategy swapped at runtime**
  8. bug: `Square` derived from `Rectangle` breaks `setWidth`
  9. Liskov definition
  10. compare: owning members vs Python references
  11. class explosion
  12. **cpp an aggregated object outlives its aggregator**
  13. the cost of delegation (boilerplate)
  14. UML multiplicity `1..*`
  15. **python composed `Stack` has no `insert`: `hasattr(s, "insert")`**
  16. dependency (dashed arrow)
- **Exercises:**
  - cpp `Car`:
    - composes an `Engine` (by value) and 4 `Wheel`s; `start()` → `"Engine started: 150hp"`.
    - `Garage` aggregates non-owning `Car&`: `park`, `count`, and it does not destroy cars.
    - Tests: `!std::is_base_of_v<Engine, Car>`.
  - cpp composition instead of class explosion:
    - `Feature` interface (`name()`); `Border`, `Scrollbar`, `Title(text)`.
    - `Window::add(std::unique_ptr<Feature>)`; `render()` → `"Window[border, scrollbar, title:Hi]"`.
  - python `Stack` composed over a list:
    - `push`, `pop`/`peek` (raise `IndexError`), `__len__`, `is_empty`.
    - Tests: `not hasattr(Stack(), "insert")` and `not isinstance(Stack(), list)`.
  - python LSP-safe shapes:
    - an immutable `Rectangle(w, h)` with `with_width()`; `Square(side)` is *not* a `Rectangle` subclass.
    - `scaled(factor)` on both; `resize_all(shapes, factor)`.
    - Tests: `not issubclass(Square, Rectangle)`.

**18 SOLID Principles (`solid`)**
- **Lesson:** one section per principle. Each one shows a *smell* (bad code in both languages), the *refactor* (good code in both languages), the rule in one sentence, and how to spot a violation.
  1. SRP: a `Report` that formats, saves and emails.
  2. OCP: a discount `if/elif` on customer type → policies.
  3. LSP: `Penguin.fly`, Square/Rectangle, contracts.
  4. ISP: a fat `Worker` interface (`work`, `eat`) forces `Robot.eat`.
  5. DIP: an `OrderService` that `new`s a `MySqlDatabase` → an injected `Repository`, tested with an in-memory fake.
  6. SOLID in moderation (YAGNI, over-abstraction).
- **MCQs:**
  1. SRP's "one reason to change"
  2. which class violates SRP (code)
  3. OCP
  4. **python adding a discount class without editing the calculator**
  5. spot the LSP violation
  6. **python a function expecting `Bird` fails with `Penguin` (prints the caught error)**
  7. ISP
  8. DIP
  9. **cpp injecting a fake repository prints `saved 1 order`**
  10. compare: DIP via C++ interfaces vs Python Protocols
  11. bug: adding a shape forces editing an `area()` switch
  12. constructor injection benefits
  13. which principle an inherited `NotImplementedError` usually signals
  14. **cpp polymorphic discount strategies total**
  15. over-engineering risk
  16. SRP vs "a function does one thing"
- **Exercises:**
  - cpp OCP:
    - `DiscountPolicy` (`apply(double) const`); `NoDiscount`, `PercentageDiscount(pct)`, `BulkDiscount(threshold, off)`.
    - `Checkout(const DiscountPolicy&)::total(const std::vector<double>&)`.
  - cpp DIP:
    - `OrderRepository` and `Notifier` interfaces; `InMemoryOrderRepository`.
    - `OrderService(OrderRepository&, Notifier&)::place(Order)` validates, saves and notifies.
    - Tests use fakes and check the messages.
  - python SRP refactor:
    - The starter is a god class `Report`.
    - Required pieces: `ReportData(rows).totals()`, `ReportFormatter.to_text(data)` / `.to_csv(data)`, `ReportWriter(sink).write(text)`. Each piece is tested on its own.
  - python ISP:
    - small runtime_checkable Protocols `Printer`, `Scanner`, `Fax`; `BasicPrinter` implements only `print_doc`; `MultiFunctionDevice` implements all three.
    - `print_all(printer, docs)`.
    - Tests: `not hasattr(BasicPrinter(), "scan")`.

**19 Design Patterns I (`patterns-1`)**: Singleton, Factory Method, Builder, Adapter, Decorator, Composite. The lesson starts with what patterns are (shared vocabulary, not templates) and the GoF categories.
- **Lesson notes per pattern:**
  - Singleton: Meyers singleton (thread-safe function-local static) and why it hurts testing → prefer dependency injection. In Python a module is a singleton.
  - Factory: a registry map of lambdas / a dict of classes.
  - Builder: a fluent `*this` chain vs Python keyword arguments.
  - Adapter: Fahrenheit legacy sensor → Celsius interface.
  - Decorator: Coffee + Milk + Sugar, and how it relates to Python's `@decorator`.
  - Composite: a file tree.
- **MCQs:**
  1. what a pattern is
  2. **cpp Meyers singleton constructed once (prints a construction count)**
  3. singleton vs testability
  4. **python a `__new__` singleton: `a is b`**
  5. Factory Method intent
  6. **python a registry factory creates by key**
  7. telescoping constructors → Builder
  8. **cpp fluent builder output**
  9. Adapter intent
  10. **python an adapter converts °F to °C**
  11. Decorator vs subclass explosion
  12. **cpp a decorated beverage's cost and description**
  13. **python a composite directory's total size**
  14. compare: Python function decorator vs GoF Decorator
  15. Composite's uniform treatment
  16. which pattern fixes a third-party API mismatch
- **Exercises:**
  - cpp Decorator:
    - `Beverage` (`cost()`, `description()`); `Espresso` (2.00, "Espresso").
    - Wrappers `Milk` (+0.50, ", milk"), `Sugar` (+0.25), `Whip` (+0.75), each holding a `std::unique_ptr<Beverage>`.
  - cpp Composite:
    - `FsNode` (`name()`, `size()`, `render(int indent)`); `File(name, size)`; `Directory(name)::add(std::unique_ptr<FsNode>)`.
    - `render` produces an exact multi-line tree with 2-space indentation.
  - python Builder: `QueryBuilder().select("a","b").from_("t").where("x > 1").order_by("a").build()` → `"SELECT a, b FROM t WHERE x > 1 ORDER BY a"`. `build()` without `from_` raises `ValueError`.
  - python Adapter: `LegacyThermometer.get_fahrenheit()` → `ThermometerAdapter.read_celsius()`; `average_celsius(sensors)` mixes adapters and native sensors.
  - python Factory: `ShapeFactory.register("circle")` is a class decorator; `ShapeFactory.create(name, **kw)` raises `KeyError` listing the known names.

**20 Design Patterns II (`patterns-2`)**: Strategy, Observer, Command, Template Method, State, Iterator.
- **Lesson notes per pattern:**
  - Strategy: functions as strategies in Python.
  - Observer: the lapsed-listener leak and weak references.
  - Command: undo/redo stacks.
  - Template Method vs Strategy.
  - State: replacing a switch with state objects.
  - Iterator: C++ `begin`/`end` + range-for vs Python `__iter__`/`__next__`/generators.
  - Close with choosing a pattern, and the overuse anti-pattern.
- **MCQs:**
  1. Strategy intent
  2. **python swapping function strategies**
  3. **cpp observer notification order**
  4. the lapsed-listener leak
  5. **python unsubscribe, then notify**
  6. Command intent
  7. **python text after 3 commands and 2 undos**
  8. Template Method vs Strategy
  9. **cpp template method hook order**
  10. State intent
  11. **python traffic-light transitions**
  12. what range-for needs
  13. **python generator laziness: print order**
  14. compare: iterator protocols in C++ and Python
  15. what Command enables (queue, log, undo)
  16. which pattern replaces a big switch on state
- **Exercises:**
  - cpp Observer:
    - `EventBus::subscribe(topic, std::function<void(const std::string&)>) → int`, `unsubscribe(int)`, `publish(topic, msg) → int delivered`.
  - cpp Command:
    - `TextEditor`; `Command` (`execute`/`undo`); `InsertCommand(pos, text)`, `DeleteCommand(pos, len)`.
    - `History::run(std::unique_ptr<Command>)`, `undo()`/`redo()` → `bool`; a new `run` clears redo.
  - python State:
    - `TrafficLight` with `Green`/`Yellow`/`Red` state objects; `next()`, `state_name`.
    - `pedestrian_button()`: Green → Yellow immediately; the other states ignore it.
  - python Strategy: `ShippingCalculator(strategy)` where `flat_rate`, `by_weight(rate)` (a closure) and the class `FreeOverThreshold(threshold, fallback)` with `__call__` are interchangeable.
  - python Iterator:
    - `Countdown(n)` is re-iterable (`__iter__` as a generator).
    - `Paginator(items, page_size)` is a one-shot iterator with `__next__`, raising `StopIteration`.

### Task 17: Content — Mastery capstones (module 21)

**Files:** `content/21-mastery/lesson.md`, `content/21-mastery/quiz.js` (`export default [];`), `content/21-mastery/exercises.js`
**Interfaces:** Consumes the Task 5 schema (the final-module rules: lesson ≥ 2000 chars, empty quiz, ≥ 3 cpp + ≥ 3 python exercises); produces module 21.

- [ ] **Step 1: Write `lesson.md`** (≥ 2000 chars):
  - How to approach the capstones: read the whole spec, sketch a class diagram, write the interfaces first, run the tests early.
  - A table mapping each capstone to the modules it exercises.
  - An **OOP design review checklist**: invariants protected? ownership clear? virtual destructor on polymorphic bases? Liskov holds? dependencies injected? no god classes? exceptions specific?
  - How the final exam works and how to use its per-module breakdown.

- [ ] **Step 2: Write `exercises.js`** — 6 exercises (each capstone in both languages), difficulty 3, with **8–12 tests** each:
  1. **Shape Studio** (`mastery-e01` cpp, `mastery-e02` python):
     - an abstract `Shape` (`area`, `perimeter`, `name`); `Circle`, `Rectangle`, `Triangle` (invalid sides → `std::invalid_argument` / `ValueError`)
     - a `Canvas` that owns its shapes (`std::vector<std::unique_ptr<Shape>>` / a list), with `add`, `totalArea`, `largest`, `sortedByArea` (names), `remove(name)`
     - `operator<<` / `__str__` → `"Canvas(3 shapes, area=12.57)"`
     - Exercises modules 03, 06, 07, 08, 11, 16 and 17.
  2. **Bank System** (`mastery-e03` cpp, `mastery-e04` python):
     - `Account` (protected balance, virtual `withdraw`), `SavingsAccount` (minimum balance, `addInterest`), `CheckingAccount` (overdraft limit)
     - a `Bank` that owns accounts by generated id (static/class counter)
     - `transfer(from, to, amount)` with the **strong guarantee**
     - an exception hierarchy: `BankError` → `InsufficientFunds`, `AccountNotFound`
     - transaction listeners notified on every successful operation
     - Exercises modules 04, 05, 06, 09, 10, 16, 18 and 20.
  3. **Library Events** (`mastery-e05` cpp, `mastery-e06` python):
     - `Library` with books and members; `checkout` / `return` as **Command** objects with `undo`
     - late-fee **Strategy** (`Standard`, `Student`, `Senior`)
     - **Observer** subscribers notified when a reserved book becomes available
     - `Library::report()` lists the books in a stable order
     - Exercises modules 07, 11, 15, 17, 18, 19 and 20.

- [ ] **Step 3: Validate and check**

Run: `npm run validate -- --module mastery` and `npm run check -- --module mastery`
Expected: both green.

- [ ] **Step 4: Full content gate**

Run: `npm run validate` and `npm run check` (all modules)
Expected: `Content OK`, and "All reference solutions pass, all starters fail, all output MCQs verified." The table shows 21 modules, at least 300 MCQs in total, and at least 80 exercises in total.

- [ ] **Step 5: Commit**

```bash
git add content/21-mastery
git commit -m "content: module 21 mastery capstones"
```

### Task 18: README, CI/CD and GitHub Pages deploy

**Files:**
- Create: `README.md`, `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: the `npm test`, `npm run validate` and `npm run check` scripts.
- Produces: the live site at `https://ihsankt.github.io/oop-mastery/`.

- [ ] **Step 1: Write `.github/workflows/deploy.yml`**

```yaml
name: Check and deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - uses: actions/setup-python@v7
        with:
          python-version: '3.13'
      - run: g++ --version
      - run: npm test
      - run: npm run validate
      - run: npm run check

  deploy:
    needs: check
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v7
      - name: Assemble site
        run: |
          mkdir _site
          cp -r index.html css js content _site/
          touch _site/.nojekyll
      - uses: actions/upload-pages-artifact@v5
        with:
          path: _site
      - id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 2: Write `README.md`** with these sections (complete prose, no placeholders):
  - **OOP Mastery:** a one-paragraph pitch and the live link.
  - **What's inside:** 21 modules (list the titles from `content/index.js`), per-option explanations, labs that really run your code, XP/levels/streaks/badges, a review queue, and the final exam.
  - **How code runs:**
    - Pyodide in a Web Worker.
    - Wandbox with Compiler Explorer as a fallback, plus a privacy note (your C++ code is sent to those services).
  - **Run locally:** `npm run serve` → `http://localhost:8000`. Needs Python for the server. No npm install.
  - **Checks:** `npm test`, `npm run validate`, `npm run check` (needs `g++` with C++20 and Python 3.13 on PATH; override with `CXX` and `PYTHON`).
  - **Writing content:** points to the schema and test contract (summarize Task 2's contract and Task 5's schema, and link to `docs/superpowers/plans/2026-10-04-oop-mastery.md`).
  - **Deploying:** a push to `main` runs the checks, then deploys to GitHub Pages.

- [ ] **Step 3: Full local verification**

Run: `npm test && npm run validate && npm run check`
Expected: all green. If anything fails, fix it before going further.

- [ ] **Step 4: Commit**

```bash
git add README.md .github/workflows/deploy.yml
git commit -m "ci: check content and deploy to GitHub Pages"
```

- [ ] **Step 5: Create the repo, enable Pages, push** (enable Pages *before* the first push so the first deploy succeeds)

```bash
gh repo create IhsanKT/oop-mastery --public --source . --remote origin --description "Master object-oriented programming in C++ and Python: lessons, explained MCQs and coding labs that run your code."
gh api -X POST repos/IhsanKT/oop-mastery/pages -f build_type=workflow
git push -u origin main
```
Expected: the repo is created, the Pages API returns JSON containing `"build_type": "workflow"`, and the push succeeds.

- [ ] **Step 6: Watch the workflow** (run in the background and wait for the notification)

Run: `gh run watch --repo IhsanKT/oop-mastery --exit-status $(gh run list --repo IhsanKT/oop-mastery --limit 1 --json databaseId --jq '.[0].databaseId')`
Expected: the `check` and `deploy` jobs both succeed. On a failure, read `gh run view --log-failed`, fix the cause, commit and push again.

- [ ] **Step 7: Verify the live site**

Run:
```bash
curl -sI https://ihsankt.github.io/oop-mastery/ | head -1
curl -s -o /dev/null -w '%{http_code}\n' https://ihsankt.github.io/oop-mastery/content/05-inheritance/quiz.js
curl -s -o /dev/null -w '%{http_code}\n' https://ihsankt.github.io/oop-mastery/js/runners/python-worker.js
```
Expected: `HTTP/2 200`, then `200` and `200`.

Then open the live URL in a browser:
- The dashboard loads with all 21 modules live.
- Run one Python lab and one C++ lab to a pass on the live origin. This confirms CORS from `ihsankt.github.io` and the Pyodide worker path under `/oop-mastery/`.


