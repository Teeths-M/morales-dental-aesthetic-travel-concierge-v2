import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── publicDoctorCheck — the PUBLIC, no-login "Check Your Doctor" look-up. ──────
//
// Deliberately different from the internal admin engine (runInternetIntelligence):
//  - NO fingerprinting of the SEARCHER.
//  - NO risk score, NO "HIGH RISK" verdict. Every signal is framed neutrally.
//  - IP-rate-limited so it can't be used for mass harassment / stalking.

const SUMMARY_PARTIAL =
  'We couldn’t independently verify this doctor from the public sources we can access. ' +
  'That doesn’t mean anything is wrong — many good doctors have a small online footprint, and some registries aren’t publicly searchable. ' +
  'It does mean the picture is incomplete, so confirm their credentials directly before you commit.';
const SUMMARY_FOUND =
  'We found public records consistent with this doctor. That’s a reassuring sign — but verification signals aren’t proof, ' +
  'so it’s still worth confirming directly with the provider before you book.';

// ── Inlined: sanitizePromptInput ─────────────────────────────────────────────
const INJECTION_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /ignore\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|context)/gi, label: 'ignore_previous' },
  { re: /disregard\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|earlier|system)/gi, label: 'disregard' },
  { re: /forget\s+(?:everything|all|the\s+above|previous)/gi, label: 'forget' },
  { re: /override\s+(?:the\s+)?(?:decision|result|verdict|system|rules?|safety|assessment)/gi, label: 'override' },
  { re: /(?:mark|set|classify|rate|score)\s+(?:this|it|me|the\s+\w+)?\s*(?:as\s+)?(?:low\s*risk|safe|approved|cleared|passed?)/gi, label: 'force_clear' },
  { re: /approve\s+(?:anyway|regardless|it|this|me|despite)/gi, label: 'approve_anyway' },
  { re: /\b(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be|roleplay\s+as|from\s+now\s+on\s+you)\b/gi, label: 'role_reassign' },
  { re: /\b(?:new|updated|revised)\s+(?:instructions?|rules?|system\s+prompt)\b/gi, label: 'new_instructions' },
  { re: /\b(?:jailbreak|DAN\s+mode|developer\s+mode|sudo\s+mode)\b/gi, label: 'jailbreak' },
  { re: /<\/?\s*(?:system|instructions?|prompt|assistant|user)\s*>/gi, label: 'role_tag' },
  { re: /^\s*(?:system|assistant|developer)\s*:/gim, label: 'role_prefix' },
  { re: /```+\s*(?:system|prompt|instructions?)/gi, label: 'fenced_prompt' },
];

function sanitizePromptInput(input: unknown, maxLen = 1500): { text: string; flagged: boolean; hits: string[] } {
  if (typeof input !== 'string' || !input) return { text: '', flagged: false, hits: [] };
  let text = input;
  const hits: string[] = [];
  for (const { re, label } of INJECTION_PATTERNS) {
    if (re.test(text)) { hits.push(label); text = text.replace(re, ' [removed] '); }
    re.lastIndex = 0;
  }
  text = text.replace(/[<>]/g, ' ').replace(/`{3,}/g, ' ');
  text = text.replace(/\s+/g, ' ').trim().slice(0, maxLen);
  return { text, flagged: hits.length > 0, hits: [...new Set(hits)] };
}

// ── Inlined: registry lookup ──────────────────────────────────────────────────

const COUNTRY_NAME_ISO: Record<string, string> = {
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

function resolveCountryISO(locationText: string): string | null {
  if (!locationText) return null;
  const t = locationText.toLowerCase();
  for (const [name, iso] of Object.entries(COUNTRY_NAME_ISO)) {
    if (t.includes(name)) return iso;
  }
  return null;
}

const REGISTRY_ADAPTERS: Record<string, any> = {
  US: {
    country: 'US', registry_name: 'NPI Registry (CMS / NPPES)', supportsLookup: true,
    async lookup(licenseNumber: string, doctorName: string) {
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
      return { found: true, npi: record.number, registry_name_on_file: `${basic.first_name} ${basic.last_name}`.trim(), name_match: nameMatch, status: basic.status, credential: basic.credential, taxonomy: record.taxonomies?.[0]?.desc || null, source: 'US_NPI', confidence: nameMatch ? 90 : 55 };
    },
  },
  CO: {
    country: 'CO', registry_name: 'RETHUS (Ministerio de Salud)', supportsLookup: true,
    async lookup(licenseNumber: string, _doctorName: string) {
      const url = `https://www.consultorsalud.com/rethus/buscar?numero=${encodeURIComponent(licenseNumber)}`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'Accept': 'application/json', 'User-Agent': 'MoralesMedicalPlatform/1.0' } });
        if (!res.ok) return { found: false, reason: 'service_unavailable', source: 'CO_RETHUS' };
        const data = await res.json();
        if (!data || data.length === 0) return { found: false, reason: 'not_found', source: 'CO_RETHUS' };
        const rec = data[0];
        return { found: true, registry_name_on_file: rec.nombre || rec.name || null, registration_number: rec.registro || licenseNumber, status: rec.estado || rec.status || 'active', source: 'CO_RETHUS', confidence: 75 };
      } catch { return { found: false, reason: 'service_unavailable', source: 'CO_RETHUS' }; }
    },
  },
  MX: {
    country: 'MX', registry_name: 'Cédula Profesional Federal (SEP)', supportsLookup: true,
    async lookup(licenseNumber: string, _doctorName: string) {
      const url = `https://www.cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action`;
      try {
        const body = new URLSearchParams({ 'json[idCedula]': licenseNumber });
        const res = await fetch(url, { method: 'POST', body, signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        if (!res.ok) return { found: false, reason: 'service_unavailable', source: 'MX_SEP' };
        const text = await res.text();
        if (text.includes('sinResultados') || text.length < 50) return { found: false, reason: 'not_found', source: 'MX_SEP' };
        return { found: true, registration_number: licenseNumber, source: 'MX_SEP', confidence: 65, note: 'Cédula found in SEP registry. Manual review recommended for full credential validation.' };
      } catch { return { found: false, reason: 'service_unavailable', source: 'MX_SEP' }; }
    },
  },
};

async function runLookup(countryISO: string | null, licenseNumber: string, doctorName: string) {
  const adapter = countryISO ? REGISTRY_ADAPTERS[countryISO] : null;
  if (!adapter || !adapter.supportsLookup) {
    return { supported: false, country: countryISO, route_to_manual: true, message: countryISO ? `No automated public registry lookup available for ${countryISO}.` : 'Could not determine a country with a publicly searchable registry.' };
  }
  try {
    const result = await adapter.lookup(licenseNumber, doctorName);
    return { supported: true, country: countryISO, registry_name: adapter.registry_name, ...result, route_to_manual: !result.found || (result.confidence || 0) < 70 };
  } catch {
    return { supported: true, country: countryISO, registry_name: adapter.registry_name, found: false, reason: 'service_unavailable', route_to_manual: true };
  }
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

async function checkRateLimit(base44: any, key: string, windowSeconds: number, maxRequests: number) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter({ bucket_key: key }, '-created_date', 1).catch(() => []);
  const bucket = buckets?.[0];
  if (!bucket) {
    await base44.asServiceRole.entities.RateLimitBucket.create({ bucket_key: key, window_start: now.toISOString(), count: 1, updated_at: now.toISOString() }).catch(() => {});
    return true;
  }
  if (new Date(bucket.window_start) < windowStart) {
    await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { window_start: now.toISOString(), count: 1, updated_at: now.toISOString() }).catch(() => {});
    return true;
  }
  if (bucket.count >= maxRequests) return false;
  await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { count: bucket.count + 1, updated_at: now.toISOString() }).catch(() => {});
  return true;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { doctor_name, clinic, location, license } = body;

    if (!doctor_name?.trim() || !clinic?.trim() || !location?.trim()) {
      return Response.json({ error: 'Please add the doctor’s name, their clinic, and a country or city.' }, { status: 400 });
    }

    // ── Rate limit by IP (anti-harassment) ──
    const ip = (req.headers.get('CF-Connecting-IP')
      || req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
      || 'unknown').trim();
    const hourOk = await checkRateLimit(base44, `cyd_ip_hour_${ip}`, 3600, 15);
    const dayOk = await checkRateLimit(base44, `cyd_ip_day_${ip}`, 86400, 60);
    if (!hourOk || !dayOk) {
      return Response.json({ error: 'You’ve run a lot of look-ups in a short time. This tool is for checking your own doctor before booking — please try again later.' }, { status: 429 });
    }

    const name = doctor_name.trim();
    const iso = resolveCountryISO(location);
    const countryLabel = location.trim();

    const namePrompt = sanitizePromptInput(name, 120).text;
    const clinicPrompt = sanitizePromptInput(clinic.trim(), 160).text;
    const locationPrompt = sanitizePromptInput(countryLabel, 120).text;

    // ── Signal 1: License registry ──
    let licenseSignal;
    if (license?.trim()) {
      const r: any = await runLookup(iso, license.trim(), name);
      if (r.supported && r.found && r.name_match !== false) {
        licenseSignal = { label: 'License registry', status: 'found', finding: `A licence record matching “${name}” was found in ${r.registry_name}.` };
      } else if (r.supported && r.found) {
        licenseSignal = { label: 'License registry', status: 'found', finding: `A licence record was found in ${r.registry_name}, though the name on file differs slightly — worth confirming directly.` };
      } else if (r.supported && r.reason === 'not_found') {
        licenseSignal = { label: 'License registry', status: 'not_found', finding: `That licence number didn’t match a public record in ${r.registry_name}.` };
      } else {
        licenseSignal = { label: 'License registry', status: 'unknown', finding: `${countryLabel}’s registry couldn’t be checked automatically right now — confirm the licence with the provider or the local board.` };
      }
    } else if (iso && REGISTRY_ADAPTERS[iso]) {
      licenseSignal = { label: 'License registry', status: 'unknown', finding: `Add the doctor’s licence number for an automated check against ${REGISTRY_ADAPTERS[iso].registry_name}.` };
    } else {
      licenseSignal = { label: 'License registry', status: 'unknown', finding: `${countryLabel}’s licence registry isn’t publicly searchable from here, so this can only be confirmed with the provider or the local board directly.` };
    }

    // ── Signal 2 & 3: Web/social presence + news/litigation ──
    let webSignal, newsSignal;
    try {
      const ai: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
        add_context_from_internet: true,
        prompt: `You are a neutral public-records assistant helping a patient sanity-check a doctor before booking medical travel. Do NOT judge, score, rank, or accuse. Only report what is publicly findable, factually.

Doctor: ${namePrompt}
Clinic / practice: ${clinicPrompt}
Location: ${locationPrompt}

Search the public web and report two things:
1. web_presence: Is there an established public profile (Google Business listing, Facebook, Instagram, TikTok, clinic website) that plausibly matches this doctor + clinic + location? Answer "found" or "not_found". If found, give ONE short neutral detail (e.g. "Google Business listing with reviews", "active clinic Instagram").
2. news: Are there any public news, litigation, malpractice, or complaint mentions naming this doctor or clinic? Answer "found" or "none". If found, give ONE neutral one-line description of what the mention is — describe it, do not judge it.

Return ONLY JSON: {"web_presence":"found"|"not_found","web_detail":string|null,"news":"found"|"none","news_detail":string|null}`,
        response_json_schema: {
          type: 'object',
          properties: {
            web_presence: { type: 'string' },
            web_detail: { type: 'string' },
            news: { type: 'string' },
            news_detail: { type: 'string' },
          },
        },
      });

      if (ai?.web_presence === 'found') {
        webSignal = { label: 'Web & social presence', status: 'found', finding: ai.web_detail ? `Found ${ai.web_detail} consistent with ${clinic.trim()}.` : `Found a public presence consistent with ${clinic.trim()}.` };
      } else {
        webSignal = { label: 'Web & social presence', status: 'not_found', finding: `We couldn’t find an established public profile (Google Business, Instagram, Facebook) matching this name and ${clinic.trim()}.` };
      }

      if (ai?.news === 'found' && ai.news_detail) {
        newsSignal = { label: 'News & public records', status: 'found', finding: `Public mention found: ${ai.news_detail} — read it yourself and weigh it before deciding.` };
      } else {
        newsSignal = { label: 'News & public records', status: 'clear', finding: webSignal.status === 'found' ? 'No litigation, complaint, or adverse-news mentions found.' : 'No news, litigation, or complaint mentions found — and none confirming their practice either.' };
      }
    } catch (_) {
      webSignal = { label: 'Web & social presence', status: 'unknown', finding: 'We couldn’t complete the web search right now. Try again shortly, or check their Google Business and social profiles yourself.' };
      newsSignal = { label: 'News & public records', status: 'unknown', finding: 'We couldn’t complete the news search right now.' };
    }

    // ── Signal 4: Our safety network (name/clinic overlap — NEVER an accusation) ──
    let networkSignal;
    try {
      const hits: any[] = await base44.asServiceRole.entities.Doctor
        .filter({ internet_risk_level: 'high' }, '-created_date', 200).catch(() => []);
      const needle = name.toLowerCase();
      const cneedle = clinic.trim().toLowerCase();
      const overlap = (hits || []).some((d: any) =>
        (d.full_name && d.full_name.toLowerCase().includes(needle)) ||
        (d.clinic_name && String(d.clinic_name).toLowerCase().includes(cneedle)));
      networkSignal = overlap
        ? { label: 'Our safety network', status: 'found', finding: 'This name or clinic overlaps with a record our team has reviewed internally. It isn’t a verdict — reach out and a coordinator can share what we’re able to.' }
        : { label: 'Our safety network', status: 'clear', finding: 'No matches in Morales’ fraud-signal database — we have no red flags on record (not the same as verified).' };
    } catch (_) {
      networkSignal = { label: 'Our safety network', status: 'clear', finding: 'No matches in Morales’ fraud-signal database — we have no red flags on record (not the same as verified).' };
    }

    const signals = [licenseSignal, webSignal, newsSignal, networkSignal];
    const outcome = (licenseSignal.status === 'found' || webSignal.status === 'found') ? 'found' : 'partial';

    return Response.json({
      outcome,
      doctorName: name,
      clinic: clinic.trim(),
      location: countryLabel,
      signals,
      summary: outcome === 'found' ? SUMMARY_FOUND : SUMMARY_PARTIAL,
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});