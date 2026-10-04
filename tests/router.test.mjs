import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute } from '../js/router.js';

test('parseRoute', () => {
  assert.deepEqual(parseRoute(''), { name: 'home', params: {} });
  assert.deepEqual(parseRoute('#/'), { name: 'home', params: {} });
  assert.deepEqual(parseRoute('#/m/inheritance'), { name: 'module', params: { id: 'inheritance', tab: 'lesson', exId: null } });
  assert.deepEqual(parseRoute('#/m/inheritance/quiz'), { name: 'module', params: { id: 'inheritance', tab: 'quiz', exId: null } });
  assert.deepEqual(parseRoute('#/m/inheritance/lab/inheritance-e02'), { name: 'module', params: { id: 'inheritance', tab: 'lab', exId: 'inheritance-e02' } });
  assert.deepEqual(parseRoute('#/m/inheritance/bogus'), { name: 'module', params: { id: 'inheritance', tab: 'lesson', exId: null } });
  assert.deepEqual(parseRoute('#/review'), { name: 'review', params: {} });
  assert.deepEqual(parseRoute('#/exam'), { name: 'exam', params: {} });
  assert.deepEqual(parseRoute('#/settings'), { name: 'settings', params: {} });
  assert.equal(parseRoute('#/nope').name, 'notfound');
  assert.equal(parseRoute('#/m/%E0%A4%A').name, 'notfound'); // malformed escape must not throw
});
