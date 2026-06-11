const { applySecurityHeaders, isRateLimited, createAdminSession, sanitizeText } = require('./_firebase');
const {
  validateRole,
  verifyProof,
  consumeChallenge,
  getStoredPasswordHash,
  getAuthStatus,
} = require('./password');

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
    const proof = sanitizeText(req.body?.proof, 128);
    const nonce = sanitizeText(req.body?.nonce, 64);

    if (!validateRole(role)) {
      return res.status(400).json({ error: 'invalid_role' });
    }
    if (!proof || !nonce) {
      return res.status(400).json({ error: 'proof_required' });
    }

    const status = await getAuthStatus();
    if (!status.initialSetupComplete) {
      return res.status(503).json({ error: 'setup_required' });
    }

    if (!(await consumeChallenge(nonce, role))) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const storedHash = await getStoredPasswordHash(role);
    if (!storedHash || !verifyProof(storedHash, nonce, proof)) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const session = createAdminSession(role);
    return res.status(200).json(session);
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', detail: err.message });
  }
};
