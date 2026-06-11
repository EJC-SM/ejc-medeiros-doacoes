import { adminAuthHeaders } from '../utils/auth';
import {
  CATS_DEFAULT,
  ITENS_DEFAULT,
  applyAppConfig,
  getEtapaAtual,
  setCategorias,
  setDoacoes,
  setEquipes,
  setEtapaAtual,
  setEtapaLocked,
  setItensCatalogo,
  setRecado,
} from './store';
import type { AppConfig, AuthRole, CategoriaCatalogo, Doacao, Etapa, ItemCatalogo } from './types';

interface ApiConfigResponse {
  etapa: Etapa;
  data: {
    itens: ItemCatalogo[];
    cats?: CategoriaCatalogo[];
    equipes: string[];
    recado: string;
    nome_evento?: string;
    versiculo?: string;
    versiculo_ref?: string;
    pix_chave?: string;
    pix_qr?: string;
    logo?: string;
    etapa_locked?: 0 | Etapa;
  };
}

interface ApiDoacoesResponse {
  etapa: Etapa;
  data: Doacao[];
}

interface ApiDoacaoResponse {
  etapa: Etapa;
  data: Doacao;
}

interface UpdateConfigInput {
  etapa: Etapa;
  itens?: ItemCatalogo[];
  cats?: CategoriaCatalogo[];
  equipes?: string[];
  recado?: string;
  nome_evento?: string;
  versiculo?: string;
  versiculo_ref?: string;
  pix_chave?: string;
  pix_qr?: string;
  logo?: string;
  etapa_locked?: 0 | Etapa;
}

interface AdminActionInput {
  etapa: Etapa;
  action: 'reset_doacoes' | 'reset_itens' | 'lock_etapa' | 'change_password';
  lock_etapa?: 0 | Etapa;
  password_role?: AuthRole;
  passwordHash?: string;
}

export interface AuthSetupStatus {
  initialSetupComplete: boolean;
  coordConfigured: boolean;
  dirConfigured: boolean;
  coordUpdatedAt: string | null;
  dirUpdatedAt: string | null;
  iterations: number;
  algo: string;
  salts?: {
    coord: string;
    dir: string;
  };
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(input, init);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function hasLocalDevApi(): boolean {
  return Boolean(import.meta.env.DEV);
}

function adminHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...adminAuthHeaders(),
    ...extra,
  };
}

export async function fetchDoacoesApi(etapa: Etapa): Promise<Doacao[] | null> {
  const response = await requestJson<ApiDoacoesResponse>(`/api/doacoes?etapa=${etapa}`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (response?.data) return response.data;
  return hasLocalDevApi() ? [] : null;
}

export async function createDoacaoApi(input: {
  etapa: Etapa;
  nome: string;
  equipe: string;
  telefone: string;
  itens: Doacao['itens'];
}): Promise<Doacao | null> {
  const response = await requestJson<ApiDoacaoResponse>('/api/doacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return response?.data ?? null;
}

export async function updateEntregaApi(
  etapa: Etapa,
  id: number,
  entregue: Doacao['entregue'] | null,
): Promise<Doacao | null> {
  const response = await requestJson<ApiDoacaoResponse>('/api/doacoes', {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify({ etapa, id, entregue }),
  });

  return response?.data ?? null;
}

export async function updateConfigApi(
  input: UpdateConfigInput,
  authOverride?: Record<string, string>,
): Promise<boolean> {
  const response = await requestJson<ApiConfigResponse>('/api/config', {
    method: 'PUT',
    headers: adminHeaders(authOverride),
    body: JSON.stringify(input),
  });
  return Boolean(response);
}

export async function adminActionApi(
  input: AdminActionInput,
  authOverride?: Record<string, string>,
): Promise<boolean> {
  const response = await requestJson<{ ok?: boolean }>('/api/admin', {
    method: 'POST',
    headers: adminHeaders(authOverride),
    body: JSON.stringify(input),
  });
  return Boolean(response?.ok);
}

function applyConfigPayload(etapa: Etapa, data: ApiConfigResponse['data']): void {
  setItensCatalogo(data.itens || []);
  if (data.cats?.length) setCategorias(data.cats);
  if (data.equipes?.length) setEquipes(etapa, data.equipes);
  setRecado(etapa, data.recado || '');
  applyAppConfig({
    nomeEvento: data.nome_evento,
    versiculo: data.versiculo,
    versiculoRef: data.versiculo_ref,
    pixChave: data.pix_chave,
    pixQr: data.pix_qr,
    logo: data.logo,
    etapaLocked: data.etapa_locked,
  });
}

export async function hydrateEtapaFromApi(etapa: Etapa): Promise<boolean> {
  const [cfgResponse, doacoes] = await Promise.all([
    requestJson<ApiConfigResponse>(`/api/config?etapa=${etapa}`, {
      method: 'GET',
      cache: 'no-store',
    }),
    fetchDoacoesApi(etapa),
  ]);

  let changed = false;

  if (cfgResponse?.data) {
    applyConfigPayload(etapa, cfgResponse.data);
    changed = true;
  }

  if (doacoes) {
    setDoacoes(etapa, doacoes);
    changed = true;
  }

  return changed;
}

export async function hydrateAllFromApi(): Promise<boolean> {
  const [cfg1, cfg2, d1, d2] = await Promise.all([
    requestJson<ApiConfigResponse>('/api/config?etapa=1', { method: 'GET', cache: 'no-store' }),
    requestJson<ApiConfigResponse>('/api/config?etapa=2', { method: 'GET', cache: 'no-store' }),
    fetchDoacoesApi(1),
    fetchDoacoesApi(2),
  ]);

  let changed = false;
  if (cfg1?.data) {
    applyConfigPayload(1, cfg1.data);
    changed = true;
  }
  if (cfg2?.data) {
    if (cfg2.data.equipes?.length) setEquipes(2, cfg2.data.equipes);
    setRecado(2, cfg2.data.recado || '');
    if (cfg2.data.cats?.length) setCategorias(cfg2.data.cats);
    changed = true;
  }
  if (d1) {
    setDoacoes(1, d1);
    changed = true;
  }
  if (d2) {
    setDoacoes(2, d2);
    changed = true;
  }
  return changed;
}

export async function switchEtapaApi(etapa: Etapa): Promise<boolean> {
  setEtapaAtual(etapa);
  return hydrateEtapaFromApi(etapa);
}

export async function lockEtapaApi(
  etapa: 0 | Etapa,
  authOverride?: Record<string, string>,
): Promise<boolean> {
  const ok = await adminActionApi(
    { etapa: getEtapaAtual(), action: 'lock_etapa', lock_etapa: etapa },
    authOverride,
  );
  if (ok) setEtapaLocked(etapa);
  return ok;
}

export async function resetDoacoesApi(etapa: Etapa, authOverride?: Record<string, string>): Promise<boolean> {
  const ok = await adminActionApi({ etapa, action: 'reset_doacoes' }, authOverride);
  if (ok) setDoacoes(etapa, []);
  return ok;
}

export async function resetItensApi(etapa: Etapa, authOverride?: Record<string, string>): Promise<boolean> {
  const ok = await adminActionApi({ etapa, action: 'reset_itens' }, authOverride);
  if (ok) {
    setItensCatalogo([...ITENS_DEFAULT]);
    setCategorias([...CATS_DEFAULT]);
  }
  return ok;
}

export async function changePasswordApi(
  role: AuthRole,
  passwordHash: string,
  authOverride?: Record<string, string>,
): Promise<boolean> {
  return adminActionApi(
    {
      etapa: getEtapaAtual(),
      action: 'change_password',
      password_role: role,
      passwordHash,
    },
    authOverride,
  );
}

export async function fetchAuthSetupStatus(): Promise<AuthSetupStatus | null> {
  try {
    const response = await fetch('/api/auth/status', { method: 'GET', cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as AuthSetupStatus;
  } catch {
    return null;
  }
}

export async function initialSetupApi(
  coordHash: string,
  dirHash: string,
  setupToken: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/initial-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-setup-token': setupToken,
      },
      body: JSON.stringify({ coordHash, dirHash }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok) return { ok: false, error: data.error || 'setup_failed' };
    return { ok: Boolean(data.ok) };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

export type { AppConfig };
