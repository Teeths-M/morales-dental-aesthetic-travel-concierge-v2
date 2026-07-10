import { createHandler } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { message, category, submitted_at } = await body();
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
}, { name: 'sendSupportTicket' }));
