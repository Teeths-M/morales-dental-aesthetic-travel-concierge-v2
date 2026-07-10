import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { doctor_name, doctor_email, patient_name, procedure, country, case_id, pool_size, active_cases } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');

    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const caseUrl = `${appUrl}/admin/portal-viewer?case_id=${case_id}`;
    const procedureLabel = (procedure || 'Procedure').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const message = {
      channel: '#new-cases',
      username: 'Morales Case Router',
      icon_emoji: ':stethoscope:',
      text: `*New Case Auto-Assigned* — ${doctor_name}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🏥 New Consultation Assigned', emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Doctor:*\n${doctor_name}` },
            { type: 'mrkdwn', text: `*Patient:*\n${patient_name}` },
            { type: 'mrkdwn', text: `*Procedure:*\n${procedureLabel}` },
            { type: 'mrkdwn', text: `*Region:*\n${country || 'Unknown'}` },
            { type: 'mrkdwn', text: `*Doctor Email:*\n${doctor_email}` },
            { type: 'mrkdwn', text: `*Pool Size:*\n${pool_size || 1} specialist(s) | ${active_cases || 0} active cases` },
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Case →', emoji: true },
              url: caseUrl,
              style: 'primary'
            }
          ]
        }
      ]
    };

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await res.json();
    if (!result.ok) {
      console.error('[notifySlackAssignment] Slack error:', result.error);
      return Response.json({ success: false, error: result.error }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[notifySlackAssignment]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'notifySlackAssignment', requireAuth: false }));
