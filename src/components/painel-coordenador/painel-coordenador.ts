import template from './painel-coordenador.html?raw';
import './painel-coordenador.css';
import { isLoggedIn } from '../../utils/auth';
import { renderLoginGate, renderLogoutBar } from '../../utils/login-gate';
import { refreshSubBanco, renderSubBanco } from './sub-banco';
import { refreshSubDirigente, renderSubDirigente } from './sub-dirigente';
import { refreshSubDoacoes, renderSubDoacoes } from './sub-doacoes';

type CoordSubTab = 'doacoes' | 'banco' | 'dirigente';

type RefreshHandler = () => void;

let refreshHandler: RefreshHandler | null = null;
let activeSubTab: CoordSubTab = 'doacoes';
let doacoesRoot: HTMLElement | null = null;
let bancoRoot: HTMLElement | null = null;
let dirigenteRoot: HTMLElement | null = null;

function setSubTab(root: HTMLElement, tab: CoordSubTab): void {
  activeSubTab = tab;

  root.querySelectorAll<HTMLButtonElement>('.coord-subtab').forEach((btn) => {
    const isActive = btn.dataset.coordSub === tab;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  const panels: Record<CoordSubTab, HTMLElement | null> = {
    doacoes: root.querySelector('#coord-sub-doacoes'),
    banco: root.querySelector('#coord-sub-banco'),
    dirigente: root.querySelector('#coord-sub-dirigente'),
  };

  for (const [key, panel] of Object.entries(panels) as [CoordSubTab, HTMLElement | null][]) {
    if (!panel) continue;
    const isActive = key === tab;
    panel.classList.toggle('is-active', isActive);
    panel.hidden = !isActive;
  }

  if (tab === 'doacoes' && doacoesRoot) refreshSubDoacoes(doacoesRoot);
  if (tab === 'banco' && bancoRoot) refreshSubBanco(bancoRoot);
  if (tab === 'dirigente' && dirigenteRoot) refreshSubDirigente(dirigenteRoot);
}

function mountSubTabs(root: HTMLElement): void {
  if (doacoesRoot) {
    setSubTab(root, activeSubTab);
    return;
  }

  const doacoesHost = root.querySelector<HTMLElement>('#coord-sub-doacoes');
  const bancoHost = root.querySelector<HTMLElement>('#coord-sub-banco');
  const dirHost = root.querySelector<HTMLElement>('#coord-sub-dirigente');
  if (!doacoesHost || !bancoHost || !dirHost) return;

  doacoesRoot = renderSubDoacoes();
  bancoRoot = renderSubBanco();
  dirigenteRoot = renderSubDirigente();

  doacoesHost.appendChild(doacoesRoot);
  bancoHost.appendChild(bancoRoot);
  dirHost.appendChild(dirigenteRoot);

  root.querySelectorAll<HTMLButtonElement>('.coord-subtab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.coordSub as CoordSubTab;
      if (tab) setSubTab(root, tab);
    });
  });

  setSubTab(root, activeSubTab);
}

function mountAuth(root: HTMLElement): void {
  const loginHost = root.querySelector<HTMLElement>('#coord-login-host');
  const panelHost = root.querySelector<HTMLElement>('#coord-panel-host');
  const toolbarHost = root.querySelector<HTMLElement>('#coord-toolbar-host');
  if (!loginHost || !panelHost || !toolbarHost) return;

  const renderAuthState = (): void => {
    const logged = isLoggedIn('coordenador');
    loginHost.replaceChildren();
    toolbarHost.replaceChildren();
    panelHost.hidden = !logged;

    if (!logged) {
      loginHost.appendChild(
        renderLoginGate({
          role: 'coordenador',
          title: 'Acesso do Coordenador',
          description: 'Digite a senha para acessar o painel de doacoes.',
          onSuccess: renderAuthState,
        }),
      );
      return;
    }

    toolbarHost.appendChild(renderLogoutBar('coordenador', renderAuthState));

    if (!doacoesRoot) mountSubTabs(root);
    else {
      if (doacoesRoot) refreshSubDoacoes(doacoesRoot);
      if (bancoRoot) refreshSubBanco(bancoRoot);
      if (dirigenteRoot) refreshSubDirigente(dirigenteRoot);
    }
  };

  renderAuthState();
}

export function refreshPainelCoordenador(): void {
  if (refreshHandler) refreshHandler();
}

export function renderPainelCoordenador(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template.trim();
  const root = wrapper.firstElementChild as HTMLElement;

  mountAuth(root);

  refreshHandler = () => {
    if (!isLoggedIn('coordenador')) return;
    if (doacoesRoot) refreshSubDoacoes(doacoesRoot);
    if (bancoRoot) refreshSubBanco(bancoRoot);
    if (dirigenteRoot) refreshSubDirigente(dirigenteRoot);
  };

  return root;
}
