// Pure helpers shared by the browser runners and the Node content checker.
// No DOM and no Node APIs in this file.

export function makeNonce() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const notRun = (tests, message = '') => tests.map((t) => ({ name: t.name, status: 'notrun', message }));

export const cppString = (s) =>
  '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';

export const cppHasMain = (code) => /\bint\s+main\s*\(/.test(code);

export function mainNotAllowed(tests) {
  return {
    ok: false, phase: 'compile', results: notRun(tests), stdout: '',
    message: 'Remove your main() function: the test runner supplies its own main() and calls your classes directly.',
  };
}

export function cppPrelude(nonce) {
  return [
    '#include <iostream>',
    '#include <sstream>',
    '#include <string>',
    '#include <functional>',
    '#include <stdexcept>',
    '#include <type_traits>',
    '#include <cmath>',
    'namespace oopm {',
    'struct Failure { std::string msg; };',
    'template <class T> std::string show(const T& v) {',
    '  if constexpr (requires(std::ostream& o, const T& x) { o << x; }) { std::ostringstream s; s << v; return s.str(); }',
    '  else return "<value>";',
    '}',
    'inline std::string captureCout(const std::function<void()>& fn) {',
    '  std::ostringstream buf; auto* old = std::cout.rdbuf(buf.rdbuf());',
    '  try { fn(); } catch (...) { std::cout.rdbuf(old); throw; }',
    '  std::cout.rdbuf(old); return buf.str();',
    '}',
    "inline std::string clean(std::string s) { for (char& c : s) if (c == '\\n' || c == '\\r' || c == '|') c = ' '; return s; }",
    'inline void run(const char* name, const std::function<void()>& fn) {',
    '  std::string status = "PASS", msg;',
    '  try { fn(); }',
    '  catch (const Failure& f) { status = "FAIL"; msg = f.msg; }',
    '  catch (const std::exception& e) { status = "FAIL"; msg = std::string("uncaught exception: ") + e.what(); }',
    '  catch (...) { status = "FAIL"; msg = "uncaught non-standard exception"; }',
    `  std::cout << "\\n@@TEST:${nonce}|" << clean(name) << "|" << status << "|" << clean(msg) << std::endl;`,
    '}',
    '} // namespace oopm',
    '#define EXPECT(cond) do { if (!(cond)) throw ::oopm::Failure{"expected: " #cond}; } while (0)',
    '#define EXPECT_EQ(a, b) do { auto&& oopm_a = (a); auto&& oopm_b = (b); if (!(oopm_a == oopm_b)) throw ::oopm::Failure{std::string("expected " #a " == " #b ", got ") + ::oopm::show(oopm_a) + " vs " + ::oopm::show(oopm_b)}; } while (0)',
    '#define EXPECT_NEAR(a, b, eps) do { double oopm_a = (a), oopm_b = (b); if (std::fabs(oopm_a - oopm_b) > (eps)) throw ::oopm::Failure{std::string("expected " #a " ~= " #b ", got ") + std::to_string(oopm_a) + " vs " + std::to_string(oopm_b)}; } while (0)',
    '#define EXPECT_THROWS(expr, ExType) do { bool oopm_t = false; try { (void)(expr); } catch (const ExType&) { oopm_t = true; } catch (...) {} if (!oopm_t) throw ::oopm::Failure{"expected " #expr " to throw " #ExType}; } while (0)',
    'using ::oopm::captureCout;',
  ].join('\n');
}

export function buildCppProgram(userCode, tests, nonce) {
  const head = `${cppPrelude(nonce)}\n// ---- your code ----\n`;
  const userStartLine = head.split('\n').length;
  const body = tests.map((t) => `  ::oopm::run(${cppString(t.name)}, [&] {\n${t.code}\n  });`).join('\n');
  const program = `${head}${userCode}\n// ---- tests ----\nint main() {\n${body}\n  return 0;\n}\n`;
  return { program, userStartLine };
}

const FILE_RE = '(?:prog\\.cc|<source>|main\\.cpp|example\\.cpp)';

export function mapCppDiagnostics(text, userStartLine, userLineCount) {
  return text
    .replace(new RegExp(`${FILE_RE}:(\\d+)(?::(\\d+))?`, 'g'), (_, l, c) => {
      const line = Number(l);
      if (line < userStartLine) return `harness:${line}`;
      if (line >= userStartLine + userLineCount) return 'test code';
      return `your code:${line - userStartLine + 1}${c ? `:${c}` : ''}`;
    })
    .replace(new RegExp(`${FILE_RE}:(?=\\s)`, 'g'), 'your program:');
}

export const hasCompileError = (text) => /(^|[\s:])(fatal )?error:/m.test(text || '');

export function parseCppOutput(stdout, nonce) {
  const tag = `@@TEST:${nonce}|`;
  const markers = [];
  const user = [];
  for (const line of stdout.replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith(tag)) {
      const [name, status, ...rest] = line.slice(tag.length).split('|');
      markers.push({ name, status: status === 'PASS' ? 'pass' : 'fail', message: rest.join('|') });
      if (user.length && user[user.length - 1] === '') user.pop(); // separator newline emitted by the harness
    } else {
      user.push(line);
    }
  }
  return { markers, userOutput: user.join('\n').replace(/\n+$/, '') };
}

export function normalizeCppResult(raw, tests, nonce, userStartLine, userLineCount) {
  if (!raw.compiled) {
    const message = mapCppDiagnostics(raw.compilerOutput || '', userStartLine, userLineCount).trim();
    return { ok: false, phase: 'compile', message: message || 'Compilation failed.', results: notRun(tests), stdout: '' };
  }
  const { markers, userOutput } = parseCppOutput(raw.stdout || '', nonce);
  const results = tests.map((t, i) => (markers[i]
    ? { name: t.name, status: markers[i].status, message: markers[i].message }
    : { name: t.name, status: 'notrun', message: '' }));
  let phase = 'tests';
  let message = '';
  if (markers.length < tests.length) {
    const at = tests[markers.length].name;
    if (raw.timedOut) {
      phase = 'timeout';
      message = `Your program ran too long and was stopped during "${at}". Look for an infinite loop or unbounded recursion.`;
      results[markers.length].message = 'timed out here';
    } else {
      phase = 'runtime';
      const why = raw.signal ? ` (${raw.signal})` : raw.exitCode ? ` (exit code ${raw.exitCode})` : '';
      message = `Your program crashed during "${at}"${why}. Common causes: dereferencing a null or dangling pointer, deleting twice, or out-of-range access.`;
      if (raw.stderr && raw.stderr.trim()) message += `\n${raw.stderr.trim()}`;
      results[markers.length].message = 'crashed here';
    }
  }
  const ok = phase === 'tests' && results.length > 0 && results.every((r) => r.status === 'pass');
  return { ok, phase, message, results, stdout: userOutput };
}

export function wandboxToRaw(d) {
  const compilerOutput = d.compiler_error || '';
  return {
    compiled: !hasCompileError(compilerOutput),
    compilerOutput,
    stdout: d.program_output || '',
    stderr: d.program_error || '',
    exitCode: Number(d.status ?? 0),
    signal: d.signal || '',
    timedOut: /time ?out|killed/i.test(d.signal || ''),
  };
}

export function godboltToRaw(d) {
  const b = d.buildResult ?? d;
  const text = (arr) => (arr || []).map((x) => x.text).join('\n');
  return {
    compiled: b.code === 0,
    compilerOutput: text(b.stderr),
    stdout: text(d.stdout),
    stderr: text(d.stderr),
    exitCode: d.code,
    signal: '',
    timedOut: !!d.timedOut,
  };
}

export const PY_HARNESS = String.raw`
import json, io, sys, types, traceback, contextlib

def _fresh_namespace():
    # A real module in sys.modules, so dataclasses/typing can resolve cls.__module__.
    mod = types.ModuleType('solution')
    sys.modules['solution'] = mod
    return mod.__dict__

def capture(fn, *args, **kwargs):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        fn(*args, **kwargs)
    return buf.getvalue()

def _where(exc, sources):
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename in sources]
    if not frames:
        return ''
    f = frames[-1]
    lines = sources[f.filename].splitlines()
    text = lines[f.lineno - 1].strip() if f.lineno and 0 < f.lineno <= len(lines) else ''
    label = 'your code' if f.filename == '<your code>' else 'test'
    return label + ' line ' + str(f.lineno) + ': ' + text

def run_all(payload_json):
    payload = json.loads(payload_json)
    code, tests = payload['code'], payload['tests']
    out = {'compileError': None, 'runtimeError': None, 'results': [], 'stdout': ''}
    try:
        compiled = compile(code, '<your code>', 'exec')
    except SyntaxError as e:
        out['compileError'] = type(e).__name__ + ': ' + str(e.msg) + ' (your code line ' + str(e.lineno) + ')'
        return json.dumps(out)
    first = io.StringIO()
    try:
        with contextlib.redirect_stdout(first):
            exec(compiled, _fresh_namespace())
    except BaseException as e:
        out['stdout'] = first.getvalue()
        where = _where(e, {'<your code>': code})
        out['runtimeError'] = (type(e).__name__ + ': ' + str(e) + '\n' + where).strip()
        return json.dumps(out)
    out['stdout'] = first.getvalue()
    for t in tests:
        sources = {'<your code>': code, '<test>': t['code']}
        ns = _fresh_namespace()
        ns['capture'] = capture
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                exec(compiled, ns)
                exec(compile(t['code'], '<test>', 'exec'), ns)
            out['results'].append({'name': t['name'], 'status': 'pass', 'message': ''})
        except AssertionError as e:
            msg = str(e) or 'assertion failed'
            out['results'].append({'name': t['name'], 'status': 'fail', 'message': msg + ' (' + _where(e, sources) + ')'})
        except BaseException as e:
            out['results'].append({'name': t['name'], 'status': 'fail',
                                   'message': type(e).__name__ + ': ' + str(e) + ' (' + _where(e, sources) + ')'})
    return json.dumps(out)
`;

export function normalizePythonResult(json, tests) {
  const r = typeof json === 'string' ? JSON.parse(json) : json;
  if (r.compileError) return { ok: false, phase: 'compile', message: r.compileError, results: notRun(tests), stdout: '' };
  if (r.runtimeError) return { ok: false, phase: 'runtime', message: r.runtimeError, results: notRun(tests), stdout: r.stdout || '' };
  const results = tests.map((t, i) => (r.results[i]
    ? { name: t.name, status: r.results[i].status, message: r.results[i].message }
    : { name: t.name, status: 'notrun', message: '' }));
  const ok = results.length > 0 && results.every((x) => x.status === 'pass');
  return { ok, phase: 'tests', message: '', results, stdout: r.stdout || '' };
}
