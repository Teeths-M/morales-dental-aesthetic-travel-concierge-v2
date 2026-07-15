import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── READ-ONLY: Query active cases in intermediate / stuck states ──
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
    }, '-created_date', 50);

    // ── Query pending / escalated solo check-ins ──
    const activeCheckIns = await base44.asServiceRole.entities.SoloCheckIn.filter({
      status: { $in: ['pending', 'escalated_2h', 'escalated_3h', 'escalated_5h'] },
    }, '-created_date', 30);

    // ── Query unresolved dispatch failures ──
    const recentFailures = await base44.asServiceRole.entities.DispatchFailureLog.filter({
      status: 'logged',
    }, '-created_date', 20);

    const totalIssues = stuckCases.length + activeCheckIns.length + recentFailures.length;
    if (totalIssues === 0) {
      return Response.json({
        success: true,
        message: 'No active anomalies to analyze',
        insights: 0,
      });
    }

    // ── Sanitize data for LLM — NO PHI, structural patterns only ──
    const now = Date.now();
    const casePatterns = stuckCases.map((c) => ({
      status: c.status,
      case_priority: c.case_priority,
      safe_t_result: c.safe_t_result,
      fallback_in_flux: c.fallback_state?.in_flux || false,
      fallback_escalation_level: c.fallback_state?.current_escalation_level || 0,
      days_since_created: c.created_date
        ? Math.floor((now - new Date(c.created_date).getTime()) / 86400000)
        : null,
      doctor_confirmation_status: c.doctor_confirmation_status,
      itinerary_status: c.itinerary_status,
      transfer_status: c.transfer_status,
      companion_requirement_status: c.companion_requirement_status,
    }));

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
        `ACTIVE CASES (${casePatterns.length}):\n${JSON.stringify(casePatterns, null, 2)}\n\n` +
        `ACTIVE SOLO CHECK-INS (${checkInPatterns.length}):\n${JSON.stringify(checkInPatterns, null, 2)}\n\n` +
        `UNRESOLVED DISPATCH FAILURES (${failurePatterns.length}):\n${JSON.stringify(failurePatterns, null, 2)}\n\n` +
        'Identify the TOP 1-3 most critical patterns. For each, provide:\n' +
        '1. A short title\n' +
        '2. Severity (low/medium/high/critical)\n' +
        '3. What pattern or anomaly you detected\n' +
        '4. Recommended action for the ops team\n\n' +
        'Only report genuinely actionable insights. If everything looks routine, return an empty insights array with a summary explaining why. Be concise. No patient data is present — this is structural analysis only.',
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

    const insightBlocks = insights.flatMap((insight, i) => [
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
          text: `*Pattern detected:*\n${insight.pattern}\n\n*Recommended action:*\n${insight.recommendation}`,
        },
      },
      { type: 'divider' },
    ]);

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