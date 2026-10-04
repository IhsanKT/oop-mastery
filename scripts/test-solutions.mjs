import { cpus } from 'node:os';
import { MODULES } from '../content/index.js';
import { runCppLocal, runPythonLocal, runProgramLocal } from './lib/local-runners.mjs';

const argv = process.argv.slice(2);
let only = null;
if (argv.includes('--module')) {
  only = argv[argv.indexOf('--module') + 1];
  if (!only || only.startsWith('--')) {
    console.error('--module needs a module id');
    process.exit(1);
  }
  if (!MODULES.some((m) => m.id === only)) {
    console.error(`Unknown module id "${only}". Known ids: ${MODULES.map((m) => m.id).join(', ')}`);
    process.exit(1);
  }
}
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
      if (['compile', 'timeout', 'network'].includes(r.phase)) return `${ex.id}: starter does not compile/run (${r.phase}): ${String(r.message).slice(0, 300)}`;
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

if (jobs.length === 0) {
  console.error('No checks were run (no loadable content found).');
  process.exit(1);
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
