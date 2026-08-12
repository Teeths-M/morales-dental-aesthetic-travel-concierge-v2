import { createHandler, ok } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { searchForProviders } from '../../shared/providerDiscovery.ts';
import { logExternalSearch } from '../../shared/logExternalSearch.ts';
import { isLikelyKnownProvider, computeCandidateConfidence, type KnownProviderSignature } from '../../shared/providerCandidateMatch.ts';
import { resolveCountryISO, REGISTRY_ADAPTERS } from '../../shared/registryLookup.ts';

// ── discoverProviderCandidates ───────────────────────────────────────────────
// M-Care's controlled web-discovery tool. Runs when a traveler asks for a
// provider not already in Morales's network:
//   1. Existing provider memory — real Doctor records checked first, so a
//      web search never happens for someone Morales already works with.
//   2. Tavily web discovery — a real, structured search (title/url/snippet/
//      source/relevance/timestamp), honestly unavailable if TAVILY_API_KEY
//      isn't configured. Every call is audit-logged via logExternalSearch,
//      success or not.
//   3. Identity resolution — a result that's really just an existing
//      partner (providerCandidateMatch.ts) is filtered out, not duplicated.
//   4. Verification — a raw search snippet essentially never contains a
//      license number, so no live registryLookup.ts call happens here; each
//      new candidate is tagged with whether a registry check is even
//      *possible* for its country, honestly deferring the real check to a
//      human reviewer who has a license number to check.
//   5. Confidence — search relevance alone is structurally capped well
//      below anything resembling "verified" (computeCandidateConfidence).
//   6. Memory — new candidates persist to DiscoveredProviderCandidate, a
//      staging entity with no path to auto-promotion into a real partner
//      record. That stays the existing human-gated mcareCreate*Pending ->
//      initiatePartnerVerification -> admin-approval pipeline, untouched.
//
// A DiscoveredProviderCandidate is never, at any point in this function, a
// verified provider — every response makes that explicit so M-Care states
// it plainly in conversation too.

const bodySchema = strictObject({
  need: Fields.shortText(200),
  location: Fields.shortText(200),
  case_id: Fields.optionalText(100),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { need, location, case_id } = await body();
  const query = `${need} in ${location}`.trim();

  // 1. Existing provider memory.
  let knownDoctors: any[] = [];
  try {
    knownDoctors = await base44.asServiceRole.entities.Doctor.filter({}, '-created_date', 200);
  } catch (_) {
    knownDoctors = [];
  }

  const needLow = need.toLowerCase();
  const locationLow = location.toLowerCase();
  const knownMatches = knownDoctors
    .filter((d: any) => {
      const specialtyLow = (d.specialty || '').toLowerCase();
      const cityLow = (d.clinic_city || '').toLowerCase();
      const countryLow = (d.clinic_country || '').toLowerCase();
      const specialtyHit = !!specialtyLow && (needLow.includes(specialtyLow) || specialtyLow.split(/\s+/).some((w: string) => w.length > 3 && needLow.includes(w)));
      const locationHit = (!!cityLow && locationLow.includes(cityLow)) || (!!countryLow && locationLow.includes(countryLow));
      return specialtyHit && locationHit;
    })
    .slice(0, 5)
    .map((d: any) => ({
      id: d.id,
      name: d.full_name,
      city: d.clinic_city,
      country: d.clinic_country,
      specialty: d.specialty,
    }));

  const knownSignatures: KnownProviderSignature[] = knownDoctors.map((d: any) => ({
    id: d.id,
    partner_type: 'doctor' as const,
    name: d.full_name || '',
    city: d.clinic_city,
    country: d.clinic_country,
    specialty: d.specialty,
  }));

  // 2. Tavily web discovery.
  const searchResult = await searchForProviders(query);

  await logExternalSearch(base44, {
    query,
    search_type: 'provider',
    vendor: searchResult.supported ? 'tavily' : 'none',
    status: searchResult.supported ? 'success' : 'unavailable',
    result_count: searchResult.supported ? searchResult.results.length : 0,
    initiated_by: 'discoverProviderCandidates',
    case_id: case_id || undefined,
  });

  if (!searchResult.supported) {
    return ok({
      success: true,
      discovery_available: false,
      known_providers: knownMatches,
      candidates: [],
      message: knownMatches.length > 0
        ? `Found ${knownMatches.length} doctor(s) already in the Morales network matching this. Open-web discovery isn't configured yet (${searchResult.message}), so I can't search beyond that right now.`
        : `No matching doctor found in the Morales network yet, and open-web discovery isn't configured (${searchResult.message}). This would need a human to source a candidate manually.`,
    });
  }

  // 3. Identity resolution — drop results that are really an existing partner.
  const extractedCountry = resolveCountryISO(location);
  const registrySupported = extractedCountry ? !!REGISTRY_ADAPTERS[extractedCountry]?.supportsLookup : false;

  const candidateRows: any[] = [];
  for (const result of searchResult.results) {
    const dup = isLikelyKnownProvider({ title: result.title, snippet: result.snippet }, knownSignatures);
    if (dup.matched) continue;

    // 4. Verification (honest deferral) + 5. Confidence.
    const identity_confidence = computeCandidateConfidence(result.relevance);
    const registry_check_status: 'not_attempted' | 'unsupported_country' = registrySupported ? 'not_attempted' : 'unsupported_country';

    // 6. Memory — dedupe against a candidate already discovered from the same URL.
    let candidateId: string | null = null;
    try {
      const existing = await base44.asServiceRole.entities.DiscoveredProviderCandidate.filter({ url: result.url }, '-created_date', 1);
      if (existing.length > 0) {
        candidateId = existing[0].id;
      } else {
        const rec = await base44.asServiceRole.entities.DiscoveredProviderCandidate.create({
          source_query: query,
          procedure_context: need,
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          source: 'tavily',
          relevance_score: result.relevance,
          discovered_at: result.timestamp,
          identity_confidence,
          extracted_country_iso: extractedCountry || '',
          registry_check_status,
          status: 'candidate',
          discovered_by_case_id: case_id || '',
          created_at: new Date().toISOString(),
        });
        candidateId = rec?.id || null;
      }
    } catch (e) {
      console.error('[discoverProviderCandidates] failed to persist candidate', e);
    }

    candidateRows.push({
      id: candidateId,
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      relevance_score: result.relevance,
      identity_confidence,
      registry_check_status,
      extracted_country_iso: extractedCountry,
      reason: registrySupported
        ? 'Discovered on the web — not verified. A government-registry check is possible for this location but needs a license number a human reviewer will look up.'
        : 'Discovered on the web — not verified. No automated registry exists for this location; this needs manual human review.',
    });
  }

  candidateRows.sort((a, b) => b.identity_confidence - a.identity_confidence);

  return ok({
    success: true,
    discovery_available: true,
    known_providers: knownMatches,
    candidates: candidateRows.slice(0, 8),
    message: `Checked the Morales network first (${knownMatches.length} match${knownMatches.length === 1 ? '' : 'es'}), then searched the web and found ${candidateRows.length} new candidate${candidateRows.length === 1 ? '' : 's'}. None of the web candidates are verified — that's a separate step a human completes before anyone is contacted.`,
  });
}, { name: 'discoverProviderCandidates', requireAuth: false, bodySchema }));