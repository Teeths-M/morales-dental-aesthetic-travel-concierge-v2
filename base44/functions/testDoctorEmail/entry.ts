import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BRAND = 'Morales Medical Travel Safety';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const portalEmail = ({ doctorName, portalLink }) => `<!doctype html>
<html>
  <body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;color:#13221d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
          <tr><td style="background:#29483d;padding:28px 32px;color:#ffffff;"><div style="font-family:Georgia,serif;font-size:26px;">${BRAND}</div><div style="margin-top:8px;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">Portal access test</div></td></tr>
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:30px;line-height:1.15;font-weight:400;">Portal link confirmation</h1>
            <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#40514a;">Dear ${escapeHtml(doctorName || 'Doctor')}, this message confirms that your Portal Hub link is ready for testing.</p>
            <a href="${escapeHtml(portalLink)}" style="display:inline-block;background:#29483d;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:999px;font-size:14px;font-weight:700;">Open Portal Hub</a>
            <p style="margin:28px 0 0;font-size:14px;color:#64746d;">If the button does not open, copy this link into your browser:<br><span style="color:#29483d;">${escapeHtml(portalLink)}</span></p>
            <p style="margin:18px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECURITY: this sends email as the platform to any attacker-supplied address —
    // must not be an open relay. Admin-only debug utility.
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { doctor_email, doctor_name } = await req.json();

    const appUrl = Deno.env.get('APP_URL') || 'https://your-portal-url.com';
    const portalLink = `${appUrl}/portal-hub`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: doctor_email,
      subject: `Portal Hub test link | ${BRAND}`,
      body: portalEmail({ doctorName: doctor_name, portalLink }),
    });

    return Response.json({ status: 'sent', link: portalLink });
  } catch (error) {
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});