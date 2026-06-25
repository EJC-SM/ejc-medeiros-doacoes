import type { Page, Route } from '@playwright/test';

// Config retornada pelo mock de /api/config — equipes e itens nao-vazios
// garantem que o formulario publico nao fique bloqueado.
const CONFIG = {
  itens: [
    { nome: 'Arroz', unidade: 'kg', meta: 0, cat: 'secos', visivel: true },
    { nome: 'Feijao', unidade: 'kg', meta: 0, cat: 'secos', visivel: true },
  ],
  cats: [{ id: 'secos', nome: 'Alimentos Secos' }],
  equipes: ['Cozinha', 'Ordem', 'Sala'],
  recado: '',
  nome_evento: 'EJC Medeiros — Doacoes',
  versiculo: '',
  versiculo_ref: '',
  pix_chave: 'pix@ejc.com',
  pix_qr: '',
  logo: '',
  etapa_locked: 0,
};

export interface CreatedDoacao {
  id: number;
  nome: string;
  equipe: string;
  telefone: string;
  itens: unknown[];
  data: string;
}

// Intercepta todas as rotas /api/* para tornar o E2E deterministico e
// independente do Firebase. Retorna a lista de doacoes "criadas" via POST.
export async function mockApi(page: Page): Promise<CreatedDoacao[]> {
  const created: CreatedDoacao[] = [];

  await page.route('**/api/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/auth/status') {
      return route.fulfill({
        json: {
          initialSetupComplete: true,
          coordConfigured: true,
          dirConfigured: true,
          coordUpdatedAt: null,
          dirUpdatedAt: null,
          iterations: 1,
          algo: 'PBKDF2-SHA256',
        },
      });
    }

    if (path === '/api/runtime-config') {
      // Sem Firebase no E2E — o gateway desiste graciosamente.
      return route.fulfill({ status: 500, json: { error: 'missing_firebase_env', local: true } });
    }

    if (path === '/api/config') {
      const etapa = Number(url.searchParams.get('etapa') || 1);
      return route.fulfill({ json: { etapa, data: CONFIG } });
    }

    if (path === '/api/doacoes' && method === 'GET') {
      const etapa = Number(url.searchParams.get('etapa') || 1);
      return route.fulfill({ json: { etapa, data: [] } });
    }

    if (path === '/api/doacoes' && method === 'POST') {
      const body = request.postDataJSON() as CreatedDoacao & { etapa: number };
      const data: CreatedDoacao = {
        id: Date.now(),
        nome: body.nome,
        equipe: body.equipe,
        telefone: body.telefone || '',
        itens: body.itens,
        data: '20/06/2026',
      };
      created.push(data);
      return route.fulfill({ status: 201, json: { etapa: body.etapa, data } });
    }

    return route.fulfill({ status: 404, json: { error: 'not_found' } });
  });

  return created;
}
