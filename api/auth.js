const crypto = require('node:crypto');
const {
  dbGet,
  applySecurityHeaders,
  isRateLimited,
  createAdminSession,
  sanitizeText,
} = require('./_firebase');

const DEFAULT_SENHA_COORD = 'ejcdoacoes2025';
const DEFAULT_SENHA_DIR = 'Senh@ejc123!*';

async function resolvePassword(role) {
  const cfg = (await dbGet('config')) || {};
  if (role === 'coordenador') return cfg.senha_coord || DEFAULT_SENHA_COORD;
  if (role === 'dirigente') return cfg.senha_dir || DEFAULT_SENHA_DIR;
  return null;
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

module.exports = async function handler(req, res) {
  try {
    applySecurityHeaders(res);

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    if (isRateLimited(req, 'auth:login', 10, 60_000)) {
      return res.status(429).json({ error: 'rate_limit_exceeded' });
    }

    const role = sanitizeText(req.body?.role, 20);
    const password = String(req.body?.password || '');

    if (role !== 'coordenador' && role !== 'dirigente') {
      return res.status(400).json({ error: 'invalid_role' });
    }
    if (!password) {
      return res.status(400).json({ error: 'password_required' });
    }

    const expected = await resolvePassword(role);
    if (!expected || !safeCompare(password, expected)) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    const session = createAdminSession(role);
    return res.status(200).json(session);
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', detail: err.message });
  }
};
