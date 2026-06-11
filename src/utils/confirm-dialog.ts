import { trapFocus } from './accessibility';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function confirmAction(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const titleId = `confirm-title-${Date.now()}`;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', titleId);

    const confirmClass = options.danger ? 'btn btn--danger-filled' : 'btn btn--filled';
    const confirmLabel = options.confirmLabel ?? (options.danger ? 'Confirmar' : 'Confirmar');
    const cancelLabel = options.cancelLabel ?? 'Cancelar';

    overlay.innerHTML = `
      <section class="modal-card">
        <h3 id="${titleId}">${escapeHtml(options.title)}</h3>
        <p class="modal-message">${escapeHtml(options.message)}</p>
        <div class="btn-row">
          <button type="button" class="btn btn--outline" data-confirm-cancel>
            <span class="icon material-symbols-outlined" aria-hidden="true">close</span>
            ${escapeHtml(cancelLabel)}
          </button>
          <button type="button" class="${confirmClass}" data-confirm-ok>
            <span class="icon material-symbols-outlined" aria-hidden="true">${options.danger ? 'warning' : 'check'}</span>
            ${escapeHtml(confirmLabel)}
          </button>
        </div>
      </section>
    `;

    document.body.appendChild(overlay);
    const card = overlay.querySelector<HTMLElement>('.modal-card');
    const releaseFocus = card ? trapFocus(card) : () => {};

    const close = (result: boolean): void => {
      releaseFocus();
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('[data-confirm-cancel]')?.addEventListener('click', () => close(false));
    overlay.querySelector('[data-confirm-ok]')?.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(false);
    });
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close(false);
    });
  });
}
