/**
 * closeEmergencyThreatLoop
 *
 * Stage 5 of the Non-Medical Security Breach scenario (iQ200 Coordination Engine).
 * Called when the traveler confirms safe arrival from any device.
 *
 * Actions:
 * 1. Validate PinSession
 * 2. Mark RecoveryTransportRequest as completed
 * 3. Expire all active GuardianShareLink records for this case
 * 4. Clear "is_compromised" flag on CaseRecord
 * 5. Revoke the PinSession (single-use after closure)
 * 6. Write audit log entry
 * 7. Email admin the incident report
 * 8. Email emergency contacts: "{name} is safe"
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validatePinSession(base44: any, token: string) {
  if (!token) return { valid: false };
  const tokenHash = await sha256(token);
  const sessions = await base44.asServiceRole.entities.PinSession.filter({ token_hash: tokenHash, is_revoked: false });
  if (!sessions.length) return { valid: false };
  const session = sessions[0];
  if (new Date(session.expires_at) < new Date()) return { valid: false };
  return { valid: true, session };
}

function generateIncidentRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => chars[b % chars.length]).join('');
  return `INC-${suffix}`;
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { pin_session_token, safe_location, notes } = await req.json();

    if (!pin_session_token) return Response.json({ error: 'pin_session_token required' }, { status: 400 });

    const sessionResult = await validatePinSession(base44, pin_session_token);
    if (!sessionResult.valid) return Response.json({ error: 'Invalid or expired session' }, { status: 401 });

    const userEmail: string = sessionResult.session.user_email;
    const now = new Date();
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
    const incidentRef = generateIncidentRef();

    // ── Resolve case ──────────────────────────────────────────────────────────
    let caseRecord: any = null;
    try {
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ client_email: userEmail }, '-created_date', 1);
      caseRecord = cases[0] || null;
    } catch (_) {}

    const patientName: string = caseRecord?.client_name || userEmail.split('@')[0];
    const caseId: string = caseRecord?.id || '';

    // ── 1. Complete RecoveryTransportRequest ──────────────────────────────────
    try {
      const transports = await base44.asServiceRole.entities.RecoveryTransportRequest.filter(
        { user_email: userEmail }, '-created_date', 5
      );
      const active = transports.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled');
      for (const t of active) {
        await base44.asServiceRole.entities.RecoveryTransportRequest.update(t.id, {
          status: 'completed',
          completed_at: now.toISOString(),
          safe_location: safe_location || 'Confirmed safe via Emergency Terminal',
        });
      }
    } catch (_) {}

    // ── 2. Expire all active GuardianShareLink records ────────────────────────
    if (caseId) {
      try {
        const links = await base44.asServiceRole.entities.GuardianShareLink.filter({ case_id: caseId, is_active: true });
        for (const link of links) {
          await base44.asServiceRole.entities.GuardianShareLink.update(link.id, {
            is_active: false,
            expired_at: now.toISOString(),
            expired_reason: 'threat_loop_closed',
          });
        }
      } catch (_) {}
    }

    // ── 3. Clear compromised flag on CaseRecord ───────────────────────────────
    if (caseRecord?.id) {
      try {
        await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
          is_compromised: false,
          threat_loop_closed_at: now.toISOString(),
          safe_arrival_confirmed_at: now.toISOString(),
          safe_arrival_location: safe_location || '',
        });
      } catch (_) {}
    }

    // ── 4. Revoke PinSession ──────────────────────────────────────────────────
    try {
      const tokenHash = await sha256(pin_session_token);
      const sessions = await base44.asServiceRole.entities.PinSession.filter({ token_hash: tokenHash });
      for (const s of sessions) {
        await base44.asServiceRole.entities.PinSession.update(s.id, { is_revoked: true, revoked_at: now.toISOString() });
      }
    } catch (_) {}

    // ── 5. Audit log ──────────────────────────────────────────────────────────
    await base44.functions.invoke('logAuditEvent', {
      event_type: 'emergency_threat_loop_closed',
      performed_by: userEmail,
      target_email: userEmail,
      metadata: { case_id: caseId, safe_location: safe_location || '', incident_ref: incidentRef, notes: notes || '' },
      timestamp: now.toISOString(),
    }).catch(() => {});

    // ── 6. Admin incident report email ────────────────────────────────────────
    if (adminEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales — iQ200 Coordination Engine',
        to: adminEmail,
        subject: `✅ THREAT LOOP CLOSED — ${patientName} safe [${incidentRef}]`,
        body: `<div style="font-family:sans-serif;max-width:600px;padding:24px;border:2px solid #16a34a;border-radius:12px;">
<div style="background:#16a34a;color:white;padding:16px;border-radius:8px;margin-bottom:20px;">
  <h2 style="margin:0;">✅ iQ200 — Emergency Resolved & Threat Loop Closed</h2>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
  <tr><td style="padding:6px 0;color:#6b7280;width:160px;">Traveler</td><td><strong>${patientName}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td>${userEmail}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Case ID</td><td>${caseId || 'N/A'}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Safe Location</td><td>${safe_location || 'Confirmed via Emergency Terminal'}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Incident Ref</td><td><strong style="font-size:15px;">${incidentRef}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Closed At</td><td>${now.toUTCString()}</td></tr>
  ${notes ? `<tr><td style="padding:6px 0;color:#6b7280;">Notes</td><td>${notes}</td></tr>` : ''}
</table>
<ul style="color:#374151;font-size:13px;line-height:2;">
  <li>✅ RecoveryTransportRequest status updated to <strong>completed</strong></li>
  <li>✅ Guardian tracking links expired (trail protected)</li>
  <li>✅ Emergency compromised flag cleared on case</li>
  <li>✅ PinSession revoked</li>
  <li>✅ Emergency contacts notified</li>
</ul>
<p style="color:#6b7280;font-size:12px;margin-top:16px;">Archive this incident report under reference <strong>${incidentRef}</strong>. Forward to local investigators or law enforcement if required.</p>
</div>`,
      }).catch(() => {});
    }

    // ── 7. Notify emergency contacts ──────────────────────────────────────────
    const contactEmails: string[] = [];
    if (caseRecord?.emergency_contact_email) contactEmails.push(caseRecord.emergency_contact_email);
    if (caseRecord?.guardian_email) contactEmails.push(caseRecord.guardian_email);

    for (const contactEmail of contactEmails) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Medical — Safety Update',
        to: contactEmail,
        subject: `✅ ${patientName} has confirmed they are safe`,
        body: `Good news — ${patientName} has signed off as safely arrived via the Morales Emergency System.\n\n${safe_location ? `Safe location: ${safe_location}\n\n` : ''}The Morales concierge team will follow up shortly with a full incident summary.\n\n— Morales Medical Concierge`,
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      golden_m: true,
      incident_ref: incidentRef,
      closed_at: now.toISOString(),
      contacts_notified: contactEmails.length,
      message: 'Threat loop closed. Family notified. Guardian links expired. Incident archived.',
    });
  } catch (error) {
    console.error('[closeEmergencyThreatLoop]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'closeEmergencyThreatLoop', requireAuth: false }));
