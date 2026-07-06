import { api } from '../api.js';
import { el, icon } from '../dom.js';

/** No equivalent in the source design — this is a real, previously-shipped feature (npm registry update check) adapted into the new shell as a slim top banner. */
export function createUpdateBanner() {
  const text = el('span', {});
  const updateButton = el('button', { class: 'btn btn-secondary', type: 'button', text: 'Update' });
  const root = el('div', { id: 'update-banner', hidden: true }, [
    text,
    el('div', { class: 'update-banner-actions', style: 'display:flex;align-items:center;gap:10px;' }, [
      updateButton,
      el('button', { class: 'icon-btn icon-btn-md', type: 'button', 'aria-label': 'Dismiss', onclick: () => (root.hidden = true) }, [icon('x', 'font-size:14px;')]),
    ]),
  ]);

  updateButton.addEventListener('click', async () => {
    updateButton.disabled = true;
    updateButton.textContent = 'Updating…';
    const { body } = await api.update();
    if (body.ok) {
      text.textContent = 'Updated — restart (stop and run "npm run team" again) to use the new version.';
      updateButton.hidden = true;
    } else {
      updateButton.disabled = false;
      updateButton.textContent = 'Update';
      text.textContent = 'Update failed — check the terminal for details.';
    }
  });

  async function checkForUpdate(retriesLeft = 1) {
    const { body } = await api.meta();
    if (body.updateInfo?.updateAvailable) {
      text.textContent = `A new version of my-team is available (v${body.updateInfo.latestVersion}).`;
      root.hidden = false;
    } else if (!body.updateInfo && retriesLeft > 0) {
      // The registry check runs in the background at server startup and may not have resolved yet.
      setTimeout(() => checkForUpdate(retriesLeft - 1), 3000);
    }
  }

  return { el: root, checkForUpdate };
}
