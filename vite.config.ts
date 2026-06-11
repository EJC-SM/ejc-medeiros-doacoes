import { createRequire } from 'node:module';
import { defineConfig, loadEnv } from 'vite';

const require = createRequire(import.meta.url);

function applyServerEnv(mode: string): void {
  const env = loadEnv(mode, process.cwd(), '');
  const keys = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_DATABASE_URL',
    'FIREBASE_DATABASE_SECRET',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'ADMIN_API_TOKEN',
    'SESSION_SECRET',
    'AUTH_SETUP_TOKEN',
  ];

  for (const key of keys) {
    if (env[key]) process.env[key] = env[key];
  }
}

export default defineConfig(({ mode }) => {
  applyServerEnv(mode);

  return {
    plugins: [
      {
        name: 'ejc-local-api',
        configureServer(server) {
          const { createDevApiMiddleware } = require('./api/dev-server.cjs');
          server.middlewares.use(createDevApiMiddleware());
        },
      },
    ],
  };
});
