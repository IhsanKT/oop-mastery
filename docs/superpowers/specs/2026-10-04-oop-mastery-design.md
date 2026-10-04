# OOP Mastery — C++ & Python learning site (design + plan)

## Context
The user wants a website that teaches object-oriented programming in **C++ and Python** well enough that someone who finishes it has *mastered* OOP. It is **for learning, not grading**: every MCQ explains itself right after you answer, and every coding exercise ends with a walkthrough of the model solution. It must be deployed on GitHub.

`D:\oops` is empty, so this is a new project. Available tools: `gh` (logged in as **IhsanKT**), git 2.49, Node 22, Python 3.13, g++ 14.2 (MSYS2).

**Decisions the user made:**
- **Code execution:** real execution. Python runs in the browser (Pyodide in a Web Worker). C++ runs on the Wandbox API, with Compiler Explorer as a fallback. Both APIs were checked: they allow cross-origin requests (`Access-Control-Allow-Origin: *`).
- **Structure:** side-by-side. Each module teaches one concept in both languages, with a C++/Python/Both toggle.
- **Light gamification:** XP, levels, daily streak, badges, mastery % per module, and a review queue for missed questions.
- **Repo:** public `IhsanKT/oop-mastery`, served at `https://ihsankt.github.io/oop-mastery/`.

**Assumptions** (not stated by the user):
- The learner already knows basic syntax in both languages.
- Nothing is locked: the order is a recommendation, not a requirement.
- Progress lives in the browser's localStorage, with export/import. There is no login.

## Approach
A **static site with no build step**: plain HTML, CSS and ES modules, with a hash router so links don't 404 on GitHub Pages. Libraries load from CDNs:
- marked and highlight.js (cdnjs)
- CodeMirror 5 with its clike and python modes (cdnjs)
- Pyodide (jsdelivr)

The site has **no npm dependencies**. The Node dev scripts use only built-in modules.

**Content is the product.** It is gated by an automated checker: before anything deploys, every reference solution, starter file and "predict the output" MCQ is actually compiled and run.

## Curriculum (20 modules + final), each with C++ and Python side by side
| Tier | # | Module | Key topics |
|---|---|---|---|
| Foundations | 1 | Why OOP | procedural vs OO, state+behavior, 4 pillars, memory model (C++ stack/heap vs Python refs) |
| | 2 | Classes & Objects | members/methods, `this` vs `self`, instance vs class attrs, struct vs class, `__dict__` |
| | 3 | Constructors, Destructors, Lifetime | init lists, delegating/explicit ctors, dtor order, `__init__` vs `__new__`, `__del__` caveats |
| | 4 | Encapsulation | public/private/protected, invariants, `friend`, `_x`/`__x` mangling, `@property` |
| Pillars | 5 | Inheritance | ctor chaining, `super()`, inheritance access modes, overriding, object slicing |
| | 6 | Runtime Polymorphism | `virtual`/`override`/`final`, vtable/vptr model, virtual dtors, duck typing |
| | 7 | Abstraction & Interfaces | pure virtual, abstract classes, `abc.ABC`, `typing.Protocol` |
| | 8 | Operator Overloading & Dunders | member vs free operators, `<<`, `<=>`, `[]`, `()`, `++`; `__eq__/__hash__`, `__add__/__radd__`, `__iter__`, `total_ordering` |
| | 9 | Static & Class-level Members | static data/functions, inline static, `@classmethod` alt-ctors, `@staticmethod` |
| Deep dive | 10 | Copy & Move Semantics | shallow/deep, copy-and-swap, Rule of 3/5/0, move, `=delete`, `copy`/`deepcopy`, aliasing traps |
| | 11 | Memory & RAII | `unique_ptr`/`shared_ptr`/`weak_ptr`, cycles, refcounting, `weakref`, context managers |
| | 12 | Multiple Inheritance & MRO | diamond, virtual inheritance, C3 MRO, cooperative `super()`, mixins |
| | 13 | C++ Class Toolbox | const members, `mutable`, `constexpr`, nested classes, conversion operators, `explicit` |
| | 14 | Python Object Model | `__slots__`, descriptors, `__getattr__`, dataclasses, `__init_subclass__`, metaclasses |
| | 15 | Templates & Generics | class templates, specialization, CRTP, concepts; `TypeVar`/`Generic` |
| | 16 | Exceptions & OOP | exception hierarchies, catch by ref, exception-safety guarantees, `raise from` |
| Design | 17 | Composition & Relationships | has-a vs is-a, delegation, aggregation, UML class diagrams |
| | 18 | SOLID | each principle shown as a bad version refactored into a good one, in both languages |
| | 19 | Patterns I | Singleton (and its problems), Factory Method, Builder, Adapter, Decorator, Composite |
| | 20 | Patterns II | Strategy, Observer, Command, Template Method, State, Iterator |
| Final | 21 | Mastery | 3 capstone projects (in both languages) plus a 40-question mixed exam drawn from all modules |

**Per module, at minimum:**
- **Lesson:** a detailed Markdown lesson. C++ and Python code blocks that sit next to each other are grouped into a side-by-side "compare" widget. Each lesson ends with *Key takeaways* and *Common pitfalls*.
- **MCQs:** 15 or more, mixing concept, predict-the-output (at least 3, each executed to verify the answer), spot-the-bug and C++-vs-Python questions.
- **Coding exercises:** 4 or more (at least 2 in C++ and 2 in Python), each with tests, progressive hints, a model solution and an explanation.

That totals roughly 300 MCQs and 80 or more exercises.

## Learning mechanics
- **MCQ (after every question):** the options lock, and the correct and chosen answers are highlighted. Then the site shows *why* for **every** option (why the right one is right and why each wrong one is wrong), followed by a deeper concept explanation. Keys 1–4 select an option and Enter moves on. A missed question goes into the review queue.
- **Review queue (Leitner-lite):** a missed question must be answered correctly in two separate review sessions before it leaves the queue. On retry, options are shuffled.
- **Lab:** a CodeMirror editor with starter code that autosaves per exercise.
  - **Run Tests** shows pass/fail per test, compile errors and stdout.
  - Hints unlock one at a time. **Show solution** is always available, but using it reduces XP.
  - After you pass, the model solution and its walkthrough appear so you can compare approaches.
- **Gamification:**
  - **XP:** 10 for a first-try correct MCQ, 5 after a retry; 50 per exercise, minus 10 per hint, and 0 if the solution was revealed.
  - **Levels and badges:** levels come from XP thresholds. Badges include module mastered, perfect quiz, no-hints, and *Polyglot* (both languages in a module).
  - **Daily streak.**
  - **Module mastery %:** 50% × (questions whose latest answer is correct) + 50% × (exercises passed). A module counts as "mastered" at 90% or more with every exercise passed.

## Architecture (repo `D:\oops`)
```
index.html            shell + CDN tags (marked, highlight.js, CodeMirror 5); Pyodide is loaded by the worker
css/styles.css        color tokens, light/dark themes, responsive down to phone width
js/app.js, router.js  bootstrap; hash routes: #/, #/m/:id/lesson|quiz|lab, #/review, #/exam, #/settings
js/state.js           pure progress logic (XP, levels, streak, badges, mastery, review queue) + localStorage I/O in try/catch
js/views/*.js         home (dashboard), lesson, quiz, lab, review, exam, settings
js/runners/harness.js PURE (no DOM): assembles C++/Python test programs and parses result markers — shared by browser and Node scripts
js/runners/python-runner.js + python-worker.js   Pyodide in a Worker; 10 s timeout → terminate and respawn
js/runners/cpp-runner.js     Wandbox (g++, -std=c++20) → falls back to Godbolt on network/5xx errors; friendly compile-error display
content/index.js      ordered module registry (id, title, tier, recommended prerequisites)
content/NN-slug/lesson.md, quiz.js, exercises.js
scripts/validate-content.mjs   schema checks (ids unique, exactly 1 correct option, every option has a "why", required fields, lang tags, counts per module)
scripts/test-solutions.mjs     runs locally with python + g++: solution passes ALL tests, starter FAILS ≥1 test, output-MCQ stdout == correct option
tests/*.test.mjs               node:test unit tests for state.js and harness.js
.github/workflows/deploy.yml   validate → unit tests → test-solutions → deploy to GitHub Pages
README.md
```

**Content schemas:**
- **`quiz.js`** exports an array of:
  `{id, lang:'cpp'|'python'|'both', type:'concept'|'output'|'bug'|'compare', difficulty:1-3, prompt, code?, codeLang?, options:[{text, correct, why}], explanation}`
- **`exercises.js`** exports an array of:
  `{id, lang, title, difficulty, task, starter, tests:[{name, code}], hints[], solution, explanation}`
- **Code fences:** lessons and code strings use `~~~` fences, so they don't clash with JavaScript template literals.

**How tests run:**
- **C++ tests:**
  - A small prelude provides `RUN_TEST(name, lambda)`, `EXPECT(cond)`, `EXPECT_EQ(a,b)` and `captureCout(fn)`.
  - Each test prints `@@TEST|name|PASS` or `@@TEST|name|FAIL|msg`.
  - Structural checks run as runtime checks of type traits, e.g. `EXPECT(std::is_abstract_v<Shape>)`.
  - If the program crashes, the remaining tests are reported as "not run".
- **Python tests:** user code runs in a fresh namespace for each test. Test code uses `assert` plus a `capture(fn)` helper (wraps `redirect_stdout`), and results come back as JSON.
  - In the browser this runs in Pyodide. In the scripts and CI it runs in CPython, using the same harness string from `harness.js`.

## Implementation order
0. **Save the design.** After approval, save this design as `docs/superpowers/specs/2026-10-04-oop-mastery-design.md`, then break it into tasks with the writing-plans skill. The user then picks how it gets executed.
1. **Scaffold.** `git init` and set up the folder layout, `index.html`, CSS tokens and themes, router, and `state.js` with unit tests.
2. **Runners.** Build `harness.js` with unit tests, then the Python worker and runner, then the C++ runner. Confirm the exact Wandbox compiler name via `GET /api/list.json` and the Godbolt compiler id.
3. **Views.** Build the dashboard, lesson renderer with the compare widget, quiz engine, lab, review, exam and settings (language toggle, theme, export/import/reset progress).
4. **Content checkers.** Write `validate-content.mjs` and `test-solutions.mjs`.
5. **Pilot module.** Write module 05 Inheritance in full, to fix the content format and quality bar, and check it end to end in the browser.
6. **Remaining content.** Write modules 01–04 and 06–21 in batches. Every batch must pass both content checkers before moving on.
7. **Deploy.** Add the deploy workflow and README. Run `gh repo create IhsanKT/oop-mastery --public --source . --push`, then enable Pages with build_type=workflow (`gh api -X POST repos/IhsanKT/oop-mastery/pages -f build_type=workflow`).

## Verification
- **Automated checks.** Run `node --test tests/`, `node scripts/validate-content.mjs` and `node scripts/test-solutions.mjs`. All must pass, including "starter fails" and the executed output MCQs.
- **Local browser check.** Serve with `python -m http.server 8000` from `D:\oops` and click through:
  - answer an MCQ right and wrong (per-option explanations appear; the missed one lands in Review)
  - run a Python exercise failing, then passing
  - run a C++ exercise on Wandbox, plus a deliberate compile error
  - test an infinite loop (timeout + respawn)
  - check that XP, streak and mastery persist after a reload
  - try the C++/Python/Both toggle, dark mode, and a 375 px-wide viewport
- **Deploy check.** The GitHub Actions run is green, `curl -I https://ihsankt.github.io/oop-mastery/` returns 200, and a smoke test on the live site (one Python and one C++ exercise run) works.
