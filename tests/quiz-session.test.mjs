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
