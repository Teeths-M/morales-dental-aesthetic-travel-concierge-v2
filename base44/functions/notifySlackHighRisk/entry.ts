import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');

    const { patient_name, flagged_condition, procedure, case_id } = await req.json();

    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
    const caseUrl = `${appUrl}/admin/portal-viewer?case_id=${case_id}`;

    const message = {
      channel: 'morales-safe-t4life',
      username: 'Morales Safe-T4Life',
      icon_emoji: ':hospital:',
      text: `⚠️ *High-Risk Medical Review Required*`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '⚠️ High-Risk Consultation Flagged', emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Patient:*\n${patient_name || 'Unknown'}` },
            { type: 'mrkdwn', text: `*Procedure:*\n${(procedure || 'N/A').replace(/_/g, ' ')}` },
            { type: 'mrkdwn', text: `*Flagged Condition:*\n${flagged_condition || 'High-risk condition'}` },
            { type: 'mrkdwn', text: `*Case ID:*\n${case_id ? case_id.slice(-8) : 'N/A'}` }
          ]
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: 'This case is *on hold* pending Senior Medical Team review. Doctor assignment has been blocked until an admin clears the case.' }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '🔍 Review Case Now', emoji: true },
              style: 'danger',
              url: caseUrl
            }
          ]
        }
      ]
    };

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    const data = await res.json();

    if (!data.ok) {
      console.error('[notifySlackHighRisk] Slack error:', data.error);
      return Response.json({ success: false, error: data.error }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[notifySlackHighRisk]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'notifySlackHighRisk', requireAuth: false }));
