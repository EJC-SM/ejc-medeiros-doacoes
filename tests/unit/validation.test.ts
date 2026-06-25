import { describe, expect, it } from 'vitest';
import {
  validateEquipe,
  validateNome,
  validateQuantidade,
  validateTelefone,
} from '../../src/utils/validation';

describe('validateNome', () => {
  it('rejeita nome vazio', () => {
    expect(validateNome('').valid).toBe(false);
    expect(validateNome('   ').valid).toBe(false);
  });

  it('rejeita nome muito curto', () => {
    expect(validateNome('Jo').valid).toBe(false);
  });

  it('rejeita nome muito longo (> 80 chars)', () => {
    expect(validateNome('a'.repeat(81)).valid).toBe(false);
  });

  it('aceita nome valido com acentos, numeros, ponto e hifen', () => {
    expect(validateNome('Joao da Silva').valid).toBe(true);
    expect(validateNome('Maria-José 2').valid).toBe(true);
    expect(validateNome('Ana M. Souza').valid).toBe(true);
  });

  it('rejeita caracteres invalidos', () => {
    // sanitizeText remove < > " ', sobrando o resto; @ permanece e e invalido.
    expect(validateNome('Joao@Silva').valid).toBe(false);
  });
});

describe('validateEquipe', () => {
  const allowed = ['Cozinha', 'Ordem', 'Sala'];

  it('rejeita quando vazio', () => {
    expect(validateEquipe('', allowed).valid).toBe(false);
  });

  it('rejeita equipe fora da lista permitida', () => {
    expect(validateEquipe('Inexistente', allowed).valid).toBe(false);
  });

  it('aceita equipe presente na lista', () => {
    expect(validateEquipe('Cozinha', allowed).valid).toBe(true);
  });
});

describe('validateTelefone', () => {
  it('aceita telefone vazio (opcional)', () => {
    expect(validateTelefone('').valid).toBe(true);
    expect(validateTelefone('   ').valid).toBe(true);
  });

  it('exige 10 ou 11 digitos', () => {
    expect(validateTelefone('(11) 9999').valid).toBe(false);
    expect(validateTelefone('(11) 3333-4444').valid).toBe(true);
    expect(validateTelefone('(11) 98888-7777').valid).toBe(true);
    expect(validateTelefone('119888877779').valid).toBe(false);
  });
});

describe('validateQuantidade', () => {
  it('aceita inteiros de 1 a 9999', () => {
    expect(validateQuantidade(1).valid).toBe(true);
    expect(validateQuantidade(9999).valid).toBe(true);
  });

  it('rejeita valores fora do intervalo', () => {
    expect(validateQuantidade(0).valid).toBe(false);
    expect(validateQuantidade(10000).valid).toBe(false);
  });

  it('rejeita nao-inteiros e nao-finitos', () => {
    expect(validateQuantidade(1.5).valid).toBe(false);
    expect(validateQuantidade(Number.NaN).valid).toBe(false);
    expect(validateQuantidade(Number.POSITIVE_INFINITY).valid).toBe(false);
  });
});
