import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Doacao, Etapa, ItemCatalogo } from '../../src/state/types';
import { exportBackupCsv, exportEtapaCsv } from '../../src/utils/export';

// Captura o conteudo do CSV gerado pelo download, sem realmente baixar nada.
// jsdom nao implementa URL.createObjectURL nem Blob.text(), entao trocamos
// Blob por um stub que guarda o texto e interceptamos createObjectURL.
let capturedText: string[] = [];
const OriginalBlob = globalThis.Blob;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

class FakeBlob {
  parts: unknown[];
  type: string;
  constructor(parts: unknown[] = [], opts: { type?: string } = {}) {
    this.parts = parts;
    this.type = opts.type || '';
  }
}

beforeEach(() => {
  capturedText = [];
  localStorage.clear();
  globalThis.Blob = FakeBlob as unknown as typeof Blob;
  URL.createObjectURL = (blob: Blob | MediaSource) => {
    capturedText.push(((blob as unknown as FakeBlob).parts as string[]).join(''));
    return 'blob:mock';
  };
  URL.revokeObjectURL = () => undefined;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  globalThis.Blob = OriginalBlob;
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  vi.restoreAllMocks();
});

function lastCsv(): string {
  expect(capturedText.length).toBeGreaterThan(0);
  return capturedText[capturedText.length - 1];
}

const doacao: Doacao = {
  id: 1,
  nome: '=HYPERLINK(evil)',
  equipe: 'Cozinha',
  telefone: '(11) 98888-7777',
  itens: [{ nome: 'Arroz', unidade: 'kg', quantidade: 2 }],
  data: '20/06/2026',
};

describe('exportEtapaCsv', () => {
  it('inclui cabecalho e dados da doacao', () => {
    exportEtapaCsv(1, [doacao]);
    const csv = lastCsv();
    const [header] = csv.split('\r\n');
    expect(header).toContain('Nome');
    expect(header).toContain('Quantidade');
    expect(csv).toContain('Cozinha');
    expect(csv).toContain('Arroz');
  });

  it('neutraliza injecao de formula com prefixo seguro (apostrofo)', () => {
    exportEtapaCsv(1, [doacao]);
    const csv = lastCsv();
    // Sem delimitador na celula, nao ha aspas — mas o prefixo ' neutraliza a formula.
    expect(csv).toContain(`'=HYPERLINK(evil)`);
    expect(csv).not.toContain(';=HYPERLINK(evil)');
  });

  it('envolve em aspas e neutraliza quando a celula contem delimitador', () => {
    const comDelimitador: Doacao = { ...doacao, nome: '=CMD();DROP' };
    exportEtapaCsv(1, [comDelimitador]);
    const csv = lastCsv();
    expect(csv).toContain(`"'=CMD();DROP"`);
  });

  it('gera uma linha por item da doacao', () => {
    const multi: Doacao = {
      ...doacao,
      nome: 'Ana',
      itens: [
        { nome: 'Arroz', unidade: 'kg', quantidade: 2 },
        { nome: 'Feijao', unidade: 'kg', quantidade: 3 },
      ],
    };
    exportEtapaCsv(2, [multi]);
    const csv = lastCsv();
    const dataLines = csv.split('\r\n').filter((l) => l.includes('Ana'));
    expect(dataLines).toHaveLength(2);
  });
});

describe('exportBackupCsv', () => {
  it('gera as tres secoes (dados, equipe, item) com BOM', () => {
    const itens: ItemCatalogo[] = [{ nome: 'Arroz', unidade: 'kg', meta: 10, cat: 'secos', visivel: true }];
    const byEtapa: Record<Etapa, Doacao[]> = { 1: [doacao], 2: [] };
    exportBackupCsv(byEtapa, itens);
    const csv = lastCsv();
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    expect(csv).toContain('=== RESUMO POR EQUIPE ===');
    expect(csv).toContain('=== RESUMO POR ITEM ===');
    expect(csv).toContain('Cozinha');
  });
});
