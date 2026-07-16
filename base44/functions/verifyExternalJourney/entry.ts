import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ── Inlined: prompt sanitizer ──────────────────────────────────────────────────
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|context)/gi,
  /disregard\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|earlier|system)/gi,
  /forget\s+(?:everything|all|the\s+above|previous)/gi,
  /override\s+(?:the\s+)?(?:decision|result|verdict|system|rules?|safety|assessment)/gi,
  /(?:mark|set|classify|rate|score)\s+(?:this|it|me|the\s+\w+)?\s*(?:as\s+)?(?:low\s*risk|safe|approved|cleared|passed?)/gi,
  /approve\s+(?:anyway|regardless|it|this|me|despite)/gi,
  /\b(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be|roleplay\s+as|from\s+now\s+on\s+you)\b/gi,
  /\b(?:new|updated|revised)\s+(?:instructions?|rules?|system\s+prompt)\b/gi,
  /\b(?:jailbreak|DAN\s+mode|developer\s+mode|sudo\s+mode)\b/gi,
  /<\/?\s*(?:system|instructions?|prompt|assistant|user)\s*>/gi,
  /^\s*(?:system|assistant|developer)\s*:/gim,
  /```+\s*(?:system|prompt|instructions?)/gi,
];
function sanitizePromptInput(input: unknown, maxLen = 1500): string {
  if (typeof input !== 'string' || !input) return '';
  let text = input;
  for (const re of INJECTION_PATTERNS) { text = text.replace(re, ' [removed] '); re.lastIndex = 0; }
  text = text.replace(/[<>]/g, ' ').replace(/`{3,}/g, ' ');
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

// ── Inlined: freshness check ──────────────────────────────────────────────────
const HOUR = 60 * 60 * 1000;
const TTL_CLINIC_STATUS = 24 * HOUR;
function isFresh(timestamp: string | null | undefined, ttlMs: number): boolean {
  if (!timestamp) return false;
  const t = Date.parse(timestamp);
  return !Number.isNaN(t) && Date.now() - t <= ttlMs;
}

// ── Inlined: country ISO mapping + registry adapters ──────────────────────────
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
  for (const [name, iso] of Object.entries(COUNTRY_NAME_ISO)) { if (t.includes(name)) return iso; }
  return null;
}

type CheckStatus = 'verified' | 'concern' | 'unconfirmed';
interface CheckResult { key: string; label: string; status: CheckStatus; detail: string; completed: boolean; }

function aggregateVerification(checks: CheckResult[]) {
  const total = checks.length;
  const completedCount = checks.filter((c) => c.completed).length;
  const concerns = checks.filter((c) => c.status === 'concern');
  const completeness = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  let overall: 'verified' | 'concerns' | 'incomplete';
  if (concerns.length > 0) overall = 'concerns';
  else if (completedCount < total) overall = 'incomplete';
  else overall = 'verified';
  return { overall, completeness, completed: completedCount, total, concern_keys: concerns.map((c) => c.key) };
}

// ── Inlined: procedure compatibility (RED rules) ──────────────────────────────
interface ProcedureProfile { anesthesiaHrs: number; recoveryDays: number; stress: number; group: string; minorSurgery: boolean }
const PROCEDURE_PROFILES: Record<string, ProcedureProfile> = {
  'Dental Cleaning': { anesthesiaHrs: 0, recoveryDays: 0, stress: 1, group: 'dental-general', minorSurgery: false },
  'Deep Cleaning': { anesthesiaHrs: 0, recoveryDays: 2, stress: 2, group: 'dental-general', minorSurgery: false },
  'Fillings': { anesthesiaHrs: 0.5, recoveryDays: 1, stress: 2, group: 'dental-general', minorSurgery: false },
  'Tooth Extraction': { anesthesiaHrs: 0.5, recoveryDays: 3, stress: 3, group: 'dental-general', minorSurgery: true },
  'Wisdom Tooth Removal': { anesthesiaHrs: 1, recoveryDays: 5, stress: 4, group: 'dental-surgical', minorSurgery: true },
  'Root Canal Treatment': { anesthesiaHrs: 1.5, recoveryDays: 3, stress: 3, group: 'dental-general', minorSurgery: false },
  'Dental Crowns': { anesthesiaHrs: 0.5, recoveryDays: 1, stress: 2, group: 'dental-general', minorSurgery: false },
  'Dental Bridges': { anesthesiaHrs: 0.5, recoveryDays: 2, stress: 2, group: 'dental-general', minorSurgery: false },
  'Teeth Whitening': { anesthesiaHrs: 0, recoveryDays: 2, stress: 1, group: 'dental-cosmetic', minorSurgery: false },
  'Porcelain Veneers': { anesthesiaHrs: 0.5, recoveryDays: 2, stress: 2, group: 'dental-cosmetic', minorSurgery: false },
  'Composite Bonding': { anesthesiaHrs: 0, recoveryDays: 0, stress: 1, group: 'dental-cosmetic', minorSurgery: false },
  'Smile Makeover': { anesthesiaHrs: 1, recoveryDays: 3, stress: 3, group: 'dental-cosmetic', minorSurgery: false },
  'Hollywood Smile': { anesthesiaHrs: 1.5, recoveryDays: 3, stress: 4, group: 'dental-cosmetic', minorSurgery: false },
  'Single Dental Implant': { anesthesiaHrs: 1.5, recoveryDays: 5, stress: 4, group: 'dental-implant', minorSurgery: true },
  'Multiple Dental Implants': { anesthesiaHrs: 3, recoveryDays: 7, stress: 6, group: 'dental-implant', minorSurgery: true },
  'Full Mouth Implants': { anesthesiaHrs: 7, recoveryDays: 14, stress: 9, group: 'dental-implant', minorSurgery: true },
  'All-on-4 Implants': { anesthesiaHrs: 5, recoveryDays: 5, stress: 8, group: 'dental-implant', minorSurgery: true },
  'All-on-6 Implants': { anesthesiaHrs: 6, recoveryDays: 5, stress: 8, group: 'dental-implant', minorSurgery: true },
  'Bone Grafting': { anesthesiaHrs: 1.5, recoveryDays: 21, stress: 5, group: 'dental-implant', minorSurgery: true },
  'Sinus Lift': { anesthesiaHrs: 1.5, recoveryDays: 21, stress: 5, group: 'dental-implant', minorSurgery: true },
  'Rhinoplasty': { anesthesiaHrs: 3, recoveryDays: 14, stress: 7, group: 'face', minorSurgery: false },
  'Facelift': { anesthesiaHrs: 4, recoveryDays: 14, stress: 8, group: 'face', minorSurgery: false },
  'Eyelid Surgery': { anesthesiaHrs: 1.5, recoveryDays: 10, stress: 5, group: 'face', minorSurgery: false },
  'Botox': { anesthesiaHrs: 0, recoveryDays: 0, stress: 1, group: 'face-nonsurgical', minorSurgery: false },
  'Dermal Fillers': { anesthesiaHrs: 0, recoveryDays: 1, stress: 1, group: 'face-nonsurgical', minorSurgery: false },
  'Liposuction': { anesthesiaHrs: 3, recoveryDays: 14, stress: 6, group: 'body', minorSurgery: false },
  'Tummy Tuck': { anesthesiaHrs: 3.5, recoveryDays: 42, stress: 8, group: 'body', minorSurgery: false },
  'Mommy Makeover': { anesthesiaHrs: 5.5, recoveryDays: 42, stress: 9, group: 'body', minorSurgery: false },
  'Brazilian Butt Lift': { anesthesiaHrs: 3.5, recoveryDays: 21, stress: 7, group: 'body', minorSurgery: false },
  'Breast Augmentation': { anesthesiaHrs: 2, recoveryDays: 21, stress: 6, group: 'breast', minorSurgery: false },
  'Breast Lift': { anesthesiaHrs: 2.5, recoveryDays: 21, stress: 6, group: 'breast', minorSurgery: false },
  'Breast Reduction': { anesthesiaHrs: 3, recoveryDays: 28, stress: 7, group: 'breast', minorSurgery: false },
};

const RED_VIOLATION_PAIRS: Record<string, string> = {};
function addPair(a: string, b: string, reason: string) { RED_VIOLATION_PAIRS[`${a}|${b}`] = reason; RED_VIOLATION_PAIRS[`${b}|${a}`] = reason; }
addPair('Full Mouth Implants', 'Facelift', 'Full-mouth implants require 8–10 weeks of jaw healing. Facelift pulls facial tissue that overlaps the surgical field — combining them risks implant failure.');
addPair('Full Mouth Implants', 'Tummy Tuck', 'Total anesthesia exceeds safe thresholds (>12 hrs). Dramatically increases infection risk across two distant surgical fields.');
addPair('Full Mouth Implants', 'Rhinoplasty', 'Both share the maxillofacial blood supply. Simultaneous surgery creates vascular competition that can cause implant rejection.');
addPair('All-on-4 Implants', 'Tummy Tuck', 'Total ~8.5 hrs under general anesthesia, exceeding safe ceiling and raising DVT risk 6×.');
addPair('All-on-4 Implants', 'Mommy Makeover', 'Simultaneous surgical trauma in three anatomical zones. Recovery conflicts are irresolvable.');
addPair('All-on-6 Implants', 'Mommy Makeover', 'Total operating time would exceed 11 hrs with compounding infection and hemorrhage risk.');
addPair('Mommy Makeover', 'Rhinoplasty', 'Mommy Makeover requires supine with abdominal binders; Rhinoplasty requires head elevation. Recovery protocols are incompatible.');
addPair('Mommy Makeover', 'Facelift', 'Combined anesthesia exceeds 9 hrs. Recovery postures directly contradict each other.');
addPair('Tummy Tuck', 'Brazilian Butt Lift', 'Tummy Tuck requires supine recovery; BBL requires avoiding sitting/supine for 8 weeks. Mutually exclusive.');
addPair('Breast Reduction', 'Tummy Tuck', 'Combined blood loss can exceed safe transfusion thresholds. DVT risk increases 4×.');
addPair('Breast Reduction', 'Mommy Makeover', 'Mommy Makeover already includes breast work. Adding Breast Reduction creates redundant incisions.');
addPair('Bone Grafting', 'Sinus Lift', 'Both operate in overlapping maxillary bone territory. Doubles infection pathway and prevents proper clot formation.');

function getViolations(titles: string[]): { violations: string[]; isBlocked: boolean } {
  if (!titles || titles.length < 2) return { violations: [], isBlocked: false };
  const violations: string[] = [];
  for (let i = 0; i < titles.length; i++) {
    for (let j = i + 1; j < titles.length; j++) {
      const reason = RED_VIOLATION_PAIRS[`${titles[i]}|${titles[j]}`];
      if (reason) violations.push(`${titles[i]} + ${titles[j]}: ${reason}`);
    }
  }
  const profiles = titles.map((t) => PROCEDURE_PROFILES[t] || { stress: 3, anesthesiaHrs: 0 });
  const majorSurgeries = profiles.filter((p) => p.stress >= 6).length;
  if (majorSurgeries >= 3 && violations.length === 0) {
    violations.push(`${majorSurgeries} major surgeries simultaneously — safe anesthesia limits exceeded.`);
  }
  const totalAnesthesiaHrs = profiles.reduce((s, p) => s + (p.anesthesiaHrs || 0), 0);
  if (totalAnesthesiaHrs > 8 && violations.length === 0) {
    violations.push(`Combined anesthesia ~${totalAnesthesiaHrs.toFixed(1)} hrs exceeds safe ceiling for elective procedures.`);
  }
  return { violations, isBlocked: violations.length > 0 };
}

// ── Registry lookup (US NPI only — the only API-based adapter) ────────────────
async function runLookup(iso: string | null, licenseNumber: string, doctorName: string): Promise<any> {
  if (iso === 'US') {
    try {
      const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${encodeURIComponent(licenseNumber)}&limit=5`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return { supported: true, found: false, reason: 'service_unavailable', registry_name: 'NPI Registry (CMS)' };
      const data: any = await res.json();
      if (!data.results || data.results.length === 0) return { supported: true, found: false, reason: 'not_found', registry_name: 'NPI Registry (CMS)' };
      const rec = data.results[0];
      const basic = rec.basic || {};
      const fullName = `${basic.first_name || ''} ${basic.last_name || ''}`.trim().toLowerCase();
      const submittedName = (doctorName || '').toLowerCase();
      const nameMatch = fullName.length > 0 && (fullName.includes(submittedName.split(' ')[1] || submittedName) || submittedName.includes(fullName.split(' ')[1] || fullName));
      return { supported: true, found: true, registry_name: 'NPI Registry (CMS)', name_match: nameMatch, status: basic.status, confidence: nameMatch ? 90 : 55 };
    } catch { return { supported: true, found: false, reason: 'service_unavailable', registry_name: 'NPI Registry (CMS)' }; }
  }
  return { supported: false, route_to_manual: true, message: iso ? `No automated public registry lookup for ${iso}.` : 'Could not determine country with a searchable registry.' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    const isNonMedical = String(b.journey_type || 'medical') === 'non_medical';
    const doctor_name = String(b.doctor_name || '').trim();
    const clinic_name = String(b.clinic_name || '').trim();
    const country = String(b.destination_country || '').trim();
    const city = String(b.destination_city || '').trim();
    const doctor_license = String(b.doctor_license || '').trim();
    const procedures: string[] = Array.isArray(b.procedures) ? b.procedures.filter(Boolean).map(String) : [];
    const activity_name = String(b.activity_name || '').trim();
    const venue_name = String(b.venue_name || '').trim();
    const activity_type = String(b.activity_type || '').trim();
    const external_journey_id = b.external_journey_id ? String(b.external_journey_id) : '';

    if (isNonMedical) {
      if (!activity_name || !venue_name || !country) return Response.json({ error: 'Activity, venue, and destination country are required.' }, { status: 400 });
    } else {
      if (!doctor_name || !clinic_name || !country) return Response.json({ error: 'Doctor, clinic, and destination country are required.' }, { status: 400 });
    }

    const patient_email = user?.email || '';
    const patient_name = user?.full_name || '';
    const checks: CheckResult[] = [];

    if (isNonMedical) {
      // ── Non-medical: venue / activity intelligence ──────────────────────────
      try {
        const ai: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
          add_context_from_internet: true,
          prompt: `You are a travel safety analyst. A traveller has booked a NON-MEDICAL trip and wants safety verification.
Activity: ${sanitizePromptInput(activity_name, 120)}
Venue/Organizer: ${sanitizePromptInput(venue_name, 160)}
Type: ${sanitizePromptInput(activity_type, 80)}
Location: ${sanitizePromptInput([city, country].filter(Boolean).join(', '), 120)}
Report only publicly findable safety concerns (scams, dangerous areas, unreliable operators). Return ONLY JSON: {"credibility":"high"|"medium"|"low","red_flags":[string],"note":string}`,
          response_json_schema: { type: 'object', properties: {
            credibility: { type: 'string' }, red_flags: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } } },
        });
        const cred = String(ai?.credibility || '').toLowerCase();
        const flags: string[] = Array.isArray(ai?.red_flags) ? ai.red_flags.map(String) : [];
        if (cred === 'low' || flags.length > 0) {
          checks.push({ key: 'venue_intel', label: 'Venue intelligence', status: 'concern', completed: true,
            detail: flags[0] || 'Public records raise questions about this venue or operator worth reviewing.' });
        } else {
          checks.push({ key: 'venue_intel', label: 'Venue intelligence', status: 'verified', completed: true,
            detail: ai?.note ? String(ai.note) : 'No public safety concerns found — reassuring, not proof.' });
        }
      } catch (_) {
        checks.push({ key: 'venue_intel', label: 'Venue intelligence', status: 'unconfirmed', completed: false,
          detail: 'We couldn’t complete the live venue search right now — a coordinator can check manually.' });
      }
    } else {
      // ── 1. License registry ──────────────────────────────────────────────────
      const iso = resolveCountryISO(country);
      if (doctor_license) {
        try {
          const r: any = await runLookup(iso, doctor_license, doctor_name);
          const status = String(r?.status || '').toLowerCase();
          if (r?.supported && (status.includes('revoked') || status.includes('suspended') || status.includes('inactive'))) {
            checks.push({ key: 'license', label: 'License registry', status: 'concern', completed: true,
              detail: `The licence on file reads “${r.status}” in ${r.registry_name || 'the registry'} — needs review.` });
          } else if (r?.supported && r?.found && r?.name_match !== false) {
            checks.push({ key: 'license', label: 'License registry', status: 'verified', completed: true,
              detail: `A licence matching “${doctor_name}” was found in ${r.registry_name || 'the national registry'}.` });
          } else if (r?.supported && r?.found) {
            checks.push({ key: 'license', label: 'License registry', status: 'verified', completed: true,
              detail: 'A licence record was found, though the name on file differs slightly — worth confirming.' });
          } else if (r?.supported && r?.reason === 'not_found') {
            checks.push({ key: 'license', label: 'License registry', status: 'concern', completed: true,
              detail: `That licence number didn’t match a public record in ${r.registry_name || 'the registry'}.` });
          } else {
            checks.push({ key: 'license', label: 'License registry', status: 'unconfirmed', completed: false,
              detail: `${country}’s registry couldn’t be checked automatically — confirm the licence with the provider.` });
          }
        } catch (_) {
                checks.push({ key: 'license', label: 'License registry', status: 'unconfirmed', completed: false,
            detail: 'We couldn’t reach the licence registry just now.' });
        }
      } else {
        checks.push({ key: 'license', label: 'License registry', status: 'unconfirmed', completed: false,
          detail: 'Add the doctor’s licence number and we’ll check it against the national registry.' });
      }

      // ── 2. Clinic status + freshness ────────────────────────────────────────
      try {
        const matches = await base44.asServiceRole.entities.Clinic.filter({ name: clinic_name, country }, '-status_verified_at', 1).catch(() => []);
        const clinic = (matches as any[])?.[0];
        if (!clinic) {
          checks.push({ key: 'clinic', label: 'Clinic status', status: 'unconfirmed', completed: false,
            detail: 'We have no verified operating record for this clinic yet — a gap, not a red flag.' });
        } else if (clinic.operating_status === 'closed' || clinic.operating_status === 'suspended') {
          checks.push({ key: 'clinic', label: 'Clinic status', status: 'concern', completed: true,
            detail: `Our records list this clinic as “${clinic.operating_status}.” Confirm with them before you travel.` });
        } else if (clinic.operating_status === 'operating' && isFresh(clinic.status_verified_at, TTL_CLINIC_STATUS)) {
          checks.push({ key: 'clinic', label: 'Clinic status', status: 'verified', completed: true,
            detail: 'Clinic operating status confirmed and current.' });
        } else {
          checks.push({ key: 'clinic', label: 'Clinic status', status: 'unconfirmed', completed: false,
            detail: 'The last confirmation of this clinic’s status is past our freshness window — re-verifying.' });
        }
      } catch (_) {
        checks.push({ key: 'clinic', label: 'Clinic status', status: 'unconfirmed', completed: false,
          detail: 'We couldn’t check the clinic’s status just now.' });
      }

      // ── 3. Procedure combination (RED rules) ────────────────────────────────
      if (procedures.length >= 2) {
        const { isBlocked, violations } = getViolations(procedures);
        if (isBlocked) {
          checks.push({ key: 'procedures', label: 'Procedure safety', status: 'concern', completed: true,
            detail: violations[0] || 'This combination needs review by a licensed physician before your date.' });
        } else {
          checks.push({ key: 'procedures', label: 'Procedure safety', status: 'verified', completed: true,
            detail: 'No dangerous combination detected in what you listed.' });
        }
      } else {
        checks.push({ key: 'procedures', label: 'Procedure safety', status: 'verified', completed: true,
          detail: 'A single procedure — no combination risk. A full SAFE-T scan runs once you’re enrolled.' });
      }

      // ── 4. Provider intel ───────────────────────────────────────────────────
      let fraudOverlap = false;
      try {
        const hits: any[] = await base44.asServiceRole.entities.Doctor.filter({ internet_risk_level: 'high' }, '-created_date', 200).catch(() => []);
        const last = (doctor_name.toLowerCase().split(' ').filter(Boolean).pop() || '');
        const cn = clinic_name.toLowerCase();
        fraudOverlap = (hits || []).some((d: any) =>
          (last.length >= 3 && d.name && String(d.name).toLowerCase().includes(last)) ||
          (d.clinic_name && String(d.clinic_name).toLowerCase().includes(cn)));
      } catch (_) { /* non-fatal */ }

      if (fraudOverlap) {
        checks.push({ key: 'intel', label: 'Safety network', status: 'concern', completed: true,
          detail: 'This name or clinic overlaps with a record our team has flagged internally.' });
      } else {
        try {
          const ai: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
            add_context_from_internet: true,
            prompt: `You are a verification analyst for a medical-travel safety platform. A patient has ALREADY booked with this provider. Report only what is publicly findable.
Doctor: ${sanitizePromptInput(doctor_name, 120)}
Clinic: ${sanitizePromptInput(clinic_name, 160)}
Location: ${sanitizePromptInput([city, country].filter(Boolean).join(', '), 120)}
Return ONLY JSON: {"credibility":"high"|"medium"|"low","red_flags":[string],"note":string}`,
            response_json_schema: { type: 'object', properties: {
              credibility: { type: 'string' }, red_flags: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } } },
          });
          const cred = String(ai?.credibility || '').toLowerCase();
          const flags: string[] = Array.isArray(ai?.red_flags) ? ai.red_flags.map(String) : [];
          if (cred === 'low' || flags.length > 0) {
            checks.push({ key: 'intel', label: 'Provider intelligence', status: 'concern', completed: true,
              detail: flags[0] || 'Public records raise questions worth reviewing before your date.' });
          } else {
            checks.push({ key: 'intel', label: 'Provider intelligence', status: 'verified', completed: true,
              detail: ai?.note ? String(ai.note) : 'Public records are consistent with an established provider.' });
          }
        } catch (_) {
          checks.push({ key: 'intel', label: 'Provider intelligence', status: 'unconfirmed', completed: false,
            detail: 'We couldn’t complete the live provider search right now — a coordinator can check manually.' });
        }
      }
    }

    // ── Aggregate ────────────────────────────────────────────────────────────────
    const summary = aggregateVerification(checks);

    // ── R2: NEVER a silent pass — escalate concerns ─────────────────────────────
    let escalation_id = '';
    if (summary.overall === 'concerns') {
      const detailLines = checks.filter((c) => c.status === 'concern').map((c) => `${c.label}: ${c.detail}`);
      try {
        const rec = await base44.asServiceRole.entities.DutyOfCareEscalation.create({
          external_journey_id, patient_email, patient_name,
          finding_type: isNonMedical ? 'venue_safety_concern' : (summary.concern_keys[0] === 'license' ? 'license_not_found' : summary.concern_keys[0] === 'clinic' ? 'clinic_closed_or_suspended' : summary.concern_keys[0] === 'procedures' ? 'procedure_red_block' : 'provider_fraud_signal'),
          severity: 'critical',
          detail: detailLines.join(' | '),
          coordinator_outreach_status: 'pending',
          status: 'open', source: 'byoj_verification',
          external_reporting_considered: false,
          detected_at: new Date().toISOString(),
        });
        escalation_id = rec?.id || '';
      } catch (_) { /* logging failure must not swallow the concern */ }

      try {
        const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@moralesmedical.com';
        const providerLabel = isNonMedical ? `${activity_name} @ ${venue_name}` : `${doctor_name} @ ${clinic_name}`;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `⚠️ Duty-of-care escalation — BYOJ ${isNonMedical ? 'non-medical' : 'medical'} patient ${patient_name || patient_email}`,
          body: `<h2>Bring Your Own Journey — concerning verification</h2>
<p>This patient has ALREADY booked externally. A concern was found and must be actioned.</p>
<p><strong>Patient:</strong> ${patient_name || '—'} (${patient_email})</p>
<p><strong>${isNonMedical ? 'Activity' : 'Provider'}:</strong> ${providerLabel}, ${city ? city + ', ' : ''}${country}</p>
<p><strong>Findings:</strong><ul>${detailLines.map((l) => `<li>${l}</li>`).join('')}</ul></p>
<p>Escalation record: ${escalation_id || '(record write failed — action manually)'}</p>`,
        });
      } catch (_) { /* outreach best-effort */ }
    }

    // ── Persist verification snapshot ───────────────────────────────────────────
    const nowISO = new Date().toISOString();
    const journeyPatch: Record<string, any> = {
      patient_email, patient_name,
      destination_country: country, destination_city: city,
      surgery_date: b.surgery_date || '', travel_departure_date: b.travel_departure_date || '',
      travel_return_date: b.travel_return_date || '',
      verification_status: summary.overall,
      verification_completeness: summary.completeness,
      verification_result: { checks, summary },
      verified_at: nowISO,
      escalation_id,
      origin: 'byoj',
      journey_type: isNonMedical ? 'non_medical' : 'medical',
    };
    if (isNonMedical) {
      journeyPatch.doctor_name = '';
      journeyPatch.clinic_name = venue_name;
      journeyPatch.procedures = [];
      journeyPatch.activity_name = activity_name;
      journeyPatch.venue_name = venue_name;
      journeyPatch.activity_type = activity_type;
    } else {
      journeyPatch.doctor_name = doctor_name;
      journeyPatch.doctor_license = doctor_license;
      journeyPatch.clinic_name = clinic_name;
      journeyPatch.procedures = procedures;
    }

    let journeyId = external_journey_id;
    try {
      if (external_journey_id) {
        await base44.asServiceRole.entities.ExternalJourney.update(external_journey_id, journeyPatch);
      } else {
        const rec = await base44.asServiceRole.entities.ExternalJourney.create({ ...journeyPatch, created_at: nowISO });
        journeyId = rec?.id || '';
      }
    } catch (_) { /* snapshot persistence is best-effort */ }

    // ── Guide, don't wall ────────────────────────────────────────────────────────
    const recommendations: string[] = [];
    if (!isNonMedical && summary.concern_keys.includes('procedures')) recommendations.push('Book a second-opinion tele-consult before your surgery date.');
    if (summary.concern_keys.length > 0) recommendations.push('Add a travel companion for the recovery window — we can arrange one.');
    if (!isNonMedical && (summary.concern_keys.includes('license') || summary.concern_keys.includes('clinic'))) recommendations.push('Send the clinic our short safety brief and share their reply with us.');
    if (summary.overall === 'incomplete') recommendations.push('We’ll keep re-checking what we couldn’t confirm live and let you know.');
    if (recommendations.length === 0) recommendations.push('You’re set to enroll — we’ll monitor your journey end to end.');

    return Response.json({
      external_journey_id: journeyId,
      overall: summary.overall,
      completeness: summary.completeness,
      checks,
      recommendations,
      escalated: !!escalation_id || summary.overall === 'concerns',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});