const { applySecurityHeaders, isRateLimited } = require('../_firebase');
const { getAuthStatus, getSetupPublicParams } = require('../password');

module.exports = async function handler(req, res) {
  try {
    applySecurityHeaders(res);

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    if (isRateLimited(req, 'auth:status', 60, 60_000)) {
      return res.status(429).json({ error: 'rate_limit_exceeded' });
    }

    const status = await getAuthStatus();
    const setupParams = status.initialSetupComplete ? null : await getSetupPublicParams();

    return res.status(200).json({
      ...status,
      ...(setupParams
        ? {
            salts: setupParams.salts,
          }
        : {}),
    });
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', detail: err.message });
  }
};
