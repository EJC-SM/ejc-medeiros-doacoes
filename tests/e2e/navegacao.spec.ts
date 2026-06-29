import { expect, test } from '@playwright/test';
import { mockApi } from './_mock-api';

test('rota publica nao expoe acesso ao Coordenador', async ({ page }) => {
  await mockApi(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Formulario publico ativo.
  await expect(page.getByRole('heading', { name: 'Registrar minha doacao' })).toBeVisible();

  // Nao deve existir aba/menu de Coordenador na rota publica.
  await expect(page.getByRole('tab', { name: /Coordenador/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Acesso do Coordenador' })).toHaveCount(0);
});

test('rota /admin exibe o gate de login do Coordenador', async ({ page }) => {
  await mockApi(page);

  await page.goto('/admin');
  await page.waitForLoadState('networkidle');

  // Gate de login do Coordenador.
  await expect(page.getByRole('heading', { name: 'Acesso do Coordenador' })).toBeVisible();

  // O formulario publico nao deve aparecer na rota admin.
  await expect(page.getByRole('heading', { name: 'Registrar minha doacao' })).toHaveCount(0);
});
