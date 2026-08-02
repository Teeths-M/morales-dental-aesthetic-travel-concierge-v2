import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { renderEmail } from '../../shared/emailTemplate.ts';

async function sendSms(to: string, body: string): Promise<void> {
  const sid  = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !sid.startsWith('AC')) return; // mock mode — skip silently
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  }).catch(e => console.warn('[resendPaymentEmail] SMS failed:', e.message));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { case_id } = body;
    
    if (!case_id) {
      return Response.json({ error: 'Case ID required' }, { status: 400 });
    }

    // Fetch the case
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Blackout guard
    const blackoutRes = await base44.functions.invoke('checkNotificationBlackout', {
      case_id,
      notification_type: 'email',
      recipient_role: 'patient',
      recipient_identifier: caseRecord.client_email || '',
      event_trigger: 'resendPaymentEmail',
      payload: body,
      internal_secret: Deno.env.get('CRON_SECRET'),
    }).catch(() => ({ data: { suppressed: false } }));

    if (blackoutRes.data?.suppressed) {
      return Response.json({
        suppressed: true,
        reason: blackoutRes.data.reason,
        message: 'Notification suppressed — case is in SURGICAL_EXECUTION_WINDOW blackout'
      });
    }

    // FIX: /pay-now is behind ProtectedRoute — a client not already logged in on that
    // device hits a login wall that doesn't preserve the token (see iq200Pipeline's
    // admin_approve_proposal for the full explanation). Point at the genuinely public,
    // no-login /portal/proposal/:token page instead.
    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const paymentUrl = `${appUrl}/portal/proposal/${caseRecord.proposal_token || case_id}`;

    // Send payment email
    const packageItems = [
      ['🦷', `Medical procedure with board-certified specialist in ${caseRecord.procedure_country}`],
      ['✈️', 'Hand-selected round-trip flights with premium comfort seating'],
      ['🏨', 'Luxury hotel accommodations near your treatment facility'],
      ['🚘', 'Private airport transfers and clinic transportation throughout your stay'],
    ];
    const heroHtml = `
      <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:28px 24px;margin:8px 0 28px;text-align:center;">
        <p style="margin:0;font-size:12px;color:rgba(238,242,247,0.5);text-transform:uppercase;letter-spacing:1.5px;">Total Package Investment</p>
        <p style="margin:8px 0 0;font-size:38px;font-weight:700;color:#D4AF37;line-height:1.2;">$${caseRecord.final_package_price.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
      </div>
      <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:1.5px;">What's Included</p>
      <div style="margin-bottom:8px;">
        ${packageItems.map(([icon, text]) => `
          <div style="display:flex;align-items:flex-start;padding:12px 0;border-bottom:1px solid #2A3F4A;font-size:14px;color:rgba(238,242,247,0.8);line-height:1.6;">
            <span style="font-size:20px;margin-right:12px;flex-shrink:0;">${icon}</span>
            <span>${text}</span>
          </div>`).join('')}
      </div>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: caseRecord.client_email,
      subject: `Complete Your Medical Travel Package — ${caseRecord.client_name}`,
      body: renderEmail({
        appUrl,
        eyebrow: 'Payment Ready',
        title: `Your journey is ready, ${caseRecord.client_name}`,
        intro: 'Your personalized medical travel package is ready. Complete your booking now to secure your preferred dates.',
        bodyHtml: heroHtml,
        note: 'Flexible payment options available: Pay in Full (5% discount), 50% deposit, or 25% deposit.',
        ctaText: 'Complete Your Booking',
        ctaUrl: paymentUrl,
      }),
    });

    // Log to timeline
    const timelineEntry = {
      timestamp: new Date().toISOString(),
      action: 'payment_email_resent',
      details: 'Payment email resent to client'
    };
    const updatedTimeline = caseRecord.timeline_log ? [...caseRecord.timeline_log, timelineEntry] : [timelineEntry];
    await base44.asServiceRole.entities.CaseRecord.update(case_id, {
      timeline_log: updatedTimeline
    });

    // SMS — send alongside email if phone on file
    if (caseRecord.client_phone) {
      await sendSms(
        caseRecord.client_phone,
        `Hi ${caseRecord.client_name}! Your Morales payment link is ready. Tap to pay and secure your spot: ${paymentUrl}`
      );
    }

    return Response.json({
      status: 'EMAIL_RESENT',
      case_id,
      payment_url: paymentUrl,
      sent_to: caseRecord.client_email,
      sms_sent: !!caseRecord.client_phone,
      message: 'Payment link sent via email' + (caseRecord.client_phone ? ' and SMS' : '')
    });

  } catch (error) {
    console.error('resendPaymentEmail error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});