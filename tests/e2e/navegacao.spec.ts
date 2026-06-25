import { expect, test } from '@playwright/test';
import { mockApi } from './_mock-api';

test('navegacao entre abas Equipistas e Coordenador exibe o gate de login', async ({ page }) => {
  await mockApi(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Aba publica ativa por padrao.
  await expect(page.getByRole('heading', { name: 'Registrar minha doacao' })).toBeVisible();

  // Ir para a area do Coordenador — deve aparecer o gate de login.
  await page.getByRole('tab', { name: /Coordenador/ }).click();
  await expect(page.getByRole('heading', { name: 'Acesso do Coordenador' })).toBeVisible();

  // Voltar para a aba publica.
  await page.getByRole('tab', { name: /Equipistas/ }).click();
  await expect(page.getByRole('heading', { name: 'Registrar minha doacao' })).toBeVisible();
});
