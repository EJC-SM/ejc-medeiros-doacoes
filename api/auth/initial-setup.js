const { applySecurityHeaders, isRateLimited, sanitizeText } = require('../_firebase');
const { completeInitialSetup, verifySetupToken } = require('../password');

module.exports = async function handler(req, res) {
  try {
    applySecurityHeaders(res);

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    if (isRateLimited(req, 'auth:initial-setup', 5, 60_000)) {
      return res.status(429).json({ error: 'rate_limit_exceeded' });
    }

    if (!verifySetupToken(req)) {
      return res.status(401).json({ error: 'invalid_setup_token' });
    }

    const coordHash = sanitizeText(req.body?.coordHash, 128);
    const dirHash = sanitizeText(req.body?.dirHash, 128);

    const result = await completeInitialSetup(coordHash, dirHash);
    if (!result.ok) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.status(200).json({ ok: true, message: 'initial_setup_complete' });
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', detail: err.message });
  }
};
