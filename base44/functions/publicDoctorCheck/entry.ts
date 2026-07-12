import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { runLookup, resolveCountryISO, REGISTRY_ADAPTERS } from '../_shared/registryLookup.ts';
import { sanitizePromptInput } from '../_shared/sanitizePromptInput.ts';

/**
 * publicDoctorCheck — the PUBLIC, no-login "Check Your Doctor" look-up.
 *
 * Deliberately different from the internal admin engine (runInternetIntelligence):
 *  - NO fingerprinting of the SEARCHER (no device/IP risk analysis on the person
 *    doing the look-up — that only applies to someone submitting THEMSELVES as a
 *    provider).
 *  - NO risk score, NO "HIGH RISK" verdict. Every signal is framed neutrally:
 *    absence = "we couldn't verify", presence = "consistent with". The scored
 *    admin view is reserved for reviewing doctors applying to join the network.
 *  - IP-rate-limited so it can't be used for mass harassment / stalking.
 *
 * Returns a result shaped exactly for the CheckYourDoctor UI:
 *   { outcome, doctorName, clinic, location, signals:[{label,status,finding}], summary }
 * where status ∈ 'found' | 'not_found' | 'clear' | 'unknown'.
 */

const SUMMARY_PARTIAL =
  'We couldn’t independently verify this doctor from the public sources we can access. ' +
  'That doesn’t mean anything is wrong — many good doctors have a small online footprint, and some registries aren’t publicly searchable. ' +
  'It does mean the picture is incomplete, so confirm their credentials directly before you commit.';
const SUMMARY_FOUND =
  'We found public records consistent with this doctor. That’s a reassuring sign — but verification signals aren’t proof, ' +
  'so it’s still worth confirming directly with the provider before you book.';

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

export default createHandler(async ({ req, base44, body }) => {
  const { doctor_name, clinic, location, license } = await body<Record<string, string>>();
  if (!doctor_name?.trim() || !clinic?.trim() || !location?.trim()) {
    return err('Please add the doctor’s name, their clinic, and a country or city.');
  }

  // ── Rate limit by IP (anti-harassment). Never fingerprint beyond this. ──────
  const ip = (req.headers.get('CF-Connecting-IP')
    || req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown').trim();
  const hourOk = await checkRateLimit(base44, `cyd_ip_hour_${ip}`, 3600, 15);
  const dayOk  = await checkRateLimit(base44, `cyd_ip_day_${ip}`, 86400, 60);
  if (!hourOk || !dayOk) {
    return err('You’ve run a lot of look-ups in a short time. This tool is for checking your own doctor before booking — please try again later.', 429);
  }

  const name = doctor_name.trim();
  const iso = resolveCountryISO(location);
  const countryLabel = location.trim();

  // Sanitized copies for the LLM prompt only (public, unauthenticated input =
  // injection surface). The registry lookup + displayed findings keep the real
  // values — sanitizing is applied strictly to what enters the model prompt.
  const namePrompt = sanitizePromptInput(name, 120).text;
  const clinicPrompt = sanitizePromptInput(clinic.trim(), 160).text;
  const locationPrompt = sanitizePromptInput(countryLabel, 120).text;

  // ── Signal 1: License registry ──────────────────────────────────────────────
  let licenseSignal;
  if (license?.trim()) {
    const r: any = await runLookup(iso, license.trim(), name);
    if (r.supported && r.found && r.name_match !== false) {
      licenseSignal = { label: 'License registry', status: 'found',
        finding: `A licence record matching “${name}” was found in ${r.registry_name}.` };
    } else if (r.supported && r.found) {
      licenseSignal = { label: 'License registry', status: 'found',
        finding: `A licence record was found in ${r.registry_name}, though the name on file differs slightly — worth confirming directly.` };
    } else if (r.supported && r.reason === 'not_found') {
      licenseSignal = { label: 'License registry', status: 'not_found',
        finding: `That licence number didn’t match a public record in ${r.registry_name}.` };
    } else {
      licenseSignal = { label: 'License registry', status: 'unknown',
        finding: `${countryLabel}’s registry couldn’t be checked automatically right now — confirm the licence with the provider or the local board.` };
    }
  } else if (iso && REGISTRY_ADAPTERS[iso]) {
    licenseSignal = { label: 'License registry', status: 'unknown',
      finding: `Add the doctor’s licence number for an automated check against ${REGISTRY_ADAPTERS[iso].registry_name}.` };
  } else {
    licenseSignal = { label: 'License registry', status: 'unknown',
      finding: `${countryLabel}’s licence registry isn’t publicly searchable from here, so this can only be confirmed with the provider or the local board directly.` };
  }

  // ── Signal 2 & 3: Web/social presence + news/litigation (one neutral AI pass) ─
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
      webSignal = { label: 'Web & social presence', status: 'found',
        finding: ai.web_detail ? `Found ${ai.web_detail} consistent with ${clinic.trim()}.` : `Found a public presence consistent with ${clinic.trim()}.` };
    } else {
      webSignal = { label: 'Web & social presence', status: 'not_found',
        finding: `We couldn’t find an established public profile (Google Business, Instagram, Facebook) matching this name and ${clinic.trim()}.` };
    }

    if (ai?.news === 'found' && ai.news_detail) {
      newsSignal = { label: 'News & public records', status: 'found',
        finding: `Public mention found: ${ai.news_detail} — read it yourself and weigh it before deciding.` };
    } else {
      newsSignal = { label: 'News & public records', status: 'clear',
        finding: webSignal.status === 'found'
          ? 'No litigation, complaint, or adverse-news mentions found.'
          : 'No news, litigation, or complaint mentions found — and none confirming their practice either.' };
    }
  } catch (_) {
    webSignal = { label: 'Web & social presence', status: 'unknown',
      finding: 'We couldn’t complete the web search right now. Try again shortly, or check their Google Business and social profiles yourself.' };
    newsSignal = { label: 'News & public records', status: 'unknown',
      finding: 'We couldn’t complete the news search right now.' };
  }

  // ── Signal 4: Our safety network (name/clinic overlap — NEVER an accusation) ─
  let networkSignal;
  try {
    const hits: any[] = await base44.asServiceRole.entities.Doctor
      .filter({ internet_risk_level: 'high' }, '-created_date', 200).catch(() => []);
    const nmeedle = name.toLowerCase();
    const cneedle = clinic.trim().toLowerCase();
    const overlap = (hits || []).some((d: any) =>
      (d.name && nameOverlap(String(d.name).toLowerCase(), nmeedleSafe(nmeedle))) ||
      (d.clinic_name && String(d.clinic_name).toLowerCase().includes(cneedle)));
    networkSignal = overlap
      ? { label: 'Our safety network', status: 'found',
          finding: 'This name or clinic overlaps with a record our team has reviewed internally. It isn’t a verdict — reach out and a coordinator can share what we’re able to.' }
      : { label: 'Our safety network', status: 'clear',
          finding: 'No matches in Morales’ fraud-signal database — we have no red flags on record (not the same as verified).' };
  } catch (_) {
    networkSignal = { label: 'Our safety network', status: 'clear',
      finding: 'No matches in Morales’ fraud-signal database — we have no red flags on record (not the same as verified).' };
  }

  const signals = [licenseSignal, webSignal, newsSignal, networkSignal];
  const outcome = (licenseSignal.status === 'found' || webSignal.status === 'found') ? 'found' : 'partial';

  return ok({
    outcome,
    doctorName: name,
    clinic: clinic.trim(),
    location: countryLabel,
    signals,
    summary: outcome === 'found' ? SUMMARY_FOUND : SUMMARY_PARTIAL,
    checked_at: new Date().toISOString(),
  });
}, { name: 'publicDoctorCheck', requireAuth: false });

// Loose name overlap on last name — avoids false "matches" on common first names.
function nmeedleSafe(n: string) { return n; }
function nameOverlap(a: string, b: string) {
  const last = b.split(' ').filter(Boolean).pop() || b;
  return last.length >= 3 && a.includes(last);
}
