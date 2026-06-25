import { defineConfig, devices } from '@playwright/test';

const PORT = 4318;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Todas as rotas /api/* sao interceptadas/mockadas nos testes (page.route),
    // entao o E2E nunca toca o Firebase real. Forcar memoria e seguro mesmo assim.
    env: {
      FIREBASE_DATABASE_URL: '',
      FIREBASE_API_KEY: '',
    },
  },
});
