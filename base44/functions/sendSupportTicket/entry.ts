import { createHandler } from '../../shared/createHandler.ts';
import { escapeHtml } from '../../shared/emailTemplate.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { message, category, submitted_at } = await body();
    if (!message?.trim()) return Response.json({ error: 'Message is required' }, { status: 400 });

    const safeName = escapeHtml(user.full_name || 'N/A');
    const safeEmail = escapeHtml(user.email);
    const safeCategory = escapeHtml(category || 'General Inquiry');
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');

    // Send email to admin
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'admin@moralesdentalandaesthetics.com',
      subject: `Support Ticket — ${safeCategory} from ${user.full_name || user.email}`,
      body: `
        <h2>New Support Ticket</h2>
        <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
        <p><strong>Category:</strong> ${safeCategory}</p>
        <p><strong>Submitted:</strong> ${escapeHtml(submitted_at || new Date().toISOString())}</p>
        <hr/>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
      `,
    });

    return Response.json({ success: true });
}, { name: 'sendSupportTicket' }));
