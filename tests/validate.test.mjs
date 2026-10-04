import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateModule } from '../scripts/lib/validate.mjs';

const meta = { id: 'demo', dir: '99-demo' };
const why = 'Because this is the reason it is right or wrong.';
const q = (i, extra = {}) => ({
  id: `demo-q${i}`, lang: 'both', type: i < 3 ? 'output' : 'concept', difficulty: 1,
  prompt: 'What does this print?', code: i < 3 ? '#include <iostream>\nint main(){ std::cout << 1; }' : undefined,
  codeLang: i < 3 ? 'cpp' : undefined,
  options: [{ text: '1', correct: true, why }, { text: '2', correct: false, why }, { text: '3', correct: false, why }],
  explanation: 'x'.repeat(80), ...extra,
});
const ex = (i, lang) => ({
  id: `demo-e${i}`, lang, title: 'T', difficulty: 1, task: 't'.repeat(100), starter: '// start',
  tests: [{ name: 'a', code: 'x' }, { name: 'b', code: 'y' }, { name: 'c', code: 'z' }],
  hints: ['h1', 'h2'], solution: '// solution', explanation: 'e'.repeat(150),
});
const lesson = `# Demo\n${'Lorem ipsum. '.repeat(500)}\n~~~cpp\nint x;\n~~~\n~~~python\nx = 1\n~~~\n## Key takeaways\n- a\n## Common pitfalls\n- b\n`;
const good = () => ({
  quiz: Array.from({ length: 15 }, (_, i) => q(i)),
  exercises: [ex(1, 'cpp'), ex(2, 'cpp'), ex(3, 'python'), ex(4, 'python')],
});

test('a complete module validates', () => {
  const { quiz, exercises } = good();
  assert.deepEqual(validateModule(meta, lesson, quiz, exercises), []);
});

test('flags each schema violation', () => {
  const { quiz, exercises } = good();
  quiz[5].options[1].correct = true;          // two correct
  quiz[6].options[0].why = 'short';           // weak why
  quiz[7].id = 'other-q7';                    // wrong prefix
  quiz[8].id = quiz[9].id;                    // duplicate id
  exercises[0].solution = 'int main() { return 0; }';
  exercises[2].tests = [{ name: 'a', code: 'x' }];
  const errs = validateModule(meta, lesson.replace('~~~python\nx = 1\n~~~\n', '```python\nx=1\n```\n'), quiz, exercises).join('\n');
  assert.match(errs, /exactly one option/);
  assert.match(errs, /option 0 needs a "why"/);
  assert.match(errs, /id must start with "demo-"/);
  assert.match(errs, /duplicate id/);
  assert.match(errs, /must not define main/);
  assert.match(errs, /needs ≥3 tests/);
  assert.match(errs, /~~~ fences/);
  assert.match(errs, /~~~python block/);
});

test('minimum counts are enforced, final module relaxes quiz rules', () => {
  const errs = validateModule(meta, lesson, [], []).join('\n');
  assert.match(errs, /≥15 questions/);
  assert.match(errs, /≥4 exercises/);
  const finalMeta = { id: 'demo', dir: '21-demo', final: true };
  const six = [1, 2, 3].map((i) => ex(i, 'cpp')).concat([4, 5, 6].map((i) => ex(i, 'python')));
  assert.deepEqual(validateModule(finalMeta, 'x'.repeat(2000), [], six), []);
});
