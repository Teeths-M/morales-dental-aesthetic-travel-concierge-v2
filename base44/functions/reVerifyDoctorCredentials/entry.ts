import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { cronAuthorized } from '../_shared/cronAuth.ts';
import { runLookup, resolveCountryISO } from '../_shared/registryLookup.ts';
import { TTL_MS, isFresh, flagForReview } from '../_shared/freshness.ts';

/**
 * reVerifyDoctorCredentials — scheduled DAILY re-verification of doctor licences
 * against the OFFICIAL registries (US NPI, RETHUS, SEP via the shared adapters).
 *
 * FAIL-SAFE, NOT FAIL-SILENT — this deliberately replaces the previous version,
 * which "silently renewed" a doctor's verified timestamp from an LLM guess:
 *   • A real positive registry hit (found + active + name match) is the ONLY
 *     thing that refreshes credential_verified_date. We never renew on a guess.
 *   • A definite bad status (deactivated / suspended / revoked) immediately
 *     suspends the doctor (suppressing them from new bookings) and flags review.
 *   • An ambiguous 'not found' / 'service unavailable' does NOT auto-suspend a
 *     previously-verified doctor (registries flake) — it leaves the record
 *     UNCONFIRMED (stale) and flags it for a human. It is never renewed.
 *
 * Registry adapters are free (NPI) or cheap; the LLM bridge for countries with
 * no adapter is capped per run to protect integration credits.
 *
 * Cron-registered in Base44 (daily), runs under the scheduler's admin identity —
 * same pattern as expireDoctorVerifications. Also manually triggerable by admin.
 */
const BATCH = 40; // doctors re-checked per daily run (oldest-confirmed first)
const RECHECK_COOLDOWN_MS = 20 * 60 * 60 * 1000; // don't re-hit the same doctor within 20h
const LLM_FALLBACK_CAP = 8; // max internet-bridge checks per run (credit guard)

/** Only a DEFINITE negative registry status counts as a revocation. Unknown ≠ revoked. */
function statusIsRevoked(result: any): boolean {
  const s = String(result?.status ?? '').trim().toLowerCase();
  if (!s) return false;
  const bad = ['inactive', 'deactivated', 'suspended', 'revoked', 'expired', 'cancelado', 'inactivo', 'suspendido', 'n', 'd', 'i'];
  const good = ['active', 'activo', 'a', 'vigente', 'valid'];
  if (good.includes(s)) return false;
  return bad.includes(s);
}

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);
  const nowISO = new Date().toISOString();
  const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
  const useLLM = Deno.env.get('DOCTOR_RECHECK_USE_LLM') !== 'false';

  // Oldest-confirmed verified doctors first, so the cohort rotates over days.
  const verified = await base44.asServiceRole.entities.Doctor.filter(
    { verification_status: 'verified' }, 'credential_verified_date', 200,
  ).catch(() => []);

  const due = verified.filter((d: any) => {
    const doc = d.data || d;
    if (isFresh(doc.credential_verified_date, TTL_MS.doctor_license)) return false; // still fresh
    // Skip anything re-checked within the cooldown even if still unconfirmed.
    return (Date.now() - (Date.parse(doc.license_last_checked_at || '') || 0)) > RECHECK_COOLDOWN_MS;
  }).slice(0, BATCH);

  let confirmed = 0, suspended = 0, unconfirmed = 0, llmUsed = 0;

  for (const d of due) {
    const doc = d.data || d;
    const id = d.id;
    const name = doc.full_name || doc.doctor_name || 'Unknown';
    const license = doc.license_number || '';
    const iso = resolveCountryISO(doc.country || doc.clinic_country || '');

    // Mark the attempt regardless of outcome (separates "checked" from "confirmed").
    await base44.asServiceRole.entities.Doctor.update(id, { license_last_checked_at: nowISO }).catch(() => {});

    let result: any = null;
    if (license && iso) {
      result = await runLookup(iso, license, name).catch(() => null);
    }

    // ── Country with no registry adapter → optional internet bridge (capped) ──
    if ((!result || result.supported === false) && useLLM && llmUsed < LLM_FALLBACK_CAP && license) {
      llmUsed++;
      try {
        const bridge = await base44.asServiceRole.integrations.Core.InvokeLLM({
          add_context_from_internet: true,
          prompt: `Is medical licence/registration "${license}" for "${name}" in ${doc.country || 'their country'} currently active and in good standing on the official medical board registry? Only answer from the official registry. Return JSON {found:boolean, active:boolean, confidence:number(0-100), source:string}.`,
          response_json_schema: {
            type: 'object',
            properties: { found: { type: 'boolean' }, active: { type: 'boolean' }, confidence: { type: 'number' }, source: { type: 'string' } },
            required: ['found', 'active', 'confidence'],
          },
        });
        if (bridge?.found && bridge?.active && (bridge?.confidence ?? 0) >= 75) {
          result = { supported: true, found: true, status: 'active', confidence: bridge.confidence, registry_name: bridge.source || 'internet bridge', name_match: true };
        } else if (bridge?.found && bridge?.active === false && (bridge?.confidence ?? 0) >= 75) {
          result = { supported: true, found: true, status: 'suspended', confidence: bridge.confidence, registry_name: bridge.source || 'internet bridge' };
        } else {
          result = { supported: true, found: false, reason: 'not_found', registry_name: bridge?.source || 'internet bridge' };
        }
      } catch { result = null; }
    }

    // ── Decide ────────────────────────────────────────────────────────────────
    if (result && result.supported && result.found && !statusIsRevoked(result) && (result.name_match !== false) && (result.confidence ?? 100) >= 70) {
      // REAL confirmation → refresh the user-facing "last verified" date.
      await base44.asServiceRole.entities.Doctor.update(id, {
        credential_verified_date: nowISO,
        verified_at: nowISO,
        license_verified: true,
        verification_notes: `Auto-confirmed ${nowISO} via ${result.registry_name || 'registry'} (${iso || 'bridge'}).`,
      }).catch(() => {});
      confirmed++;
      continue;
    }

    if (result && result.supported && result.found && statusIsRevoked(result)) {
      // DEFINITE bad status → suppress from bookings immediately + human review.
      await base44.asServiceRole.entities.Doctor.update(id, {
        verification_status: 'suspended',
        verification_notes: `Suspended ${nowISO}: registry status '${result.status}' in ${result.registry_name || iso}. Awaiting admin review.`,
      }).catch(() => {});
      await flagForReview(base44, {
        subject_type: 'doctor_license', subject_id: id, subject_label: `${name} (${doc.country || iso || '—'})`,
        change_type: 'suspected_revocation',
        detail: `Registry ${result.registry_name || iso} reported status '${result.status}' for licence ${license}. Doctor auto-suspended and suppressed from new bookings pending review.`,
        detected_via: 'scheduled', previous_value: 'verified', new_value: `registry: ${result.status}`, severity: 'critical',
      });
      if (doc.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: doc.email,
          subject: 'Action required: licence re-verification — Morales',
          body: `Dear Dr. ${name},\n\nOur scheduled re-check could not confirm your licence (${license}) as active in the official registry. Your profile is temporarily suspended from new bookings while our team reviews this. Please reply with current documentation.\n\nMorales Verification Team`,
        }).catch(() => {});
      }
      suspended++;
      continue;
    }

    // ── Ambiguous: not found / unavailable → leave UNCONFIRMED, never renew ────
    unconfirmed++;
    await flagForReview(base44, {
      subject_type: 'doctor_license', subject_id: id, subject_label: `${name} (${doc.country || iso || '—'})`,
      change_type: 'source_unavailable',
      detail: `Scheduled re-check could not confirm licence ${license || '(none on file)'} in ${iso || 'an available registry'} (${result?.reason || 'no automated source'}). Left unconfirmed — profile shows "re-verifying", not a stale confident date. Manual verification recommended.`,
      detected_via: 'scheduled', severity: 'warning',
    });
  }

  console.log(`[reVerifyDoctorCredentials] due=${due.length} confirmed=${confirmed} suspended=${suspended} unconfirmed=${unconfirmed} llm=${llmUsed}`);
  return ok({ success: true, checked: due.length, confirmed, suspended, unconfirmed, llm_used: llmUsed });
// Cron-only: cronAuthorized/CRON_SECRET is the real gate — rate-limiting the
// scheduler itself would risk throttling legitimate runs.
}, { name: 'reVerifyDoctorCredentials', requireAuth: false, rateLimit: false }));
