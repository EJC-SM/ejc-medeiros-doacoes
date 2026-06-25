const CSRF_SESSION_KEY = 'ejc_csrf_token';

export function sanitizeText(value: string): string {
  return value
    .replace(/[<>"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '');
}

function joinPhoneParts(ddd: string, prefix: string, suffix: string): string {
  let out = ddd ? `(${ddd})` : '';
  if (prefix) out += `${out ? ' ' : ''}${prefix}`;
  if (suffix) out += `-${suffix}`;
  return out;
}

export function formatPhoneBr(value: string): string {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length <= 10) {
    return joinPhoneParts(d.slice(0, 2), d.slice(2, 6), d.slice(6, 10));
  }
  return joinPhoneParts(d.slice(0, 2), d.slice(2, 7), d.slice(7, 11));
}

export function getOrCreateClientCsrfToken(): string {
  const existing = sessionStorage.getItem(CSRF_SESSION_KEY);
  if (existing) return existing;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem(CSRF_SESSION_KEY, token);
  return token;
}

export function isValidClientCsrfToken(token: string): boolean {
  return token.length > 12 && token === sessionStorage.getItem(CSRF_SESSION_KEY);
}
