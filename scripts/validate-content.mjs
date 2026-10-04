import { readFile } from 'node:fs/promises';
import { MODULES } from '../content/index.js';
import { validateModule } from './lib/validate.mjs';

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
