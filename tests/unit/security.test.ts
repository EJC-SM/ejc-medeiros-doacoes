import { beforeEach, describe, expect, it } from 'vitest';
import {
  digitsOnly,
  formatPhoneBr,
  getOrCreateClientCsrfToken,
  isValidClientCsrfToken,
  sanitizeText,
} from '../../src/utils/security';

describe('sanitizeText', () => {
  it('remove caracteres perigosos (< > " \')', () => {
    expect(sanitizeText('a"b\'c<d>e')).toBe('abcde');
  });

  it('normaliza espacos multiplos e faz trim', () => {
    expect(sanitizeText('  Joao   da    Silva  ')).toBe('Joao da Silva');
  });

  it('remove tags mantendo o texto interno', () => {
    expect(sanitizeText('<script>Maria</script>')).toBe('scriptMaria/script');
  });
});

describe('digitsOnly', () => {
  it('mantem apenas digitos', () => {
    expect(digitsOnly('(11) 98888-7777')).toBe('11988887777');
    expect(digitsOnly('abc123def')).toBe('123');
    expect(digitsOnly('')).toBe('');
  });
});

describe('formatPhoneBr', () => {
  it('formata celular de 11 digitos', () => {
    expect(formatPhoneBr('11988887777')).toBe('(11) 98888-7777');
  });

  it('formata fixo de 10 digitos', () => {
    expect(formatPhoneBr('1133334444')).toBe('(11) 3333-4444');
  });

  it('trunca alem de 11 digitos', () => {
    expect(formatPhoneBr('119888877779999')).toBe('(11) 98888-7777');
  });

  it('formata parcialmente conforme o usuario digita', () => {
    expect(formatPhoneBr('11')).toBe('(11)');
    expect(formatPhoneBr('1198')).toBe('(11) 98');
  });

  it('nao adiciona espaco antes do hifen', () => {
    expect(formatPhoneBr('11988887777')).not.toContain(' -');
  });
});

describe('CSRF client token', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('cria e reutiliza o mesmo token', () => {
    const a = getOrCreateClientCsrfToken();
    const b = getOrCreateClientCsrfToken();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(12);
  });

  it('valida o token corrente e rejeita um falso', () => {
    const token = getOrCreateClientCsrfToken();
    expect(isValidClientCsrfToken(token)).toBe(true);
    expect(isValidClientCsrfToken('curto')).toBe(false);
    expect(isValidClientCsrfToken(`${token}-adulterado`)).toBe(false);
  });
});
