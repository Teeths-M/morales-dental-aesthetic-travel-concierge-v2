import { createHandler } from '../_shared/createHandler.ts';

function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => chars[b % chars.length]).join('');
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { case_id, guardian_name, guardian_email, guardian_phone, expires_hours: _expires_hours = 720, data_scope } = await body();
    // Cap at 720 hours (30 days)
    const expires_hours = Math.min(_expires_hours, 720);
    if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

    // Verify the user owns this case
    const cases = await base44.entities.CaseRecord.filter({ id: case_id });
    if (!cases[0] || cases[0].client_email !== user.email) {
      return Response.json({ error: 'Case not found or access denied' }, { status: 403 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expires_hours * 60 * 60 * 1000).toISOString();
    const token = generateToken(32);

    const session = await base44.asServiceRole.entities.GuardianSession.create({
      case_id,
      patient_email: user.email,
      patient_name: user.full_name || user.email,
      guardian_name: guardian_name || 'Family Member',
      guardian_email: guardian_email || '',
      guardian_phone: guardian_phone || '',
      view_token: token,
      expires_at: expiresAt,
      is_active: true,
      view_count: 0,
      shared_data_scope: data_scope || ['case_status', 'journey_stage', 'location'],
      created_at: now.toISOString()
    });

    const appUrl = Deno.env.get('APP_URL') || 'https://app.moralesmedical.com';
    const guardianUrl = `${appUrl}/guardian/${token}`;

    // Optionally notify the guardian by email
    if (guardian_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Medical Safe-T',
        to: guardian_email,
        subject: `${user.full_name || user.email} shared their travel status with you`,
        body: `<div style="font-family:sans-serif;max-width:600px;">
<h2>You've been granted Guardian View access</h2>
<p><strong>${user.full_name || 'Your contact'}</strong> is traveling with Morales Medical and has shared their journey status with you.</p>
<p><a href="${guardianUrl}" style="background:#047857;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">View Live Status →</a></p>
<p style="color:#6b7280;font-size:14px;">This link expires in ${expires_hours} hours and requires no login. View only — no actions can be taken.</p>
<p style="color:#9ca3af;font-size:12px;">If you did not expect this, you may ignore this email.</p>
</div>`
      });
    }

    return Response.json({ session_id: session.id, guardian_url: guardianUrl, token, expires_at: expiresAt });
}, { name: 'generateGuardianLink' }));
