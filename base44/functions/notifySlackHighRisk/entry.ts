import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { internalOrAdminAuthorized } from '../../shared/internalAuth.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);

    // PRIVACY BY DESIGN: Slack is a third-party channel with no health-data (BAA)
    // agreement, so NO patient PHI is sent here — not the name, not the flagged
    // condition, not the procedure. We send only a non-identifying case reference
    // and a login-gated link. The reviewing admin opens the secure portal (which
    // requires authentication) to see the actual medical detail. Any PHI fields
    // still present in the request body are intentionally ignored.
    const { case_id, internal_secret } = await req.json();

    // SECURITY: had zero auth — anyone could post fabricated "high-risk case"
    // alerts into the internal Slack channel with an arbitrary case_id. Same
    // gate as its sibling notifySlackAssignment; the real caller
    // (createCaseFromConsultation.ts, cron-triggered, no forwardable session)
    // now passes internal_secret explicitly.
    if (!(await internalOrAdminAuthorized(internal_secret, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');

    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
    const caseUrl = `${appUrl}/admin/portal-viewer?case_id=${case_id}`;
    const caseRef = case_id ? String(case_id).slice(-8) : 'N/A';

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
            { type: 'mrkdwn', text: `*Case reference:*\n${caseRef}` },
            { type: 'mrkdwn', text: `*Status:*\nOn hold — doctor assignment blocked` }
          ]
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: 'A consultation has been flagged for *Senior Medical Team review*. Patient details are protected and are not shown in Slack — open the secure portal to review the case. Doctor assignment stays blocked until an admin clears it.' }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '🔍 Review Case in Secure Portal', emoji: true },
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
