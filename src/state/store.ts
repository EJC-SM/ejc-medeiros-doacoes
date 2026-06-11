import type { AppConfig, AppState, CategoriaCatalogo, Doacao, Etapa, ItemCatalogo } from './types';

const STORAGE_KEY_ETAPA = 'ejc_d_etapa';
const STORAGE_KEY_LOCKED = 'ejc_d_locked';
const STORAGE_KEY_DOACOES = (etapa: Etapa) => `ejc_doacoes_etapa${etapa}`;
const STORAGE_KEY_EQUIPES = (etapa: Etapa) => `ejc_equipes_${etapa}`;
const STORAGE_KEY_ITENS = 'ejc_d_itens';
const STORAGE_KEY_CATS = 'ejc_d_cats';
const STORAGE_KEY_RECADO = (etapa: Etapa) => `ejc_recado_${etapa}`;
const STORAGE_KEY_NOME_EVENTO = 'ejc_nome_evento';
const STORAGE_KEY_VERSICULO = 'ejc_versiculo';
const STORAGE_KEY_VERSICULO_REF = 'ejc_versiculo_ref';
const STORAGE_KEY_PIX_CHAVE = 'ejc_pix_chave';
const STORAGE_KEY_PIX_QR = 'ejc_pix_qr';
const STORAGE_KEY_LOGO = 'ejc_logo';

export const DEFAULT_VERSICULO =
  'Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação, pois Deus ama quem dá com alegria.';
export const DEFAULT_VERSICULO_REF = '2 Coríntios 9:7';
export const DEFAULT_PIX_CHAVE = 'financasejcmedeiros@gmail.com';
export const DEFAULT_NOME_EVENTO = 'EJC Medeiros — Doações';

const EQUIPES_DEFAULT: Record<Etapa, string[]> = {
  1: [
    'Apoio',
    'Círculo',
    'Cozinha',
    'Dirigente',
    'Divulgação',
    'Eventos',
    'Folclore',
    'Liturgia',
    'Ordem',
    'Sala',
    'Secretaria',
    'Sexteto',
    'Trânsito',
    'Visitação A',
    'Visitação B',
  ],
  2: [
    'Apoio',
    'Cozinha',
    'Dirigente',
    'Divulgação',
    'Eventos',
    'Folclore',
    'Gesto Concreto',
    'Grupo de Estudo',
    'Liturgia',
    'Ordem',
    'Sala',
    'Secretaria',
    'Segurança',
    'Sexteto',
    'Visitação',
  ],
};

const CATS_DEFAULT: CategoriaCatalogo[] = [
  { id: 'secos', nome: '🌾 Alimentos Secos' },
  { id: 'condimentos', nome: '🫙 Óleos & Condimentos' },
  { id: 'frescos', nome: '🥚 Frescos & Frios' },
  { id: 'bebidas', nome: '🥤 Bebidas' },
  { id: 'higiene', nome: '🧴 Higiene & Limpeza' },
  { id: 'outros', nome: '📦 Outros' },
];

const ITENS_DEFAULT: ItemCatalogo[] = [
  { nome: 'Arroz', unidade: 'kg', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Feijão', unidade: 'kg', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Macarrão', unidade: 'kg', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Açúcar', unidade: 'kg', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Óleo', unidade: 'L', meta: 0, cat: 'condimentos', visivel: true },
  { nome: 'Sal', unidade: 'kg', meta: 0, cat: 'condimentos', visivel: true },
  { nome: 'Café', unidade: 'g', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Farinha de trigo', unidade: 'kg', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Biscoito', unidade: 'pct', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Leite', unidade: 'L', meta: 0, cat: 'frescos', visivel: true },
  { nome: 'Ovos', unidade: 'dz', meta: 0, cat: 'frescos', visivel: true },
  { nome: 'Frango', unidade: 'kg', meta: 0, cat: 'frescos', visivel: true },
  { nome: 'Carne bovina', unidade: 'kg', meta: 0, cat: 'frescos', visivel: true },
  { nome: 'Pão', unidade: 'un', meta: 0, cat: 'frescos', visivel: true },
  { nome: 'Refrigerante 2L', unidade: 'un', meta: 0, cat: 'bebidas', visivel: true },
  { nome: 'Suco', unidade: 'L', meta: 0, cat: 'bebidas', visivel: true },
  { nome: 'Água mineral', unidade: 'L', meta: 0, cat: 'bebidas', visivel: true },
  { nome: 'Papel higiênico', unidade: 'pct', meta: 0, cat: 'higiene', visivel: true },
  { nome: 'Sabão em pó', unidade: 'kg', meta: 0, cat: 'higiene', visivel: true },
  { nome: 'Detergente', unidade: 'un', meta: 0, cat: 'higiene', visivel: true },
];

function parseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getEtapaAtual(): Etapa {
  const raw = Number(localStorage.getItem(STORAGE_KEY_ETAPA) || 1);
  return raw === 2 ? 2 : 1;
}

export function setEtapaAtual(etapa: Etapa): void {
  localStorage.setItem(STORAGE_KEY_ETAPA, String(etapa));
}

export function getEtapaLocked(): 0 | Etapa {
  const raw = Number(localStorage.getItem(STORAGE_KEY_LOCKED) || 0);
  return raw === 1 || raw === 2 ? raw : 0;
}

export function setEtapaLocked(locked: 0 | Etapa): void {
  localStorage.setItem(STORAGE_KEY_LOCKED, String(locked));
}

export function getEtapaPublica(): Etapa {
  const locked = getEtapaLocked();
  if (locked === 1 || locked === 2) return locked;
  return getEtapaAtual();
}

export function isEtapaSelectableForPublic(etapa: Etapa): boolean {
  const locked = getEtapaLocked();
  return locked === 0 || locked === etapa;
}

export function getDoacoes(etapa: Etapa): Doacao[] {
  return parseJSON<Doacao[]>(localStorage.getItem(STORAGE_KEY_DOACOES(etapa)), []);
}

export function setDoacoes(etapa: Etapa, doacoes: Doacao[]): void {
  localStorage.setItem(STORAGE_KEY_DOACOES(etapa), JSON.stringify(doacoes));
}

export function getEquipes(etapa: Etapa): string[] {
  const stored = parseJSON<string[] | null>(localStorage.getItem(STORAGE_KEY_EQUIPES(etapa)), null);
  const equipes = stored?.length ? stored : EQUIPES_DEFAULT[etapa];
  return equipes.filter(Boolean);
}

export function getItensCatalogo(): ItemCatalogo[] {
  const itens = parseJSON<ItemCatalogo[]>(localStorage.getItem(STORAGE_KEY_ITENS), ITENS_DEFAULT);
  return itens.filter((item) => item?.nome && item?.unidade && item.visivel !== false);
}

export function getItensCatalogoRaw(): ItemCatalogo[] {
  return parseJSON<ItemCatalogo[]>(localStorage.getItem(STORAGE_KEY_ITENS), ITENS_DEFAULT);
}

export function setItensCatalogo(itens: ItemCatalogo[]): void {
  localStorage.setItem(STORAGE_KEY_ITENS, JSON.stringify(itens));
}

export function getCategorias(): CategoriaCatalogo[] {
  return parseJSON<CategoriaCatalogo[]>(localStorage.getItem(STORAGE_KEY_CATS), CATS_DEFAULT);
}

export function setCategorias(cats: CategoriaCatalogo[]): void {
  localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(cats));
}

export function getCategoriaNome(catId: string | undefined): string {
  if (!catId || catId === '_sem') return 'Sem categoria';
  const cat = getCategorias().find((c) => c.id === catId);
  return cat?.nome || 'Sem categoria';
}

export function setEquipes(etapa: Etapa, equipes: string[]): void {
  localStorage.setItem(STORAGE_KEY_EQUIPES(etapa), JSON.stringify(equipes));
}

export function getRecado(etapa: Etapa): string {
  return localStorage.getItem(STORAGE_KEY_RECADO(etapa)) || '';
}

export function setRecado(etapa: Etapa, recado: string): void {
  localStorage.setItem(STORAGE_KEY_RECADO(etapa), recado);
}

export function getNomeEvento(): string {
  return localStorage.getItem(STORAGE_KEY_NOME_EVENTO) || DEFAULT_NOME_EVENTO;
}

export function setNomeEvento(value: string): void {
  localStorage.setItem(STORAGE_KEY_NOME_EVENTO, value);
}

export function getVersiculo(): string {
  const stored = localStorage.getItem(STORAGE_KEY_VERSICULO)?.trim();
  return stored || DEFAULT_VERSICULO;
}

export function setVersiculo(value: string): void {
  const trimmed = value.trim();
  if (trimmed) localStorage.setItem(STORAGE_KEY_VERSICULO, trimmed);
  else localStorage.removeItem(STORAGE_KEY_VERSICULO);
}

export function getVersiculoRef(): string {
  const stored = localStorage.getItem(STORAGE_KEY_VERSICULO_REF)?.trim();
  return stored || DEFAULT_VERSICULO_REF;
}

export function setVersiculoRef(value: string): void {
  const trimmed = value.trim();
  if (trimmed) localStorage.setItem(STORAGE_KEY_VERSICULO_REF, trimmed);
  else localStorage.removeItem(STORAGE_KEY_VERSICULO_REF);
}

export function getPixChave(): string {
  return localStorage.getItem(STORAGE_KEY_PIX_CHAVE) || DEFAULT_PIX_CHAVE;
}

export function setPixChave(value: string): void {
  localStorage.setItem(STORAGE_KEY_PIX_CHAVE, value);
}

export function getPixQr(): string {
  return localStorage.getItem(STORAGE_KEY_PIX_QR) || '';
}

export function setPixQr(value: string): void {
  localStorage.setItem(STORAGE_KEY_PIX_QR, value);
}

export function getLogo(): string {
  return localStorage.getItem(STORAGE_KEY_LOGO) || '';
}

export function setLogo(value: string): void {
  localStorage.setItem(STORAGE_KEY_LOGO, value);
}

export function getAppConfig(): AppConfig {
  return {
    nomeEvento: getNomeEvento(),
    versiculo: getVersiculo(),
    versiculoRef: getVersiculoRef(),
    pixChave: getPixChave(),
    pixQr: getPixQr(),
    logo: getLogo(),
    etapaLocked: getEtapaLocked(),
  };
}

export function applyAppConfig(input: Partial<AppConfig>): void {
  if (input.nomeEvento != null) setNomeEvento(input.nomeEvento);
  if (input.versiculo?.trim()) setVersiculo(input.versiculo);
  if (input.versiculoRef?.trim()) setVersiculoRef(input.versiculoRef);
  if (input.pixChave != null) setPixChave(input.pixChave);
  if (input.pixQr != null) setPixQr(input.pixQr);
  if (input.logo != null) setLogo(input.logo);
  if (input.etapaLocked != null) setEtapaLocked(input.etapaLocked);
}

export function getInitialState(): AppState {
  return {
    etapaAtual: getEtapaAtual(),
    doacoes: {
      1: getDoacoes(1),
      2: getDoacoes(2),
    },
  };
}

export function getPublicTotais(etapa: Etapa): Array<{ nome: string; unidade: string; total: number }> {
  const totals = new Map<string, number>();
  const units = new Map<string, string>();

  for (const d of getDoacoes(etapa)) {
    for (const item of d.itens) {
      totals.set(item.nome, (totals.get(item.nome) || 0) + item.quantidade);
      units.set(item.nome, item.unidade);
    }
  }

  return [...totals.entries()]
    .map(([nome, total]) => ({ nome, unidade: units.get(nome) || '', total }))
    .sort((a, b) => b.total - a.total);
}

/** Quantidade ainda necessária na etapa. `null` = item sem meta (sem limite). */
export function getItemMetaRemaining(itemNome: string, meta: number, etapa: Etapa): number | null {
  if (!meta || meta <= 0) return null;
  const donated = getPublicTotais(etapa).find((t) => t.nome === itemNome)?.total || 0;
  return Math.max(0, meta - donated);
}

export { CATS_DEFAULT, EQUIPES_DEFAULT, ITENS_DEFAULT };
