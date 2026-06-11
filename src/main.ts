import './styles/variables.css';
import './styles/a11y.css';
import './styles/buttons.css';
import './styles/global.css';
import { mountInitialSetup } from './components/auth-setup/initial-setup';
import { refreshFormDoacao, renderFormDoacao } from './components/form-doacao/form-doacao';
import {
  onHeaderEtapaChange,
  refreshHeader,
  renderHeader,
  setHeaderViewContext,
} from './components/header/header';
import {
  refreshPainelCoordenador,
  renderPainelCoordenador,
} from './components/painel-coordenador/painel-coordenador';
import { fetchAuthSetupStatus, hydrateAllFromApi } from './state/api';
import { setButtonContent } from './utils/icons';
import './components/auth-setup/initial-setup.css';
import { initFirebaseGateway } from './state/firebase';
import { initWebVitals } from './utils/web-vitals';

type ViewKey = 'publico' | 'coordenador';

const PANEL_ID_BY_VIEW: Record<ViewKey, string> = {
  publico: 'panel-publico',
  coordenador: 'panel-coordenador',
};

const VIEW_TAB_ICONS: Record<ViewKey, string> = {
  publico: 'volunteer_activism',
  coordenador: 'admin_panel_settings',
};

function buildViewTab(view: ViewKey, label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'view-tab';
  btn.dataset.view = view;
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-selected', 'false');
  btn.setAttribute('aria-controls', PANEL_ID_BY_VIEW[view]);
  setButtonContent(btn, { icon: VIEW_TAB_ICONS[view], label });
  return btn;
}

function setActiveView(root: HTMLElement, view: ViewKey): void {
  root.querySelectorAll<HTMLElement>('[data-view-panel]').forEach((panel) => {
    const isActive = panel.dataset.viewPanel === view;
    panel.classList.toggle('is-active', isActive);
    panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });

  root.querySelectorAll<HTMLButtonElement>('.view-tab').forEach((btn) => {
    const isActive = btn.dataset.view === view;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  setHeaderViewContext(view);
}

function refreshAllViews(): void {
  refreshHeader();
  refreshFormDoacao();
  refreshPainelCoordenador();
}

function bootMain(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const root = document.createElement('main');
  root.id = 'main-content';
  root.setAttribute('role', 'main');

  const skip = document.createElement('a');
  skip.href = '#main-content';
  skip.className = 'skip-link';
  skip.textContent = 'Pular para o conteúdo principal';

  app.replaceChildren(skip, root);

  root.appendChild(renderHeader());

  const nav = document.createElement('nav');
  nav.className = 'view-nav';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'Areas do sistema');

  const tabPublico = buildViewTab('publico', 'Equipistas');
  const tabCoord = buildViewTab('coordenador', 'Coordenador');
  nav.appendChild(tabPublico);
  nav.appendChild(tabCoord);
  root.appendChild(nav);

  const publicoPanel = document.createElement('section');
  publicoPanel.id = PANEL_ID_BY_VIEW.publico;
  publicoPanel.dataset.viewPanel = 'publico';
  publicoPanel.className = 'view-panel is-active';
  publicoPanel.setAttribute('role', 'tabpanel');
  publicoPanel.setAttribute('aria-hidden', 'false');
  publicoPanel.appendChild(renderFormDoacao());

  const coordPanel = document.createElement('section');
  coordPanel.id = PANEL_ID_BY_VIEW.coordenador;
  coordPanel.dataset.viewPanel = 'coordenador';
  coordPanel.className = 'view-panel';
  coordPanel.setAttribute('role', 'tabpanel');
  coordPanel.setAttribute('aria-hidden', 'true');
  coordPanel.appendChild(renderPainelCoordenador());

  root.appendChild(publicoPanel);
  root.appendChild(coordPanel);

  tabPublico.onclick = () => setActiveView(root, 'publico');
  tabCoord.onclick = () => setActiveView(root, 'coordenador');
  setActiveView(root, 'publico');

  onHeaderEtapaChange(() => {
    void hydrateAllFromApi().then(() => {
      refreshAllViews();
    });
  });

  void initFirebaseGateway();

  refreshAllViews();

  void hydrateAllFromApi().then(() => {
    refreshAllViews();
  });
}

async function boot(): Promise<void> {
  initWebVitals();

  const app = document.getElementById('app');
  if (!app) return;

  const status = await fetchAuthSetupStatus();
  if (status && !status.initialSetupComplete) {
    mountInitialSetup(app, status, () => bootMain());
    return;
  }

  bootMain();
}

boot();
