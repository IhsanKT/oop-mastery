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
  const minLesson = final ? 1500 : 3000;
  if (lesson.length < minLesson) err('lesson.md', `must be at least ${minLesson} characters (has ${lesson.length})`);
  if (lesson.includes('```')) err('lesson.md', 'use ~~~ fences, not backticks');
  if (!final) {
    for (const h of ['## Key takeaways', '## Common pitfalls']) if (!lesson.includes(h)) err('lesson.md', `missing heading "${h}"`);
    if (!/^~~~cpp\s*$/m.test(lesson)) err('lesson.md', 'needs at least one ~~~cpp block');
    if (!/^~~~python\s*$/m.test(lesson)) err('lesson.md', 'needs at least one ~~~python block');
  }

  if (!Array.isArray(quiz)) { err('quiz.js', 'default export must be an array'); quiz = []; }
  if (!final && quiz.length < 8) err('quiz.js', `needs ≥8 questions (has ${quiz.length})`);
  if (!final && quiz.filter((q) => q?.type === 'output').length < 2) err('quiz.js', 'needs ≥2 output questions');
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
  const perLang = 1;
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
