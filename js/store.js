import { load, save } from './state.js';

let state = load();
const listeners = new Set();

export const store = {
  get: () => state,
  set(next) {
    if (next === state) return;
    state = next;
    save(state);
    for (const fn of listeners) fn(state);
  },
  update(fn) {
    store.set(fn(state));
    return state;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
