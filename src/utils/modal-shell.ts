import { trapFocus } from './accessibility';

export interface ModalShellOptions {
  host: HTMLElement;
  title: string;
  bodyHtml: string;
  onMount?: (modal: HTMLElement, close: () => void) => void;
}

export function openModalShell(options: ModalShellOptions): () => void {
  const titleId = `modal-title-${Date.now()}`;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', titleId);

  const modal = document.createElement('section');
  modal.className = 'modal-card';
  modal.innerHTML = `
    <h3 id="${titleId}">${options.title}</h3>
    ${options.bodyHtml}
  `;

  overlay.appendChild(modal);
  options.host.replaceChildren(overlay);

  const close = (): void => {
    releaseFocus();
    options.host.replaceChildren();
  };

  const releaseFocus = trapFocus(modal);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  options.onMount?.(modal, close);

  return close;
}
