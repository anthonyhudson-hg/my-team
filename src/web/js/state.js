/** Minimal observable store — no reducers/actions ceremony, just get/set/subscribe. */
export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    get() {
      return state;
    },
    set(patch) {
      state = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
      for (const listener of listeners) listener(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
