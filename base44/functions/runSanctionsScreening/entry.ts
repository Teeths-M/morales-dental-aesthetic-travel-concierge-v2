import { createHandler, ok, err } from '../../shared/createHandler.ts';

// ComplyAdvantage REST API — global sanctions, PEP, adverse-media screening.
// Env vars required for live mode:
//   COMPLY_ADVANTAGE_API_KEY  — your ComplyAdvantage API key
//   COMPLY_ADVANTAGE_FUZZINESS — 0.0–1.0 (default 0.6)
// When the env var is absent the function falls back to a keyword list so the
// pipeline keeps running while you're setting up the external account.

const CA_BASE = 'https://api.complyadvantage.com';
const CA_TYPES = ['sanction', 'warning', 'pep', 'pep-class-1', 'pep-class-2', 'adverse-media'];
// Score threshold (0–1) above which a potential_match is treated as a real hit.
const HIT_SCORE_THRESHOLD = 0.85;

// Broad keyword list used as fallback when no API key is configured.
const KEYWORD_LIST = [
  'sanctioned', 'blacklisted', 'ofac', 'terrorist', 'fraud_conviction',
  'money_laundering', 'narco', 'cartel', 'interpol_red',
];

async function callComplyAdvantage(
  apiKey: string,
  partnerName: string,
  partnerType: string,
  partnerId: string,
  country: string | undefined,
): Promise<{ searchId: string; hitCount: number; highestScore: number; rawHits: unknown[] }> {
  const fuzziness = parseFloat(Deno.env.get('COMPLY_ADVANTAGE_FUZZINESS') || '0.6');

  const payload: Record<string, unknown> = {
    search_term: partnerName,
    // client_ref is echoed back in monitoring webhooks — used to identify the partner
    client_ref: `${partnerType}:${partnerId}`,
    fuzziness,
    filters: { types: CA_TYPES },
    share_url: false,
    tags: ['morales_platform', partnerType],
  };
  if (country) payload.filters = { ...payload.filters as object, birth_location: country };

  const resp = await fetch(`${CA_BASE}/searches`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`ComplyAdvantage ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  const searchData = data?.data || {};
  const hits: unknown[] = searchData.hits || [];
  let highestScore = 0;
  for (const hit of hits as Record<string, unknown>[]) {
    if (hit.match_status === 'potential_match' && typeof hit.score === 'number') {
      if (hit.score > highestScore) highestScore = hit.score;
    }
  }

  return {
    searchId: searchData.id || '',
    hitCount: searchData.total_hits || 0,
    highestScore,
    rawHits: hits,
  };
}

function keywordFallback(partnerName: string): { hitCount: number; highestScore: number } {
  const lower = partnerName.toLowerCase();
  const hit = KEYWORD_LIST.some(k => lower.includes(k));
  return { hitCount: hit ? 1 : 0, highestScore: hit ? 1.0 : 0 };
}

async function updatePartnerEntity(
  base44: unknown,
  partnerType: string,
  partnerId: string,
  fields: Record<string, unknown>,
) {
  const b = base44 as { asServiceRole: { entities: Record<string, { update: (id: string, data: unknown) => Promise<void> }> } };
  const entityMap: Record<string, string> = {
    doctor:          'Doctor',
    travel_agency:   'TravelAgency',
    taxi_service:    'TaxiService',
    companion:       'Companion',
    security_agency: 'SecurityAgency',
  };
  const entity = entityMap[partnerType];
  if (entity) await b.asServiceRole.entities[entity].update(partnerId, fields);
}

const ENTITY_MAP: Record<string, string> = {
  doctor:          'Doctor',
  travel_agency:   'TravelAgency',
  taxi_service:    'TaxiService',
  companion:       'Companion',
  security_agency: 'SecurityAgency',
};

const NAME_FIELD: Record<string, string> = {
  doctor:          'full_name',
  travel_agency:   'agency_name',
  taxi_service:    'company_name',
  companion:       'full_name',
  security_agency: 'agency_name',
};

Deno.serve(createHandler(async ({ base44, body }) => {
  const { partner_id, partner_type, country } = await body();
  if (!partner_id || !partner_type) {
    return err('partner_id and partner_type are required');
  }

  // SECURITY: never screen using a caller-supplied name — that lets an
  // attacker launder an actually-sanctioned partner as "clear" by searching
  // an unrelated clean name while still linking the result to the real
  // partner_id. Always fetch the record server-side and use its own stored
  // name and email.
  const entityName = ENTITY_MAP[partner_type];
  if (!entityName) return err('Unknown partner_type');
  const partnerRecord = await base44.asServiceRole.entities[entityName].get(partner_id).catch(() => null);
  if (!partnerRecord) return err('Partner not found', 404);
  const partner_name  = partnerRecord[NAME_FIELD[partner_type]] || partnerRecord.email || partner_id;
  const partner_email = partnerRecord.email;

  const now = new Date().toISOString();
  const apiKey = Deno.env.get('COMPLY_ADVANTAGE_API_KEY');

  let status: 'clear' | 'flagged';
  let provider: string;
  let searchId: string | null = null;
  let hitCount = 0;
  let highestScore = 0;
  let errorNote = '';

  if (apiKey) {
    try {
      const result = await callComplyAdvantage(apiKey, partner_name, partner_type, partner_id, country);
      searchId     = result.searchId;
      hitCount     = result.hitCount;
      highestScore = result.highestScore;
      provider     = 'comply_advantage';
      // Flag only when hit count > 0 AND the highest match score clears the threshold.
      status = hitCount > 0 && highestScore >= HIT_SCORE_THRESHOLD ? 'flagged' : 'clear';
    } catch (apiErr) {
      // API unavailable — fall back to keyword list so signup never hangs.
      console.error('[runSanctionsScreening] ComplyAdvantage unavailable, using keyword fallback:', apiErr);
      const fb = keywordFallback(partner_name);
      hitCount     = fb.hitCount;
      highestScore = fb.highestScore;
      provider     = 'keyword_fallback';
      errorNote    = 'ComplyAdvantage unreachable — keyword fallback used';
      status = hitCount > 0 ? 'flagged' : 'clear';
    }
  } else {
    const fb = keywordFallback(partner_name);
    hitCount     = fb.hitCount;
    highestScore = fb.highestScore;
    provider     = 'keyword_fallback';
    errorNote    = 'COMPLY_ADVANTAGE_API_KEY not set — keyword fallback used';
    status = hitCount > 0 ? 'flagged' : 'clear';
  }

  // Persist sanctions status onto the partner entity.
  // We store search_id as sanctions_search_id so the monitoring webhook can
  // locate the correct partner when ComplyAdvantage fires an update.
  const entityUpdate: Record<string, unknown> = {
    sanctions_check_status: status,
    sanctions_check_at:     now,
    sanctions_provider:     provider,
    sanctions_search_id:    searchId,
  };
  if (status === 'flagged') {
    entityUpdate.verification_status = 'sanctions_flagged';
    entityUpdate.status = 'blocked';
  }
  await updatePartnerEntity(base44, partner_type, partner_id, entityUpdate);

  // Write to KYPVerification so the admin can see it in the partner hub.
  try {
    const b44 = base44 as { asServiceRole: { entities: { KYPVerification: { filter: Function; update: Function; create: Function } } } };
    const existing = await b44.asServiceRole.entities.KYPVerification.filter({ partner_email }, '-submitted_at', 1);
    const kypData: Record<string, unknown> = {
      partner_id, partner_type, partner_name, partner_email,
      sanctions_check_status: status,
      sanctions_check_at: now,
      overall_status: status === 'flagged' ? 'rejected' : 'in_progress',
      audit_trail: [{ timestamp: now, action: 'sanctions_screening', actor: provider, notes: `${hitCount} hits. Score: ${(highestScore * 100).toFixed(0)}%. ${errorNote}` }],
    };
    if (existing.length) {
      await b44.asServiceRole.entities.KYPVerification.update(existing[0].id, kypData);
    } else {
      await b44.asServiceRole.entities.KYPVerification.create({ ...kypData, submitted_at: now });
    }
  } catch (_) { /* KYP write is best-effort — never blocks the main pipeline */ }

  // Alert admin on a real hit.
  if (status === 'flagged') {
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@moralesmedical.com';
    try {
      const b44 = base44 as { asServiceRole: { integrations: { Core: { SendEmail: Function } } } };
      await b44.asServiceRole.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `🚨 SANCTIONS HIT — ${partner_name} (${partner_type})`,
        body: `A partner application has been automatically blocked by sanctions screening.\n\n`
            + `Partner: ${partner_name}\nType: ${partner_type}\nCountry: ${country || 'unknown'}\n`
            + `Provider: ${provider}\nHits: ${hitCount}\nHighest score: ${(highestScore * 100).toFixed(0)}%\n`
            + `${errorNote ? `Note: ${errorNote}\n` : ''}\n`
            + `Partner status set to BLOCKED.\n\nReview: /admin/partner-verification`,
      });
    } catch (_) { /* email is non-fatal */ }
  }

  return ok({ status, provider, hit_count: hitCount, highest_score: highestScore, search_id: searchId });
}, { name: 'runSanctionsScreening', requireAuth: true }));
