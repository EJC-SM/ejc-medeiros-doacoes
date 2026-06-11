const { applySecurityHeaders, isRateLimited, sanitizeText } = require('../_firebase');
const { validateRole, getPublicAuthParams, issueChallenge } = require('../password');

module.exports = async function handler(req, res) {
  try {
    applySecurityHeaders(res);

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    if (isRateLimited(req, 'auth:challenge', 30, 60_000)) {
      return res.status(429).json({ error: 'rate_limit_exceeded' });
    }

    const role = sanitizeText(req.query?.role, 20);
    if (!validateRole(role)) {
      return res.status(400).json({ error: 'invalid_role' });
    }

    const params = await getPublicAuthParams(role);
    if (!params) {
      return res.status(400).json({ error: 'invalid_role' });
    }

    const nonce = await issueChallenge(role);
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    return res.status(200).json({
      nonce,
      salt: params.salt,
      iterations: params.iterations,
      algo: params.algo,
      expiresAt,
    });
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', detail: err.message });
  }
};
