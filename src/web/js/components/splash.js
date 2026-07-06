import { el } from '../dom.js';

const MIN_VISIBLE_MS = 500;

/**
 * Unlike the source design (a fixed ~2s timer, since its mockup has no real
 * backend to wait for), this splash stays up until the real initial load
 * (status/profile/history/meta) actually resolves — with a minimum visible
 * time so it doesn't flash instantly on a fast machine.
 */
export function createSplash() {
  const shownAt = Date.now();
  const overlay = el('div', { class: 'splash-overlay' }, [
    el('div', { class: 'splash-mark' }, [
      el('div', { class: 'splash-logo', text: 'C' }),
      el('div', { class: 'splash-name', text: 'Cofound' }),
      el('div', { class: 'splash-tagline', text: 'Your AI-native workspace' }),
    ]),
    el('div', { class: 'splash-loading' }, [el('div', { class: 'splash-spinner' }), el('span', { class: 'splash-loading-text', text: 'Loading your workspace…' })]),
  ]);

  return {
    el: overlay,
    hide() {
      const elapsed = Date.now() - shownAt;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      setTimeout(() => {
        overlay.classList.add('hiding');
        setTimeout(() => overlay.remove(), 600);
      }, wait);
    },
  };
}
