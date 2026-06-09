import { updateConfigApi } from '../../state/api';
import { isFirebaseReady, syncConfigValue } from '../../state/firebase';
import {
  getCategorias,
  getDoacoes,
  getItensCatalogoRaw,
  setCategorias,
  setItensCatalogo,
} from '../../state/store';
import type { CategoriaCatalogo, ItemCatalogo } from '../../state/types';
import { getBancoAuthHeaders, isBancoDesbloqueado, unlockBanco } from '../../utils/auth';
import { sanitizeText } from '../../utils/security';
import { refreshFormDoacao } from '../form-doacao/form-doacao';

const UNIDADES = ['kg', 'g', 'L', 'ml', 'un', 'pct', 'dz', 'cx'];

async function persistCatalogo(itens: ItemCatalogo[], cats: CategoriaCatalogo[]): Promise<void> {
  setItensCatalogo(itens);
  setCategorias(cats);
  const etapa = 1;
  const synced = await updateConfigApi({ etapa, itens, cats }, getBancoAuthHeaders());
  if (!synced && isFirebaseReady()) {
    await syncConfigValue('config/itens', itens);
    await syncConfigValue('config/cats', cats);
  }
  refreshFormDoacao();
}

function calcArrecadado(): Map<string, number> {
  const arrecadado = new Map<string, number>();
  for (const etapa of [1, 2] as const) {
    for (const d of getDoacoes(etapa)) {
      for (const item of d.itens) {
        arrecadado.set(item.nome, (arrecadado.get(item.nome) || 0) + item.quantidade);
      }
    }
  }
  return arrecadado;
}

function buildItemRow(
  item: ItemCatalogo,
  idx: number,
  arrecadado: Map<string, number>,
  root: HTMLElement,
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'db-item';
  if (item.visivel === false) row.dataset.hidden = 'true';

  const total = arrecadado.get(item.nome) || 0;
  const meta = item.meta || 0;
  const pct = meta > 0 ? Math.min(100, Math.round((total / meta) * 100)) : null;

  const nome = document.createElement('span');
  nome.className = 'db-nome';
  nome.textContent = item.nome;

  const un = document.createElement('span');
  un.className = 'db-un';
  un.textContent = item.unidade;

  const metaEl = document.createElement('span');
  metaEl.className = 'db-meta';
  if (meta > 0) {
    metaEl.textContent = `${total}/${meta} ${item.unidade} (${pct}%)`;
  } else if (total > 0) {
    metaEl.textContent = `${total} ${item.unidade}`;
  }

  const actions = document.createElement('div');
  actions.className = 'db-actions';

  const visBtn = document.createElement('button');
  visBtn.type = 'button';
  visBtn.className = item.visivel !== false ? 'db-btn-vis' : 'db-btn-hidden';
  visBtn.title = item.visivel !== false ? 'Ocultar' : 'Mostrar';
  visBtn.textContent = item.visivel !== false ? 'Visivel' : 'Oculto';
  visBtn.onclick = () => {
    const itens = getItensCatalogoRaw();
    itens[idx].visivel = itens[idx].visivel === false;
    void persistCatalogo(itens, getCategorias()).then(() => renderBanco(root));
  };

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.textContent = 'Editar';
  editBtn.onclick = () => openEditModal(root, idx);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'db-btn-danger';
  removeBtn.textContent = 'Remover';
  removeBtn.onclick = () => {
    const itens = getItensCatalogoRaw();
    if (!window.confirm(`Remover "${itens[idx].nome}" da lista?`)) return;
    itens.splice(idx, 1);
    void persistCatalogo(itens, getCategorias()).then(() => renderBanco(root));
  };

  actions.appendChild(visBtn);
  actions.appendChild(editBtn);
  actions.appendChild(removeBtn);
  row.appendChild(nome);
  row.appendChild(un);
  if (metaEl.textContent) row.appendChild(metaEl);
  row.appendChild(actions);
  return row;
}

function populateCatSelect(select: HTMLSelectElement, selected?: string): void {
  const cats = getCategorias();
  const prev = selected || select.value;
  select.replaceChildren();
  for (const cat of cats) {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.nome;
    select.appendChild(opt);
  }
  if (prev) select.value = prev;
}

function renderCatList(root: HTMLElement): void {
  const host = root.querySelector<HTMLElement>('#db-cats-lista');
  if (!host) return;
  const cats = getCategorias();
  host.replaceChildren();

  if (!cats.length) {
    const p = document.createElement('p');
    p.textContent = 'Nenhuma categoria.';
    host.appendChild(p);
    return;
  }

  cats.forEach((cat) => {
    const row = document.createElement('div');
    row.className = 'db-item';
    const nome = document.createElement('span');
    nome.className = 'db-nome';
    nome.textContent = cat.nome;
    const actions = document.createElement('div');
    actions.className = 'db-actions';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'db-btn-danger';
    removeBtn.textContent = 'Remover';
    removeBtn.onclick = () => {
      if (!window.confirm('Remover esta categoria?')) return;
      const next = getCategorias().filter((c) => c.id !== cat.id);
      void persistCatalogo(getItensCatalogoRaw(), next).then(() => {
        renderBanco(root);
      });
    };
    actions.appendChild(removeBtn);
    row.appendChild(nome);
    row.appendChild(actions);
    host.appendChild(row);
  });
}

function renderBanco(root: HTMLElement): void {
  const locked = root.querySelector<HTMLElement>('#db-locked-info');
  const content = root.querySelector<HTMLElement>('#db-conteudo');
  const count = root.querySelector<HTMLElement>('#db-count');
  const lista = root.querySelector<HTMLElement>('#db-lista');
  const catSelect = root.querySelector<HTMLSelectElement>('#db-novo-cat');

  if (!locked || !content || !lista) return;

  const desbloq = isBancoDesbloqueado();
  locked.hidden = desbloq;
  content.hidden = !desbloq;
  if (!desbloq) return;

  const itens = getItensCatalogoRaw();
  const cats = getCategorias();
  if (count) count.textContent = `${itens.length} itens`;
  if (catSelect) populateCatSelect(catSelect);

  renderCatList(root);

  const arrecadado = calcArrecadado();
  const byCat = new Map<string, Array<{ item: ItemCatalogo; idx: number }>>();
  for (const cat of cats) byCat.set(cat.id, []);
  byCat.set('_sem', []);

  itens.forEach((item, idx) => {
    const bucket = item.cat && byCat.has(item.cat) ? item.cat : '_sem';
    byCat.get(bucket)?.push({ item, idx });
  });

  lista.replaceChildren();
  let hasItems = false;

  for (const cat of [...cats, { id: '_sem', nome: 'Sem categoria' }]) {
    const grupo = byCat.get(cat.id);
    if (!grupo?.length) continue;
    hasItems = true;

    const heading = document.createElement('div');
    heading.className = 'db-cat-heading';
    heading.textContent = cat.nome;
    lista.appendChild(heading);

    for (const { item, idx } of grupo) {
      lista.appendChild(buildItemRow(item, idx, arrecadado, root));
    }
  }

  if (!hasItems) {
    const p = document.createElement('p');
    p.textContent = 'Nenhum item cadastrado.';
    lista.appendChild(p);
  }
}

function openUnlockModal(root: HTMLElement): void {
  const host = root.querySelector<HTMLElement>('#db-modal-host');
  if (!host) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const modal = document.createElement('section');
  modal.className = 'modal-card';
  modal.innerHTML = `
    <h3>Banco de Dados</h3>
    <p>Digite a senha do Dirigente para editar os itens de doacao.</p>
    <label for="db-unlock-pass">Senha do Dirigente</label>
    <input id="db-unlock-pass" type="password" maxlength="80" autocomplete="current-password" />
    <p id="db-unlock-error" class="login-error" hidden></p>
    <div class="coord-export-actions">
      <button type="button" id="db-unlock-submit">Desbloquear</button>
      <button type="button" id="db-unlock-cancel">Cancelar</button>
    </div>
  `;

  overlay.appendChild(modal);
  host.replaceChildren(overlay);

  const close = (): void => {
    host.replaceChildren();
  };

  modal.querySelector('#db-unlock-cancel')?.addEventListener('click', close);
  modal.querySelector('#db-unlock-submit')?.addEventListener('click', async () => {
    const pass = (modal.querySelector('#db-unlock-pass') as HTMLInputElement).value;
    const error = modal.querySelector<HTMLElement>('#db-unlock-error');
    const ok = await unlockBanco(pass);
    if (!ok) {
      if (error) {
        error.textContent = 'Senha incorreta.';
        error.hidden = false;
      }
      return;
    }
    close();
    renderBanco(root);
  });
}

function openAddCatModal(root: HTMLElement): void {
  const host = root.querySelector<HTMLElement>('#db-modal-host');
  if (!host) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';

  const modal = document.createElement('section');
  modal.className = 'modal-card';
  modal.innerHTML = `
    <h3>Nova categoria</h3>
    <label for="cat-nome">Nome da categoria</label>
    <input id="cat-nome" type="text" maxlength="80" placeholder="Ex: Enlatados" />
    <p id="cat-error" class="login-error" hidden>Preencha o nome.</p>
    <div class="coord-export-actions">
      <button type="button" id="cat-save">Salvar</button>
      <button type="button" id="cat-cancel">Cancelar</button>
    </div>
  `;

  overlay.appendChild(modal);
  host.replaceChildren(overlay);

  const close = (): void => host.replaceChildren();

  modal.querySelector('#cat-cancel')?.addEventListener('click', close);
  modal.querySelector('#cat-save')?.addEventListener('click', () => {
    const nome = sanitizeText((modal.querySelector('#cat-nome') as HTMLInputElement).value);
    const error = modal.querySelector<HTMLElement>('#cat-error');
    if (!nome) {
      if (error) error.hidden = false;
      return;
    }
    const cats = getCategorias();
    cats.push({ id: `cat_${Date.now()}`, nome });
    void persistCatalogo(getItensCatalogoRaw(), cats).then(() => {
      close();
      renderBanco(root);
    });
  });
}

function openEditModal(root: HTMLElement, idx: number): void {
  const host = root.querySelector<HTMLElement>('#db-modal-host');
  if (!host) return;

  const item = getItensCatalogoRaw()[idx];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';

  const modal = document.createElement('section');
  modal.className = 'modal-card';
  modal.innerHTML = `
    <h3>Editar item</h3>
    <label for="edit-item-nome">Nome</label>
    <input id="edit-item-nome" type="text" maxlength="80" value="" />
    <label for="edit-item-un">Unidade</label>
    <select id="edit-item-un"></select>
    <label for="edit-item-meta">Meta</label>
    <input id="edit-item-meta" type="number" min="0" step="1" />
    <label for="edit-item-cat">Categoria</label>
    <select id="edit-item-cat"></select>
    <p id="edit-error" class="login-error" hidden>Preencha o nome.</p>
    <div class="coord-export-actions">
      <button type="button" id="edit-save">Salvar</button>
      <button type="button" id="edit-cancel">Cancelar</button>
    </div>
  `;

  overlay.appendChild(modal);
  host.replaceChildren(overlay);

  const unSelect = modal.querySelector<HTMLSelectElement>('#edit-item-un');
  const catSelect = modal.querySelector<HTMLSelectElement>('#edit-item-cat');
  if (unSelect) {
    for (const u of UNIDADES) {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      unSelect.appendChild(opt);
    }
    unSelect.value = item.unidade;
  }
  if (catSelect) populateCatSelect(catSelect, item.cat || '');

  (modal.querySelector('#edit-item-nome') as HTMLInputElement).value = item.nome;
  (modal.querySelector('#edit-item-meta') as HTMLInputElement).value = String(item.meta || '');

  const close = (): void => host.replaceChildren();

  modal.querySelector('#edit-cancel')?.addEventListener('click', close);
  modal.querySelector('#edit-save')?.addEventListener('click', () => {
    const nome = sanitizeText((modal.querySelector('#edit-item-nome') as HTMLInputElement).value);
    const un = (modal.querySelector('#edit-item-un') as HTMLSelectElement).value;
    const meta = Number((modal.querySelector('#edit-item-meta') as HTMLInputElement).value) || 0;
    const cat = (modal.querySelector('#edit-item-cat') as HTMLSelectElement).value;
    const error = modal.querySelector<HTMLElement>('#edit-error');
    if (!nome) {
      if (error) error.hidden = false;
      return;
    }
    const itens = getItensCatalogoRaw();
    itens[idx] = { ...itens[idx], nome, unidade: un, meta, cat, visivel: itens[idx].visivel !== false };
    void persistCatalogo(itens, getCategorias()).then(() => {
      close();
      renderBanco(root);
    });
  });
}

function mountAddItemForm(root: HTMLElement): void {
  const btn = root.querySelector<HTMLButtonElement>('#db-add-item');
  if (!btn) return;

  btn.onclick = () => {
    const nome = sanitizeText((root.querySelector('#db-novo-nome') as HTMLInputElement)?.value || '');
    const un = (root.querySelector('#db-novo-un') as HTMLSelectElement)?.value || 'un';
    const meta = Number((root.querySelector('#db-novo-meta') as HTMLInputElement)?.value) || 0;
    const cat = (root.querySelector('#db-novo-cat') as HTMLSelectElement)?.value || '';
    if (!nome) {
      window.alert('Digite o nome do item.');
      return;
    }
    const itens = getItensCatalogoRaw();
    if (itens.some((i) => i.nome.toLowerCase() === nome.toLowerCase())) {
      window.alert('Item ja existe.');
      return;
    }
    itens.push({ nome, unidade: un, meta, cat, visivel: true });
    void persistCatalogo(itens, getCategorias()).then(() => {
      (root.querySelector('#db-novo-nome') as HTMLInputElement).value = '';
      (root.querySelector('#db-novo-meta') as HTMLInputElement).value = '';
      renderBanco(root);
    });
  };
}

export function renderSubBanco(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'coord-sub-banco-root';
  root.innerHTML = `
    <section class="db-section">
      <h3>Itens de doacao <span id="db-count" class="db-count"></span></h3>
      <div id="db-locked-info" class="db-locked-msg">
        <p>Acesso ao banco de dados requer senha do Dirigente.</p>
        <button id="db-unlock-btn" type="button">Desbloquear</button>
      </div>
      <div id="db-conteudo" hidden>
        <div id="db-lista" class="db-lista"></div>
        <p class="db-legend"><span>Visivel</span> no formulario · <span>Oculto</span> do formulario</p>
        <h4>Adicionar novo item</h4>
        <div class="db-add-grid">
          <div>
            <label for="db-novo-nome">Nome do item</label>
            <input id="db-novo-nome" type="text" maxlength="80" placeholder="Ex: Maionese" />
          </div>
          <div>
            <label for="db-novo-un">Unidade</label>
            <select id="db-novo-un">${UNIDADES.map((u) => `<option value="${u}">${u}</option>`).join('')}</select>
          </div>
          <div>
            <label for="db-novo-meta">Qtd. necessaria</label>
            <input id="db-novo-meta" type="number" min="0" step="1" placeholder="Ex: 20" />
          </div>
          <div>
            <label for="db-novo-cat">Categoria</label>
            <select id="db-novo-cat"></select>
          </div>
          <button id="db-add-item" type="button" class="db-add-btn">Adicionar item</button>
        </div>
        <div class="db-cats-header">
          <h4>Categorias</h4>
          <button id="db-add-cat" type="button">Nova categoria</button>
        </div>
        <div id="db-cats-lista" class="db-cats-lista"></div>
      </div>
    </section>
    <div id="db-modal-host"></div>
  `;

  root.querySelector('#db-unlock-btn')?.addEventListener('click', () => openUnlockModal(root));
  root.querySelector('#db-add-cat')?.addEventListener('click', () => openAddCatModal(root));
  mountAddItemForm(root);
  renderBanco(root);

  return root;
}

export function refreshSubBanco(root: HTMLElement): void {
  renderBanco(root);
}
