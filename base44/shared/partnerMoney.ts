/**
 * partnerMoney — decimal-safe money for the partner catalogue.
 *
 * Every amount in the catalogue is an INTEGER number of minor units (cents,
 * pence, kobo) plus an ISO-4217 currency. There is no float anywhere in the
 * path, because 0.1 + 0.2 is not 0.3 and a partner's price is not a place to
 * discover that.
 *
 * Parsing deliberately works on the decimal STRING rather than on
 * Number(value) * 100: "19.99" * 100 is 1998.9999999999998 in binary
 * floating point, which rounds wrong for some values. Splitting the string and
 * padding the fraction gets the exact integer the partner typed.
 */

/** Currencies whose minor unit is the whole unit (no decimal places). */
const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG',
  'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/** Three-decimal currencies — rare, but a "cent" assumption would be wrong. */
const THREE_DECIMAL = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

export function currencyExponent(currency: string): number {
  const code = String(currency || '').toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

/**
 * Validate an ISO currency code against the runtime's own ISO-4217 table.
 *
 * Formatting alone is not a validation: Intl.NumberFormat happily formats
 * "ZZZ" as "ZZZ 1.00" because an unknown-but-well-formed code is echoed rather
 * than rejected. That would let a partner publish a price in a currency no
 * traveller can be charged in, so the code is checked against the real list.
 */
let ISO_CURRENCIES: Set<string> | null = null;
function isoCurrencySet(): Set<string> | null {
  if (ISO_CURRENCIES) return ISO_CURRENCIES;
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
      .supportedValuesOf?.('currency');
    if (supported && supported.length > 0) {
      ISO_CURRENCIES = new Set(supported.map((code) => code.toUpperCase()));
      return ISO_CURRENCIES;
    }
  } catch {
    // Older runtime without supportedValuesOf — fall through to null.
  }
  return null;
}

export function normalizeCurrency(input: unknown): string | null {
  const code = String(input ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;

  const iso = isoCurrencySet();
  // A runtime with no ISO table still gets structural validation; where the
  // table exists, only a real currency is accepted.
  if (iso && !iso.has(code)) return null;

  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(1);
  } catch {
    return null;
  }
  return code;
}

/**
 * Parse a partner-entered amount into integer minor units.
 * Returns null for anything that is not a clean non-negative decimal — a
 * missing or unparseable price must stay missing, never become 0.
 */
export function parseAmountMinor(input: unknown, currency: string): number | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim().replace(/,/g, '');
  if (!raw) return null;
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;

  const [whole, fraction = ''] = raw.split('.');
  const exponent = currencyExponent(currency);
  if (fraction.length > exponent) return null; // more precision than the currency has

  const padded = fraction.padEnd(exponent, '0');
  const digits = `${whole}${padded}`.replace(/^0+(?=\d)/, '');
  const minor = Number(digits);
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}

/** Convert integer minor units back to a decimal string, e.g. 1999 → "19.99". */
export function minorToDecimalString(amountMinor: number, currency: string): string {
  const exponent = currencyExponent(currency);
  if (exponent === 0) return String(amountMinor);
  const negative = amountMinor < 0;
  const digits = String(Math.abs(amountMinor)).padStart(exponent + 1, '0');
  const whole = digits.slice(0, -exponent);
  const fraction = digits.slice(-exponent);
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

export function formatMinor(amountMinor: number | null | undefined, currency: string): string | null {
  if (amountMinor === null || amountMinor === undefined || !Number.isFinite(amountMinor)) return null;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizeCurrency(currency) || 'USD',
    }).format(amountMinor / (10 ** currencyExponent(currency)));
  } catch {
    return null;
  }
}

export function sumMinor(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => (
    typeof value === 'number' && Number.isFinite(value) ? total + value : total
  ), 0);
}

/**
 * Total of a package's components.
 *
 * A component contributes ONLY when it is explicitly 'included' AND carries a
 * price. Anything 'unpriced' is reported back as unpriced so the caller can
 * say so plainly; treating it as free is exactly the failure this prevents.
 */
export function packageTotalMinor(
  components: Array<{ component_state?: string; amount_minor?: number | null }> = [],
): { totalMinor: number; pricedCount: number; unpricedLabels: number } {
  let totalMinor = 0;
  let pricedCount = 0;
  let unpricedLabels = 0;
  for (const component of components) {
    if (component?.component_state !== 'included') continue;
    if (typeof component.amount_minor === 'number' && Number.isFinite(component.amount_minor)) {
      totalMinor += component.amount_minor;
      pricedCount += 1;
    } else {
      unpricedLabels += 1;
    }
  }
  return { totalMinor, pricedCount, unpricedLabels };
}