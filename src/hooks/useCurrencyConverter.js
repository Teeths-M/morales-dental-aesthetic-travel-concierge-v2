import { useState, useEffect } from 'react';

export const CURRENCIES = [
  { code: 'USD', symbol: '$',    flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', symbol: '€',    flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', symbol: '£',    flag: '🇬🇧', name: 'British Pound' },
  { code: 'CAD', symbol: 'CA$',  flag: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'AU$',  flag: '🇦🇺', name: 'Australian Dollar' },
  { code: 'BRL', symbol: 'R$',   flag: '🇧🇷', name: 'Brazilian Real' },
  { code: 'COP', symbol: 'COP',  flag: '🇨🇴', name: 'Colombian Peso' },
  { code: 'MXN', symbol: 'MX$',  flag: '🇲🇽', name: 'Mexican Peso' },
  { code: 'AED', symbol: 'AED',  flag: '🇦🇪', name: 'UAE Dirham' },
  { code: 'NGN', symbol: '₦',    flag: '🇳🇬', name: 'Nigerian Naira' },
  { code: 'INR', symbol: '₹',    flag: '🇮🇳', name: 'Indian Rupee' },
  { code: 'PHP', symbol: '₱',    flag: '🇵🇭', name: 'Philippine Peso' },
];

// Fallback rates vs USD (approx mid-2025)
const FALLBACK_RATES = {
  EUR: 0.92, GBP: 0.79, CAD: 1.37, AUD: 1.54,
  BRL: 5.15, COP: 4100, MXN: 17.1,
  AED: 3.67, NGN: 1620, INR: 84, PHP: 58,
};

const CACHE_KEY  = 'morales_fx_rates';
const CACHE_TTL  = 6 * 60 * 60 * 1000; // 6 hours

async function fetchRates() {
  const codes = CURRENCIES.filter(c => c.code !== 'USD').map(c => c.code).join(',');
  const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${codes}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error('rate fetch failed');
  const json = await res.json();
  return json.rates;
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { rates, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return rates;
  } catch { return null; }
}

function saveCache(rates) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, ts: Date.now() })); } catch {}
}

export function useCurrencyConverter() {
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [selectedCode, setSelectedCode] = useState('USD');

  useEffect(() => {
    const cached = loadCache();
    if (cached) { setRates(cached); return; }
    fetchRates()
      .then(r => { setRates(r); saveCache(r); })
      .catch(() => {}); // silently use fallback
  }, []);

  function convert(amountUSD) {
    if (selectedCode === 'USD' || !amountUSD) return null;
    const rate = rates[selectedCode];
    if (!rate) return null;
    return amountUSD * rate;
  }

  function formatLocal(amountUSD) {
    const local = convert(amountUSD);
    if (local === null) return null;
    const cur = CURRENCIES.find(c => c.code === selectedCode);
    if (!cur) return null;
    const formatted = local >= 1000
      ? local.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : local.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${cur.flag} ${cur.symbol}${formatted} ${cur.code}`;
  }

  const selectedCurrency = CURRENCIES.find(c => c.code === selectedCode) || CURRENCIES[0];

  return { currencies: CURRENCIES, selectedCode, setSelectedCode, selectedCurrency, convert, formatLocal };
}
