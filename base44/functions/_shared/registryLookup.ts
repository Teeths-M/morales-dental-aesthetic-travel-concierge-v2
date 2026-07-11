// ── Shared medical-registry lookup ───────────────────────────────────────────
// Pluggable public-registry adapters, extracted so BOTH the internal admin
// verification (runRegistryLookup) and the public "Check Your Doctor" tool
// (publicDoctorCheck) use exactly the same lookup logic and stay in sync.
//
// A lookup returning { found: false } is NOT "verification failed" — it means
// the registry could not confirm (or isn't publicly searchable). Callers frame
// that neutrally; only an admin decision ever rejects a provider.

export type RegistryResult = {
  found: boolean;
  reason?: string;
  source?: string;
  registry_name_on_file?: string | null;
  registration_number?: string | number;
  name_match?: boolean;
  status?: string;
  credential?: string;
  taxonomy?: string | null;
  confidence?: number;
  note?: string;
  npi?: string | number;
  enumeration_type?: string;
};

type Adapter = {
  country: string;
  registry_name: string;
  registry_url: string;
  reliability: 'api' | 'scrape' | 'unsupported';
  supportsLookup: boolean;
  lookup: (licenseNumber: string, doctorName: string) => Promise<RegistryResult>;
};

export const REGISTRY_ADAPTERS: Record<string, Adapter> = {
  // ── United States — NPI Registry (CMS) — free public REST API, no key. ──
  US: {
    country: 'US',
    registry_name: 'NPI Registry (CMS / NPPES)',
    registry_url: 'https://npiregistry.cms.hhs.gov',
    reliability: 'api',
    supportsLookup: true,
    async lookup(licenseNumber, doctorName) {
      const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${encodeURIComponent(licenseNumber)}&limit=5`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return { found: false, reason: 'service_unavailable', source: 'US_NPI' };
      const data = await res.json();
      if (!data.results || data.results.length === 0) return { found: false, reason: 'not_found', source: 'US_NPI' };

      const record = data.results[0];
      const basic = record.basic || {};
      const fullName = `${basic.first_name || ''} ${basic.last_name || ''}`.trim().toLowerCase();
      const submittedName = (doctorName || '').toLowerCase();
      const nameMatch = fullName.length > 0 && submittedName.length > 0 &&
        (fullName.includes(submittedName.split(' ')[1] || submittedName) ||
          submittedName.includes(fullName.split(' ')[1] || fullName));

      return {
        found: true,
        npi: record.number,
        registry_name_on_file: `${basic.first_name} ${basic.last_name}`.trim(),
        name_match: nameMatch,
        enumeration_type: record.enumeration_type,
        status: basic.status,
        credential: basic.credential,
        taxonomy: record.taxonomies?.[0]?.desc || null,
        source: 'US_NPI',
        confidence: nameMatch ? 90 : 55,
      };
    },
  },

  // ── Colombia — RETHUS (Ministerio de Salud). ──
  CO: {
    country: 'CO',
    registry_name: 'RETHUS (Ministerio de Salud)',
    registry_url: 'https://www.minsalud.gov.co/salud/PS/Paginas/RETHUS.aspx',
    reliability: 'scrape',
    supportsLookup: true,
    async lookup(licenseNumber, _doctorName) {
      const url = `https://www.consultorsalud.com/rethus/buscar?numero=${encodeURIComponent(licenseNumber)}`;
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(10000),
          headers: { 'Accept': 'application/json', 'User-Agent': 'MoralesMedicalPlatform/1.0' },
        });
        if (!res.ok) return { found: false, reason: 'service_unavailable', source: 'CO_RETHUS' };
        const data = await res.json();
        if (!data || data.length === 0) return { found: false, reason: 'not_found', source: 'CO_RETHUS' };
        const rec = data[0];
        return {
          found: true,
          registry_name_on_file: rec.nombre || rec.name || null,
          registration_number: rec.registro || licenseNumber,
          status: rec.estado || rec.status || 'active',
          source: 'CO_RETHUS',
          confidence: 75,
        };
      } catch {
        return { found: false, reason: 'service_unavailable', source: 'CO_RETHUS' };
      }
    },
  },

  // ── Mexico — Cédula Profesional Federal (SEP). ──
  MX: {
    country: 'MX',
    registry_name: 'Cédula Profesional Federal (SEP)',
    registry_url: 'https://www.cedulaprofesional.sep.gob.mx',
    reliability: 'scrape',
    supportsLookup: true,
    async lookup(licenseNumber, _doctorName) {
      const url = `https://www.cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action`;
      try {
        const body = new URLSearchParams({ 'json[idCedula]': licenseNumber });
        const res = await fetch(url, {
          method: 'POST',
          body,
          signal: AbortSignal.timeout(10000),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        if (!res.ok) return { found: false, reason: 'service_unavailable', source: 'MX_SEP' };
        const text = await res.text();
        if (text.includes('sinResultados') || text.length < 50) {
          return { found: false, reason: 'not_found', source: 'MX_SEP' };
        }
        return {
          found: true,
          registration_number: licenseNumber,
          source: 'MX_SEP',
          confidence: 65,
          note: 'Cédula found in SEP registry. Manual review recommended for full credential validation.',
        };
      } catch {
        return { found: false, reason: 'service_unavailable', source: 'MX_SEP' };
      }
    },
  },
};

// Country name → ISO2, so a free-text location ("Tijuana, Mexico") can pick an adapter.
export const COUNTRY_NAME_ISO: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'u.s.': 'US', 'america': 'US',
  'colombia': 'CO', 'mexico': 'MX', 'méxico': 'MX',
  'trinidad and tobago': 'TT', 'trinidad': 'TT', 'jamaica': 'JM', 'barbados': 'BB',
  'bahamas': 'BS', 'saint lucia': 'LC', 'grenada': 'GD', 'guyana': 'GY',
  'dominican republic': 'DO', 'costa rica': 'CR', 'panama': 'PA', 'venezuela': 'VE',
  'brazil': 'BR', 'argentina': 'AR', 'chile': 'CL', 'peru': 'PE', 'ecuador': 'EC',
  'guatemala': 'GT', 'honduras': 'HN', 'el salvador': 'SV',
  'thailand': 'TH', 'india': 'IN', 'malaysia': 'MY', 'singapore': 'SG',
  'philippines': 'PH', 'south korea': 'KR', 'japan': 'JP', 'turkey': 'TR',
  'united kingdom': 'GB', 'uk': 'GB', 'germany': 'DE', 'france': 'FR', 'spain': 'ES',
  'italy': 'IT', 'portugal': 'PT', 'nigeria': 'NG', 'ghana': 'GH', 'kenya': 'KE',
  'south africa': 'ZA', 'uae': 'AE', 'united arab emirates': 'AE',
};

/** Best-effort ISO2 from a free-text "country or city" string. */
export function resolveCountryISO(locationText: string): string | null {
  if (!locationText) return null;
  const t = locationText.toLowerCase();
  for (const [name, iso] of Object.entries(COUNTRY_NAME_ISO)) {
    if (t.includes(name)) return iso;
  }
  return null;
}

/** Runs the adapter for `countryISO`, or reports that no public lookup exists. */
export async function runLookup(countryISO: string | null, licenseNumber: string, doctorName: string) {
  const adapter = countryISO ? REGISTRY_ADAPTERS[countryISO] : null;
  if (!adapter || !adapter.supportsLookup) {
    return {
      supported: false,
      country: countryISO,
      route_to_manual: true,
      message: countryISO
        ? `No automated public registry lookup available for ${countryISO}.`
        : 'Could not determine a country with a publicly searchable registry.',
    };
  }
  try {
    const result = await adapter.lookup(licenseNumber, doctorName);
    return {
      supported: true,
      country: countryISO,
      registry_name: adapter.registry_name,
      registry_url: adapter.registry_url,
      reliability: adapter.reliability,
      ...result,
      route_to_manual: !result.found || (result.confidence || 0) < 70,
    };
  } catch {
    return {
      supported: true,
      country: countryISO,
      registry_name: adapter.registry_name,
      found: false,
      reason: 'service_unavailable',
      route_to_manual: true,
    };
  }
}
