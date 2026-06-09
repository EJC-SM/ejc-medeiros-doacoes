module.exports = function handler(req, res) {
  const storage = process.env.FIREBASE_DATABASE_URL ? 'firebase' : 'memory';
  res.status(200).json({
    ok: true,
    service: 'ejc-medeiros-doacoes-api',
    storage,
    timestamp: new Date().toISOString(),
  });
};
