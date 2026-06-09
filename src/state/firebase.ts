import type { Doacao, Etapa, FirebaseRuntimeConfig } from './types';

declare global {
  interface Window {
    firebase?: any;
    _db?: any;
  }
}

async function loadScript(src: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar script: ${src}`));
    document.head.appendChild(script);
  });
}

async function fetchRuntimeConfig(): Promise<FirebaseRuntimeConfig | null> {
  try {
    const resp = await fetch('/api/runtime-config', { cache: 'no-store' });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { firebase?: FirebaseRuntimeConfig };
    return data.firebase ?? null;
  } catch {
    return null;
  }
}

function getLocalViteConfig(): FirebaseRuntimeConfig | null {
  const env = import.meta.env;

  const firebase: FirebaseRuntimeConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: env.VITE_FIREBASE_DATABASE_URL,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };

  const required = Object.values(firebase);
  return required.every(Boolean) ? firebase : null;
}

export async function initFirebaseGateway(): Promise<boolean> {
  const config = (await fetchRuntimeConfig()) ?? getLocalViteConfig();
  if (!config) return false;

  const appCdn = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js';
  const dbCdn = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js';

  try {
    if (!window.firebase) {
      await loadScript(appCdn);
      await loadScript(dbCdn);
    }

    if (!window.firebase?.apps?.length) {
      window.firebase.initializeApp(config);
    }

    window._db = window.firebase.database();
    return true;
  } catch {
    return false;
  }
}

export function isFirebaseReady(): boolean {
  return Boolean(window._db);
}

export async function syncDoacoesEtapa(etapa: Etapa, doacoes: Doacao[]): Promise<boolean> {
  if (!window._db) return false;

  const payload: Record<string, Doacao> = {};
  for (const d of doacoes) {
    payload[String(d.id)] = d;
  }

  try {
    await window._db.ref(`doacoes/etapa${etapa}`).set(payload);
    return true;
  } catch {
    return false;
  }
}

export async function syncConfigValue(path: string, value: unknown): Promise<boolean> {
  if (!window._db) return false;
  try {
    await window._db.ref(path).set(value);
    return true;
  } catch {
    return false;
  }
}
