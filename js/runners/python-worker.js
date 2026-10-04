/* Classic worker: loads Pyodide once, then runs the test harness on request. */
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.29.5/full/';
let pyodide = null;
let harnessLoaded = false;

const boot = (async () => {
  importScripts(PYODIDE_URL + 'pyodide.js');
  pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
})();

boot.then(
  () => self.postMessage({ type: 'ready' }),
  (err) => self.postMessage({ type: 'load-error', error: String((err && err.message) || err) }),
);

self.onmessage = async (e) => {
  const { id, harness, payload } = e.data;
  try {
    await boot;
    if (!harnessLoaded) {
      pyodide.runPython(harness);
      harnessLoaded = true;
    }
    const runAll = pyodide.globals.get('run_all');
    const json = runAll(payload);
    runAll.destroy();
    self.postMessage({ id, ok: true, json });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
