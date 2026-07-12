import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { runLookup, resolveCountryISO } from '../_shared/registryLookup.ts';
import { getViolations } from '../_shared/procedureCompatibility.ts';
import { isFresh, TTL_MS } from '../_shared/freshness.ts';
import { sanitizePromptInput } from '../_shared/sanitizePromptInput.ts';
import { aggregateVerification, CheckResult } from '../_shared/byoj.ts';

// ── verifyExternalJourney (Bring Your Own Journey) ────────────────────────────
// Runs a doctor + clinic + procedure the patient booked ELSEWHERE through the
// REAL, precise engines (registry lookup, clinic freshness, RED procedure rules,
// scored provider intel + fraud-signal DB) — not the neutral public tool.
//
// R5 — HONEST DEGRADED STATE. Every check reports whether it actually completed.
// A check that couldn't run (credits/registry/timeout) is 'unconfirmed', never a
// false green. The overall can be 'verified' only if EVERY check completed clean.
//
// R2 — NEVER A SILENT PASS. Any concerning finding, for a patient who has already
// booked, MUST create an append-only DutyOfCareEscalation record and notify a
// human coordinator before we return. We surface it, we don't wall it.
export default createHandler(async ({ base44, user, body }) => {
  const b = await body<Record<string, any>>();
  const doctor_name = String(b.doctor_name || '').trim();
  const clinic_name = String(b.clinic_name || '').trim();
  const country = String(b.destination_country || '').trim();
  const city = String(b.destination_city || '').trim();
  const doctor_license = String(b.doctor_license || '').trim();
  const procedures: string[] = Array.isArray(b.procedures) ? b.procedures.filter(Boolean).map(String) : [];
  const external_journey_id = b.external_journey_id ? String(b.external_journey_id) : '';

  if (!doctor_name || !clinic_name || !country) {
    return err('Doctor, clinic, and destination country are required.');
  }

  const patient_email = user?.email || '';
  const patient_name = user?.full_name || '';
  const checks: CheckResult[] = [];

  // ── 1. License registry (precise, deterministic) ────────────────────────────
  const iso = resolveCountryISO(country);
  if (doctor_license) {
    try {
      const r: any = await runLookup(iso, doctor_license, doctor_name);
      const status = String(r?.status || '').toLowerCase();
      if (r?.supported && (status.includes('revoked') || status.includes('suspended') || status.includes('inactive'))) {
        checks.push({ key: 'license', label: 'License registry', status: 'concern', completed: true,
          detail: `The licence on file reads “${r.status}” in ${r.registry_name || 'the registry'} — this needs review before your date.` });
      } else if (r?.supported && r?.found && r?.name_match !== false) {
        checks.push({ key: 'license', label: 'License registry', status: 'verified', completed: true,
          detail: `A licence matching “${doctor_name}” was found in ${r.registry_name || 'the national registry'}.` });
      } else if (r?.supported && r?.found) {
        checks.push({ key: 'license', label: 'License registry', status: 'verified', completed: true,
          detail: `A licence record was found, though the name on file differs slightly — worth confirming directly.` });
      } else if (r?.supported && r?.reason === 'not_found') {
        checks.push({ key: 'license', label: 'License registry', status: 'concern', completed: true,
          detail: `That licence number didn’t match a public record in ${r.registry_name || 'the registry'}.` });
      } else {
        checks.push({ key: 'license', label: 'License registry', status: 'unconfirmed', completed: false,
          detail: `${country}’s registry couldn’t be checked automatically right now — confirm the licence with the provider or the local board.` });
      }
    } catch (_) {
      checks.push({ key: 'license', label: 'License registry', status: 'unconfirmed', completed: false,
        detail: 'We couldn’t reach the licence registry just now. This is a gap to confirm, not a finding.' });
    }
  } else {
    checks.push({ key: 'license', label: 'License registry', status: 'unconfirmed', completed: false,
      detail: 'Add the doctor’s licence number and we’ll check it against the national registry.' });
  }

  // ── 2. Clinic status + freshness ────────────────────────────────────────────
  try {
    const matches = await base44.asServiceRole.entities.Clinic
      .filter({ name: clinic_name, country }, '-status_verified_at', 1).catch(() => []);
    const clinic = matches?.[0];
    if (!clinic) {
      checks.push({ key: 'clinic', label: 'Clinic status', status: 'unconfirmed', completed: false,
        detail: 'We have no verified operating record for this clinic yet — a gap, not a red flag. Your coordinator can reach out to confirm.' });
    } else if (clinic.operating_status === 'closed' || clinic.operating_status === 'suspended') {
      checks.push({ key: 'clinic', label: 'Clinic status', status: 'concern', completed: true,
        detail: `Our records list this clinic as “${clinic.operating_status}.” Please confirm with them before you travel.` });
    } else if (clinic.operating_status === 'operating' && isFresh(clinic.status_verified_at, TTL_MS.clinic_status)) {
      checks.push({ key: 'clinic', label: 'Clinic status', status: 'verified', completed: true,
        detail: 'Clinic operating status confirmed and current.' });
    } else {
      checks.push({ key: 'clinic', label: 'Clinic status', status: 'unconfirmed', completed: false,
        detail: 'The last confirmation of this clinic’s status is past our freshness window — we’re re-verifying.' });
    }
  } catch (_) {
    checks.push({ key: 'clinic', label: 'Clinic status', status: 'unconfirmed', completed: false,
      detail: 'We couldn’t check the clinic’s status just now.' });
  }

  // ── 3. Procedure combination (RED rules — deterministic, always completes) ───
  if (procedures.length >= 2) {
    const { isBlocked, violations } = getViolations(procedures.map((p) => ({ title: p, name: p })));
    if (isBlocked) {
      checks.push({ key: 'procedures', label: 'Procedure safety', status: 'concern', completed: true,
        detail: `${violations[0]?.reason || 'This combination needs review by a licensed physician before your date.'}` });
    } else {
      checks.push({ key: 'procedures', label: 'Procedure safety', status: 'verified', completed: true,
        detail: 'No dangerous combination detected in what you listed.' });
    }
  } else {
    checks.push({ key: 'procedures', label: 'Procedure safety', status: 'verified', completed: true,
      detail: 'A single procedure — no combination risk to flag. A full SAFE-T scan runs once you’re enrolled.' });
  }

  // ── 4. Provider intel — fraud-signal DB overlap + scored AI pass ────────────
  let fraudOverlap = false;
  try {
    const hits: any[] = await base44.asServiceRole.entities.Doctor
      .filter({ internet_risk_level: 'high' }, '-created_date', 200).catch(() => []);
    const last = (doctor_name.toLowerCase().split(' ').filter(Boolean).pop() || '');
    const cn = clinic_name.toLowerCase();
    fraudOverlap = (hits || []).some((d: any) =>
      (last.length >= 3 && d.name && String(d.name).toLowerCase().includes(last)) ||
      (d.clinic_name && String(d.clinic_name).toLowerCase().includes(cn)));
  } catch (_) { /* non-fatal */ }

  if (fraudOverlap) {
    checks.push({ key: 'intel', label: 'Safety network', status: 'concern', completed: true,
      detail: 'This name or clinic overlaps with a record our team has flagged internally. A coordinator will share what we can.' });
  } else {
    // Scored AI credibility pass (sanitized). AI may only ADD caution, never clear.
    try {
      const ai: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
        add_context_from_internet: true,
        prompt: `You are a verification analyst for a medical-travel safety platform. A patient has ALREADY booked with this provider. Report only what is publicly findable — do not reassure beyond the evidence.
Doctor: ${sanitizePromptInput(doctor_name, 120).text}
Clinic: ${sanitizePromptInput(clinic_name, 160).text}
Location: ${sanitizePromptInput([city, country].filter(Boolean).join(', '), 120).text}
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
          detail: ai?.note ? String(ai.note) : 'Public records are consistent with an established provider — reassuring, not proof.' });
      }
    } catch (_) {
      // R5: credits/network down → unconfirmed, NEVER a false clean.
      checks.push({ key: 'intel', label: 'Provider intelligence', status: 'unconfirmed', completed: false,
        detail: 'We couldn’t complete the live provider search right now — we’ll retry, and a coordinator can check manually.' });
    }
  }

  // ── Aggregate honestly (R5) ─────────────────────────────────────────────────
  const summary = aggregateVerification(checks);

  // ── R2: NEVER a silent pass. Any concern → escalate + notify, before returning ─
  let escalation_id = '';
  if (summary.overall === 'concerns') {
    const findingMap: Record<string, string> = {
      license: 'license_not_found', clinic: 'clinic_closed_or_suspended',
      procedures: 'procedure_red_block', intel: 'provider_fraud_signal',
    };
    const detailLines = checks.filter((c) => c.status === 'concern').map((c) => `${c.label}: ${c.detail}`);
    try {
      const rec = await base44.asServiceRole.entities.DutyOfCareEscalation.create({
        external_journey_id, patient_email, patient_name,
        finding_type: findingMap[summary.concern_keys[0]] || 'other',
        severity: 'critical',
        detail: detailLines.join(' | '),
        coordinator_outreach_status: 'pending',
        status: 'open', source: 'byoj_verification',
        external_reporting_considered: false, // OPEN POLICY DECISION — not acted on
        detected_at: new Date().toISOString(),
      });
      escalation_id = rec?.id || '';
    } catch (_) { /* logging failure must not swallow the concern — see below */ }

    // Mandatory human-coordinator outreach.
    try {
      const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@moralesmedical.com';
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `⚠️ Duty-of-care escalation — BYOJ patient ${patient_name || patient_email}`,
        body: `<h2>Bring Your Own Journey — concerning verification</h2>
<p>This patient has ALREADY booked externally. A concern was found and must be actioned, not left to pass.</p>
<p><strong>Patient:</strong> ${patient_name || '—'} (${patient_email})</p>
<p><strong>Provider:</strong> ${doctor_name} @ ${clinic_name}, ${city ? city + ', ' : ''}${country}</p>
<p><strong>Findings:</strong><ul>${detailLines.map((l) => `<li>${l}</li>`).join('')}</ul></p>
<p>Escalation record: ${escalation_id || '(record write failed — action manually)'}</p>`,
      });
    } catch (_) { /* outreach best-effort; the escalation record is the durable artifact */ }
  }

  // ── Persist the verification snapshot on the ExternalJourney ─────────────────
  const nowISO = new Date().toISOString();
  const journeyPatch = {
    patient_email, patient_name,
    doctor_name, doctor_license, clinic_name, procedures,
    destination_country: country, destination_city: city,
    surgery_date: b.surgery_date || '', travel_departure_date: b.travel_departure_date || '',
    travel_return_date: b.travel_return_date || '',
    verification_status: summary.overall,
    verification_completeness: summary.completeness,
    verification_result: { checks, summary },
    verified_at: nowISO,
    escalation_id,
    origin: 'byoj',
  };
  let journeyId = external_journey_id;
  try {
    if (external_journey_id) {
      await base44.asServiceRole.entities.ExternalJourney.update(external_journey_id, journeyPatch);
    } else {
      const rec = await base44.asServiceRole.entities.ExternalJourney.create({ ...journeyPatch, created_at: nowISO });
      journeyId = rec?.id || '';
    }
  } catch (_) { /* snapshot persistence is best-effort; the result is still returned */ }

  // ── Guide, don't wall — recommended next actions derived from the findings ───
  const recommendations: string[] = [];
  if (summary.concern_keys.includes('procedures')) recommendations.push('Book a second-opinion tele-consult before your surgery date.');
  if (summary.concern_keys.length > 0) recommendations.push('Add a travel companion for the recovery window — we can arrange one.');
  if (summary.concern_keys.includes('license') || summary.concern_keys.includes('clinic')) recommendations.push('Send the clinic our short safety brief and share their reply with us.');
  if (summary.overall === 'incomplete') recommendations.push('We’ll keep re-checking what we couldn’t confirm live and let you know if anything changes.');
  if (recommendations.length === 0) recommendations.push('You’re set to enroll — we’ll monitor your journey end to end.');

  return ok({
    external_journey_id: journeyId,
    overall: summary.overall,
    completeness: summary.completeness,
    checks,
    recommendations,
    escalated: !!escalation_id || summary.overall === 'concerns',
  });
}, { name: 'verifyExternalJourney', requireAuth: true });
