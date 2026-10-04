import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCppLocal, runPythonLocal, runProgramLocal } from '../scripts/lib/local-runners.mjs';

const pyTests = [
  { name: 'speak', code: 'assert Dog("Rex").speak() == "Rex says woof", "speak() text"' },
  { name: 'prints', code: 'out = capture(Dog("A").announce)\nassert out == "A is here\\n", repr(out)' },
];
const pyGood = 'class Dog:\n    def __init__(self, name):\n        self.name = name\n    def speak(self):\n        return f"{self.name} says woof"\n    def announce(self):\n        print(f"{self.name} is here")\nprint("top-level output")\nif __name__ == "__main__":\n    raise SystemExit("main guard must not run")\n';

test('python: passing solution', async () => {
  const r = await runPythonLocal(pyGood, pyTests);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.stdout, 'top-level output\n');
});

test('python: assertion failure reports message and test line', async () => {
  const bad = pyGood.replace('says woof', 'says meow');
  const r = await runPythonLocal(bad, pyTests);
  assert.equal(r.ok, false);
  assert.equal(r.results[0].status, 'fail');
  assert.match(r.results[0].message, /speak\(\) text \(test line 1/);
  assert.equal(r.results[1].status, 'pass');
});

test('python: syntax error, top-level error, sys.exit', async () => {
  assert.equal((await runPythonLocal('class Dog(:\n  pass', pyTests)).phase, 'compile');
  const rt = await runPythonLocal('x = undefined_name', pyTests);
  assert.equal(rt.phase, 'runtime');
  assert.match(rt.message, /NameError/);
  assert.equal((await runPythonLocal('import sys\nsys.exit(1)', pyTests)).phase, 'runtime');
});

test('python: dataclasses work inside the harness namespace', async () => {
  const code = 'from dataclasses import dataclass, field\n@dataclass(order=True)\nclass P:\n    x: int\n    tags: list = field(default_factory=list)\n';
  const r = await runPythonLocal(code, [{ name: 'eq', code: 'assert P(1) == P(1)' }, { name: 'order', code: 'assert P(1) < P(2)' }]);
  assert.equal(r.ok, true, JSON.stringify(r));
});

test('python: infinite loop times out', async () => {
  const r = await runPythonLocal('while True:\n    pass', pyTests, { timeoutMs: 2000 });
  assert.equal(r.phase, 'timeout');
});

const cppTests = [
  { name: 'speak', code: 'Dog d("Rex");\nEXPECT_EQ(d.speak(), std::string("Rex says woof"));' },
  { name: 'prints', code: 'Dog d("A");\nEXPECT_EQ(captureCout([&]{ d.announce(); }), std::string("A is here\\n"));' },
];
const cppGood = '#include <iostream>\n#include <string>\nclass Dog {\n  std::string name_;\npublic:\n  explicit Dog(std::string n) : name_(std::move(n)) {}\n  std::string speak() const { return name_ + " says woof"; }\n  void announce() const { std::cout << name_ << " is here\\n"; }\n};\n';

test('cpp: passing solution', async () => {
  const r = await runCppLocal(cppGood, cppTests);
  assert.equal(r.ok, true, JSON.stringify(r));
});

test('cpp: failing test shows expected vs got', async () => {
  const r = await runCppLocal(cppGood.replace('says woof', 'says meow'), cppTests);
  assert.equal(r.ok, false);
  assert.equal(r.phase, 'tests');
  assert.match(r.results[0].message, /got Rex says meow vs Rex says woof/);
  assert.equal(r.results[1].status, 'pass');
});

test('cpp: compile error is mapped to the learner line', async () => {
  const r = await runCppLocal('class Dog {\n  int x\n};\n', cppTests);
  assert.equal(r.phase, 'compile');
  assert.match(r.message, /your code:\d+/);
});

test('cpp: crash and timeout', async () => {
  const crash = await runCppLocal(cppGood + '#include <cstdlib>\n', [{ name: 'ok', code: 'EXPECT(true);' }, { name: 'boom', code: 'std::abort();' }, { name: 'after', code: 'EXPECT(true);' }]);
  assert.equal(crash.phase, 'runtime');
  assert.deepEqual(crash.results.map((x) => x.status), ['pass', 'notrun', 'notrun']);
  const loop = await runCppLocal(cppGood, [{ name: 'spin', code: 'volatile int x = 0; while (true) { x = x + 1; }' }], { timeoutMs: 2000 });
  assert.equal(loop.phase, 'timeout');
});

test('cpp: main() is rejected with a friendly message', async () => {
  const r = await runCppLocal(cppGood + 'int main() { return 0; }\n', cppTests);
  assert.equal(r.phase, 'compile');
  assert.match(r.message, /Remove your main\(\)/);
});

test('runProgramLocal runs whole programs in both languages', async () => {
  const py = await runProgramLocal('python', 'print("hi")\nprint(1 + 1)\n');
  assert.deepEqual([py.ok, py.stdout.replace(/\r\n/g, '\n')], [true, 'hi\n2\n']);
  const cpp = await runProgramLocal('cpp', '#include <iostream>\nint main() { std::cout << "hi\\n" << 2 << "\\n"; }\n');
  assert.deepEqual([cpp.ok, cpp.stdout], [true, 'hi\n2\n']);
});
