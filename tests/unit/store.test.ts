import { beforeEach, describe, expect, it } from 'vitest';
import {
  getEtapaPublica,
  getItemMetaRemaining,
  getItensCatalogo,
  getPublicTotais,
  isEtapaSelectableForPublic,
  setDoacoes,
  setEtapaAtual,
  setEtapaLocked,
  setItensCatalogo,
} from '../../src/state/store';
import type { Doacao, ItemCatalogo } from '../../src/state/types';

beforeEach(() => {
  localStorage.clear();
});

describe('getEtapaPublica / isEtapaSelectableForPublic', () => {
  it('retorna a etapa atual quando nada esta travado', () => {
    setEtapaAtual(2);
    setEtapaLocked(0);
    expect(getEtapaPublica()).toBe(2);
    expect(isEtapaSelectableForPublic(1)).toBe(true);
    expect(isEtapaSelectableForPublic(2)).toBe(true);
  });

  it('forca a etapa travada e bloqueia a outra', () => {
    setEtapaAtual(2);
    setEtapaLocked(1);
    expect(getEtapaPublica()).toBe(1);
    expect(isEtapaSelectableForPublic(1)).toBe(true);
    expect(isEtapaSelectableForPublic(2)).toBe(false);
  });
});

describe('getItensCatalogo', () => {
  it('filtra itens invisiveis ou invalidos', () => {
    const itens: ItemCatalogo[] = [
      { nome: 'Arroz', unidade: 'kg', visivel: true },
      { nome: 'Oculto', unidade: 'kg', visivel: false },
      { nome: '', unidade: 'kg', visivel: true },
    ];
    setItensCatalogo(itens);
    const visiveis = getItensCatalogo().map((i) => i.nome);
    expect(visiveis).toContain('Arroz');
    expect(visiveis).not.toContain('Oculto');
    expect(visiveis).not.toContain('');
  });
});

describe('getPublicTotais', () => {
  it('agrega quantidades por item e ordena por total desc', () => {
    const doacoes: Doacao[] = [
      { id: 1, nome: 'A', equipe: 'X', itens: [{ nome: 'Arroz', unidade: 'kg', quantidade: 2 }], data: 'd' },
      {
        id: 2,
        nome: 'B',
        equipe: 'Y',
        itens: [
          { nome: 'Arroz', unidade: 'kg', quantidade: 3 },
          { nome: 'Feijao', unidade: 'kg', quantidade: 10 },
        ],
        data: 'd',
      },
    ];
    setDoacoes(1, doacoes);
    const totais = getPublicTotais(1);
    expect(totais[0]).toEqual({ nome: 'Feijao', unidade: 'kg', total: 10 });
    expect(totais.find((t) => t.nome === 'Arroz')?.total).toBe(5);
  });
});

describe('getItemMetaRemaining', () => {
  it('retorna null quando nao ha meta', () => {
    expect(getItemMetaRemaining('Arroz', 0, 1)).toBeNull();
  });

  it('retorna o restante da meta considerando o ja doado', () => {
    setDoacoes(1, [
      { id: 1, nome: 'A', equipe: 'X', itens: [{ nome: 'Arroz', unidade: 'kg', quantidade: 4 }], data: 'd' },
    ]);
    expect(getItemMetaRemaining('Arroz', 10, 1)).toBe(6);
  });

  it('nunca retorna negativo (meta ultrapassada)', () => {
    setDoacoes(1, [
      { id: 1, nome: 'A', equipe: 'X', itens: [{ nome: 'Arroz', unidade: 'kg', quantidade: 15 }], data: 'd' },
    ]);
    expect(getItemMetaRemaining('Arroz', 10, 1)).toBe(0);
  });
});
