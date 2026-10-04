import {
  makeNonce, buildCppProgram, normalizeCppResult, cppHasMain, mainNotAllowed,
  wandboxToRaw, godboltToRaw, notRun,
} from './harness.js';

export const WANDBOX_URL = 'https://wandbox.org/api/compile.json';
export const GODBOLT_URL = 'https://godbolt.org/api/compiler/g132/compile';
const REQUEST_TIMEOUT_MS = 45000;

async function postJson(fetchImpl, url, body, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`${url} answered HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const viaWandbox = async (source, fetchImpl) => wandboxToRaw(await postJson(fetchImpl, WANDBOX_URL, {
  compiler: 'gcc-13.2.0', code: source, options: 'warning', 'compiler-option-raw': '-std=c++20', save: false,
}));

const viaGodbolt = async (source, fetchImpl) => godboltToRaw(await postJson(fetchImpl, GODBOLT_URL, {
  source,
  options: {
    userArguments: '-std=c++20 -O1 -fdiagnostics-color=never',
    executeParameters: { args: [], stdin: '' },
    compilerOptions: { executorRequest: true },
    filters: { execute: true },
    tools: [],
    libraries: [],
  },
  lang: 'c++',
  allowStoreCodeDebug: false,
}, { Accept: 'application/json' }));

export async function runCpp(code, tests, { onStatus = () => {}, fetchImpl = (...a) => globalThis.fetch(...a) } = {}) {
  if (cppHasMain(code)) return mainNotAllowed(tests);
  const nonce = makeNonce();
  const { program, userStartLine } = buildCppProgram(code, tests, nonce);
  let raw;
  try {
    onStatus('Compiling on Wandbox (GCC 13, C++20)…');
    raw = await viaWandbox(program, fetchImpl);
  } catch {
    try {
      onStatus('Wandbox is unavailable — trying Compiler Explorer…');
      raw = await viaGodbolt(program, fetchImpl);
    } catch {
      return {
        ok: false, phase: 'network', results: notRun(tests), stdout: '',
        message: 'Could not reach an online C++ compiler (Wandbox and Compiler Explorer both failed). Check your internet connection and try again — your code is saved.',
      };
    }
  }
  return normalizeCppResult(raw, tests, nonce, userStartLine, code.split('\n').length);
}
