import template from './painel-dirigente.html?raw';
import './painel-dirigente.css';
import {
  changePasswordApi,
  lockEtapaApi,
  resetDoacoesApi,
  resetItensApi,
  updateConfigApi,
} from '../../state/api';
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
import type { AuthRole, Etapa } from '../../state/types';
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

export interface DirigentePanelOptions {
  embedded?: boolean;
}

let pixPreview = '';
let logoPreview = '';

function setFeedback(root: HTMLElement, message: string, ok: boolean): void {
  const el = root.querySelector<HTMLElement>('#dir-feedback');
  if (!el) return;
  el.textContent = message;
  el.className = ok ? 'dir-ok' : 'dir-err';
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
    removeBtn.setAttribute('data-equipe-remove', String(etapa));
    removeBtn.setAttribute('data-equipe-idx', String(idx));
    removeBtn.textContent = 'Remover';
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
  if (b1) b1.textContent = locked === 1 ? '1a Etapa (travada)' : 'Travar 1a Etapa';
  if (b2) b2.textContent = locked === 2 ? '2a Etapa (travada)' : 'Travar 2a Etapa';
}

function openPasswordModal(root: HTMLElement, role: AuthRole): void {
  const host = root.querySelector<HTMLElement>('#dir-modal-host');
  if (!host) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const modal = document.createElement('section');
  modal.className = 'modal-card';
  modal.innerHTML = `
    <h3>Trocar senha ${role === 'coordenador' ? 'do Coordenador' : 'do Dirigente'}</h3>
    <label for="dir-pass-current">Senha atual do Dirigente</label>
    <input id="dir-pass-current" type="password" maxlength="80" />
    <label for="dir-pass-new">Nova senha</label>
    <input id="dir-pass-new" type="password" maxlength="80" />
    <label for="dir-pass-confirm">Confirmar nova senha</label>
    <input id="dir-pass-confirm" type="password" maxlength="80" />
    <p id="dir-pass-error" class="dir-err" hidden></p>
    <div class="dir-actions">
      <button type="button" id="dir-pass-save">Salvar</button>
      <button type="button" id="dir-pass-cancel">Cancelar</button>
    </div>
  `;

  overlay.appendChild(modal);
  host.replaceChildren(overlay);

  const close = (): void => host.replaceChildren();

  modal.querySelector('#dir-pass-cancel')?.addEventListener('click', close);
  modal.querySelector('#dir-pass-save')?.addEventListener('click', async () => {
    const current = (modal.querySelector('#dir-pass-current') as HTMLInputElement).value;
    const next = (modal.querySelector('#dir-pass-new') as HTMLInputElement).value;
    const confirm = (modal.querySelector('#dir-pass-confirm') as HTMLInputElement).value;
    const error = modal.querySelector<HTMLElement>('#dir-pass-error');
    if (!error) return;

    if (next.length < 4) {
      error.textContent = 'A nova senha deve ter ao menos 4 caracteres.';
      error.hidden = false;
      return;
    }
    if (next !== confirm) {
      error.textContent = 'As senhas nao conferem.';
      error.hidden = false;
      return;
    }

    const ok = await changePasswordApi(role, current, next, getEmbeddedDirigenteAuthHeaders());
    if (!ok) {
      error.textContent = 'Nao foi possivel alterar a senha.';
      error.hidden = false;
      return;
    }
    close();
    setFeedback(root, 'Senha atualizada.', true);
  });
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
    } catch (err) {
      setFeedback(root, err instanceof Error ? err.message : 'Erro ao ler imagem.', false);
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
      setFeedback(root, nv.message || 'Equipe invalida.', false);
      return;
    }

    const equipes = getEquipes(etapa);
    if (equipes.some((eq) => eq.toLowerCase() === nome.toLowerCase())) {
      setFeedback(root, 'Equipe ja existe.', false);
      return;
    }

    equipes.push(nome);
    setEquipes(etapa, equipes);
    await syncConfigLocal(root, { etapa, equipes }, `config/equipes${etapa}`, equipes);
    form.reset();
    renderEquipesForEtapa(root, etapa);
    setFeedback(root, 'Equipe adicionada.', true);
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
    setFeedback(root, 'Equipe removida.', true);
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
    setFeedback(root, 'Branding salvo.', true);
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
    const chave = sanitizeText((root.querySelector('#dir-pix-chave') as HTMLInputElement).value);
    await syncConfigLocal(
      root,
      { etapa: getEtapaAtual(), pix_chave: chave, pix_qr: pixPreview || getPixQr() },
      'config',
      { pix_chave: chave, pix_qr: pixPreview || getPixQr() },
    );
    pixPreview = '';
    setFeedback(root, 'Pix salvo.', true);
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
    const logo = logoPreview || getLogo();
    setLogo(logo);
    await syncConfigLocal(root, { etapa: getEtapaAtual(), logo }, 'config/logo', logo);
    logoPreview = '';
    setFeedback(root, 'Logo salvo.', true);
  });

  root.querySelector('#dir-restaurar-logo')?.addEventListener('click', async () => {
    setLogo('');
    await syncConfigLocal(root, { etapa: getEtapaAtual(), logo: '' }, 'config/logo', '');
    renderBrandingFields(root);
    setFeedback(root, 'Logo restaurado.', true);
  });
}

function bindLockActions(root: HTMLElement): void {
  const toggle = async (etapa: 0 | Etapa): Promise<void> => {
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
    setFeedback(root, next === 0 ? 'Etapas destravadas.' : `Etapa ${next} travada.`, true);
  };

  root.querySelector('#dir-trava-1')?.addEventListener('click', () => void toggle(1));
  root.querySelector('#dir-trava-2')?.addEventListener('click', () => void toggle(2));
  root.querySelector('#dir-destravar')?.addEventListener('click', () => void toggle(0));
}

function bindDangerZone(root: HTMLElement): void {
  root.querySelector('#dir-reset-doacoes')?.addEventListener('click', async () => {
    const etapa = getEtapaAtual();
    if (!window.confirm(`Apagar TODAS as doacoes da ${etapa}a Etapa? Esta acao e irreversivel.`)) return;
    const ok = await resetDoacoesApi(etapa, getEmbeddedDirigenteAuthHeaders());
    if (ok) {
      refreshPainelCoordenador();
      refreshFormDoacao();
      setFeedback(root, 'Doacoes resetadas.', true);
    } else {
      setFeedback(root, 'Falha ao resetar doacoes.', false);
    }
  });

  root.querySelector('#dir-reset-itens')?.addEventListener('click', async () => {
    if (!window.confirm('Restaurar itens padrao? Isso substitui os itens personalizados.')) return;
    const ok = await resetItensApi(getEtapaAtual(), getEmbeddedDirigenteAuthHeaders());
    if (ok) {
      refreshFormDoacao();
      refreshPainelCoordenador();
      setFeedback(root, 'Itens restaurados.', true);
    } else {
      setFeedback(root, 'Falha ao restaurar itens.', false);
    }
  });
}

function bindPasswordButtons(root: HTMLElement): void {
  root
    .querySelector('#dir-trocar-senha-coord')
    ?.addEventListener('click', () => openPasswordModal(root, 'coordenador'));
  root
    .querySelector('#dir-trocar-senha-dir')
    ?.addEventListener('click', () => openPasswordModal(root, 'dirigente'));
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
  bindPasswordButtons(root);
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
            return ok ? { ok: true } : { ok: false, message: 'Senha incorreta.' };
          },
          onSuccess: () => {
            renderAuthState();
            mountPanel(root);
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
