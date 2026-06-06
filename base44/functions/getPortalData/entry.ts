import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

Deno.serve(async (req) => {
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

    // Return only the fields the partner actually needs — never return the full record
    const safeConsultation = {
      patient_name: consultation.patient_name,
      procedure_interest: consultation.procedure_interest,
      preferred_date: consultation.preferred_date,
      duration_of_stay: consultation.duration_of_stay,
      procedure_country: consultation.procedure_country,
    };

    let partner = null;
    try {
      partner = await base44.asServiceRole.entities.TaxiService.get(partner_id);
    } catch (e) {
      try {
        partner = await base44.asServiceRole.entities.TravelAgency.get(partner_id);
      } catch (e2) {
        partner = null;
      }
    }

    return Response.json({ consultation: safeConsultation, partner });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});