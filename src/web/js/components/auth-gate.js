import { el } from '../dom.js';

/**
 * No equivalent in the source design (it assumes a working backend is
 * already logged in) — this reuses the splash's visual language for the
 * real "Claude Code isn't installed/logged in yet" states.
 */
export function createAuthGate({ onCheckAgain }) {
  const body = el('div', {});
  const root = el('div', { class: 'splash-overlay', style: 'position:absolute;' }, [
    el('div', { class: 'splash-mark' }, [el('div', { class: 'splash-logo', text: 'C' }), el('div', { class: 'splash-name', text: 'Cofound' })]),
    el('div', { class: 'card', style: 'margin-top:28px;padding:22px 26px;max-width:420px;text-align:left;' }, [
      el('h2', { style: 'margin:0 0 12px;font-size:17px;font-weight:800;color:var(--text);', text: 'Set up Claude Code' }),
      body,
      el('button', { class: 'btn', type: 'button', style: 'margin-top:16px;', onclick: onCheckAgain, text: 'Check again' }),
    ]),
  ]);
  root.hidden = true;

  return {
    el: root,
    showCliMissing() {
      body.replaceChildren(
        el('p', { style: 'font-size:13.5px;color:var(--muted);margin:0 0 8px;', text: "The Claude Code CLI binary couldn't be found or run." }),
        el('p', { style: 'font-size:13.5px;color:var(--muted);margin:0 0 8px;', text: 'Try installing it globally, then check again:' }),
        el('pre', { style: 'background:var(--content-bg-2);padding:10px 12px;border-radius:8px;font-family:var(--font-mono);font-size:12.5px;overflow-x:auto;', text: 'npm install -g @anthropic-ai/claude-code' }),
      );
      root.hidden = false;
    },
    showNotAuthenticated() {
      body.replaceChildren(
        el('p', { style: 'font-size:13.5px;color:var(--muted);margin:0 0 8px;', text: "Claude Code isn't logged in yet. In a terminal, run:" }),
        el('pre', { style: 'background:var(--content-bg-2);padding:10px 12px;border-radius:8px;font-family:var(--font-mono);font-size:12.5px;overflow-x:auto;', text: 'claude login' }),
        el('p', { style: 'font-size:13.5px;color:var(--muted);margin:8px 0 0;', text: 'Then come back here.' }),
      );
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
  };
}
