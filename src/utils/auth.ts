import type { AuthRole } from '../state/types';

const SESSION_KEY = 'ejc_admin_session';
const BANCO_UNLOCK_KEY = 'ejc_banco_unlock';
const BANCO_DIR_TOKEN_KEY = 'ejc_banco_dir_token';
const EMBEDDED_DIR_TOKEN_KEY = 'ejc_embedded_dir_token';

let embeddedDirigenteLogged = false;

interface AdminSession {
  role: AuthRole;
  token: string;
  expiresAt: number;
}

function readSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed.token || parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(session: AdminSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function isLoggedIn(role: AuthRole): boolean {
  const session = readSession();
  return Boolean(session && session.role === role);
}

export function getAdminSessionToken(): string | null {
  return readSession()?.token ?? null;
}

export function logout(role?: AuthRole): void {
  const session = readSession();
  if (!session) return;
  if (!role || session.role === role) {
    sessionStorage.removeItem(SESSION_KEY);
    if (!role || role === 'coordenador') {
      clearBancoUnlock();
      logoutEmbeddedDirigente();
    }
  }
}

export function isBancoDesbloqueado(): boolean {
  return sessionStorage.getItem(BANCO_UNLOCK_KEY) === '1';
}

export function clearBancoUnlock(): void {
  sessionStorage.removeItem(BANCO_UNLOCK_KEY);
  sessionStorage.removeItem(BANCO_DIR_TOKEN_KEY);
}

export function getBancoAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(BANCO_DIR_TOKEN_KEY);
  return token ? { 'x-admin-session': token } : {};
}

export async function verifyDirigentePassword(password: string): Promise<boolean> {
  const session = readSession();
  const coordSession = session?.role === 'coordenador' ? session : null;
  const result = await loginApi('dirigente', password);
  if (!result.ok) return false;
  if (coordSession) writeSession(coordSession);
  else logout('dirigente');
  return true;
}

export async function unlockBanco(password: string): Promise<boolean> {
  const session = readSession();
  const coordSession = session?.role === 'coordenador' ? session : null;
  const result = await loginApi('dirigente', password);
  if (!result.ok) return false;
  const dirSession = readSession();
  if (dirSession?.token) {
    sessionStorage.setItem(BANCO_DIR_TOKEN_KEY, dirSession.token);
    sessionStorage.setItem(BANCO_UNLOCK_KEY, '1');
  }
  if (coordSession) writeSession(coordSession);
  else logout('dirigente');
  return true;
}

export function isEmbeddedDirigenteLogged(): boolean {
  return embeddedDirigenteLogged;
}

export function logoutEmbeddedDirigente(): void {
  embeddedDirigenteLogged = false;
  sessionStorage.removeItem(EMBEDDED_DIR_TOKEN_KEY);
}

export function getEmbeddedDirigenteAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(EMBEDDED_DIR_TOKEN_KEY);
  return token ? { 'x-admin-session': token } : {};
}

export async function loginEmbeddedDirigente(password: string): Promise<boolean> {
  const session = readSession();
  const coordSession = session?.role === 'coordenador' ? session : null;
  const result = await loginApi('dirigente', password);
  if (!result.ok) return false;
  const dirSession = readSession();
  if (dirSession?.token) {
    sessionStorage.setItem(EMBEDDED_DIR_TOKEN_KEY, dirSession.token);
    embeddedDirigenteLogged = true;
  }
  if (coordSession) writeSession(coordSession);
  else logout('dirigente');
  return true;
}

export async function loginApi(role: AuthRole, password: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, password }),
    });
    const data = (await response.json()) as { token?: string; expiresAt?: number; error?: string };
    if (!response.ok || !data.token || !data.expiresAt) {
      return { ok: false, message: data.error || 'Senha incorreta.' };
    }
    writeSession({ role, token: data.token, expiresAt: data.expiresAt });
    return { ok: true };
  } catch {
    return { ok: false, message: 'Não foi possível autenticar agora.' };
  }
}

export function adminAuthHeaders(): Record<string, string> {
  const token = getAdminSessionToken();
  return token ? { 'x-admin-session': token } : {};
}
