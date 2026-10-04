import { spawn } from 'node:child_process';

const MAX_OUTPUT = 1_000_000;

// Copies process.env, dropping any inherited key that matches an override
// case-insensitively (Windows may call the variable "Path"), then applies the overrides.
function mergeEnv(env = {}) {
  const merged = { ...process.env };
  const overridden = new Set(Object.keys(env).map((k) => k.toLowerCase()));
  for (const key of Object.keys(merged)) {
    if (overridden.has(key.toLowerCase())) delete merged[key];
  }
  return { ...merged, ...env };
}

// Spawns a process, feeds optional stdin, and resolves (never rejects) with its outcome.
export function runProcess(cmd, args, { cwd, input, timeoutMs = 20000, env } = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    const finish = (res) => { if (!settled) { settled = true; clearTimeout(timer); resolve(res); } };
    let child;
    try {
      child = spawn(cmd, args, { cwd, env: mergeEnv(env), windowsHide: true });
    } catch (error) {
      resolve({ code: null, signal: null, stdout, stderr: String(error), timedOut, error });
      return;
    }
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    child.stdout.setEncoding('utf8').on('data', (d) => {
      stdout += d;
      if (stdout.length > MAX_OUTPUT) { stdout = stdout.slice(0, MAX_OUTPUT); child.kill('SIGKILL'); }
    });
    child.stderr.setEncoding('utf8').on('data', (d) => { if (stderr.length < MAX_OUTPUT) stderr += d; });
    child.on('error', (error) => finish({ code: null, signal: null, stdout, stderr: stderr + String(error), timedOut, error }));
    child.on('close', (code, signal) => finish({ code, signal, stdout, stderr, timedOut }));
    child.stdin.on('error', () => {});
    child.stdin.end(input ?? '');
  });
}
