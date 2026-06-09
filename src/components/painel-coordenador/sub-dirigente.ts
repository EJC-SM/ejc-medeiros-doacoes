import { mountDirigentePanel } from '../painel-dirigente/painel-dirigente';

export function renderSubDirigente(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'coord-sub-dirigente-root';
  mountDirigentePanel(root, { embedded: true });
  return root;
}

export function refreshSubDirigente(root: HTMLElement): void {
  const refresh = root.querySelector<HTMLElement>('[data-dir-refresh]');
  refresh?.dispatchEvent(new CustomEvent('dirigente-refresh'));
}
