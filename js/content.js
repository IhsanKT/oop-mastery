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
