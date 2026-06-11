import type { AuthRole } from '../state/types';

const MIN_PASSWORD_LEN = 8;

export interface AuthChallenge {
  nonce: string;
  salt: string;
  iterations: number;
  algo: string;
  expiresAt: string;
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

function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function encodeBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]!);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < MIN_PASSWORD_LEN) {
    return `Use pelo menos ${MIN_PASSWORD_LEN} caracteres.`;
  }
  if (password.length > 80) return 'Senha muito longa.';
  return null;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function deriveKeyFromPassword(
  password: string,
  saltB64: string,
  iterations: number,
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const saltBytes = decodeBase64Url(saltB64);
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(saltBytes),
      iterations,
    },
    keyMaterial,
    256,
  );
  return encodeBase64Url(derived);
}

async function createProof(derivedKeyB64: string, nonce: string): Promise<string> {
  const keyBytes = decodeBase64Url(derivedKeyB64);
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(nonce));
  return encodeBase64Url(signature);
}

export async function fetchAuthChallenge(role: AuthRole): Promise<AuthChallenge | null> {
  try {
    const response = await fetch(`/api/auth/challenge?role=${encodeURIComponent(role)}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as AuthChallenge;
  } catch {
    return null;
  }
}

export async function buildLoginProof(
  role: AuthRole,
  password: string,
): Promise<{ proof: string; nonce: string } | { error: string }> {
  if (!password) return { error: 'Informe a senha.' };

  const challenge = await fetchAuthChallenge(role);
  if (!challenge?.nonce || !challenge.salt) {
    return { error: 'Não foi possível iniciar a autenticação.' };
  }

  const derivedKey = await deriveKeyFromPassword(password, challenge.salt, challenge.iterations);
  const proof = await createProof(derivedKey, challenge.nonce);
  return { proof, nonce: challenge.nonce };
}

export async function hashForStorage(
  password: string,
  saltB64: string,
  iterations: number,
): Promise<string | null> {
  const policyError = validatePasswordPolicy(password);
  if (policyError) return null;
  return deriveKeyFromPassword(password, saltB64, iterations);
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
