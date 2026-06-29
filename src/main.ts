import './styles/variables.css';
import './styles/a11y.css';
import './styles/buttons.css';
import './styles/modal.css';
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
import './components/auth-setup/initial-setup.css';
import { initFirebaseGateway } from './state/firebase';
import { initWebVitals } from './utils/web-vitals';

type ViewKey = 'publico' | 'coordenador';

let activeView: ViewKey = 'publico';

function resolveView(): ViewKey | null {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/admin') return 'coordenador';
  if (path === '/') return 'publico';
  return null;
}

function refreshActiveView(): void {
  refreshHeader();
  if (activeView === 'coordenador') {
    refreshPainelCoordenador();
  } else {
    refreshFormDoacao();
  }
}

function bootMain(view: ViewKey): void {
  const app = document.getElementById('app');
  if (!app) return;

  activeView = view;

  const root = document.createElement('main');
  root.id = 'main-content';
  root.setAttribute('role', 'main');

  const skip = document.createElement('a');
  skip.href = '#main-content';
  skip.className = 'skip-link';
  skip.textContent = 'Pular para o conteúdo principal';

  app.replaceChildren(skip, root);

  root.appendChild(renderHeader());

  const panel = document.createElement('section');
  panel.dataset.viewPanel = view;
  panel.className = 'view-panel is-active';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-hidden', 'false');

  if (view === 'coordenador') {
    panel.id = 'panel-coordenador';
    panel.appendChild(renderPainelCoordenador());
  } else {
    panel.id = 'panel-publico';
    panel.appendChild(renderFormDoacao());
  }

  root.appendChild(panel);

  setHeaderViewContext(view);

  onHeaderEtapaChange(() => {
    void hydrateAllFromApi().then(() => {
      refreshActiveView();
    });
  });

  void initFirebaseGateway();

  refreshActiveView();

  void hydrateAllFromApi().then(() => {
    refreshActiveView();
  });
}

async function boot(): Promise<void> {
  initWebVitals();

  const view = resolveView();
  if (view === null) {
    window.location.replace('/');
    return;
  }

  const app = document.getElementById('app');
  if (!app) return;

  const status = await fetchAuthSetupStatus();
  if (status && !status.initialSetupComplete) {
    mountInitialSetup(app, status, () => bootMain(view));
    return;
  }

  bootMain(view);
}

boot();
