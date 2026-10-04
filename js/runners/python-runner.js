import { PY_HARNESS, normalizePythonResult, notRun } from './harness.js';

const RUN_TIMEOUT_MS = 10000;
const LOAD_TIMEOUT_MS = 90000;
let worker = null;
let ready = null;
let seq = 0;

function kill() {
  if (worker) worker.terminate();
  worker = null;
  ready = null;
}

function spawn() {
  const w = new Worker(new URL('./python-worker.js', import.meta.url));
  worker = w;
  ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Python took too long to load')), LOAD_TIMEOUT_MS);
    w.addEventListener('message', (e) => {
      if (e.data?.type === 'ready') { clearTimeout(timer); resolve(); }
      if (e.data?.type === 'load-error') { clearTimeout(timer); reject(new Error(e.data.error)); }
    });
    w.addEventListener('error', (e) => { clearTimeout(timer); reject(new Error(e.message || 'Python worker failed to start')); });
  });
  ready.catch(() => { if (worker === w) kill(); });
}

// Start downloading Pyodide early (e.g. when a Python exercise opens).
export function warmUpPython() {
  if (!worker) spawn();
  return ready.catch(() => {});
}

export async function runPython(code, tests, { onStatus = () => {} } = {}) {
  if (!worker) spawn();
  const w = worker;
  try {
    onStatus('Loading Python in your browser (the first run downloads about 10 MB)…');
    await ready;
  } catch (err) {
    return {
      ok: false, phase: 'network', results: notRun(tests), stdout: '',
      message: `Could not start Python: ${err.message}. Check your internet connection and try again — your code is saved.`,
    };
  }
  onStatus('Running tests…');
  const id = ++seq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      w.removeEventListener('message', onMsg);
      if (worker === w) kill(); // a fresh worker is spawned on the next run
      resolve({
        ok: false, phase: 'timeout', results: notRun(tests), stdout: '',
        message: 'Your code ran longer than 10 seconds and was stopped. Look for an infinite loop or recursion without a base case.',
      });
    }, RUN_TIMEOUT_MS);
    function onMsg(e) {
      if (e.data?.id !== id) return;
      clearTimeout(timer);
      w.removeEventListener('message', onMsg);
      let result;
      try {
        result = e.data.ok
          ? normalizePythonResult(e.data.json, tests)
          : { ok: false, phase: 'runtime', message: e.data.error, results: notRun(tests), stdout: '' };
      } catch (err) {
        result = {
          ok: false, phase: 'runtime',
          message: 'Unexpected result from the Python runner: ' + (err.message || err),
          results: notRun(tests), stdout: '',
        };
      }
      resolve(result);
    }
    w.addEventListener('message', onMsg);
    w.postMessage({ id, harness: PY_HARNESS, payload: JSON.stringify({ code, tests }) });
  });
}
