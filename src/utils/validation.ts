import { digitsOnly, sanitizeText } from './security';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateNome(value: string): ValidationResult {
  const nome = sanitizeText(value);
  if (!nome) return { valid: false, message: 'Digite seu nome completo.' };
  if (nome.length < 3) return { valid: false, message: 'Nome muito curto.' };
  if (nome.length > 80) return { valid: false, message: 'Nome muito longo.' };
  const ok = /^[\p{L}0-9 .-]+$/u.test(nome);
  if (!ok) return { valid: false, message: 'Nome possui caracteres inválidos.' };
  return { valid: true };
}

export function validateEquipe(value: string, allowed: string[]): ValidationResult {
  if (!value) return { valid: false, message: 'Selecione sua equipe.' };
  if (!allowed.includes(value)) return { valid: false, message: 'Equipe inválida.' };
  return { valid: true };
}

export function validateTelefone(value: string): ValidationResult {
  if (!value.trim()) return { valid: true };
  const d = digitsOnly(value);
  if (!(d.length === 10 || d.length === 11)) {
    return { valid: false, message: 'Telefone deve ter 10 ou 11 dígitos.' };
  }
  return { valid: true };
}

export function validateQuantidade(value: number): ValidationResult {
  if (!Number.isFinite(value)) return { valid: false, message: 'Quantidade inválida.' };
  if (!Number.isInteger(value)) return { valid: false, message: 'Quantidade deve ser inteira.' };
  if (value < 1) return { valid: false, message: 'Quantidade mínima é 1.' };
  if (value > 9999) return { valid: false, message: 'Quantidade máxima é 9999.' };
  return { valid: true };
}
