/**
 * Data display standards — shared formatting helpers.
 *
 * Use these everywhere instead of one-off inline formatting so dates,
 * currency, and empty fields render consistently across the app.
 * Pure functions, no side effects, safe for hot render paths.
 */

/** Em-dash placeholder for missing/empty values */
export const EMPTY = '—';

/**
 * Format a number as currency.
 * @param {number|null|undefined} value
 * @param {string} currency  ISO code (default 'USD')
 */
export function formatCurrency(value, currency = 'USD') {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
    return EMPTY;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(value));
  } catch {
    return `$${Number(value).toLocaleString()}`;
  }
}

/** Format an ISO date string as e.g. "Jun 19, 2026". */
export function formatDate(value) {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Format an ISO date string with time, e.g. "Jun 19, 2026, 3:40 PM". */
export function formatDateTime(value) {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** Relative time like "3 days ago" / "in 2 hours". Falls back to formatDate. */
export function formatRelative(value) {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const sign = diffMs < 0 ? -1 : 1;
  if (mins < 60) return rtf.format(sign * mins, 'minute');
  if (hours < 24) return rtf.format(sign * hours, 'hour');
  if (days < 30) return rtf.format(sign * days, 'day');
  return formatDate(value);
}

/** Display any value, substituting the em-dash placeholder when empty. */
export function displayField(value, fallback = EMPTY) {
  if (value === null || value === undefined || value === '') return fallback;
  return value;
}

/** Title-case a snake_case / kebab-case status or enum string. */
export function humanize(value) {
  if (!value) return EMPTY;
  return String(value)
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Truncate long text with an ellipsis at a max length. */
export function truncate(value, max = 80) {
  if (!value) return EMPTY;
  const s = String(value);
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s;
}