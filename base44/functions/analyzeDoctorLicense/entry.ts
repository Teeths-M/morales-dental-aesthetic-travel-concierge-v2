import { createHandler, ok, err } from '../../shared/createHandler.ts';

/**
 * analyzeDoctorLicense — AI-assisted EXTRACTION of a license document, for the
 * human admin reviewer.
 *
 * ADVISORY ONLY (safety-decision invariant): it never writes a verified/cleared
 * status. Only a human (verifyDoctorLicense) or the cryptographically gated
 * activateVerifiedDoctor may clear a doctor. This function extracts fields, flags
 * concerns, stores them as notes/confidence, and routes the record to the manual
 * review queue — it can never set license_verified or a "verified" state.
 *
 * (Previously this set verification_status='ai_verified' + license_verified=true
 * straight from the model — removed 2026-07 as part of the safety hardening.)
 */
const TERMINAL = new Set(['verified', 'manually_approved', 'rejected', 'suspended']);

Deno.serve(createHandler(async ({ base44, body }) => {
  const { doctorId } = await body<{ doctorId?: string }>();
  if (!doctorId) return err('doctorId is required');

  const doctor = await base44.asServiceRole.entities.Doctor.get(doctorId).catch(() => null);
  if (!doctor || !doctor.license_url) return err('Doctor not found or no license uploaded', 404);

  let analysis: any = null;
  try {
    analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Extract the fields from this medical license document image and flag any concerns. You are ONLY extracting and flagging for a human reviewer — you do NOT decide verification, legitimacy, or approval.

Return JSON:
{
  "extracted_name": "...",
  "license_number": "...",
  "issuing_country": "...",
  "issue_date": "...",
  "expiry_date": "...",
  "specialty": "...",
  "confidence_score": 0-100,
  "red_flags": ["anything that looks off — legibility, tampering, expiry, mismatch"]
}`,
      file_urls: [doctor.license_url],
      response_json_schema: {
        type: 'object',
        properties: {
          extracted_name: { type: 'string' },
          license_number: { type: 'string' },
          issuing_country: { type: 'string' },
          issue_date: { type: 'string' },
          expiry_date: { type: 'string' },
          specialty: { type: 'string' },
          confidence_score: { type: 'number' },
          red_flags: { type: 'array', items: { type: 'string' } },
        },
      },
    });
  } catch (_) { /* AI unavailable — still route to human review, never auto-clear */ }

  const notes = analysis
    ? `AI extraction (ADVISORY ONLY — not a verification): name ${analysis.extracted_name || 'N/A'}, licence ${analysis.license_number || 'N/A'}, ${analysis.issuing_country || '?'}, expires ${analysis.expiry_date || 'N/A'}. Confidence ${analysis.confidence_score ?? '?'}%. Flags: ${(analysis.red_flags || []).join(', ') || 'none'}. A human must verify before this doctor can be activated.`
    : 'AI analysis unavailable — manual review required.';

  // Route to the human queue. NEVER set license_verified or a verified state here.
  // Do not disturb a doctor already in a terminal admin state.
  const update: Record<string, unknown> = { verification_notes: notes };
  if (analysis?.confidence_score !== undefined) update.verification_confidence = analysis.confidence_score;
  if (!TERMINAL.has(doctor.verification_status)) update.verification_status = 'pending_manual';

  await base44.asServiceRole.entities.Doctor.update(doctorId, update).catch(() => {});

  return ok({
    success: true,
    doctorId,
    advisory: analysis || null,     // returned for the admin UI to display
    routed_to: 'manual_review',
    ai_available: !!analysis,
    note: 'Advisory only — a human verifies. This function cannot clear a doctor.',
  });
}, { name: 'analyzeDoctorLicense', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
