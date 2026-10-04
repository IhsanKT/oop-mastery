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
