import template from './form-doacao.html?raw';
import './form-doacao.css';
import { createDoacaoApi } from '../../state/api';
import { isFirebaseReady, syncDoacoesEtapa } from '../../state/firebase';
import {
  getDoacoes,
  getEquipes,
  getEtapaPublica,
  getItemMetaRemaining,
  getItensCatalogo,
  getPixChave,
  getPixQr,
  getPublicTotais,
  getRecado,
  getVersiculo,
  getVersiculoRef,
  setDoacoes,
} from '../../state/store';
import type { Doacao, ItemDoacao } from '../../state/types';
import {
  formatPhoneBr,
  getOrCreateClientCsrfToken,
  isValidClientCsrfToken,
  sanitizeText,
} from '../../utils/security';
import { toastError, toastSuccess } from '../../utils/toast';
import { validateEquipe, validateNome, validateQuantidade, validateTelefone } from '../../utils/validation';
import { refreshPainelCoordenador } from '../painel-coordenador/painel-coordenador';

type RefreshFormHandler = () => void;
let refreshFormHandler: RefreshFormHandler | null = null;

function selectedItens(root: HTMLElement): ItemDoacao[] {
  const etapa = getEtapaPublica();
  const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-item-row]'));
  const itens: ItemDoacao[] = [];

  for (const row of rows) {
    const chk = row.querySelector<HTMLInputElement>('input[type="checkbox"]');
    const qty = row.querySelector<HTMLInputElement>('input[type="number"]');
    const nome = row.getAttribute('data-item-nome') || '';
    const unidade = row.getAttribute('data-item-unidade') || '';
    const meta = Number(row.getAttribute('data-item-meta') || 0);

    if (!chk || !qty) continue;

    if (!chk.checked && qty.value.trim()) {
      chk.checked = true;
    }
    if (!chk.checked) continue;

    const quantidade = Number(qty.value);
    const qv = validateQuantidade(quantidade);
    if (!qv.valid) throw new Error(`${nome}: ${qv.message}`);

    const remaining = getItemMetaRemaining(nome, meta, etapa);
    if (remaining === 0) {
      throw new Error(`${nome}: meta ja atingida para esta etapa.`);
    }
    if (remaining !== null && quantidade > remaining) {
      throw new Error(`${nome}: quantidade maxima permitida e ${remaining} ${unidade}.`);
    }

    itens.push({ nome, unidade, quantidade });
  }

  return itens;
}

function isFormReadyToSubmit(form: HTMLFormElement): boolean {
  const nome = sanitizeText(form.querySelector<HTMLInputElement>('#nome')?.value || '');
  const equipe = form.querySelector<HTMLSelectElement>('#equipe')?.value || '';
  const hasItem = Boolean(form.querySelector('[data-item-row] input[type="checkbox"]:checked'));
  return nome.length >= 3 && Boolean(equipe) && hasItem;
}

function updateSubmitButtonState(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('#form-doacao');
  const submit = root.querySelector<HTMLButtonElement>('#btn-submit');
  if (!form || !submit || form.querySelector<HTMLInputElement>('#nome')?.disabled) return;
  submit.disabled = !isFormReadyToSubmit(form);
}

function renderPublicSections(root: HTMLElement): void {
  const etapa = getEtapaPublica();
  const form = root.querySelector<HTMLFormElement>('#form-doacao');
  const submit = root.querySelector<HTMLButtonElement>('#btn-submit');
  const lockedMsg = root.querySelector<HTMLElement>('#form-locked-msg');
  const pixBtn = root.querySelector<HTMLButtonElement>('#btn-copiar-pix');

  const equipes = getEquipes(etapa);
  const itens = getItensCatalogo();
  const formBlocked = !equipes.length || !itens.length;

  if (lockedMsg) {
    if (formBlocked) {
      lockedMsg.hidden = false;
      lockedMsg.textContent = !equipes.length
        ? 'Nenhuma equipe cadastrada para esta etapa. Aguarde a configuracao do evento.'
        : 'Nenhum item disponivel para doacao nesta etapa.';
    } else {
      lockedMsg.hidden = true;
      lockedMsg.textContent = '';
    }
  }

  if (form && submit) {
    form.querySelectorAll('input, select, button').forEach((el) => {
      if (el.id === 'btn-submit') return;
      (el as HTMLInputElement).disabled = formBlocked;
    });
    submit.disabled = formBlocked || !isFormReadyToSubmit(form);
  }

  const chave = getPixChave();
  if (pixBtn) pixBtn.disabled = !chave.trim();

  const verseCard = root.querySelector<HTMLElement>('#verse-card');
  const versiculo = root.querySelector<HTMLElement>('#versiculo-texto');
  const versiculoRef = root.querySelector<HTMLElement>('#versiculo-ref');
  const verseText = getVersiculo();
  const verseRef = getVersiculoRef();
  if (versiculo) versiculo.textContent = verseText;
  if (versiculoRef) versiculoRef.textContent = verseRef;
  if (verseCard) verseCard.hidden = !verseText && !verseRef;

  const pixChave = root.querySelector<HTMLElement>('#pix-chave-display');
  const pixQr = root.querySelector<HTMLImageElement>('#pix-qr');
  const pixPlaceholder = root.querySelector<HTMLElement>('#pix-qr-placeholder');
  if (pixChave) pixChave.textContent = chave;
  const qr = getPixQr().trim();
  if (pixQr && pixPlaceholder) {
    if (qr) {
      pixQr.src = qr;
      pixQr.hidden = false;
      pixPlaceholder.hidden = true;
    } else {
      pixQr.removeAttribute('src');
      pixQr.hidden = true;
      pixPlaceholder.hidden = false;
    }
  }

  const recadoCard = root.querySelector<HTMLElement>('#recado-publico-card');
  const recadoText = root.querySelector<HTMLElement>('#recado-publico-texto');
  const recado = getRecado(etapa).trim();
  if (recadoCard && recadoText) {
    if (recado) {
      recadoText.textContent = recado;
      recadoCard.hidden = false;
    } else {
      recadoCard.hidden = true;
    }
  }

  const totaisEl = root.querySelector<HTMLElement>('#public-totais');
  if (totaisEl) {
    const totais = getPublicTotais(etapa);
    totaisEl.replaceChildren();
    if (!totais.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Nenhuma doacao registrada nesta etapa ainda.';
      totaisEl.appendChild(p);
    } else {
      totais.forEach(({ nome, unidade, total }) => {
        const row = document.createElement('div');
        row.className = 'public-total-row';
        const left = document.createElement('span');
        left.textContent = nome;
        const right = document.createElement('strong');
        right.textContent = `${total} ${unidade}`;
        row.appendChild(left);
        row.appendChild(right);
        totaisEl.appendChild(row);
      });
    }
  }
}

function mountDynamicFields(root: HTMLElement): void {
  const etapa = getEtapaPublica();
  const equipes = getEquipes(etapa);
  const itens = getItensCatalogo();

  const equipeSelect = root.querySelector<HTMLSelectElement>('#equipe');
  const itensLista = root.querySelector<HTMLElement>('#itens-lista');
  const csrfInput = root.querySelector<HTMLInputElement>('#csrf');
  const telefoneInput = root.querySelector<HTMLInputElement>('#telefone');
  const nomeInput = root.querySelector<HTMLInputElement>('#nome');

  if (!equipeSelect || !itensLista || !csrfInput || !telefoneInput) return;

  equipeSelect.replaceChildren();
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Selecione...';
  equipeSelect.appendChild(defaultOpt);

  for (const equipe of equipes) {
    const opt = document.createElement('option');
    opt.value = equipe;
    opt.textContent = equipe;
    equipeSelect.appendChild(opt);
  }

  itensLista.replaceChildren();
  itens.forEach((item, index) => {
    const remaining = getItemMetaRemaining(item.nome, item.meta || 0, etapa);
    const metaAtingida = remaining === 0;

    const row = document.createElement('div');
    row.className = metaAtingida ? 'item-row item-row-disabled' : 'item-row';
    row.setAttribute('data-item-row', '1');
    row.setAttribute('data-item-nome', item.nome);
    row.setAttribute('data-item-unidade', item.unidade);
    row.setAttribute('data-item-meta', String(item.meta || 0));

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.id = `item-${index}`;
    if (metaAtingida) chk.disabled = true;

    const label = document.createElement('label');
    label.htmlFor = chk.id;
    label.textContent = `${item.nome} (${item.unidade})`;
    if (item.meta && item.meta > 0) {
      const tag = document.createElement('span');
      tag.className = metaAtingida ? 'item-meta item-meta-ok' : 'item-meta item-meta-pending';
      tag.textContent = metaAtingida ? 'meta atingida' : `faltam ${remaining} ${item.unidade}`;
      label.appendChild(document.createElement('br'));
      label.appendChild(tag);
    }

    const qty = document.createElement('input');
    qty.type = 'number';
    qty.min = '1';
    qty.max = String(remaining !== null && remaining > 0 ? remaining : 9999);
    qty.step = '1';
    qty.disabled = metaAtingida;
    qty.placeholder = 'Qtd';

    const syncQtyVisibility = (): void => {
      if (chk.checked) {
        row.classList.add('item-row-selected');
        if (!qty.value) qty.value = '1';
        qty.focus();
      } else {
        row.classList.remove('item-row-selected');
        qty.value = '';
      }
      updateSubmitButtonState(root);
    };

    const clampQty = (): void => {
      if (metaAtingida || !chk.checked || !qty.value.trim()) return;
      const max = Number(qty.max) || 9999;
      const value = Number(qty.value);
      if (!Number.isFinite(value) || value < 1) return;
      if (value > max) qty.value = String(max);
    };

    chk.addEventListener('change', () => {
      if (chk.disabled) return;
      syncQtyVisibility();
    });

    qty.addEventListener('input', clampQty);
    qty.addEventListener('change', clampQty);

    row.appendChild(chk);
    row.appendChild(label);
    row.appendChild(qty);
    itensLista.appendChild(row);
  });

  csrfInput.value = getOrCreateClientCsrfToken();

  telefoneInput.oninput = () => {
    telefoneInput.value = formatPhoneBr(telefoneInput.value);
  };

  nomeInput?.addEventListener('input', () => updateSubmitButtonState(root));
  equipeSelect.addEventListener('change', () => updateSubmitButtonState(root));

  renderPublicSections(root);
}

function bindPixCopy(root: HTMLElement): void {
  const btn = root.querySelector<HTMLButtonElement>('#btn-copiar-pix');
  if (!btn) return;

  btn.onclick = async () => {
    const chave = getPixChave();
    if (!chave.trim()) return;
    try {
      await navigator.clipboard.writeText(chave);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = chave;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toastSuccess('Chave Pix copiada!');
  };
}

export function refreshFormDoacao(): void {
  if (refreshFormHandler) refreshFormHandler();
}

export function renderFormDoacao(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-doacao-root';
  wrapper.innerHTML = template.trim();

  refreshFormHandler = () => {
    mountDynamicFields(wrapper);
  };

  mountDynamicFields(wrapper);
  bindPixCopy(wrapper);

  const form = wrapper.querySelector<HTMLFormElement>('#form-doacao');
  const feedback = wrapper.querySelector<HTMLElement>('#form-feedback');
  const csrf = wrapper.querySelector<HTMLInputElement>('#csrf');
  const btn = wrapper.querySelector<HTMLButtonElement>('#btn-submit');

  if (!form || !feedback || !csrf || !btn) return wrapper;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    btn.disabled = true;

    try {
      const etapa = getEtapaPublica();

      if (!isValidClientCsrfToken(csrf.value)) {
        throw new Error('Sessao invalida. Recarregue a pagina.');
      }

      const nomeInput = form.querySelector<HTMLInputElement>('#nome');
      const telefoneInput = form.querySelector<HTMLInputElement>('#telefone');
      const equipeInput = form.querySelector<HTMLSelectElement>('#equipe');

      if (!nomeInput || !telefoneInput || !equipeInput) {
        throw new Error('Formulario invalido.');
      }

      const nome = sanitizeText(nomeInput.value);
      const telefone = sanitizeText(telefoneInput.value);
      const equipe = equipeInput.value;

      const nv = validateNome(nome);
      if (!nv.valid) throw new Error(nv.message);

      const ev = validateEquipe(equipe, getEquipes(etapa));
      if (!ev.valid) throw new Error(ev.message);

      const tv = validateTelefone(telefone);
      if (!tv.valid) throw new Error(tv.message);

      const itens = selectedItens(form);
      if (itens.length === 0) {
        throw new Error('Selecione ao menos um item com quantidade valida.');
      }

      const localDoacao: Doacao = {
        id: Date.now(),
        nome,
        equipe,
        telefone,
        itens,
        data: new Date().toLocaleDateString('pt-BR'),
      };

      const apiDoacao = await createDoacaoApi({
        etapa,
        nome,
        equipe,
        telefone,
        itens,
      });

      const doacao = apiDoacao || localDoacao;

      const doacoes = getDoacoes(etapa);
      doacoes.push(doacao);
      setDoacoes(etapa, doacoes);

      if (!apiDoacao && isFirebaseReady()) {
        await syncDoacoesEtapa(etapa, doacoes);
      }

      refreshPainelCoordenador();

      form.reset();
      mountDynamicFields(wrapper);

      feedback.textContent = 'Doacao registrada com sucesso!';
      toastSuccess('Doacao registrada com sucesso!');
      csrf.value = getOrCreateClientCsrfToken();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar doacao.';
      feedback.textContent = msg;
      toastError(msg);
    } finally {
      updateSubmitButtonState(wrapper);
    }
  });

  return wrapper;
}
