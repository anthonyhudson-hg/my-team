import { describe, expect, it, vi } from 'vitest';
import { createStore } from './state.js';

describe('createStore', () => {
  it('returns the initial state from get()', () => {
    const store = createStore({ count: 0 });
    expect(store.get()).toEqual({ count: 0 });
  });

  it('merges a partial object patch into the existing state', () => {
    const store = createStore({ count: 0, name: 'a' });
    store.set({ count: 1 });
    expect(store.get()).toEqual({ count: 1, name: 'a' });
  });

  it('supports a function patch computed from the previous state', () => {
    const store = createStore({ count: 1 });
    store.set((prev) => ({ count: prev.count + 1 }));
    expect(store.get()).toEqual({ count: 2 });
  });

  it('notifies subscribers with the new state on every set()', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ count: 5 });
    expect(listener).toHaveBeenCalledWith({ count: 5 });
  });

  it('stops notifying a listener once unsubscribed', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.set({ count: 1 });
    expect(listener).not.toHaveBeenCalled();
  });
});
