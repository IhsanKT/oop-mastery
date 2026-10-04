import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCpp, WANDBOX_URL, GODBOLT_URL } from '../js/runners/cpp-runner.js';

const tests = [{ name: 't1', code: 'EXPECT(true);' }, { name: 't2', code: 'EXPECT(true);' }];
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const nonceOf = (init) => /@@TEST:([a-z0-9]+)\|/.exec(JSON.parse(init.body).code ?? JSON.parse(init.body).source)[1];
const passing = (nonce) => tests.map((t) => `\n@@TEST:${nonce}|${t.name}|PASS|`).join('\n') + '\n';

test('uses Wandbox when it answers', async () => {
  const calls = [];
  const statuses = [];
  let body;
  const fetchImpl = async (url, init) => {
    calls.push(url);
    body = JSON.parse(init.body);
    return json({ status: '0', compiler_error: '', program_output: passing(nonceOf(init)), program_error: '', signal: '' });
  };
  const r = await runCpp('struct A {};', tests, { fetchImpl, onStatus: (s) => statuses.push(s) });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(calls, [WANDBOX_URL]);
  assert.match(statuses[0], /Wandbox/);
  assert.equal(body.compiler, 'gcc-13.2.0');
  assert.equal(body['compiler-option-raw'], '-std=c++20');
});

test('falls back to Godbolt on HTTP 403 from Wandbox', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(url);
    if (url === WANDBOX_URL) return json({}, 403);
    const n = nonceOf(init);
    return json({ code: 0, buildResult: { code: 0, stderr: [] }, stdout: passing(n).split('\n').map((text) => ({ text })), stderr: [] });
  };
  const r = await runCpp('struct A {};', tests, { fetchImpl });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(calls, [WANDBOX_URL, GODBOLT_URL]);
});

test('falls back when Wandbox throws (offline / CORS)', async () => {
  const fetchImpl = async (url, init) => {
    if (url === WANDBOX_URL) throw new TypeError('Failed to fetch');
    return json({ code: 0, buildResult: { code: 0, stderr: [] }, stdout: passing(nonceOf(init)).split('\n').map((text) => ({ text })) });
  };
  assert.equal((await runCpp('struct A {};', tests, { fetchImpl })).ok, true);
});

test('both services down → network phase, tests not run', async () => {
  const r = await runCpp('struct A {};', tests, { fetchImpl: async () => { throw new TypeError('offline'); } });
  assert.equal(r.phase, 'network');
  assert.match(r.message, /your code is saved/);
  assert.deepEqual(r.results.map((x) => x.status), ['notrun', 'notrun']);
});

test('main() is rejected before any request', async () => {
  let called = false;
  const r = await runCpp('int main() {}', tests, { fetchImpl: async () => { called = true; } });
  assert.equal(r.phase, 'compile');
  assert.equal(called, false);
});
