import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { cronAuthorized } from '../_shared/cronAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cron secret OR admin session. This endpoint had NO guard at all: it is
    // reachable over HTTP like every deployed function, so anyone with the URL
    // could drive it — triggering real notifications, spend and state changes.
    // NOTE: a Base44-dashboard schedule driving this must send X-Cron-Secret.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── READ-ONLY: Query ALL active cases in intermediate / stuck states ──
    // No hard limit — the status filter ensures we only pull genuinely active
    // records. The aggregation step below collapses these into pattern counts
    // before sending to the LLM, so context size stays bounded even at scale.
    const stuckCases = await base44.asServiceRole.entities.CaseRecord.filter({
      status: {
        $in: [
          'Doctor-Pending',
          'Vendor-Pending',
          'Admin-Review',
          'Travel-Coordination',
          'Procedure-In-Progress',
          'companion_required_pending',
        ],
      },
    }, '-created_date', 500);

    // ── Query pending / escalated solo check-ins ──
    const activeCheckIns = await base44.asServiceRole.entities.SoloCheckIn.filter({
      status: { $in: ['pending', 'escalated_2h', 'escalated_3h', 'escalated_5h'] },
    }, '-created_date', 200);

    // ── Query unresolved dispatch failures ──
    const recentFailures = await base44.asServiceRole.entities.DispatchFailureLog.filter({
      status: 'logged',
    }, '-created_date', 200);

    const totalIssues = stuckCases.length + activeCheckIns.length + recentFailures.length;
    if (totalIssues === 0) {
      return Response.json({
        success: true,
        message: 'No active anomalies to analyze',
        insights: 0,
      });
    }

    // ── Sanitize data for LLM — NO PHI, structural patterns only ──
    // At scale (50+ users), raw records can exceed LLM context limits, so we
    // aggregate into status/priority buckets and only surface outlier details
    // (e.g. cases stuck >7 days or in fallback flux). This keeps the prompt
    // bounded regardless of user count.
    const now = Date.now();

    const caseAggregates = {};
    const outlierCases = [];
    for (const c of stuckCases) {
      const key = `${c.status}|${c.case_priority || 'Normal'}|${c.safe_t_result || 'PENDING'}`;
      caseAggregates[key] = (caseAggregates[key] || 0) + 1;
      const daysStuck = c.created_date
        ? Math.floor((now - new Date(c.created_date).getTime()) / 86400000)
        : 0;
      const inFlux = c.fallback_state?.in_flux || false;
      if (daysStuck > 7 || inFlux || (c.fallback_state?.current_escalation_level || 0) >= 2) {
        outlierCases.push({
          status: c.status,
          case_priority: c.case_priority,
          safe_t_result: c.safe_t_result,
          fallback_in_flux: inFlux,
          fallback_escalation_level: c.fallback_state?.current_escalation_level || 0,
          days_since_created: daysStuck,
          doctor_confirmation_status: c.doctor_confirmation_status,
          itinerary_status: c.itinerary_status,
          transfer_status: c.transfer_status,
          companion_requirement_status: c.companion_requirement_status,
        });
      }
    }

    const casePatterns = {
      total_active: stuckCases.length,
      aggregates: Object.entries(caseAggregates).map(([k, count]) => {
        const [status, priority, safeT] = k.split('|');
        return { status, priority, safe_t_result: safeT, count };
      }),
      outliers: outlierCases.slice(0, 30),
    };

    const checkInPatterns = activeCheckIns.map((c) => ({
      status: c.status,
      escalation_level: c.escalation_level,
      missed_round_count: c.missed_round_count,
      check_in_round: c.check_in_round,
      minutes_since_scheduled: c.scheduled_time
        ? Math.floor((now - new Date(c.scheduled_time).getTime()) / 60000)
        : null,
    }));

    const failurePatterns = recentFailures.map((f) => ({
      partner_type: f.partner_type,
      failure_reason: f.failure_reason,
      escalation_level: f.escalation_level,
    }));

    // ── LLM analyzes patterns and decides what's worth reporting ──
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        'You are the Morales Safety Monitor AI. Analyze operational patterns from a medical travel safety platform and identify systemic issues, anomalies, or risks that require human attention.\n\n' +
        `ACTIVE CASES (${casePatterns.total_active} total, ${casePatterns.outliers.length} outliers requiring attention):\n${JSON.stringify(casePatterns, null, 2)}\n\n` +
        `ACTIVE SOLO CHECK-INS (${checkInPatterns.length}):\n${JSON.stringify(checkInPatterns, null, 2)}\n\n` +
        `UNRESOLVED DISPATCH FAILURES (${failurePatterns.length}):\n${JSON.stringify(failurePatterns, null, 2)}\n\n` +
        'Identify the TOP 1-3 most critical patterns. For each, provide:\n' +
        '1. A short title\n' +
        '2. Severity (low/medium/high/critical)\n' +
        '3. What pattern or anomaly you detected\n' +
        '4. Recommended action for the ops team\n\n' +
        'Only report genuinely actionable insights. If everything looks routine, return an empty insights array with a summary explaining why. Be concise. No patient data is present — this is structural analysis only.\n\n' +
        'For each insight, also recommend ONE safe remediation function from this whitelist that the ops team can execute with one click:\n' +
        '- retryFailedDispatches (re-attempt failed partner dispatches)\n' +
        '- autoReassignDoctorOnDecline (reassign a doctor after a decline)\n' +
        '- checkPartnerSLABreaches (check for partner SLA breaches)\n' +
        '- escalateSoloCheckIn (escalate a missed solo check-in)\n' +
        '- alertStagnantCases (send alerts for stagnant cases)\n' +
        '- checkStaleLiveLocations (flag stale GPS signals)\n' +
        'Provide the function_name, a short button label, and a one-sentence reason why this function helps. If no function is applicable, leave function_name empty.',
      response_json_schema: {
        type: 'object',
        properties: {
          insights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                pattern: { type: 'string' },
                recommendation: { type: 'string' },
                recommended_action: {
                  type: 'object',
                  properties: {
                    function_name: { type: 'string' },
                    button_label: { type: 'string' },
                    reason: { type: 'string' },
                  },
                },
              },
            },
          },
          summary: { type: 'string' },
        },
      },
    });

    const insights = llmResponse.insights || [];
    if (insights.length === 0) {
      return Response.json({
        success: true,
        message: 'Analysis complete — no actionable insights',
        insights: 0,
        summary: llmResponse.summary,
      });
    }

    // ── Post to Slack — NO PHI, structural analysis only ──
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');
    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
    const adminUrl = `${appUrl}/admin`;

    const severityEmoji = { low: '🟡', medium: '🟠', high: '🔴', critical: '🚨' };

    const insightBlocks = insights.flatMap((insight, i) => {
      const action = insight.recommended_action;
      const hasAction = action && action.function_name;
      const actionUrl = hasAction
        ? `${appUrl}/admin/monitor-action?fn=${encodeURIComponent(action.function_name)}&desc=${encodeURIComponent(insight.title || `Insight ${i + 1}`)}&reason=${encodeURIComponent(action.reason || insight.recommendation || '')}&params=${encodeURIComponent(btoa(JSON.stringify({})))}`
        : null;

      const blocksForInsight = [
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `${severityEmoji[insight.severity] || '⚪'} *${insight.title || `Insight ${i + 1}`}*`,
            },
            { type: 'mrkdwn', text: `*Severity:* ${insight.severity || 'unknown'}` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `*Pattern detected:*\n${insight.pattern}\n\n*Recommended action:*\n${insight.recommendation}` +
              (hasAction ? `\n\n🤖 *AI Suggestion:* ${action.reason || ''}` : ''),
          },
        },
      ];

      if (hasAction && actionUrl) {
        blocksForInsight.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: `⚡ ${action.button_label || 'Execute Action'}`, emoji: true },
              style: 'primary',
              url: actionUrl,
            },
          ],
        });
      }

      blocksForInsight.push({ type: 'divider' });
      return blocksForInsight;
    });

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🤖 Morales Safety Monitor — Hourly Intelligence',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*Summary:* ${llmResponse.summary || 'Pattern analysis complete.'}\n` +
            `*Scope:* ${casePatterns.length} active cases, ${checkInPatterns.length} check-ins, ${failurePatterns.length} dispatch failures`,
        },
      },
      { type: 'divider' },
      ...insightBlocks,
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '🔍 Open Admin Portal', emoji: true },
            url: adminUrl,
          },
        ],
      },
    ];

    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: 'morales-safe-t4life',
        username: 'Morales Safety Monitor',
        icon_emoji: ':robot_face:',
        text: `🤖 Safety Monitor: ${insights.length} insight(s) detected`,
        blocks,
      }),
    });

    const slackData = await slackRes.json();
    if (!slackData.ok) {
      return Response.json(
        { success: false, error: slackData.error, insights: insights.length },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: `Posted ${insights.length} insight(s) to Slack`,
      insights: insights.length,
      summary: llmResponse.summary,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});