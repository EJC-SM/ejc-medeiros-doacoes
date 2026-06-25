import { expect, test } from '@playwright/test';
import { mockApi } from './_mock-api';

test('fluxo publico: preencher e registrar uma doacao', async ({ page }) => {
  const created = await mockApi(page);

  await page.goto('/');
  // Aguarda a hidratacao (config/doacoes) que re-renderiza o formulario.
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Registrar minha doacao' })).toBeVisible();

  await page.getByLabel('Nome completo').fill('Maria Teste E2E');
  await page.getByLabel('Equipe').selectOption('Cozinha');

  // Selecionar o item Arroz — ao marcar, a quantidade vira 1 automaticamente.
  await page.getByLabel('Arroz (kg)').check();

  const submit = page.getByRole('button', { name: 'Confirmar doacao' });
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.locator('#form-feedback')).toHaveText('Doacao registrada com sucesso!');
  expect(created).toHaveLength(1);
  expect(created[0]).toMatchObject({ nome: 'Maria Teste E2E', equipe: 'Cozinha' });
});

test('fluxo publico: bloqueia envio quando faltam campos obrigatorios', async ({ page }) => {
  await mockApi(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const submit = page.getByRole('button', { name: 'Confirmar doacao' });
  // Sem nome/equipe/item o botao permanece desabilitado.
  await expect(submit).toBeDisabled();

  await page.getByLabel('Nome completo').fill('Ab');
  await page.getByLabel('Equipe').selectOption('Cozinha');
  // Nome muito curto e nenhum item: ainda desabilitado.
  await expect(submit).toBeDisabled();
});
