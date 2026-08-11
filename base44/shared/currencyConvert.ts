/**
 * currencyConvert — dormant exchange-rate adapter, same discipline as
 * providerDiscovery.ts: modeled on registryLookup.ts's { supported: boolean }
 * shape, ZERO callers anywhere in the app, not granted to M-Care's agent.
 *
 * No currency-conversion code of any kind existed anywhere in this repo
 * before this file — confirmed by a repo-wide search. Until a real
 * EXCHANGE_RATE_API_KEY is added as a Base44 secret, this honestly reports
 * unavailable rather than inventing a rate or silently returning the
 * unconverted amount.
 *
 * NOTE: the ExchangeRate-API v6 pair-conversion response shape below
 * (`result`, `conversion_rate`, `conversion_result`) is written from
 * documentation, not verified against a live call — re-confirm against
 * https://www.exchangerate-api.com's current docs before this is ever wired
 * into a live function.
 */

export type CurrencyConversionResponse =
  | { supported: false; message: string }
  | { supported: true; amount: number; from: string; to: string; converted: number; rate: number };

export async function convertCurrency(amount: number, from: string, to: string): Promise<CurrencyConversionResponse> {
  const apiKey = Deno.env.get('EXCHANGE_RATE_API_KEY');
  if (!apiKey) {
    return {
      supported: false,
      message: 'No EXCHANGE_RATE_API_KEY configured — currency conversion is not live yet. Add an ExchangeRate-API key as a Base44 secret to activate this.',
    };
  }

  const fromCode = from.toUpperCase();
  const toCode = to.toUpperCase();

  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${fromCode}/${toCode}/${amount}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) {
      return { supported: false, message: `Exchange rate lookup failed (HTTP ${res.status}).` };
    }
    const data = await res.json();
    if (data?.result !== 'success') {
      return { supported: false, message: data?.['error-type'] || 'Exchange rate lookup failed.' };
    }
    return {
      supported: true,
      amount,
      from: fromCode,
      to: toCode,
      converted: data.conversion_result,
      rate: data.conversion_rate,
    };
  } catch {
    return { supported: false, message: 'Currency conversion request failed.' };
  }
}
