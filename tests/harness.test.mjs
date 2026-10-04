import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../js/runners/harness.js';

const tests = [{ name: 'a', code: 'EXPECT(1 == 1);' }, { name: 'b|c "q"', code: 'EXPECT(2 == 2);' }, { name: 'd', code: '' }];

test('cppString escapes quotes, backslashes and newlines', () => {
  assert.equal(H.cppString('a"b\\c\nd'), '"a\\"b\\\\c\\nd"');
});

test('cppHasMain detects a main function', () => {
  assert.equal(H.cppHasMain('int main() { return 0; }'), true);
  assert.equal(H.cppHasMain('int  main (void){}'), true);
  assert.equal(H.cppHasMain('int domain() { return 1; } // main idea'), false);
});

test('buildCppProgram: userStartLine points at the first user line and names are embedded', () => {
  const nonce = 'n0nce';
  const { program, userStartLine } = H.buildCppProgram('class Dog {};\nint x = 1;', tests, nonce);
  const lines = program.split('\n');
  assert.equal(lines[userStartLine - 1], 'class Dog {};');
  assert.equal(lines[userStartLine], 'int x = 1;');
  assert.match(program, /::oopm::run\("b\|c \\"q\\"", \[&\] \{/);
  assert.match(program, /@@TEST:n0nce\|/);
  assert.match(program, /int main\(\) \{/);
});

test('parseCppOutput ignores fake markers and keeps user output', () => {
  const out = 'hello\n@@TEST|fake|PASS|\nno newline\n@@TEST:N|a|PASS|\n\n@@TEST:N|b c  q |FAIL|expected: x\n';
  const { markers, userOutput } = H.parseCppOutput(out, 'N');
  assert.equal(markers.length, 2);
  assert.deepEqual(markers[1], { name: 'b c  q ', status: 'fail', message: 'expected: x' });
  assert.equal(userOutput, 'hello\n@@TEST|fake|PASS|\nno newline');
});

test('normalizeCppResult: all pass', () => {
  const raw = { compiled: true, compilerOutput: '', stdout: '\n@@TEST:N|a|PASS|\n\n@@TEST:N|b|PASS|\n\n@@TEST:N|d|PASS|\n', stderr: '', exitCode: 0, signal: '', timedOut: false };
  const r = H.normalizeCppResult(raw, tests, 'N', 40, 2);
  assert.equal(r.ok, true);
  assert.equal(r.phase, 'tests');
  assert.deepEqual(r.results.map((x) => x.status), ['pass', 'pass', 'pass']);
  assert.equal(r.results[1].name, tests[1].name); // names come from the test list, not the marker
});

test('normalizeCppResult: compile error remaps line numbers', () => {
  const raw = { compiled: false, compilerOutput: "prog.cc:42:5: error: 'Dog' has no member 'bark'\nprog.cc:10:1: note: in harness\nprog.cc:50:3: error: in tests\nprog.cc: In function 'int main()':", stdout: '', stderr: '', exitCode: 1, signal: '', timedOut: false };
  const r = H.normalizeCppResult(raw, tests, 'N', 40, 5);
  assert.equal(r.phase, 'compile');
  assert.equal(r.ok, false);
  assert.match(r.message, /your code:3:5: error/);
  assert.match(r.message, /harness:10/);
  assert.match(r.message, /test code: error: in tests/);
  assert.match(r.message, /your program: In function/);
  assert.deepEqual(r.results.map((x) => x.status), ['notrun', 'notrun', 'notrun']);
});

test('normalizeCppResult: crash marks remaining tests not run', () => {
  const raw = { compiled: true, compilerOutput: '', stdout: '\n@@TEST:N|a|PASS|\n', stderr: '', exitCode: 139, signal: 'Segmentation fault', timedOut: false };
  const r = H.normalizeCppResult(raw, tests, 'N', 40, 2);
  assert.equal(r.ok, false);
  assert.equal(r.phase, 'runtime');
  assert.match(r.message, /crashed during "b\|c "q""/);
  assert.match(r.message, /Segmentation fault/);
  assert.deepEqual(r.results.map((x) => x.status), ['pass', 'notrun', 'notrun']);
});

test('normalizeCppResult: timeout', () => {
  const raw = { compiled: true, compilerOutput: '', stdout: '', stderr: '', exitCode: null, signal: '', timedOut: true };
  const r = H.normalizeCppResult(raw, tests, 'N', 40, 2);
  assert.equal(r.phase, 'timeout');
  assert.match(r.message, /infinite loop/);
});

test('wandboxToRaw and godboltToRaw adapt real response shapes', () => {
  const ok = H.wandboxToRaw({ status: '0', signal: '', compiler_error: 'prog.cc:3:7: warning: unused variable', program_output: 'hi\n', program_error: '' });
  assert.deepEqual(ok, { compiled: true, compilerOutput: 'prog.cc:3:7: warning: unused variable', stdout: 'hi\n', stderr: '', exitCode: 0, signal: '', timedOut: false });
  const bad = H.wandboxToRaw({ status: '1', compiler_error: "prog.cc:4:26: error: expected ';'", program_output: '' });
  assert.equal(bad.compiled, false);
  const link = H.wandboxToRaw({ status: '1', compiler_error: 'collect2: error: ld returned 1 exit status' });
  assert.equal(link.compiled, false);
  const gb = H.godboltToRaw({ code: 0, didExecute: true, stdout: [{ text: '@@TEST:N|a|PASS|' }, { text: '1' }], stderr: [], buildResult: { code: 0, stderr: [] }, timedOut: false });
  assert.equal(gb.compiled, true);
  assert.equal(gb.stdout, '@@TEST:N|a|PASS|\n1');
  const gbBad = H.godboltToRaw({ code: -1, stdout: [], stderr: [{ text: 'Build failed' }], buildResult: { code: 1, stderr: [{ text: '<source>:2:26: error: x' }] } });
  assert.equal(gbBad.compiled, false);
  assert.equal(gbBad.compilerOutput, '<source>:2:26: error: x');
});

test('mainNotAllowed explains the rule', () => {
  const r = H.mainNotAllowed(tests);
  assert.equal(r.phase, 'compile');
  assert.match(r.message, /main\(\)/);
});

test('normalizePythonResult maps the harness JSON', () => {
  const pt = [{ name: 'x', code: '' }, { name: 'y', code: '' }];
  const syntax = H.normalizePythonResult({ compileError: 'SyntaxError: bad', runtimeError: null, results: [], stdout: '' }, pt);
  assert.equal(syntax.phase, 'compile');
  assert.deepEqual(syntax.results.map((r) => r.status), ['notrun', 'notrun']);
  const rt = H.normalizePythonResult(JSON.stringify({ compileError: null, runtimeError: 'NameError: q', results: [], stdout: 'partial' }), pt);
  assert.equal(rt.phase, 'runtime');
  assert.equal(rt.stdout, 'partial');
  const mixed = H.normalizePythonResult({ compileError: null, runtimeError: null, stdout: '', results: [{ name: 'x', status: 'pass', message: '' }, { name: 'y', status: 'fail', message: 'boom' }] }, pt);
  assert.equal(mixed.ok, false);
  assert.equal(mixed.phase, 'tests');
  const all = H.normalizePythonResult({ compileError: null, runtimeError: null, stdout: '', results: [{ name: 'x', status: 'pass', message: '' }, { name: 'y', status: 'pass', message: '' }] }, pt);
  assert.equal(all.ok, true);
});

test('PY_HARNESS defines run_all and capture', () => {
  assert.match(H.PY_HARNESS, /def run_all\(payload_json\):/);
  assert.match(H.PY_HARNESS, /def capture\(fn/);
});
