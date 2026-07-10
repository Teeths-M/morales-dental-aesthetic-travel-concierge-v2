import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

async function verifyPortalToken(token) {
  const [b64, sigHex] = token.split('.');
  if (!b64 || !sigHex) return null;
  const data = atob(b64);
  const secret = Deno.env.get('PORTAL_TOKEN_SECRET') || 'change-me-in-production';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sigBytes = Uint8Array.from(sigHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  if (!valid) return null;
  const payload = JSON.parse(data);
  if (Date.now() > payload.expires_at) return null;
  return payload;
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token } = body;

    // SECURITY: Token is REQUIRED — no fallback to raw consultation_id/partner_id from body.
    // The token must be HMAC-signed and contain role, partner_id, case/consultation_id, and expiry.
    if (!token) {
      return Response.json({ error: 'Portal token required' }, { status: 401 });
    }

    const verified = await verifyPortalToken(token);
    if (!verified) {
      return Response.json({ error: 'Invalid or expired portal token' }, { status: 403 });
    }

    // Extract identity from the verified token — never trust request body for these
    const { role: tokenRole, partner_id: tokenPartnerId, consultation_id: tokenConsultationId, case_id: tokenCaseId } = verified;

    if (!tokenPartnerId || (!tokenConsultationId && !tokenCaseId)) {
      return Response.json({ error: 'Malformed portal token: missing required claims' }, { status: 403 });
    }

    const consultation_id = tokenConsultationId;
    const partner_id = tokenPartnerId;

    // Verify this partner is authorised for this consultation via WorkflowEvent
    const workflows = await base44.asServiceRole.entities.WorkflowEvent.filter({ consultation_id });

    if (!workflows || workflows.length === 0) {
      return Response.json({ error: 'No workflow found for this consultation' }, { status: 403 });
    }

    const workflow = workflows[0];
    const authorisedPartnerIds = [
      workflow.assigned_doctor_id,
      workflow.assigned_agency_id,
      workflow.assigned_taxi_id,
    ].filter(Boolean);

    if (!authorisedPartnerIds.includes(partner_id)) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);

    if (!consultation) {
      return Response.json({ error: 'Consultation not found', consultation_id }, { status: 404 });
    }

    // Look up the linked CaseRecord so portals can update logistics fields
    let caseId: string | null = null;
    try {
      const cases = await base44.asServiceRole.entities.CaseRecord.filter(
        { consultation_id }, '-created_date', 1
      );
      caseId = cases[0]?.id ?? null;
    } catch (_) {}

    // Return only the fields the partner actually needs — never return the full record
    const safeConsultation = {
      id:                  caseId,          // CaseRecord ID — used by portals to save logistics
      consultation_id:     consultation_id, // Consultation entity ID
      patient_name:        consultation.patient_name,
      procedure_interest:  consultation.procedure_interest,
      preferred_date:      consultation.preferred_date,
      duration_of_stay:    consultation.duration_of_stay,
      procedure_country:   consultation.procedure_country,
      hotel_name:          consultation.hotel_name     || null,
      hotel_address:       consultation.hotel_address  || null,
      hotel_coords:        consultation.hotel_coords   || null,
      clinic_address:      consultation.clinic_address || null,
      clinic_coords:       consultation.clinic_coords  || null,
    };

    // BUG-R10-05 FIX: try/catch on .get() silently swallows legitimate not-found vs auth errors.
    // Use a sequential fallback without throwing — check TaxiService first, then TravelAgency.
    // Also: getPortalData is called by partners who are NOT authenticated app users,
    // so partner lookup must always use asServiceRole, which is already correct here.
    let partner = null;
    const [taxi, agency] = await Promise.allSettled([
      base44.asServiceRole.entities.TaxiService.get(partner_id),
      base44.asServiceRole.entities.TravelAgency.get(partner_id),
    ]);
    if (taxi.status === 'fulfilled' && taxi.value) partner = taxi.value;
    else if (agency.status === 'fulfilled' && agency.value) partner = agency.value;

    // BUG-R10-06 FIX: SEC-10 — never return internal error detail from a public-facing endpoint
    return Response.json({ consultation: safeConsultation, partner });
  } catch (error) {
    console.error('[getPortalData]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'getPortalData', requireAuth: false }));
