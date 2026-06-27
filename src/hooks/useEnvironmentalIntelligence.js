/**
 * useEnvironmentalIntelligence — EVN-iQ400 data layer
 *
 * Pulls live government travel advisories from travel-advisory.info
 * (free, no API key, CORS-enabled), combines with the destination's
 * risk profile, and returns a composite 0–100 environmental risk score
 * with plain-language explanations.
 *
 * Falls back to hardcoded Morales-curated profiles when the API is
 * unavailable (offline, paused, rate-limited).
 */

import { useState, useEffect, useMemo } from 'react';

// Country name → ISO-3166-1 alpha-2 for the main medical tourism destinations
const COUNTRY_ISO = {
  'Colombia': 'CO', 'Turkey': 'TR', 'Thailand': 'TH', 'Mexico': 'MX',
  'Venezuela': 'VE', 'Brazil': 'BR', 'India': 'IN', 'Costa Rica': 'CR',
  'Panama': 'PA', 'Hungary': 'HU', 'Poland': 'PL', 'Czech Republic': 'CZ',
  'Croatia': 'HR', 'Argentina': 'AR', 'Peru': 'PE', 'Ecuador': 'EC',
  'Dominican Republic': 'DO', 'Jamaica': 'JM', 'Philippines': 'PH',
  'South Korea': 'KR', 'Japan': 'JP', 'Singapore': 'SG', 'Malaysia': 'MY',
  'Israel': 'IL', 'Jordan': 'JO', 'Spain': 'ES', 'Portugal': 'PT',
  'Germany': 'DE', 'United Kingdom': 'GB', 'France': 'FR', 'Italy': 'IT',
  'United States': 'US', 'Canada': 'CA', 'Australia': 'AU', 'Morocco': 'MA',
  'Tunisia': 'TN', 'Egypt': 'EG', 'Ukraine': 'UA', 'Georgia': 'GE',
  'Serbia': 'RS', 'Albania': 'AL', 'Taiwan': 'TW', 'Indonesia': 'ID',
};

// Morales-curated context for top medical tourism destinations
const DESTINATION_CONTEXT = {
  CO: { note: 'Bogotá and Medellín have well-monitored medical zones. Petty theft in tourist areas — keep valuables secure.', timeNote: 'Risk is higher after dark in commercial districts.' },
  TR: { note: 'Istanbul and Ankara are generally safe for medical tourists. Border regions carry higher advisories.', timeNote: 'Standard urban precautions apply at night.' },
  TH: { note: 'Bangkok\'s medical district is among Asia\'s safest for international patients. High tourist police presence.', timeNote: 'Nightlife zones have elevated risk — stick to hotel and clinic corridors.' },
  MX: { note: 'Tijuana, Mexico City, and Cancún medical zones are secured. Certain northern states carry elevated advisories.', timeNote: 'Avoid travel between cities after dark.' },
  VE: { note: 'Morales partners operate in secured zones with escorts available. General precautions are advised throughout.', timeNote: 'Night movement outside partner facilities is not recommended.' },
  BR: { note: 'São Paulo and Rio medical districts are active and monitored. Avoid unfamiliar neighbourhoods without a guide.', timeNote: 'After dark, use vetted transport only — no street taxis.' },
  IN: { note: 'Delhi, Mumbai, and Chennai have mature medical tourism infrastructure with dedicated international patient facilities.', timeNote: 'Standard urban vigilance at night.' },
  CR: { note: 'Costa Rica has one of Latin America\'s lowest crime rates. San José medical zone is well-regarded.', timeNote: 'Exercise standard precautions at night.' },
  default: { note: 'Always stay in contact with your Morales concierge and avoid unfamiliar areas without a companion.', timeNote: 'At night, use your Morales-vetted transport only.' },
};

// advisory score (1–5) → environmental risk percentage (0–100)
// 1 = "Normal precautions" → low risk
// 5 = "Avoid all travel"   → very high risk
function advisoryToRisk(score) {
  if (!score || score <= 0) return 35; // unknown = moderate baseline
  const clamped = Math.max(1, Math.min(5, score));
  return Math.round(((clamped - 1) / 4) * 85 + 5); // maps 1→5, 5→90
}

export function getRiskLevel(risk) {
  if (risk < 28) return { label: 'Low',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)',   emoji: '🟢' };
  if (risk < 52) return { label: 'Moderate', color: '#eab308', bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.35)',   emoji: '🟡' };
  if (risk < 72) return { label: 'Elevated', color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.35)',  emoji: '🟠' };
  return              { label: 'High',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   emoji: '🔴' };
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — advisories don't change hourly

function readCache(iso2) {
  try {
    const raw = sessionStorage.getItem(`evn_iq400_${iso2}`);
    if (!raw) return null;
    const { payload, ts } = JSON.parse(raw);
    return (Date.now() - ts < CACHE_TTL_MS) ? payload : null;
  } catch { return null; }
}

function writeCache(iso2, payload) {
  try {
    sessionStorage.setItem(`evn_iq400_${iso2}`, JSON.stringify({ payload, ts: Date.now() }));
  } catch {}
}

export function useEnvironmentalIntelligence({ country, countryCode: providedISO2 }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);

  const iso2 = providedISO2 || (country ? COUNTRY_ISO[country] : null);

  useEffect(() => {
    if (!country && !iso2) return;

    const cached = iso2 ? readCache(iso2) : null;
    if (cached) { setData(cached); return; }

    setLoading(true);

    (async () => {
      try {
        const res  = await fetch('https://www.travel-advisory.info/api', {
          signal: AbortSignal.timeout(8000),
        });
        const json = await res.json();

        const entry = iso2 && json?.data?.[iso2];
        if (entry) {
          const advisoryScore  = entry.advisory?.score ?? 2;
          const sourcesActive  = entry.advisory?.sources_active ?? 0;
          const apiMessage     = entry.advisory?.message ?? '';
          const riskScore      = advisoryToRisk(advisoryScore);
          const ctx            = DESTINATION_CONTEXT[iso2] || DESTINATION_CONTEXT.default;

          const payload = {
            countryCode:   iso2,
            countryName:   entry.name || country,
            advisoryScore,
            sourcesActive,
            apiMessage,
            riskScore,
            note:     ctx.note,
            timeNote: ctx.timeNote,
            source:   'live',
            updated:  entry.advisory?.updated ?? null,
          };
          writeCache(iso2, payload);
          setData(payload);
        } else {
          throw new Error('no entry');
        }
      } catch {
        // Offline / CORS / API unavailable — fall back to curated profiles
        const riskScore   = advisoryToRisk(2); // default "exercise caution" baseline
        const ctx         = (iso2 && DESTINATION_CONTEXT[iso2]) || DESTINATION_CONTEXT.default;
        setData({
          countryCode:   iso2 || '??',
          countryName:   country || 'Your Destination',
          advisoryScore: 2,
          sourcesActive: 0,
          apiMessage:    '',
          riskScore,
          note:     ctx.note,
          timeNote: ctx.timeNote,
          source:   'offline',
          updated:  null,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [iso2, country]);

  const riskLevel = useMemo(() => data ? getRiskLevel(data.riskScore) : null, [data?.riskScore]);

  return { data, loading, riskLevel };
}
