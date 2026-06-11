const crypto = require('node:crypto');
const { getAuthState, saveAuthState, getConfigState, saveConfigState } = require('./auth-store');

const AUTH_ALGO = 'pbkdf2-sha256';
const AUTH_ITERATIONS = 210000;
const AUTH_KEY_LEN = 32;
const NONCE_TTL_MS = 60_000;

const NONCE_BUCKET = new Map();

function timingSafeEqualText(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function roleSaltKey(role) {
  return role === 'coordenador' ? 'coord' : 'dir';
}

function passwordNodeKey(role) {
  return role === 'coordenador' ? 'senha_coord' : 'senha_dir';
}

function validateRole(role) {
  return role === 'coordenador' || role === 'dirigente';
}

function validatePasswordHashFormat(hash) {
  if (typeof hash !== 'string') return false;
  if (hash.length < 32 || hash.length > 128) return false;
  return /^[A-Za-z0-9_-]+$/.test(hash);
}

function createProof(derivedKeyB64, nonce) {
  const key = Buffer.from(derivedKeyB64, 'base64url');
  return crypto.createHmac('sha256', key).update(String(nonce)).digest('base64url');
}

function verifyProof(storedHashB64, nonce, proof) {
  if (!validatePasswordHashFormat(storedHashB64) || !proof) return false;
  const expected = createProof(storedHashB64, nonce);
  return timingSafeEqualText(expected, proof);
}

function newSalt() {
  return crypto.randomBytes(16).toString('base64url');
}

async function ensureRoleSalt(auth, role) {
  if (!auth.salts) auth.salts = {};
  const key = roleSaltKey(role);
  if (!auth.salts[key]) auth.salts[key] = newSalt();
  return auth.salts[key];
}

async function getPublicAuthParams(role) {
  if (!validateRole(role)) return null;
  const auth = await getAuthState();
  const salt = await ensureRoleSalt(auth, role);
  if (!auth.meta) {
    auth.meta = { version: 1, algo: AUTH_ALGO, iterations: AUTH_ITERATIONS };
  }
  await saveAuthState(auth);
  return {
    role,
    salt,
    iterations: AUTH_ITERATIONS,
    algo: AUTH_ALGO,
  };
}

function issueChallenge(role) {
  const nonce = crypto.randomBytes(16).toString('base64url');
  NONCE_BUCKET.set(nonce, { role, expiresAt: Date.now() + NONCE_TTL_MS, used: false });
  return nonce;
}

function consumeChallenge(nonce, role) {
  const entry = NONCE_BUCKET.get(String(nonce || ''));
  if (!entry || entry.used || entry.role !== role) return false;
  if (entry.expiresAt < Date.now()) {
    NONCE_BUCKET.delete(String(nonce));
    return false;
  }
  entry.used = true;
  return true;
}

async function getStoredPasswordHash(role) {
  const auth = await getAuthState();
  const node = auth[passwordNodeKey(role)];
  return node?.hash || null;
}

async function getAuthStatus() {
  const auth = await getAuthState();
  return {
    initialSetupComplete: Boolean(auth.meta?.initialSetupComplete),
    coordConfigured: Boolean(auth.senha_coord?.hash),
    dirConfigured: Boolean(auth.senha_dir?.hash),
    coordUpdatedAt: auth.senha_coord?.updatedAt || null,
    dirUpdatedAt: auth.senha_dir?.updatedAt || null,
    iterations: AUTH_ITERATIONS,
    algo: AUTH_ALGO,
  };
}

async function getSetupPublicParams() {
  const auth = await getAuthState();
  await ensureRoleSalt(auth, 'coordenador');
  await ensureRoleSalt(auth, 'dirigente');
  if (!auth.meta) {
    auth.meta = { version: 1, algo: AUTH_ALGO, iterations: AUTH_ITERATIONS };
  }
  await saveAuthState(auth);
  const fresh = await getAuthState();
  return {
    initialSetupComplete: Boolean(fresh.meta?.initialSetupComplete),
    iterations: AUTH_ITERATIONS,
    algo: AUTH_ALGO,
    salts: {
      coord: fresh.salts?.coord || '',
      dir: fresh.salts?.dir || '',
    },
  };
}

async function completeInitialSetup(coordHash, dirHash) {
  const auth = await getAuthState();
  if (auth.meta?.initialSetupComplete) {
    return { ok: false, status: 410, error: 'setup_already_completed' };
  }
  if (!validatePasswordHashFormat(coordHash) || !validatePasswordHashFormat(dirHash)) {
    return { ok: false, status: 400, error: 'invalid_password_hash' };
  }

  await ensureRoleSalt(auth, 'coordenador');
  await ensureRoleSalt(auth, 'dirigente');
  const now = new Date().toISOString();
  auth.senha_coord = { hash: coordHash, updatedAt: now };
  auth.senha_dir = { hash: dirHash, updatedAt: now };
  auth.meta = {
    version: 1,
    algo: AUTH_ALGO,
    iterations: AUTH_ITERATIONS,
    initialSetupComplete: true,
    completedAt: now,
  };
  await saveAuthState(auth);

  const cfg = (await getConfigState()) || {};
  delete cfg.senha_coord;
  delete cfg.senha_dir;
  await saveConfigState(cfg);

  return { ok: true, status: 200 };
}

async function setPasswordHash(role, passwordHash) {
  if (!validateRole(role)) return { ok: false, error: 'invalid_role' };
  if (!validatePasswordHashFormat(passwordHash)) return { ok: false, error: 'invalid_password_hash' };

  const auth = await getAuthState();
  if (!auth.meta?.initialSetupComplete) {
    return { ok: false, error: 'setup_required' };
  }

  await ensureRoleSalt(auth, role);
  const now = new Date().toISOString();
  auth[passwordNodeKey(role)] = { hash: passwordHash, updatedAt: now };
  await saveAuthState(auth);
  return { ok: true, updatedAt: now };
}

function verifySetupToken(req) {
  const required = String(process.env.AUTH_SETUP_TOKEN || '');
  if (!required) return false;
  const incoming = String(req.headers['x-setup-token'] || '');
  return incoming.length > 0 && timingSafeEqualText(incoming, required);
}

module.exports = {
  AUTH_ALGO,
  AUTH_ITERATIONS,
  validateRole,
  validatePasswordHashFormat,
  createProof,
  verifyProof,
  getPublicAuthParams,
  issueChallenge,
  consumeChallenge,
  getStoredPasswordHash,
  getAuthStatus,
  getSetupPublicParams,
  completeInitialSetup,
  setPasswordHash,
  verifySetupToken,
};
