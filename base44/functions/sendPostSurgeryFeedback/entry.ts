import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const APP_URL = Deno.env.get('APP_URL') || 'https://app.safe-t4life.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { entity_id } = await req.json();

    if (!entity_id) {
      return Response.json({ error: 'entity_id is required' }, { status: 400 });
    }

    const sessions = await base44.asServiceRole.entities.RecoverySession.filter({ id: entity_id });
    const session = sessions[0];
    if (!session) return Response.json({ error: 'RecoverySession not found' }, { status: 404 });

    // Skip if already sent or session still active
    if (session.feedback_requested_at) {
      return Response.json({ skipped: true, reason: 'Feedback already requested' });
    }
    if (session.is_active) {
      return Response.json({ skipped: true, reason: 'Session still active' });
    }

    // Generate a unique token
    const tokenBytes = new Uint8Array(24);
    crypto.getRandomValues(tokenBytes);
    const token = btoa(String.fromCharCode(...tokenBytes)).replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' }[c]));

    const feedbackUrl = `${APP_URL}/feedback/${token}`;
    const patientName = session.patient_name || 'Valued Patient';
    const surgeryType = session.surgery_type || 'your procedure';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f3;font-family:'Public Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f3;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a4731,#2d6a4f);padding:40px;text-align:center;">
            <h1 style="color:#ffffff;font-size:26px;margin:0;font-weight:700;">How Was Your Recovery?</h1>
            <p style="color:#a8d5b9;margin:8px 0 0;font-size:14px;">SAFE-T 4LIFE™ Post-Surgery Feedback</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="font-size:16px;color:#1a1a1a;margin:0 0 12px;">Dear <strong>${patientName}</strong>,</p>
            <p style="font-size:14px;color:#555;line-height:1.8;margin:0 0 24px;">
              Congratulations on completing your recovery from <strong>${surgeryType}</strong>. Your wellbeing is our highest priority, and we would love to hear about your experience with our platform and care team.
            </p>
            <p style="font-size:14px;color:#555;line-height:1.8;margin:0 0 28px;">
              It only takes 60 seconds — just a star rating and a few words about your journey.
            </p>

            <!-- Star rating preview -->
            <table width="100%" style="background:#f0faf4;border-radius:12px;padding:24px;margin-bottom:28px;text-align:center;" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="font-size:28px;margin:0 0 8px;">⭐⭐⭐⭐⭐</p>
                  <p style="font-size:13px;color:#555;margin:0;">Rate your overall experience from 1 to 5 stars</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${feedbackUrl}" style="display:inline-block;background:linear-gradient(135deg,#1a4731,#2d6a4f);color:#ffffff;font-size:15px;font-weight:700;padding:16px 36px;border-radius:10px;text-decoration:none;">
                    Share My Feedback →
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size:12px;color:#aaa;margin:24px 0 0;text-align:center;">
              This link is personal to you and expires in 14 days. If you have concerns, contact us at <a href="mailto:care@safe-t4life.com" style="color:#1a4731;">care@safe-t4life.com</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f4f6f3;padding:20px;text-align:center;">
            <p style="font-size:11px;color:#aaa;margin:0;">SAFE-T 4LIFE™ Medical Tourism Platform · Patient Care Team</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: session.patient_email,
      from_name: 'SAFE-T 4LIFE™ Care Team',
      subject: `How was your recovery, ${patientName}? Share your experience ⭐`,
      body: html,
    });

    await base44.asServiceRole.entities.RecoverySession.update(session.id, {
      feedback_token: token,
      feedback_requested_at: new Date().toISOString(),
    });

    return Response.json({ success: true, sent_to: session.patient_email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});