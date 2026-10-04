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
