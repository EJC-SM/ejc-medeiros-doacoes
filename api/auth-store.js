const { dbGet, dbSet } = require('./firebase-rest.cjs');

let memoryAuthRef = null;

function useMemoryAuthStore(store) {
  memoryAuthRef = store;
}

async function getAuthState() {
  if (memoryAuthRef) {
    if (!memoryAuthRef.auth) memoryAuthRef.auth = {};
    return memoryAuthRef.auth;
  }
  return (await dbGet('auth')) || {};
}

async function saveAuthState(auth) {
  if (memoryAuthRef) {
    memoryAuthRef.auth = auth;
    return;
  }
  await dbSet('auth', auth);
}

async function getConfigState() {
  if (memoryAuthRef?.config) return memoryAuthRef.config;
  return (await dbGet('config')) || {};
}

async function saveConfigState(cfg) {
  if (memoryAuthRef) {
    memoryAuthRef.config = cfg;
    return;
  }
  await dbSet('config', cfg);
}

module.exports = {
  useMemoryAuthStore,
  getAuthState,
  saveAuthState,
  getConfigState,
  saveConfigState,
};
