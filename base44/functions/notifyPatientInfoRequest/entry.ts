import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { escapeHtml } from '../../shared/emailTemplate.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { consultation_id, doctor_question, doctor_portal_token } = await req.json();

    const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);
    if (!consultation) {
      return Response.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // SECURITY: this emails the real patient with attacker-controlled text if
    // left unguarded — verify the caller is the doctor actually assigned to
    // this case via the linked CaseRecord's doctor_portal_token, the same
    // token PortalDoctor.jsx (a no-login doctor portal) already holds.
    const cases = await base44.asServiceRole.entities.CaseRecord.filter({ consultation_id });
    const linkedCase = (cases || [])[0];
    if (!doctor_portal_token || !linkedCase || linkedCase.doctor_portal_token !== doctor_portal_token) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const patientName = escapeHtml(consultation.patient_name || 'Patient');
    const patientEmail = consultation.email;
    const safeQuestion = escapeHtml(doctor_question);

    // Email patient
    if (patientEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: patientEmail,
        subject: '📋 Your Doctor Has a Question Before Confirming',
        body: `
          <p>Dear ${patientName},</p>
          <p>Your assigned doctor has reviewed your case and needs some additional information before confirming availability.</p>
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0;font-weight:700;color:#92400e;margin-bottom:8px">Doctor's Question:</p>
            <p style="margin:0;color:#111;font-size:15px">${safeQuestion}</p>
          </div>
          <p>Please reply to this email or log in to your dashboard to provide the requested information.</p>
          <p style="color:#888;font-size:12px;margin-top:24px">Morales Medical Travel Safety</p>
        `,
      });
    }

    // BUG-R11-03 FIX: hardcoded admin email — use ADMIN_EMAIL env var
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (adminEmail) await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `❓ Doctor Requested More Info — ${patientName}`,
      body: `
        <p>A doctor has requested additional information from a patient before confirming their case.</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <tr><td style="padding:8px;color:#555">Patient</td><td style="padding:8px;font-weight:700">${patientName}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding:8px;color:#555">Consultation ID</td><td style="padding:8px">${consultation_id}</td></tr>
          <tr><td style="padding:8px;color:#555">Patient Email</td><td style="padding:8px">${patientEmail || 'N/A'}</td></tr>
        </table>
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;font-weight:700;color:#92400e;margin-bottom:8px">Doctor's Question:</p>
          <p style="margin:0">${safeQuestion}</p>
        </div>
        <p style="font-size:12px;color:#888">The case stage has been updated to 'info_requested'. Please follow up as needed.</p>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    // BUG-R11-02 FIX: SEC-10
    console.error('[notifyPatientInfoRequest]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'notifyPatientInfoRequest', requireAuth: false }));
