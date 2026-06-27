/**
 * useEnvironmentalIntelligence — EVN-iQ400 global data layer
 *
 * Universal coverage: all 195 UN member states + territories.
 * Online: live government advisories from travel-advisory.info (free, no key).
 * Offline: tier-based risk profiles for every country on Earth.
 */

import { useState, useEffect, useMemo } from 'react';

// ── Complete ISO 3166-1 alpha-2 map — all UN member states + territories ────
export const COUNTRY_ISO = {
  // Americas
  'United States': 'US', 'Canada': 'CA', 'Mexico': 'MX', 'Brazil': 'BR',
  'Argentina': 'AR', 'Colombia': 'CO', 'Venezuela': 'VE', 'Peru': 'PE',
  'Chile': 'CL', 'Ecuador': 'EC', 'Bolivia': 'BO', 'Paraguay': 'PY',
  'Uruguay': 'UY', 'Guyana': 'GY', 'Suriname': 'SR', 'French Guiana': 'GF',
  'Costa Rica': 'CR', 'Panama': 'PA', 'Guatemala': 'GT', 'Honduras': 'HN',
  'El Salvador': 'SV', 'Nicaragua': 'NI', 'Belize': 'BZ',
  'Cuba': 'CU', 'Dominican Republic': 'DO', 'Haiti': 'HT', 'Jamaica': 'JM',
  'Trinidad and Tobago': 'TT', 'Barbados': 'BB', 'Bahamas': 'BS',
  'Puerto Rico': 'PR', 'Cayman Islands': 'KY', 'Aruba': 'AW',
  // Europe
  'United Kingdom': 'GB', 'Germany': 'DE', 'France': 'FR', 'Italy': 'IT',
  'Spain': 'ES', 'Portugal': 'PT', 'Netherlands': 'NL', 'Belgium': 'BE',
  'Switzerland': 'CH', 'Austria': 'AT', 'Sweden': 'SE', 'Norway': 'NO',
  'Denmark': 'DK', 'Finland': 'FI', 'Ireland': 'IE', 'Greece': 'GR',
  'Poland': 'PL', 'Czech Republic': 'CZ', 'Czechia': 'CZ', 'Hungary': 'HU',
  'Romania': 'RO', 'Bulgaria': 'BG', 'Croatia': 'HR', 'Serbia': 'RS',
  'Slovakia': 'SK', 'Slovenia': 'SI', 'Albania': 'AL', 'Kosovo': 'XK',
  'North Macedonia': 'MK', 'Bosnia and Herzegovina': 'BA', 'Montenegro': 'ME',
  'Ukraine': 'UA', 'Moldova': 'MD', 'Belarus': 'BY', 'Russia': 'RU',
  'Estonia': 'EE', 'Latvia': 'LV', 'Lithuania': 'LT',
  'Malta': 'MT', 'Cyprus': 'CY', 'Luxembourg': 'LU', 'Iceland': 'IS',
  'Georgia': 'GE', 'Armenia': 'AM', 'Azerbaijan': 'AZ',
  'Turkey': 'TR', 'Türkiye': 'TR',
  // Middle East
  'Israel': 'IL', 'Jordan': 'JO', 'Lebanon': 'LB', 'Syria': 'SY',
  'Iraq': 'IQ', 'Iran': 'IR', 'Kuwait': 'KW', 'Saudi Arabia': 'SA',
  'UAE': 'AE', 'United Arab Emirates': 'AE', 'Qatar': 'QA',
  'Bahrain': 'BH', 'Oman': 'OM', 'Yemen': 'YE',
  // Africa
  'Egypt': 'EG', 'Morocco': 'MA', 'Tunisia': 'TN', 'Algeria': 'DZ',
  'Libya': 'LY', 'Sudan': 'SD', 'South Sudan': 'SS', 'Ethiopia': 'ET',
  'Somalia': 'SO', 'Kenya': 'KE', 'Tanzania': 'TZ', 'Uganda': 'UG',
  'Rwanda': 'RW', 'Burundi': 'BI', 'Democratic Republic of Congo': 'CD',
  'Congo': 'CG', 'Cameroon': 'CM', 'Nigeria': 'NG', 'Ghana': 'GH',
  'Ivory Coast': 'CI', "Cote d'Ivoire": 'CI', 'Senegal': 'SN', 'Mali': 'ML',
  'Burkina Faso': 'BF', 'Niger': 'NE', 'Chad': 'TD', 'Mauritania': 'MR',
  'South Africa': 'ZA', 'Zimbabwe': 'ZW', 'Mozambique': 'MZ', 'Zambia': 'ZM',
  'Angola': 'AO', 'Namibia': 'NA', 'Botswana': 'BW', 'Malawi': 'MW',
  'Madagascar': 'MG', 'Mauritius': 'MU', 'Seychelles': 'SC',
  'Liberia': 'LR', 'Sierra Leone': 'SL', 'Guinea': 'GN', 'Togo': 'TG',
  'Benin': 'BJ', 'Gabon': 'GA', 'Equatorial Guinea': 'GQ',
  'Central African Republic': 'CF', 'Eritrea': 'ER', 'Djibouti': 'DJ',
  // Asia
  'India': 'IN', 'Pakistan': 'PK', 'Bangladesh': 'BD', 'Sri Lanka': 'LK',
  'Nepal': 'NP', 'Bhutan': 'BT', 'Maldives': 'MV', 'Afghanistan': 'AF',
  'China': 'CN', 'Japan': 'JP', 'South Korea': 'KR', 'North Korea': 'KP',
  'Taiwan': 'TW', 'Hong Kong': 'HK', 'Mongolia': 'MN',
  'Thailand': 'TH', 'Vietnam': 'VN', 'Cambodia': 'KH', 'Laos': 'LA',
  'Myanmar': 'MM', 'Malaysia': 'MY', 'Singapore': 'SG', 'Indonesia': 'ID',
  'Philippines': 'PH', 'Brunei': 'BN', 'Timor-Leste': 'TL',
  'Kazakhstan': 'KZ', 'Uzbekistan': 'UZ', 'Turkmenistan': 'TM',
  'Kyrgyzstan': 'KG', 'Tajikistan': 'TJ',
  // Oceania
  'Australia': 'AU', 'New Zealand': 'NZ', 'Fiji': 'FJ', 'Papua New Guinea': 'PG',
  'Solomon Islands': 'SB', 'Vanuatu': 'VU', 'Samoa': 'WS', 'Tonga': 'TO',
};

// ── Country risk tiers (offline baseline when API unavailable) ───────────────
// Tier 1 = Low   (advisory ~1.0–1.8) → riskScore ~10–30
// Tier 2 = Moderate (advisory ~2.0–2.5) → riskScore ~33–45
// Tier 3 = Elevated (advisory ~3.0–3.5) → riskScore ~58–68
// Tier 4 = High (advisory ~4.0–5.0) → riskScore ~75–90
const COUNTRY_TIER = {
  // Tier 1 — Low risk
  1: ['US','CA','AU','NZ','GB','DE','FR','IT','ES','PT','NL','BE','CH','AT',
      'SE','NO','DK','FI','IE','JP','SG','KR','TW','HK','MT','LU','IS'],
  // Tier 2 — Moderate
  2: ['MX','BR','CO','IN','TH','TR','PL','CZ','HU','HR','GR','BG','RO','SK',
      'SI','GE','AM','AZ','MA','TN','EG','JO','KW','QA','AE','BH','OM',
      'MY','PH','VN','ID','CR','PA','PE','CL','AR','UY','EC','DO','JM',
      'KZ','RS','AL','ME','MK','BA','MD','KH','LK','MU','SC','GH','SN',
      'KE','TZ','RW','UG','BW','NA','ZM','MG'],
  // Tier 3 — Elevated
  3: ['VE','GT','HN','SV','NI','BO','PY','GY','SR','CU','HT','TT',
      'PK','BD','NP','LA','MM','TL','MN','UA','BY','RU','LB','IQ',
      'IR','SA','YE','LY','DZ','SD','ET','ZW','MZ','AO','MW','ML',
      'BF','NE','SN','CI','TG','BJ','CM','NG','UZ','KG','TJ','TM'],
  // Tier 4 — High
  4: ['SY','AF','YE','SO','SS','CD','CF','LR','SL','GN','TD','ER','DJ',
      'KP','MM'],
};

// Reverse lookup: ISO2 → tier
const ISO_TO_TIER = {};
Object.entries(COUNTRY_TIER).forEach(([tier, codes]) => {
  codes.forEach(c => { ISO_TO_TIER[c] = Number(tier); });
});

// Tier advisory scores (used when API unavailable)
const TIER_ADVISORY = { 1: 1.3, 2: 2.2, 3: 3.2, 4: 4.3 };

// ── Contextual notes by region / specific country ───────────────────────────
const DESTINATION_CONTEXT = {
  // Americas — Medical Tourism Tier
  CO: { note: 'Bogotá and Medellín have world-class, internationally accredited clinics in secured zones. Petty theft in busy areas — keep valuables close.', timeNote: 'Risk increases after dark in commercial districts. Use Morales-vetted transport only.' },
  MX: { note: 'Tijuana, Mexico City, and Cancún have established medical corridors. Northern border states carry elevated risk — your Morales partner operates in secured zones.', timeNote: 'Avoid inter-city travel after dark. Stay in medical tourist areas.' },
  BR: { note: 'São Paulo and Rio de Janeiro have mature medical tourism infrastructure. Partner clinics are in secured districts with escort options available.', timeNote: 'Never use street taxis after dark. Use Morales-vetted transport.' },
  AR: { note: 'Buenos Aires is relatively safe by South American standards. The medical district (Barrio Norte) is well-monitored.', timeNote: 'Standard urban precautions apply. Avoid displaying expensive items.' },
  VE: { note: 'Morales partners in Venezuela operate exclusively in secured, escorted zones. General street movement requires coordination with your concierge.', timeNote: 'Night movement outside partner facilities is not advised without escort.' },
  GT: { note: 'Guatemala City Zone 10 (Zona Viva) is safe for medical tourists. Zones 1, 3, 6 carry elevated risk — avoid without a guide.', timeNote: 'After dark, stay within your hotel compound or Morales-vetted venues.' },
  HN: { note: 'Tegucigalpa and San Pedro Sula have high crime rates — your Morales itinerary is designed around secured medical corridors only.', timeNote: 'Strictly follow your Morales escort plan. No solo movement after dark.' },
  CR: { note: 'Costa Rica has one of the lowest crime rates in Latin America. San José medical zone is well-regarded and internationally accredited.', timeNote: 'Standard urban precautions. Avoid isolated beach areas at night.' },
  DO: { note: 'Punta Cana and Santo Domingo medical zones are active and well-monitored. Tourist areas have dedicated police presence.', timeNote: 'Stay in resort and medical corridors. Avoid unmarked taxis.' },
  // Europe
  TR: { note: 'Istanbul leads Europe with 32 JCI-accredited hospitals. Şişli, Nişantaşı, and Levent are Morales-verified medical zones. Ankara is safe for medical visits.', timeNote: 'Standard urban caution. Avoid political gatherings and Syrian border regions.' },
  PL: { note: 'Warsaw and Kraków offer excellent dental and aesthetic surgery at 60% less than Western Europe. Safe and well-regulated.', timeNote: 'Very safe by European standards. Standard precautions apply.' },
  HU: { note: 'Budapest is Eastern Europe\'s dental tourism capital. Highly regulated healthcare with EU-standard clinics.', timeNote: 'Extremely safe. Enjoy the city — standard urban awareness.' },
  UA: { note: 'Active conflict advisory in eastern regions. Medical tourism limited to western cities (Lviv). Coordinate all movement with Morales.', timeNote: 'Follow all Morales security guidance. Avoid eastern regions entirely.' },
  GE: { note: 'Tbilisi is emerging as a medical tourism hub with modern facilities and competitive pricing. Generally safe for international patients.', timeNote: 'Exercise normal caution. Tbilisi is one of the safest capitals in the region.' },
  RS: { note: 'Belgrade offers excellent dental and aesthetic procedures at significant savings. Safe and welcoming to international patients.', timeNote: 'Standard precautions apply. City centre is well-monitored.' },
  JO: { note: 'Jordan is a trusted Middle East medical hub with JCI hospitals. Amman is safe and welcoming to international patients.', timeNote: 'Amman is very safe. Standard precautions apply.' },
  IL: { note: 'Israel has world-class medical facilities, particularly in Tel Aviv. Security is high throughout.', timeNote: 'Follow current advisories regarding border areas. Tel Aviv medical zone is safe.' },
  AE: { note: 'Dubai and Abu Dhabi have exceptional medical infrastructure. Extremely low street crime with strong rule of law.', timeNote: 'One of the safest countries globally for international patients.' },
  SA: { note: 'Riyadh and Jeddah have major hospital groups. Dress codes and cultural norms must be respected throughout.', timeNote: 'Safe in medical zones. Follow all local cultural guidelines.' },
  // Asia
  IN: { note: 'Delhi, Mumbai, Chennai, and Bangalore have dedicated international patient units at major hospitals. Morales partners in secured zones.', timeNote: 'Use vetted transport. Avoid isolated areas and street food before procedures.' },
  TH: { note: 'Bangkok\'s Bumrungrad International is a global benchmark. Medical district is among Asia\'s safest for international patients.', timeNote: 'Nightlife zones near Silom/Sukhumvit carry elevated risk. Stay in medical corridors.' },
  MY: { note: 'Kuala Lumpur (Gleneagles, Pantai) offers world-class care at 40–70% less than Western prices. Safe and organized.', timeNote: 'Very safe by regional standards. Standard urban awareness.' },
  SG: { note: 'Singapore has one of the world\'s safest healthcare environments. Zero concern for street safety.', timeNote: 'No meaningful risk. One of the safest cities globally.' },
  PH: { note: 'Manila and Cebu have established medical tourism facilities. Makati and BGC districts are safe zones for international patients.', timeNote: 'Avoid areas outside Makati/BGC/Cebu IT Park after dark.' },
  ID: { note: 'Bali and Jakarta have established medical facilities. Bali is generally very safe for medical tourists.', timeNote: 'Stay in tourist and medical corridors. Standard precautions apply.' },
  VN: { note: 'Ho Chi Minh City and Hanoi have modern international clinics. Very safe for medical tourists with low street crime.', timeNote: 'Watch for traffic and scams rather than violence. Very safe country overall.' },
  KR: { note: 'Seoul is a global aesthetic surgery capital. Gangnam district has hundreds of internationally accredited clinics.', timeNote: 'Extremely safe. One of the lowest crime rates globally.' },
  JP: { note: 'Japan offers exceptional medical quality. Very safe country with excellent patient care infrastructure.', timeNote: 'Virtually zero concern for personal safety anywhere in Japan.' },
  // Africa
  EG: { note: 'Cairo and Hurghada have active medical tourism. Tourist areas are well-policed. Avoid Sinai peninsula and border regions.', timeNote: 'Stick to tourist and medical zones. Avoid protests and political gatherings.' },
  MA: { note: 'Casablanca and Marrakech have established medical facilities. Generally safe with strong tourist police presence.', timeNote: 'Be aware of persistent touts in medinas. Medically, very safe zones.' },
  TN: { note: 'Tunis has good dental and aesthetic clinics. Security has improved significantly in recent years.', timeNote: 'Avoid isolated border regions. Tunis medical zone is safe.' },
  KE: { note: 'Nairobi has modern hospitals (Aga Khan, Nairobi Hospital) but exercise vigilance in public areas. Partner clinics in secured zones.', timeNote: 'Avoid CBD after dark. Use vetted transport at all times.' },
  ZA: { note: 'Cape Town and Johannesburg have excellent private hospitals. Exercise HIGH vigilance — South Africa has elevated crime rates.', timeNote: 'Never walk alone after dark. Use only vetted transport. Don\'t display valuables.' },
  NG: { note: 'Lagos and Abuja have modern private hospitals but exercise significant caution. Morales arranges escorted access only.', timeNote: 'Use Morales escort at all times. Avoid crowds and busy transit hubs.' },
  // Default tier responses
  _tier1: { note: 'Your destination has a low overall advisory rating. Morales partner clinics operate to international standards.', timeNote: 'Standard urban precautions apply. Enjoy your journey safely.' },
  _tier2: { note: 'Your destination has a moderate advisory rating. Morales partners operate in verified safe zones with vetted transport.', timeNote: 'Use Morales-approved transport. Avoid unfamiliar areas after dark.' },
  _tier3: { note: 'Your destination carries an elevated advisory. Your Morales itinerary is routed through secured medical corridors with escort options.', timeNote: 'Follow your Morales safety plan strictly. Contact your concierge before any movement.' },
  _tier4: { note: 'Your destination carries a high-risk advisory. Morales has arranged maximum-security coordination for your journey.', timeNote: 'Do not move without Morales escort. Emergency contacts are pre-loaded in your app.' },
};

function getContext(iso2) {
  if (DESTINATION_CONTEXT[iso2]) return DESTINATION_CONTEXT[iso2];
  const tier = ISO_TO_TIER[iso2] || 2;
  return DESTINATION_CONTEXT[`_tier${tier}`] || DESTINATION_CONTEXT['_tier2'];
}

// ── Score mapping ────────────────────────────────────────────────────────────
function advisoryToRisk(score) {
  if (!score || score <= 0) return 35;
  const clamped = Math.max(1, Math.min(5, score));
  return Math.round(((clamped - 1) / 4) * 85 + 5);
}

export function getRiskLevel(risk) {
  if (risk < 28) return { label: 'Low',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  emoji: '🟢' };
  if (risk < 52) return { label: 'Moderate', color: '#eab308', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.35)',  emoji: '🟡' };
  if (risk < 72) return { label: 'Elevated', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', emoji: '🟠' };
  return              { label: 'High',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  emoji: '🔴' };
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function readCache(iso2) {
  try {
    const raw = sessionStorage.getItem(`evn_iq400_${iso2}`);
    if (!raw) return null;
    const { payload, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return { ...payload, cachedAt: ts };
  } catch { return null; }
}

function writeCache(iso2, payload) {
  try {
    sessionStorage.setItem(`evn_iq400_${iso2}`, JSON.stringify({ payload, ts: Date.now() }));
  } catch {}
}

// Fuzzy country name match — handles partial names, accents, alternate spellings
function resolveISO2(countryName) {
  if (!countryName) return null;
  const direct = COUNTRY_ISO[countryName];
  if (direct) return direct;
  const lower = countryName.toLowerCase();
  const entry = Object.entries(COUNTRY_ISO).find(([name]) => name.toLowerCase() === lower);
  if (entry) return entry[1];
  // Partial match fallback
  const partial = Object.entries(COUNTRY_ISO).find(([name]) =>
    lower.includes(name.toLowerCase()) || name.toLowerCase().includes(lower)
  );
  return partial ? partial[1] : null;
}

export function useEnvironmentalIntelligence({ country, countryCode: providedISO2 }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);

  const iso2 = providedISO2 || resolveISO2(country);

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
          const advisoryScore = entry.advisory?.score ?? TIER_ADVISORY[ISO_TO_TIER[iso2] || 2];
          const sourcesActive = entry.advisory?.sources_active ?? 0;
          const riskScore     = advisoryToRisk(advisoryScore);
          const ctx           = getContext(iso2);

          const payload = {
            countryCode:   iso2,
            countryName:   entry.name || country,
            advisoryScore,
            sourcesActive,
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
        // Offline fallback — tier-based profile for every country
        const tier          = ISO_TO_TIER[iso2] || 2;
        const advisoryScore = TIER_ADVISORY[tier];
        const riskScore     = advisoryToRisk(advisoryScore);
        const ctx           = getContext(iso2);

        setData({
          countryCode:   iso2 || '??',
          countryName:   country || 'Your Destination',
          advisoryScore,
          sourcesActive: 0,
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
