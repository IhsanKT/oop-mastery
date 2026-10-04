# OOP Mastery

OOP Mastery is a free, static website that teaches object-oriented programming in C++ and Python side by side. Each lesson shows both languages, every quiz question explains why the right answer is right and why each wrong one is wrong, and the coding labs run your code for real and check it against tests. There is no account and no backend: your progress lives in your browser.

Live site: https://ihsankt.github.io/oop-mastery/

## What's inside

Twenty-one modules, grouped into five tiers:

1. Why OOP?
2. Classes & Objects
3. Constructors, Destructors & Lifetime
4. Encapsulation
5. Inheritance
6. Runtime Polymorphism
7. Abstraction & Interfaces
8. Operator Overloading & Dunders
9. Static & Class-level Members
10. Copy & Move Semantics
11. Memory & RAII
12. Multiple Inheritance & MRO
13. The C++ Class Toolbox
14. The Python Object Model
15. Templates & Generics
16. Exceptions & OOP
17. Composition & Relationships
18. SOLID Principles
19. Design Patterns I
20. Design Patterns II
21. Mastery Capstones

Every module has a lesson, a quiz and a set of coding labs. Beyond the content itself, the site offers:

- Per-option explanations: after you answer, every option says why it is right or wrong, not just the correct one.
- Labs that really run your code, in C++ and in Python, with named tests that pass or fail individually.
- XP, levels, daily streaks and badges to reward steady practice.
- A review queue that brings back the questions you missed so they stick.
- A final exam that draws on the whole course.

## How code runs

Nothing is simulated. Your code is executed by a real interpreter or compiler.

- **Python** runs in your browser through Pyodide 0.29.5 inside a Web Worker. The worker keeps the page responsive, and a run is stopped after 10 seconds so an infinite loop cannot hang the tab.
- **C++** is compiled and run remotely. The site sends your code to Wandbox (GCC 13.2, C++20). If Wandbox is unavailable, it falls back to Compiler Explorer.

Privacy note: because C++ cannot be compiled in the browser here, the C++ code you submit in a lab is sent to those third-party services (Wandbox, and Compiler Explorer if the fallback is used). Do not paste anything secret into a C++ lab. Python code stays on your machine.

## Run locally

```
npm run serve
```

Then open http://localhost:8000. The server is Python's built-in `http.server`, so you need Python on your PATH. There is no `npm install` step, because the project has no dependencies.

## Checks

```
npm test
npm run validate
npm run check
```

- `npm test` runs the unit tests in `tests/` with the Node test runner.
- `npm run validate` checks every module's lesson, quiz and exercises against the content schema. To check one module, run `npm run validate -- --module inheritance`. In PowerShell, npm drops the `--`, so use Git Bash or call `node scripts/validate-content.mjs --module inheritance` directly.
- `npm run check` compiles and runs every exercise's reference solution against its own tests, so a broken lab cannot ship.

The checks need `g++` with C++20 support and Python 3.13 on your PATH. To use other executables, set the `CXX` and `PYTHON` environment variables.

## Writing content

Each module lives in `content/NN-slug/` and is registered in `content/index.js`. A module has three files:

- `lesson.md` is the lesson. It uses `~~~` code fences (never backticks) and, for regular modules, must be at least 6,000 characters with `## Key takeaways` and `## Common pitfalls` headings and at least one `~~~cpp` and one `~~~python` block.
- `quiz.js` default-exports an array of at least 15 questions, including at least 3 `output` questions. Each question has an id prefixed with the module id, a `lang`, a `type` (`concept`, `output`, `bug` or `compare`), a difficulty of 1 to 3, a prompt, an explanation, and 3 to 5 options. Exactly one option is correct, and every option carries a `why`.
- `exercises.js` default-exports an array with at least 2 C++ and 2 Python labs. Each lab has a task, starter code, a reference solution, an explanation, at least 2 hints and at least 3 uniquely named tests.

The test contract for labs is shared by both languages:

- **C++:** each test's `code` is the body of a lambda that runs inside `main()` after the learner's code. It uses the `EXPECT`, `EXPECT_EQ`, `EXPECT_NEAR` and `EXPECT_THROWS` macros, and `captureCout([&]{ ... })` to check printed output. The starter and solution must not define `main`, because the harness provides it.
- **Python:** each test's `code` is a script that runs in a fresh namespace after the learner's code. It uses `assert cond, "message"` and `capture(fn)` to check printed output. Blocks guarded by `if __name__ == "__main__":` do not run during tests.

The full design and the task-by-task contracts are in the implementation plan, [docs/superpowers/plans/2026-10-04-oop-mastery.md](docs/superpowers/plans/2026-10-04-oop-mastery.md), with the specification alongside it in `docs/superpowers/specs/`.

## Deploying

A push to `main` triggers the GitHub Actions workflow in `.github/workflows/deploy.yml`. It first runs `npm test`, `npm run validate` and `npm run check`. Only if all three pass does it copy `index.html`, `css`, `js` and `content` into a site folder and deploy that to GitHub Pages. The workflow can also be started by hand from the Actions tab.
