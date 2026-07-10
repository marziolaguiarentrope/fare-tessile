import type { PhoneParts } from './types';

export function normalizePhoneNumber(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
}

export function getPhoneParts(value: unknown): PhoneParts {
  const raw = String(value ?? '');
  const normalized = normalizePhoneNumber(raw);

  return {
    raw,
    normalized,
    last10: normalized.slice(-10),
    last7: normalized.slice(-7),
    last4: normalized.slice(-4),
  };
}

