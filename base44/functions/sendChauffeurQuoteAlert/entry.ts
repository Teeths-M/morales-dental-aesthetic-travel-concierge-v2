import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { consultation_id, driver_type, leg_1_cost_usd, leg_2_cost_usd, leg_3_cost_usd, leg_4_cost_usd, leg_5_cost_usd, leg_6_cost_usd } = body;

    if (!consultation_id) {
      return Response.json({ error: 'consultation_id is required' }, { status: 400 });
    }

    // Blackout guard
    const caseIdForBlackout = body.case_id || consultation_id;
    if (caseIdForBlackout) {
      const blackoutRes = await base44.functions.invoke('checkNotificationBlackout', {
        case_id: caseIdForBlackout,
        notification_type: 'email',
        recipient_role: 'vendor',
        recipient_identifier: '',
        event_trigger: 'sendChauffeurQuoteAlert',
        payload: body
      }).catch(() => ({ data: { suppressed: false } }));

      if (blackoutRes.data?.suppressed) {
        return Response.json({
          suppressed: true,
          reason: blackoutRes.data.reason,
          message: 'Notification suppressed — case is in SURGICAL_EXECUTION_WINDOW blackout'
        });
      }
    }

    const updateData = { status: 'Admin-Review' };

    if (driver_type === 'origin') {
      updateData.leg_1_cost_usd = Number(leg_1_cost_usd) || 0;
      updateData.leg_2_cost_usd = Number(leg_2_cost_usd) || 0;
    } else if (driver_type === 'destination') {
      updateData.leg_3_cost_usd = Number(leg_3_cost_usd) || 0;
      updateData.leg_4_cost_usd = Number(leg_4_cost_usd) || 0;
      updateData.leg_5_cost_usd = Number(leg_5_cost_usd) || 0;
      updateData.leg_6_cost_usd = Number(leg_6_cost_usd) || 0;
    }

    await base44.asServiceRole.entities.Consultation.update(consultation_id, updateData);

    const consultations = await base44.asServiceRole.entities.Consultation.filter({ id: consultation_id });
    const consultation = consultations[0];
    if (!consultation) {
      return Response.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // Calculate totals for admin notification
    const originTotal = (Number(updateData.leg_1_cost_usd) || 0) + (Number(updateData.leg_2_cost_usd) || 0);
    const destTotal = (Number(updateData.leg_3_cost_usd) || 0) + (Number(updateData.leg_4_cost_usd) || 0) + (Number(updateData.leg_5_cost_usd) || 0) + (Number(updateData.leg_6_cost_usd) || 0);
    const transferTotal = driver_type === 'origin' ? originTotal : destTotal;

    const appUrl = Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com';
    const adminUrl = `${appUrl}/portal-hub/admin`;

    // Fetch all admin users and notify
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'platform_admin');

    const legDetails = driver_type === 'origin'
      ? `<tr><td style="padding:8px 16px;font-size:13px;color:#888;">Leg 1 (Home → Airport)</td><td style="padding:8px 16px;font-size:14px;font-weight:600;">$${Number(updateData.leg_1_cost_usd).toFixed(2)}</td></tr>
         <tr style="background:#f9fafb;"><td style="padding:8px 16px;font-size:13px;color:#888;">Leg 2 (Airport → Home)</td><td style="padding:8px 16px;font-size:14px;font-weight:600;">$${Number(updateData.leg_2_cost_usd).toFixed(2)}</td></tr>`
      : `<tr><td style="padding:8px 16px;font-size:13px;color:#888;">Leg 3 (Airport → Hotel)</td><td style="padding:8px 16px;font-size:14px;font-weight:600;">$${Number(updateData.leg_3_cost_usd).toFixed(2)}</td></tr>
         <tr style="background:#f9fafb;"><td style="padding:8px 16px;font-size:13px;color:#888;">Leg 4 (Hotel → Clinic)</td><td style="padding:8px 16px;font-size:14px;font-weight:600;">$${Number(updateData.leg_4_cost_usd).toFixed(2)}</td></tr>
         <tr><td style="padding:8px 16px;font-size:13px;color:#888;">Leg 5 (Clinic → Hotel)</td><td style="padding:8px 16px;font-size:14px;font-weight:600;">$${Number(updateData.leg_5_cost_usd).toFixed(2)}</td></tr>
         <tr style="background:#f9fafb;"><td style="padding:8px 16px;font-size:13px;color:#888;">Leg 6 (Hotel → Airport)</td><td style="padding:8px 16px;font-size:14px;font-weight:600;">$${Number(updateData.leg_6_cost_usd).toFixed(2)}</td></tr>`;

    for (const admin of adminUsers) {
      if (!admin.email) continue;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `⚡ Admin Review Required — Transfer Quote for ${consultation.patient_name}`,
        body: `
<!doctype html>
<html>
<body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;">
    <tr><td align="center">
      <table width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #dde5df;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0F3A20;padding:24px 32px;">
          <div style="font-family:Georgia,serif;font-size:22px;color:#fff;">Morales Dental & Aesthetics</div>
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C5A059;margin-top:6px;">ADMIN REVIEW REQUIRED</div>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#0F3A20;">Transfer Quote Submitted — Markup Approval Needed</h2>
          <p style="color:#555;font-size:14px;margin:0 0 20px;">A chauffeur has submitted transfer pricing. Case status is now <strong>Admin-Review</strong>.</p>
          <table width="100%" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
            <tr style="background:#f9fafb;"><td style="padding:12px 16px;font-size:13px;color:#888;">Patient</td><td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111;">${consultation.patient_name}</td></tr>
            <tr><td style="padding:12px 16px;font-size:13px;color:#888;">Driver Type</td><td style="padding:12px 16px;font-size:14px;color:#111;text-transform:capitalize;">${driver_type}</td></tr>
            ${legDetails}
            <tr style="background:#0F3A20;"><td style="padding:12px 16px;font-size:13px;color:#C5A059;font-weight:700;">Transfer Total</td><td style="padding:12px 16px;font-size:16px;font-weight:700;color:#C5A059;">$${transferTotal.toFixed(2)}</td></tr>
          </table>
          <a href="${adminUrl}" style="display:inline-block;background:#0F3A20;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:700;">Open Admin Dashboard →</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }).catch(err => console.log(`Admin email skipped for ${admin.email}: ${err.message}`));
    }

    return Response.json({
      success: true,
      message: 'Leg costs saved. Status set to Admin-Review. Admin notified.',
      transfer_total: transferTotal,
    });
  } catch (error) {
    console.error('sendChauffeurQuoteAlert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});