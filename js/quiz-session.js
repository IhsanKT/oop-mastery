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
