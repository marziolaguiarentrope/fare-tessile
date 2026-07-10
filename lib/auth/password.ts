import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 10) return 'Senha deve ter pelo menos 10 caracteres.';
  if (!/[A-Z]/.test(password)) return 'Senha deve ter pelo menos 1 letra maiúscula.';
  if (!/[0-9]/.test(password)) return 'Senha deve ter pelo menos 1 número.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Senha deve ter pelo menos 1 símbolo.';
  return null;
}
