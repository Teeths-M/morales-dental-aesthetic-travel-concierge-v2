import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, category, submitted_at } = await req.json();
    if (!message?.trim()) return Response.json({ error: 'Message is required' }, { status: 400 });

    // Send email to admin
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'admin@moralesdentalandaesthetics.com',
      subject: `Support Ticket — ${category || 'General Inquiry'} from ${user.full_name || user.email}`,
      body: `
        <h2>New Support Ticket</h2>
        <p><strong>From:</strong> ${user.full_name || 'N/A'} (${user.email})</p>
        <p><strong>Category:</strong> ${category || 'General Inquiry'}</p>
        <p><strong>Submitted:</strong> ${submitted_at || new Date().toISOString()}</p>
        <hr/>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br/>')}</p>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});