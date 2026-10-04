import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path, { join } from 'node:path';
import { runProcess } from './proc.mjs';
import {
  makeNonce, buildCppProgram, normalizeCppResult, cppHasMain, mainNotAllowed,
  PY_HARNESS, normalizePythonResult, notRun,
} from '../../js/runners/harness.js';

export const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
export const CXX = process.env.CXX || 'g++';
const EXE = process.platform === 'win32' ? 'main.exe' : 'main';
const PY_ENV = { PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' };

// On Windows the compiler's own directory must come first on PATH, otherwise ld/the produced
// exe can load incompatible DLLs from other toolchains (e.g. Git's mingw64) ahead of its own.
function resolveCxxDir() {
  if (process.platform !== 'win32') return null;
  try {
    const r = spawnSync('where', [CXX], { encoding: 'utf8' });
    const first = (r.stdout || '').split(/\r?\n/).find((l) => l.trim());
    return first ? path.dirname(first.trim()) : null;
  } catch {
    return null;
  }
}
const CXX_DIR = resolveCxxDir();
const CXX_ENV = CXX_DIR ? { PATH: CXX_DIR + path.delimiter + (process.env.PATH ?? process.env.Path ?? '') } : {};

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'oopm-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
  }
}

async function compileAndRun(dir, source, timeoutMs) {
  await writeFile(join(dir, 'main.cpp'), source);
  const c = await runProcess(CXX, ['-std=c++20', '-Wall', '-O1', '-fdiagnostics-color=never', 'main.cpp', '-o', EXE],
    { cwd: dir, timeoutMs: 120000, env: CXX_ENV });
  if (c.code !== 0) {
    return { compiled: false, compilerOutput: c.stderr || c.stdout, stdout: '', stderr: '', exitCode: c.code, signal: '', timedOut: false };
  }
  const r = await runProcess(join(dir, EXE), [], { cwd: dir, timeoutMs, env: CXX_ENV });
  const abnormal = r.code !== null && (r.code < 0 || r.code > 255);
  return {
    compiled: true, compilerOutput: c.stderr, stdout: r.stdout, stderr: r.stderr, exitCode: r.code,
    signal: r.signal || (abnormal ? `exit status ${r.code}` : ''), timedOut: r.timedOut,
  };
}

export async function runCppLocal(code, tests, { timeoutMs = 10000 } = {}) {
  if (cppHasMain(code)) return mainNotAllowed(tests);
  const nonce = makeNonce();
  const { program, userStartLine } = buildCppProgram(code, tests, nonce);
  const raw = await withTempDir((dir) => compileAndRun(dir, program, timeoutMs));
  return normalizeCppResult(raw, tests, nonce, userStartLine, code.split('\n').length);
}

export async function runPythonLocal(code, tests, { timeoutMs = 10000 } = {}) {
  return withTempDir(async (dir) => {
    await writeFile(join(dir, 'harness.py'), `${PY_HARNESS}\nimport sys\nsys.stdout.write(run_all(sys.stdin.read()))\n`);
    const r = await runProcess(PYTHON, ['harness.py'], { cwd: dir, input: JSON.stringify({ code, tests }), timeoutMs, env: PY_ENV });
    if (r.timedOut) {
      return { ok: false, phase: 'timeout', message: 'Your code ran longer than the time limit and was stopped. Look for an infinite loop.', results: notRun(tests), stdout: '' };
    }
    try {
      return normalizePythonResult(r.stdout, tests);
    } catch {
      return { ok: false, phase: 'runtime', message: (r.stderr || r.stdout || 'Python harness failed').trim(), results: notRun(tests), stdout: '' };
    }
  });
}

// Runs a complete program, e.g. the code of a "predict the output" MCQ.
export async function runProgramLocal(lang, code, { timeoutMs = 10000 } = {}) {
  return withTempDir(async (dir) => {
    if (lang === 'python') {
      await writeFile(join(dir, 'main.py'), code);
      const r = await runProcess(PYTHON, ['main.py'], { cwd: dir, timeoutMs, env: PY_ENV });
      return { ok: r.code === 0 && !r.timedOut, stdout: r.stdout.replace(/\r\n/g, '\n'), stderr: r.stderr };
    }
    const raw = await compileAndRun(dir, code, timeoutMs);
    return {
      ok: raw.compiled && raw.exitCode === 0 && !raw.timedOut,
      stdout: raw.stdout.replace(/\r\n/g, '\n'),
      stderr: raw.compiled ? raw.stderr : raw.compilerOutput,
    };
  });
}
