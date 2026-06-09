import '../../styles/equipe-chart.css';
import { updateConfigApi, updateEntregaApi } from '../../state/api';
import { isFirebaseReady, syncDoacoesEtapa } from '../../state/firebase';
import {
  getDoacoes,
  getEquipes,
  getEtapaPublica,
  getItensCatalogoRaw,
  getRecado,
  setDoacoes,
  setRecado,
} from '../../state/store';
import type { Doacao } from '../../state/types';
import { renderEquipePieChart } from '../../utils/equipe-chart';
import { exportBackupCsv, exportEtapaCsv } from '../../utils/export';
import { sanitizeText } from '../../utils/security';
import { refreshFormDoacao } from '../form-doacao/form-doacao';

let entregaPendenteId: number | null = null;

function formatDateToBr(value: string): string {
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function buildStatItem(title: string, value: number, tone?: 'green' | 'gold'): HTMLElement {
  const card = document.createElement('div');
  card.className = 'stat-item';
  if (tone) card.dataset.tone = tone;

  const strong = document.createElement('strong');
  strong.textContent = String(value);

  const span = document.createElement('span');
  span.textContent = title;

  card.appendChild(strong);
  card.appendChild(span);
  return card;
}

function buildDoacaoCard(doacao: Doacao): HTMLElement {
  const article = document.createElement('article');
  article.className = 'coord-card';

  const title = document.createElement('h4');
  title.textContent = `${doacao.nome} - ${doacao.equipe}`;

  const meta = document.createElement('p');
  meta.textContent = `${doacao.telefone || 'Sem telefone'} · ${doacao.data}`;

  const itens = document.createElement('p');
  itens.textContent = doacao.itens.map((i) => `${i.nome}: ${i.quantidade} ${i.unidade}`).join(' · ');

  const status = document.createElement('p');
  status.className = 'coord-status';
  status.textContent = doacao.entregue
    ? `Entregue em ${doacao.entregue.data}${doacao.entregue.ocasiao ? ` · ${doacao.entregue.ocasiao}` : ''}`
    : 'Pendente de entrega';

  const actions = document.createElement('div');
  actions.className = 'coord-actions';

  if (doacao.entregue) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-delivery-remove', String(doacao.id));
    btn.textContent = 'Remover entrega';
    actions.appendChild(btn);
  } else {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-delivery-toggle', String(doacao.id));
    btn.textContent = entregaPendenteId === doacao.id ? 'Ocultar entrega' : 'Marcar entregue';
    actions.appendChild(btn);
  }

  article.appendChild(title);
  article.appendChild(meta);
  article.appendChild(itens);
  article.appendChild(status);
  article.appendChild(actions);

  if (!doacao.entregue && entregaPendenteId === doacao.id) {
    const entregaWrap = document.createElement('div');
    entregaWrap.className = 'coord-entrega-form';

    const dataInput = document.createElement('input');
    dataInput.type = 'date';
    dataInput.id = `entrega-data-${doacao.id}`;

    const ocasiaoInput = document.createElement('input');
    ocasiaoInput.type = 'text';
    ocasiaoInput.id = `entrega-ocasiao-${doacao.id}`;
    ocasiaoInput.maxLength = 60;
    ocasiaoInput.placeholder = 'Ocasião (opcional)';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.setAttribute('data-delivery-save', String(doacao.id));
    saveBtn.textContent = 'Salvar entrega';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.setAttribute('data-delivery-cancel', String(doacao.id));
    cancelBtn.textContent = 'Cancelar';

    entregaWrap.appendChild(dataInput);
    entregaWrap.appendChild(ocasiaoInput);
    entregaWrap.appendChild(saveBtn);
    entregaWrap.appendChild(cancelBtn);
    article.appendChild(entregaWrap);
  }

  return article;
}

async function persistDoacoesLocal(doacoes: Doacao[]): Promise<void> {
  const etapa = getEtapaPublica();
  setDoacoes(etapa, doacoes);
  if (isFirebaseReady()) {
    await syncDoacoesEtapa(etapa, doacoes);
  }
}

function upsertDoacao(doacoes: Doacao[], updated: Doacao): Doacao[] {
  return doacoes.map((current) => (current.id === updated.id ? updated : current));
}

function renderPainel(root: HTMLElement): void {
  const etapa = getEtapaPublica();
  const all = getDoacoes(etapa);

  const banner = root.querySelector<HTMLElement>('#coord-etapa-banner');
  const filtro = root.querySelector<HTMLSelectElement>('#coord-filtro-equipe');
  const stats = root.querySelector<HTMLElement>('#coord-stats');
  const chartHost = root.querySelector<HTMLElement>('#coord-grafico-equipes');
  const legendHost = root.querySelector<HTMLElement>('#coord-grafico-legenda');
  const lista = root.querySelector<HTMLElement>('#coord-lista');
  const totaisEl = root.querySelector<HTMLElement>('#coord-totais');
  const recadoEl = root.querySelector<HTMLTextAreaElement>('#coord-recado');

  if (!filtro || !stats || !chartHost || !legendHost || !lista || !totaisEl) return;

  if (banner) banner.textContent = `Doacoes da ${etapa}a Etapa`;
  if (recadoEl && document.activeElement !== recadoEl) recadoEl.value = getRecado(etapa);

  const selected = filtro.value;
  const dados = selected ? all.filter((d) => d.equipe === selected) : all;

  const itensPrometidos = dados.reduce((acc, d) => acc + d.itens.length, 0);
  const totalRegistros = dados.length;
  const entregues = dados.filter((d) => Boolean(d.entregue)).length;
  const pendentes = totalRegistros - entregues;

  stats.replaceChildren();
  stats.appendChild(buildStatItem('Registros', totalRegistros));
  stats.appendChild(buildStatItem('Itens prometidos', itensPrometidos));
  stats.appendChild(buildStatItem('Entregues', entregues, 'green'));
  stats.appendChild(buildStatItem('Pendentes', pendentes, 'gold'));

  renderEquipePieChart(chartHost, legendHost, all);

  if (dados.length === 0) {
    lista.replaceChildren();
    const p = document.createElement('p');
    p.textContent = 'Nenhuma doacao encontrada para o filtro atual.';
    lista.appendChild(p);
  } else {
    lista.replaceChildren();
    [...dados].reverse().forEach((d) => {
      lista.appendChild(buildDoacaoCard(d));
    });
  }

  const itemCatalogo = getItensCatalogoRaw();
  const unidadePorItem = new Map(itemCatalogo.map((i) => [i.nome, i.unidade]));
  const totaisMap = new Map<string, number>();

  for (const d of dados) {
    for (const item of d.itens) {
      totaisMap.set(item.nome, (totaisMap.get(item.nome) || 0) + item.quantidade);
    }
  }

  const totais = [...totaisMap.entries()].sort((a, b) => b[1] - a[1]);
  totaisEl.replaceChildren();

  if (!totais.length) {
    const p = document.createElement('p');
    p.textContent = 'Sem totais nesta etapa.';
    totaisEl.appendChild(p);
    return;
  }

  totais.forEach(([nome, qtd]) => {
    const row = document.createElement('div');
    row.className = 'coord-total-row';
    const un = unidadePorItem.get(nome) || '';

    const left = document.createElement('span');
    left.textContent = nome;

    const right = document.createElement('strong');
    right.textContent = `${qtd} ${un}`;

    row.appendChild(left);
    row.appendChild(right);
    totaisEl.appendChild(row);
  });
}

function mountFiltro(root: HTMLElement): void {
  const etapa = getEtapaPublica();
  const filtro = root.querySelector<HTMLSelectElement>('#coord-filtro-equipe');
  if (!filtro) return;

  const equipes = getEquipes(etapa);
  const selected = filtro.value;
  filtro.replaceChildren();
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Todas as equipes';
  filtro.appendChild(defaultOpt);
  for (const equipe of equipes) {
    const opt = document.createElement('option');
    opt.value = equipe;
    opt.textContent = equipe;
    filtro.appendChild(opt);
  }

  if (selected && equipes.includes(selected)) {
    filtro.value = selected;
  }

  filtro.onchange = () => renderPainel(root);
}

async function syncRecado(root: HTMLElement, texto: string): Promise<void> {
  const etapa = getEtapaPublica();
  const synced = await updateConfigApi({ etapa, recado: texto });
  if (synced) {
    setRecado(etapa, texto);
  }
  refreshFormDoacao();
  const feedback = root.querySelector<HTMLElement>('#coord-recado-feedback');
  if (feedback) {
    if (synced) {
      feedback.textContent = texto ? 'Recado publicado.' : 'Recado removido.';
    } else {
      feedback.textContent = 'Nao foi possivel salvar o recado. Verifique sua sessao e tente novamente.';
    }
  }
}

function mountRecadoActions(root: HTMLElement): void {
  const salvar = root.querySelector<HTMLButtonElement>('#coord-salvar-recado');
  const limpar = root.querySelector<HTMLButtonElement>('#coord-limpar-recado');
  const recado = root.querySelector<HTMLTextAreaElement>('#coord-recado');
  if (!salvar || !limpar || !recado) return;

  salvar.onclick = () => {
    void syncRecado(root, sanitizeText(recado.value));
  };

  limpar.onclick = () => {
    recado.value = '';
    void syncRecado(root, '');
  };
}

function mountEntregaActions(root: HTMLElement): void {
  root.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLButtonElement)) return;

    const toggleId = target.getAttribute('data-delivery-toggle');
    if (toggleId) {
      const id = Number(toggleId);
      entregaPendenteId = entregaPendenteId === id ? null : id;
      renderPainel(root);
      return;
    }

    const cancelId = target.getAttribute('data-delivery-cancel');
    if (cancelId) {
      entregaPendenteId = null;
      renderPainel(root);
      return;
    }

    const removeId = target.getAttribute('data-delivery-remove');
    if (removeId) {
      const id = Number(removeId);
      const etapa = getEtapaPublica();
      const updated = await updateEntregaApi(etapa, id, null);
      if (updated) {
        setDoacoes(etapa, upsertDoacao(getDoacoes(etapa), updated));
      } else {
        const doacoes = getDoacoes(etapa).map((d) => {
          if (d.id !== id) return d;
          const copy: Doacao = { ...d };
          delete copy.entregue;
          return copy;
        });
        await persistDoacoesLocal(doacoes);
      }
      renderPainel(root);
      return;
    }

    const saveId = target.getAttribute('data-delivery-save');
    if (!saveId) return;

    const id = Number(saveId);
    const dataInput = root.querySelector<HTMLInputElement>(`#entrega-data-${id}`);
    const ocasiaoInput = root.querySelector<HTMLInputElement>(`#entrega-ocasiao-${id}`);
    if (!dataInput || !dataInput.value) return;

    const dataBr = formatDateToBr(dataInput.value);
    const ocasiao = sanitizeText(ocasiaoInput?.value || '');
    const etapa = getEtapaPublica();
    const updated = await updateEntregaApi(etapa, id, { data: dataBr, ocasiao });

    if (updated) {
      setDoacoes(etapa, upsertDoacao(getDoacoes(etapa), updated));
    } else {
      const doacoes = getDoacoes(etapa).map((d) => {
        if (d.id !== id) return d;
        return { ...d, entregue: { data: dataBr, ocasiao } };
      });
      await persistDoacoesLocal(doacoes);
    }
    entregaPendenteId = null;
    renderPainel(root);
  });
}

function mountExportActions(root: HTMLElement): void {
  const exportEtapa = root.querySelector<HTMLButtonElement>('#coord-export-etapa');
  const exportBackup = root.querySelector<HTMLButtonElement>('#coord-export-backup');
  if (!exportEtapa || !exportBackup) return;

  exportEtapa.onclick = () => {
    const etapa = getEtapaPublica();
    const dados = getDoacoes(etapa);
    if (!dados.length) {
      window.alert('Nenhuma doacao para exportar.');
      return;
    }
    exportEtapaCsv(etapa, dados);
  };

  exportBackup.onclick = () => {
    exportBackupCsv({ 1: getDoacoes(1), 2: getDoacoes(2) }, getItensCatalogoRaw());
  };
}

export function renderSubDoacoes(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'coord-sub-doacoes-root';
  root.innerHTML = `
    <p class="coord-info-banner" id="coord-etapa-banner"></p>
    <div class="stats-grid" id="coord-stats" aria-live="polite"></div>
    <div class="coord-top-row">
      <label for="coord-filtro-equipe">Filtrar por equipe</label>
      <select id="coord-filtro-equipe"><option value="">Todas as equipes</option></select>
    </div>
    <h3>Registros</h3>
    <div id="coord-lista" class="coord-lista"></div>
    <h3>Totais por item</h3>
    <div id="coord-totais" class="coord-totais"></div>
    <h3>Doacoes por equipe</h3>
    <div class="equipe-chart-wrap">
      <div id="coord-grafico-equipes" class="equipe-chart"></div>
      <div id="coord-grafico-legenda" class="equipe-chart-legend"></div>
    </div>
    <div class="coord-export-actions">
      <button id="coord-export-etapa" type="button">Exportar dados desta etapa</button>
      <button id="coord-export-backup" type="button">Backup completo (todas as etapas)</button>
    </div>
    <section class="coord-recado-section">
      <h3>Recado para o publico</h3>
      <p class="coord-recado-hint">O texto abaixo aparece na tela principal para todos os participantes.</p>
      <label class="sr-only" for="coord-recado">Recado publico</label>
      <textarea id="coord-recado" rows="5" maxlength="400" placeholder="Ex: Precisamos muito de arroz e feijao!"></textarea>
      <div class="coord-export-actions">
        <button id="coord-salvar-recado" type="button">Publicar recado</button>
        <button id="coord-limpar-recado" type="button">Remover recado</button>
      </div>
      <p id="coord-recado-feedback" class="coord-recado-feedback" role="status" aria-live="polite"></p>
    </section>
  `;

  mountEntregaActions(root);
  mountExportActions(root);
  mountRecadoActions(root);
  mountFiltro(root);
  renderPainel(root);

  return root;
}

export function refreshSubDoacoes(root: HTMLElement): void {
  mountFiltro(root);
  renderPainel(root);
}
