import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { doctor_email, doctor_name } = await req.json();

    const appUrl = Deno.env.get('APP_URL') || 'https://your-portal-url.com';
    const portalLink = `${appUrl}/portal-hub`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: doctor_email,
      subject: `✅ Test Email — Portal Hub Link | Morales Dental & Aesthetics`,
      body: `Dear ${doctor_name || 'Doctor'},\n\nThis is a test email to verify the portal hub link works correctly.\n\nAccess your portal here:\n${portalLink}\n\nThank you!\n\n— Morales Dental & Aesthetics Concierge Team`,
    });

    return Response.json({ status: 'sent', link: portalLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});