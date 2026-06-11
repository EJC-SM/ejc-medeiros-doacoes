module.exports = function handler(req, res) {
  const firebase = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  };

  const required = [
    'apiKey',
    'authDomain',
    'databaseURL',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missing = required.filter((key) => !firebase[key]);

  if (missing.length > 0) {
    res.status(500).json({
      error: 'missing_firebase_env',
      missing,
    });
    return;
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({ firebase });
};
