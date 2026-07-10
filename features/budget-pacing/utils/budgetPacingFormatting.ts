// ---------------------------------------------------------------------------
// Number & date formatting helpers
// ---------------------------------------------------------------------------

export function fmtCurrency(
  value: number,
  currency = 'USD',
  compact = false,
): string {
  if (compact && Math.abs(value) >= 1_000) {
    const k = value / 1_000;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 1,
    }).format(k) + 'k';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function fmtPercent(value: number, decimals = 1): string {
  const formatted = Math.abs(value).toFixed(decimals);
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatted}%`;
}

export function fmtPercentPlain(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function fmtNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** Returns a human-readable relative time string, e.g. "3 hours ago" */
export function fmtRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Formats a diff percentage with color hint */
export function diffLabel(pct: number): string {
  if (pct === 0) return '±0%';
  return fmtPercent(pct);
}
