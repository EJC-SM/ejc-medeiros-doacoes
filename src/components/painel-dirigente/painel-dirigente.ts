import { confirmAction } from '../../utils/confirm-dialog';
import { setButtonContent } from '../../utils/icons';
import { toastError, toastSuccess, toastWarning } from '../../utils/toast';
import template from './painel-dirigente.html?raw';
import './painel-dirigente.css';
import { lockEtapaApi, resetDoacoesApi, resetItensApi, updateConfigApi } from '../../state/api';
import { isFirebaseReady, syncConfigValue } from '../../state/firebase';
import {
  applyAppConfig,
  getEquipes,
  getEtapaAtual,
  getEtapaLocked,
  getLogo,
  getNomeEvento,
  getPixChave,
  getPixQr,
  getVersiculo,
  getVersiculoRef,
  setEquipes,
  setEtapaLocked,
  setLogo,
  setPixChave,
  setPixQr,
} from '../../state/store';
import type { Etapa } from '../../state/types';
import {
  getEmbeddedDirigenteAuthHeaders,
  isEmbeddedDirigenteLogged,
  loginEmbeddedDirigente,
  logoutEmbeddedDirigente,
} from '../../utils/auth';
import { renderLoginGate, renderLogoutBar } from '../../utils/login-gate';
import { sanitizeText } from '../../utils/security';
import { validateNome } from '../../utils/validation';
import { refreshFormDoacao } from '../form-doacao/form-doacao';
import { refreshHeader } from '../header/header';
import { refreshPainelCoordenador } from '../painel-coordenador/painel-coordenador';
import { mountSecSenhas } from './sections/sec-senhas';

export interface DirigentePanelOptions {
  embedded?: boolean;
}

let pixPreview = '';
let logoPreview = '';

function updateSalvarLogoState(root: HTMLElement): void {
  const btn = root.querySelector<HTMLButtonElement>('#dir-salvar-logo');
  if (btn) btn.disabled = !logoPreview;
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
    reader.readAsDataURL(file);
  });
}

function readImageInput(input: HTMLInputElement): Promise<string> {
  const file = input.files?.[0];
  if (!file) return Promise.reject(new Error('Nenhum arquivo selecionado.'));
  return readImageFile(file);
}

async function syncConfigLocal(
  root: HTMLElement,
  payload: Parameters<typeof updateConfigApi>[0],
  firebasePath?: string,
  firebaseValue?: unknown,
): Promise<boolean> {
  const auth = getEmbeddedDirigenteAuthHeaders();
  const synced = await updateConfigApi(payload, auth);
  if (!synced && firebasePath && isFirebaseReady()) {
    await syncConfigValue(firebasePath, firebaseValue);
  }

  if (payload.nome_evento != null || payload.versiculo != null || payload.versiculo_ref != null) {
    applyAppConfig({
      nomeEvento: payload.nome_evento,
      versiculo: payload.versiculo,
      versiculoRef: payload.versiculo_ref,
    });
  }
  if (payload.pix_chave != null) setPixChave(payload.pix_chave);
  if (payload.pix_qr != null) setPixQr(payload.pix_qr);
  if (payload.logo != null) setLogo(payload.logo);
  if (payload.etapa_locked != null) applyAppConfig({ etapaLocked: payload.etapa_locked });

  refreshFormDoacao();
  refreshHeader();
  refreshPainelCoordenador();
  renderLockButtons(root);
  return synced;
}

function renderEquipesForEtapa(root: HTMLElement, etapa: Etapa): void {
  const lista = root.querySelector<HTMLElement>(`#dir-equipes-${etapa}`);
  if (!lista) return;
  const equipes = getEquipes(etapa);
  lista.replaceChildren();

  if (!equipes.length) {
    const p = document.createElement('p');
    p.textContent = 'Nenhuma equipe cadastrada.';
    lista.appendChild(p);
    return;
  }

  equipes.forEach((eq, idx) => {
    const row = document.createElement('div');
    row.className = 'dir-item';
    const label = document.createElement('span');
    label.textContent = eq;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn--danger-outline btn--sm';
    removeBtn.setAttribute('data-equipe-remove', String(etapa));
    removeBtn.setAttribute('data-equipe-idx', String(idx));
    setButtonContent(removeBtn, { icon: 'delete', label: 'Remover' });
    row.appendChild(label);
    row.appendChild(removeBtn);
    lista.appendChild(row);
  });
}

function renderBrandingFields(root: HTMLElement): void {
  const nome = root.querySelector<HTMLInputElement>('#dir-nome-evento');
  const versiculo = root.querySelector<HTMLTextAreaElement>('#dir-versiculo');
  const ref = root.querySelector<HTMLInputElement>('#dir-versiculo-ref');
  const pix = root.querySelector<HTMLInputElement>('#dir-pix-chave');
  const pixPreviewEl = root.querySelector<HTMLImageElement>('#dir-pix-preview');
  const pixDropLabel = root.querySelector<HTMLElement>('#dir-pix-drop-label');
  const logoPreviewEl = root.querySelector<HTMLImageElement>('#dir-logo-preview');
  const logoDropLabel = root.querySelector<HTMLElement>('#dir-logo-drop-label');

  if (nome) nome.value = getNomeEvento();
  if (versiculo) versiculo.value = getVersiculo();
  if (ref) ref.value = getVersiculoRef();
  if (pix) pix.value = getPixChave();

  const qr = getPixQr();
  if (pixPreviewEl && pixDropLabel) {
    if (qr) {
      pixPreviewEl.src = qr;
      pixPreviewEl.hidden = false;
      pixDropLabel.hidden = true;
    } else {
      pixPreviewEl.hidden = true;
      pixDropLabel.hidden = false;
    }
  }

  const logo = getLogo();
  if (logoPreviewEl && logoDropLabel) {
    if (logo) {
      logoPreviewEl.src = logo;
      logoPreviewEl.hidden = false;
      logoDropLabel.hidden = true;
    } else {
      logoPreviewEl.hidden = true;
      logoDropLabel.hidden = false;
    }
  }
}

function renderLockButtons(root: HTMLElement): void {
  const locked = getEtapaLocked();
  const b1 = root.querySelector<HTMLButtonElement>('#dir-trava-1');
  const b2 = root.querySelector<HTMLButtonElement>('#dir-trava-2');
  if (b1) {
    setButtonContent(b1, {
      icon: locked === 1 ? 'lock' : 'lock',
      label: locked === 1 ? '1a Etapa (travada)' : 'Travar 1a Etapa',
      iconVariant: locked === 1 ? 'filled' : 'outlined',
    });
    b1.classList.toggle('btn--filled', locked === 1);
    b1.classList.toggle('btn--outline', locked !== 1);
  }
  if (b2) {
    setButtonContent(b2, {
      icon: 'lock',
      label: locked === 2 ? '2a Etapa (travada)' : 'Travar 2a Etapa',
      iconVariant: locked === 2 ? 'filled' : 'outlined',
    });
    b2.classList.toggle('btn--filled', locked === 2);
    b2.classList.toggle('btn--outline', locked !== 2);
  }
}

function bindDropzone(
  root: HTMLElement,
  zoneId: string,
  fileId: string,
  onImage: (dataUrl: string, preview: HTMLImageElement, label: HTMLElement) => void,
): void {
  const zone = root.querySelector<HTMLElement>(zoneId);
  const file = root.querySelector<HTMLInputElement>(fileId);
  if (!zone || !file) return;

  const activate = (): void => file.click();

  zone.addEventListener('click', activate);
  zone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  });
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    zone.classList.add('is-dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('is-dragover');
    const dropped = event.dataTransfer?.files?.[0];
    if (!dropped) return;
    void readImageFile(dropped).then((dataUrl) => {
      const preview = root.querySelector<HTMLImageElement>(
        fileId === '#dir-logo-file' ? '#dir-logo-preview' : '#dir-pix-preview',
      );
      const label = root.querySelector<HTMLElement>(
        fileId === '#dir-logo-file' ? '#dir-logo-drop-label' : '#dir-pix-drop-label',
      );
      if (preview && label) onImage(dataUrl, preview, label);
      if (fileId === '#dir-logo-file') updateSalvarLogoState(root);
    });
  });

  file.addEventListener('change', async () => {
    try {
      const dataUrl = await readImageInput(file);
      const preview = root.querySelector<HTMLImageElement>(
        fileId === '#dir-logo-file' ? '#dir-logo-preview' : '#dir-pix-preview',
      );
      const label = root.querySelector<HTMLElement>(
        fileId === '#dir-logo-file' ? '#dir-logo-drop-label' : '#dir-pix-drop-label',
      );
      if (preview && label) onImage(dataUrl, preview, label);
      if (fileId === '#dir-logo-file') updateSalvarLogoState(root);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao ler imagem.');
    }
  });
}

function bindEquipeForm(root: HTMLElement, etapa: Etapa): void {
  const form = root.querySelector<HTMLFormElement>(`#dir-equipe-form-${etapa}`);
  const nomeInput = root.querySelector<HTMLInputElement>(`#dir-equipe-nome-${etapa}`);
  if (!form || !nomeInput) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = sanitizeText(nomeInput.value);
    const nv = validateNome(nome);
    if (!nv.valid) {
      toastError(nv.message || 'Equipe invalida.');
      return;
    }

    const equipes = getEquipes(etapa);
    if (equipes.some((eq) => eq.toLowerCase() === nome.toLowerCase())) {
      toastWarning('Equipe ja existe.');
      return;
    }

    equipes.push(nome);
    setEquipes(etapa, equipes);
    await syncConfigLocal(root, { etapa, equipes }, `config/equipes${etapa}`, equipes);
    form.reset();
    renderEquipesForEtapa(root, etapa);
    toastSuccess('Equipe adicionada.');
  });
}

function bindRemoveActions(root: HTMLElement): void {
  root.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const etapaRaw = target.getAttribute('data-equipe-remove');
    const idxRaw = target.getAttribute('data-equipe-idx');
    if (etapaRaw === null || idxRaw === null) return;

    const etapa = Number(etapaRaw) as Etapa;
    const idx = Number(idxRaw);
    const equipes = getEquipes(etapa);
    if (!Number.isInteger(idx) || idx < 0 || idx >= equipes.length) return;

    equipes.splice(idx, 1);
    setEquipes(etapa, equipes);
    await syncConfigLocal(root, { etapa, equipes }, `config/equipes${etapa}`, equipes);
    renderEquipesForEtapa(root, etapa);
    toastSuccess('Equipe removida.');
  });
}

function bindBranding(root: HTMLElement): void {
  root.querySelector('#dir-salvar-branding')?.addEventListener('click', async () => {
    const nome = sanitizeText((root.querySelector('#dir-nome-evento') as HTMLInputElement).value);
    const versiculo = sanitizeText((root.querySelector('#dir-versiculo') as HTMLTextAreaElement).value);
    const versiculoRef = sanitizeText((root.querySelector('#dir-versiculo-ref') as HTMLInputElement).value);
    await syncConfigLocal(
      root,
      { etapa: getEtapaAtual(), nome_evento: nome, versiculo, versiculo_ref: versiculoRef },
      'config',
      { nome_evento: nome, versiculo, versiculo_ref: versiculoRef },
    );
    toastSuccess('Branding salvo.');
  });
}

function bindPix(root: HTMLElement): void {
  bindDropzone(root, '#dir-pix-dropzone', '#dir-pix-file', (dataUrl, preview, label) => {
    pixPreview = dataUrl;
    preview.src = dataUrl;
    preview.hidden = false;
    label.hidden = true;
  });

  root.querySelector('#dir-salvar-pix')?.addEventListener('click', async () => {
    const btn = root.querySelector<HTMLButtonElement>('#dir-salvar-pix');
    if (btn) btn.disabled = true;
    const chave = sanitizeText((root.querySelector('#dir-pix-chave') as HTMLInputElement).value);
    await syncConfigLocal(
      root,
      { etapa: getEtapaAtual(), pix_chave: chave, pix_qr: pixPreview || getPixQr() },
      'config',
      { pix_chave: chave, pix_qr: pixPreview || getPixQr() },
    );
    pixPreview = '';
    if (btn) btn.disabled = false;
    toastSuccess('Pix salvo.');
  });
}

function bindLogo(root: HTMLElement): void {
  bindDropzone(root, '#dir-logo-dropzone', '#dir-logo-file', (dataUrl, preview, label) => {
    logoPreview = dataUrl;
    preview.src = dataUrl;
    preview.hidden = false;
    label.hidden = true;
  });

  root.querySelector('#dir-salvar-logo')?.addEventListener('click', async () => {
    const btn = root.querySelector<HTMLButtonElement>('#dir-salvar-logo');
    if (btn) btn.disabled = true;
    const logo = logoPreview || getLogo();
    setLogo(logo);
    await syncConfigLocal(root, { etapa: getEtapaAtual(), logo }, 'config/logo', logo);
    logoPreview = '';
    updateSalvarLogoState(root);
    toastSuccess('Logo salvo.');
  });

  root.querySelector('#dir-restaurar-logo')?.addEventListener('click', async () => {
    setLogo('');
    await syncConfigLocal(root, { etapa: getEtapaAtual(), logo: '' }, 'config/logo', '');
    logoPreview = '';
    renderBrandingFields(root);
    updateSalvarLogoState(root);
    toastSuccess('Logo restaurado.');
  });
}

function bindLockActions(root: HTMLElement): void {
  const toggle = async (etapa: 0 | Etapa, btn?: HTMLButtonElement): Promise<void> => {
    if (btn) btn.disabled = true;
    const locked = getEtapaLocked();
    const next = locked === etapa && etapa !== 0 ? 0 : etapa;
    const ok = await lockEtapaApi(next, getEmbeddedDirigenteAuthHeaders());
    if (!ok && isFirebaseReady()) {
      await syncConfigValue('config/etapa_locked', next);
      setEtapaLocked(next);
    }
    renderLockButtons(root);
    refreshHeader();
    refreshFormDoacao();
    refreshPainelCoordenador();
    toastSuccess(next === 0 ? 'Etapas destravadas.' : `Etapa ${next} travada.`);
    if (btn) btn.disabled = false;
  };

  root.querySelector('#dir-trava-1')?.addEventListener('click', (e) => {
    void toggle(1, (e.currentTarget as HTMLButtonElement) ?? undefined);
  });
  root.querySelector('#dir-trava-2')?.addEventListener('click', (e) => {
    void toggle(2, (e.currentTarget as HTMLButtonElement) ?? undefined);
  });
  root.querySelector('#dir-destravar')?.addEventListener('click', (e) => {
    void toggle(0, (e.currentTarget as HTMLButtonElement) ?? undefined);
  });
}

function bindDangerZone(root: HTMLElement): void {
  root.querySelector('#dir-reset-doacoes')?.addEventListener('click', async () => {
    const etapa = getEtapaAtual();
    const ok = await confirmAction({
      title: 'Resetar doacoes',
      message: `Apagar TODAS as doacoes da ${etapa}a Etapa? Esta acao e irreversivel.`,
      confirmLabel: 'Resetar',
      danger: true,
    });
    if (!ok) return;
    const btn = root.querySelector<HTMLButtonElement>('#dir-reset-doacoes');
    if (btn) btn.disabled = true;
    const success = await resetDoacoesApi(etapa, getEmbeddedDirigenteAuthHeaders());
    if (success) {
      refreshPainelCoordenador();
      refreshFormDoacao();
      toastSuccess('Doacoes resetadas.');
    } else {
      toastError('Falha ao resetar doacoes.');
    }
    if (btn) btn.disabled = false;
  });

  root.querySelector('#dir-reset-itens')?.addEventListener('click', async () => {
    const ok = await confirmAction({
      title: 'Restaurar itens',
      message: 'Restaurar itens padrao? Isso substitui os itens personalizados.',
      confirmLabel: 'Restaurar',
      danger: true,
    });
    if (!ok) return;
    const btn = root.querySelector<HTMLButtonElement>('#dir-reset-itens');
    if (btn) btn.disabled = true;
    const success = await resetItensApi(getEtapaAtual(), getEmbeddedDirigenteAuthHeaders());
    if (success) {
      refreshFormDoacao();
      refreshPainelCoordenador();
      toastSuccess('Itens restaurados.');
    } else {
      toastError('Falha ao restaurar itens.');
    }
    if (btn) btn.disabled = false;
  });
}

function mountPanel(root: HTMLElement): void {
  renderEquipesForEtapa(root, 1);
  renderEquipesForEtapa(root, 2);
  renderBrandingFields(root);
  renderLockButtons(root);
  bindEquipeForm(root, 1);
  bindEquipeForm(root, 2);
  bindRemoveActions(root);
  bindBranding(root);
  bindPix(root);
  bindLogo(root);
  bindLockActions(root);
  bindDangerZone(root);
  updateSalvarLogoState(root);
  const senhasHost = root.querySelector<HTMLElement>('#dir-senhas-host');
  if (senhasHost) void mountSecSenhas(senhasHost);
}

function refreshPanel(root: HTMLElement): void {
  renderEquipesForEtapa(root, 1);
  renderEquipesForEtapa(root, 2);
  renderBrandingFields(root);
  renderLockButtons(root);
}

function mountAuth(root: HTMLElement): void {
  const loginHost = root.querySelector<HTMLElement>('#dir-login-host');
  const panelHost = root.querySelector<HTMLElement>('#dir-panel-host');
  const toolbarHost = root.querySelector<HTMLElement>('#dir-toolbar-host');
  if (!loginHost || !panelHost || !toolbarHost) return;

  const renderAuthState = (): void => {
    const logged = isEmbeddedDirigenteLogged();
    loginHost.replaceChildren();
    toolbarHost.replaceChildren();
    panelHost.hidden = !logged;

    if (!logged) {
      loginHost.appendChild(
        renderLoginGate({
          role: 'dirigente',
          title: 'Painel do Dirigente',
          description: 'Digite a senha do Dirigente para acessar configuracoes administrativas.',
          loginFn: async (password) => {
            const ok = await loginEmbeddedDirigente(password);
            return ok ? { ok: true } : { ok: false, message: 'Credenciais invalidas.' };
          },
          onSuccess: () => {
            renderAuthState();
          },
        }),
      );
      return;
    }

    toolbarHost.appendChild(
      renderLogoutBar('dirigente', () => {
        logoutEmbeddedDirigente();
        renderAuthState();
      }),
    );
    mountPanel(root);
  };

  renderAuthState();
}

export function mountDirigentePanel(container: HTMLElement, _options?: DirigentePanelOptions): void {
  container.replaceChildren();
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template.trim();
  const root = wrapper.firstElementChild as HTMLElement;
  if (!root) return;

  container.appendChild(root);
  mountAuth(root);

  root.addEventListener('dirigente-refresh', () => {
    if (!isEmbeddedDirigenteLogged()) return;
    refreshPanel(root);
  });
}

/** @deprecated Tab global removida — use mountDirigentePanel embarcado no coordenador */
export function refreshPainelDirigente(): void {}

/** @deprecated Tab global removida — use mountDirigentePanel embarcado no coordenador */
export function renderPainelDirigente(): HTMLElement {
  const el = document.createElement('div');
  mountDirigentePanel(el, { embedded: true });
  return el;
}
