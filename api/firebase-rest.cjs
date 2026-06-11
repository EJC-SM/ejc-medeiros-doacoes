function getFirebaseBaseUrl() {
  const baseUrl = process.env.FIREBASE_DATABASE_URL;
  if (!baseUrl) return null;
  return baseUrl.replace(/\/+$/, '');
}

function hasFirebaseConfig() {
  return Boolean(getFirebaseBaseUrl());
}

function buildDbUrl(path) {
  const base = getFirebaseBaseUrl();
  if (!base) throw new Error('missing FIREBASE_DATABASE_URL');
  const secret = process.env.FIREBASE_DATABASE_SECRET;
  const auth = secret ? `?auth=${encodeURIComponent(secret)}` : '';
  return `${base}/${path}.json${auth}`;
}

async function dbGet(path) {
  const resp = await fetch(buildDbUrl(path), { method: 'GET' });
  if (!resp.ok) {
    throw new Error(`firebase GET failed: ${resp.status}`);
  }
  const data = await resp.json();
  return data ?? null;
}

async function dbSet(path, value) {
  const resp = await fetch(buildDbUrl(path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  if (!resp.ok) {
    throw new Error(`firebase PUT failed: ${resp.status}`);
  }
  return await resp.json();
}

async function dbDelete(path) {
  const resp = await fetch(buildDbUrl(path), { method: 'DELETE' });
  if (!resp.ok) {
    throw new Error(`firebase DELETE failed: ${resp.status}`);
  }
  return null;
}

function getClientFirebaseConfig(env = process.env) {
  const firebase = {
    apiKey: env.FIREBASE_API_KEY || '',
    authDomain: env.FIREBASE_AUTH_DOMAIN || '',
    databaseURL: env.FIREBASE_DATABASE_URL || '',
    projectId: env.FIREBASE_PROJECT_ID || '',
    storageBucket: env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.FIREBASE_APP_ID || '',
  };

  const complete = Object.values(firebase).every(Boolean);
  return complete ? firebase : null;
}

module.exports = {
  hasFirebaseConfig,
  dbGet,
  dbSet,
  dbDelete,
  getClientFirebaseConfig,
};
