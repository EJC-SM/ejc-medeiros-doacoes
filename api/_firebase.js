const crypto = require('node:crypto');
const { dbGet, dbSet } = require('./firebase-rest.cjs');

function sanitizeText(value, maxLen) {
  const text = String(value || '')
    .replace(/[<>"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return maxLen ? text.slice(0, maxLen) : text;
}

function validateEtapa(value) {
  const etapa = Number(value);
  if (etapa !== 1 && etapa !== 2) {
    throw new Error('etapa must be 1 or 2');
  }
  return etapa;
}

const RATE_LIMIT_BUCKET = new Map();
const SESSION_BUCKET = new Map();

function getSessionSecret() {
  return process.env.ADMIN_API_TOKEN || process.env.SESSION_SECRET || 'ejc-dev-session-secret';
}

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'self'");
}

function getClientIp(req) {
  const fromHeader = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return fromHeader || req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(req, scope, maxRequests, windowMs) {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${scope}:${ip}`;
  const previous = RATE_LIMIT_BUCKET.get(key) || [];
  const validWindow = previous.filter((t) => now - t < windowMs);

  if (validWindow.length >= maxRequests) {
    RATE_LIMIT_BUCKET.set(key, validWindow);
    return true;
  }

  validWindow.push(now);
  RATE_LIMIT_BUCKET.set(key, validWindow);
  return false;
}

function createAdminSession(role) {
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  const payload = `${role}:${expiresAt}:${crypto.randomBytes(12).toString('hex')}`;
  const signature = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
  const token = `${Buffer.from(payload).toString('base64url')}.${signature}`;
  SESSION_BUCKET.set(token, { role, expiresAt });
  return { token, expiresAt };
}

function verifyAdminSession(token) {
  if (!token) return null;
  const cached = SESSION_BUCKET.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const parts = String(token).split('.');
  if (parts.length !== 2) return null;
  const payload = Buffer.from(parts[0], 'base64url').toString('utf8');
  const expected = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
  if (expected !== parts[1]) return null;

  const [role, expiresAtRaw] = payload.split(':');
  const expiresAt = Number(expiresAtRaw);
  if (!role || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  if (role !== 'coordenador' && role !== 'dirigente') return null;

  const session = { role, expiresAt };
  SESSION_BUCKET.set(token, session);
  return session;
}

function requireAdminToken(req) {
  const required = process.env.ADMIN_API_TOKEN;
  if (!required) return true;
  const incoming = String(req.headers['x-admin-token'] || '');
  return incoming.length > 0 && incoming === required;
}

function requireAdminAccess(req) {
  if (requireAdminToken(req)) return true;
  const session = verifyAdminSession(String(req.headers['x-admin-session'] || ''));
  return Boolean(session);
}

function requireDirigenteAccess(req) {
  if (requireAdminToken(req)) return true;
  const session = verifyAdminSession(String(req.headers['x-admin-session'] || ''));
  return session?.role === 'dirigente';
}

function getConfigMutationFields(body) {
  const fields = [];
  if (Array.isArray(body?.itens)) fields.push('itens');
  if (Array.isArray(body?.cats)) fields.push('cats');
  if (Array.isArray(body?.equipes)) fields.push('equipes');
  if (typeof body?.recado === 'string') fields.push('recado');
  if (typeof body?.nome_evento === 'string') fields.push('nome_evento');
  if (typeof body?.versiculo === 'string') fields.push('versiculo');
  if (typeof body?.versiculo_ref === 'string') fields.push('versiculo_ref');
  if (typeof body?.pix_chave === 'string') fields.push('pix_chave');
  if (typeof body?.pix_qr === 'string') fields.push('pix_qr');
  if (typeof body?.logo === 'string') fields.push('logo');
  if (body?.etapa_locked != null) fields.push('etapa_locked');
  return fields;
}

function isRecadoOnlyConfigUpdate(body) {
  const fields = getConfigMutationFields(body);
  return fields.length === 1 && fields[0] === 'recado';
}

function requireConfigUpdateAccess(req, body) {
  if (isRecadoOnlyConfigUpdate(body)) return requireAdminAccess(req);
  return requireDirigenteAccess(req);
}

module.exports = {
  dbGet,
  dbSet,
  sanitizeText,
  validateEtapa,
  applySecurityHeaders,
  isRateLimited,
  requireAdminToken,
  requireAdminAccess,
  requireDirigenteAccess,
  requireConfigUpdateAccess,
  isRecadoOnlyConfigUpdate,
  createAdminSession,
  verifyAdminSession,
  getSessionSecret,
};
