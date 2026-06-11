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

export function formatPhoneBr(value: string): string {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length <= 10) {
    const p1 = d.slice(0, 2);
    const p2 = d.slice(2, 6);
    const p3 = d.slice(6, 10);
    return [p1 && `(${p1})`, p2, p3 && `-${p3}`].filter(Boolean).join(' ');
  }
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 7);
  const p3 = d.slice(7, 11);
  return [p1 && `(${p1})`, p2, p3 && `-${p3}`].filter(Boolean).join(' ');
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
