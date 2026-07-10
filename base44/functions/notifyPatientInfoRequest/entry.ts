import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { consultation_id, doctor_question } = await req.json();

    const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);
    if (!consultation) {
      return Response.json({ error: 'Consultation not found' }, { status: 404 });
    }

    const patientName = consultation.patient_name || 'Patient';
    const patientEmail = consultation.email;

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
            <p style="margin:0;color:#111;font-size:15px">${doctor_question}</p>
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
          <p style="margin:0">${doctor_question}</p>
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
