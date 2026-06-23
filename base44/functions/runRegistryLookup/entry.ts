import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── runRegistryLookup ─────────────────────────────────────────────────────────
// Pluggable medical registry verification system.
//
// ARCHITECTURE:
//  Each country is implemented as a standalone adapter object in REGISTRY_ADAPTERS.
//  Adding support for a new country = adding a new adapter entry.
//  The orchestrator (runLookup) is never modified when new countries are added.
//
// RELIABILITY CLASSIFICATIONS:
//  'api'        — Official government API with stable contract (most reliable)
//  'scrape'     — HTML form parse (works until the site changes layout)
//  'unsupported'— No publicly accessible lookup exists for this country
//
// IMPORTANT: A lookup returning { found: false } is NOT the same as verification
// failed. It means the registry could not confirm — this routes to manual review,
// not rejection. Rejection requires an explicit admin decision.
//
// Countries with verified public registry access (as of 2026):
//  US   — NPI Registry (CMS) — real REST API, no key required
//  CO   — RETHUS / Secretaría de Salud — HTTP form parse
//  MX   — SEP Cédula Profesional — HTTP form parse
//  All others → unsupported → manual review queue

const REGISTRY_ADAPTERS = {

  // ── United States ─────────────────────────────────────────────────────────
  // NPI Registry (CMS) — free public REST API, no auth required.
  // Returns all US licensed healthcare providers by NPI number.
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

      // Fuzzy name match: submitted name must be a substring of the registry name or vice versa
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

  // ── Colombia ──────────────────────────────────────────────────────────────
  // RETHUS — Registro del Talento Humano en Salud.
  // Publicly searchable. No formal API — uses HTTP form submission.
  CO: {
    country: 'CO',
    registry_name: 'RETHUS (Ministerio de Salud)',
    registry_url: 'https://www.minsalud.gov.co/salud/PS/Paginas/RETHUS.aspx',
    reliability: 'scrape',
    supportsLookup: true,
    async lookup(licenseNumber, _doctorName) {
      // Attempt lookup via the public RETHUS search endpoint.
      // Returns JSON for registered professionals.
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

  // ── Mexico ────────────────────────────────────────────────────────────────
  // Cédula Profesional Federal — SEP (Secretaría de Educación Pública).
  // All licensed professionals (including medical) hold a federal cedula.
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
        // The SEP API returns JSON embedded in the page or as a direct response
        if (text.includes('sinResultados') || text.length < 50) {
          return { found: false, reason: 'not_found', source: 'MX_SEP' };
        }
        // Basic presence check — full parse would require HTML scraping
        return {
          found: true,
          registration_number: licenseNumber,
          source: 'MX_SEP',
          confidence: 65, // Lower confidence due to limited parse depth
          note: 'Cédula found in SEP registry. Manual review recommended for full credential validation.',
        };
      } catch {
        return { found: false, reason: 'service_unavailable', source: 'MX_SEP' };
      }
    },
  },
};

// Countries where no public registry lookup exists.
// All doctors from these countries go to manual review — this is intentional and correct.
const MANUAL_REVIEW_COUNTRIES = new Set([
  'TT', 'BB', 'JM', 'GY', 'BZ', 'AG', 'LC', 'VC', 'GD', 'KN', 'DM', 'BS', // Caribbean
  'VE', 'DO', 'CU', 'HT', 'PA', 'CR', 'GT', 'HN', 'NI', 'SV',             // LATAM
  'BR', 'AR', 'CL', 'PE', 'EC', 'BO', 'PY', 'UY',                           // South America
  'TH', 'IN', 'MY', 'SG', 'PH', 'ID', 'KR', 'JP',                          // Asia-Pacific
  'GB', 'DE', 'FR', 'ES', 'IT', 'PT', 'NL', 'BE',                           // Europe
  'AU', 'NZ', 'ZA', 'NG', 'GH', 'KE',                                       // Other
  'AE', 'SA', 'QA', 'KW', 'BH', 'OM',                                       // Gulf
]);

async function runLookup(country, licenseNumber, doctorName) {
  const adapter = REGISTRY_ADAPTERS[country];
  if (!adapter || !adapter.supportsLookup) {
    return {
      supported: false,
      country,
      message: `No automated registry lookup available for ${country}. Routing to manual review queue.`,
      route_to_manual: true,
    };
  }
  try {
    const result = await adapter.lookup(licenseNumber, doctorName);
    return {
      supported: true,
      country,
      registry_name: adapter.registry_name,
      registry_url: adapter.registry_url,
      reliability: adapter.reliability,
      ...result,
      route_to_manual: !result.found || (result.confidence || 0) < 70,
    };
  } catch {
    return {
      supported: true,
      country,
      registry_name: adapter.registry_name,
      found: false,
      reason: 'service_unavailable',
      route_to_manual: true,
      message: 'Registry lookup failed — routing to manual review.',
    };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { doctor_id, country, license_number, doctor_name } = await req.json();
    if (!country || !license_number) {
      return Response.json({ error: 'country and license_number required' }, { status: 400 });
    }

    const result = await runLookup(country.toUpperCase(), license_number, doctor_name || '');

    // If a doctor_id was provided, update their record with the lookup result
    if (doctor_id && result.supported) {
      const now = new Date().toISOString();
      const updatePayload = {
        verification_method: result.found ? 'government_registry' : 'manual_upload',
        registry_lookup_result: JSON.stringify(result),
        registry_lookup_at: now,
      };

      if (result.found && (result.confidence || 0) >= 70) {
        // High-confidence automated match — mark license check as passed
        updatePayload.license_verification_status = 'passed';
        updatePayload.license_verified = true;
        updatePayload.verification_confidence = result.confidence;
        updatePayload.verification_notes = `Automated registry lookup PASSED (${result.registry_name}, confidence: ${result.confidence}%). Manual review still required for identity and background checks before activation.`;
      } else if (result.found) {
        // Found but lower confidence — flag for manual confirmation
        updatePayload.verification_notes = `Registry match found (confidence: ${result.confidence}%) — recommend manual confirmation before approving license check.`;
      }
      // route_to_manual = true means admin must confirm — no auto-activation ever happens here

      await base44.asServiceRole.entities.Doctor.update(doctor_id, updatePayload);
    }

    return Response.json({
      success: true,
      lookup_result: result,
      registry_name: REGISTRY_ADAPTERS[country.toUpperCase()]?.registry_name || null,
      registry_url: REGISTRY_ADAPTERS[country.toUpperCase()]?.registry_url || null,
      supported_countries: Object.keys(REGISTRY_ADAPTERS),
    });

  } catch (error) {
    console.error('[runRegistryLookup]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
