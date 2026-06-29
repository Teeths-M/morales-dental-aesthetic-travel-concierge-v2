import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
      payload: body
    }).catch(() => ({ data: { suppressed: false } }));

    if (blackoutRes.data?.suppressed) {
      return Response.json({
        suppressed: true,
        reason: blackoutRes.data.reason,
        message: 'Notification suppressed — case is in SURGICAL_EXECUTION_WINDOW blackout'
      });
    }

    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const paymentUrl = `${appUrl}/pay-now?token=${caseRecord.proposal_token || case_id}`;

    // Send payment email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: caseRecord.client_email,
      subject: `Complete Your Medical Travel Package — ${caseRecord.client_name}`,
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
            .wrapper { background: #F9F9F9; padding: 32px 16px; }
            .container { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            .header { background: #0F3A20; padding: 40px 32px; text-align: center; border-bottom: 3px solid #C5A059; }
            .brand { font-size: 18px; font-weight: 600; color: #FFFFFF; letter-spacing: 1px; margin: 0; }
            .subtext { font-size: 12px; color: #C5A059; letter-spacing: 2px; text-transform: uppercase; margin: 6px 0 0; }
            .content { padding: 40px 32px; }
            .greeting { font-size: 16px; color: #1F2937; margin: 0 0 24px; line-height: 1.6; }
            .hero-card { background: linear-gradient(135deg, rgba(15,58,32,0.08), rgba(197,160,89,0.08)); border: 1px solid rgba(197,160,89,0.3); border-radius: 8px; padding: 28px 24px; margin: 24px 0; text-align: center; }
            .price { font-size: 42px; font-weight: 700; color: #0F3A20; margin: 0; line-height: 1.2; }
            .price-label { font-size: 13px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin: 8px 0 0; }
            .section-title { font-size: 14px; font-weight: 600; color: #0F3A20; text-transform: uppercase; letter-spacing: 1px; margin: 32px 0 16px; }
            .package-item { display: flex; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #374151; line-height: 1.6; }
            .package-item:last-child { border-bottom: none; }
            .package-icon { font-size: 20px; margin-right: 12px; flex-shrink: 0; }
            .cta-container { text-align: center; margin: 32px 0; }
            .cta-button { display: inline-block; background: #0F3A20; color: #FFFFFF; text-decoration: none; padding: 16px 48px; border-radius: 999px; font-size: 14px; font-weight: 600; letter-spacing: 0.5px; transition: all 0.3s ease; border: 2px solid #0F3A20; }
            .footer { padding: 24px 32px; background: #F9F9F9; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280; line-height: 1.6; }
            .footer-text { margin: 0 0 8px; }
            @media (max-width: 600px) {
              .wrapper { padding: 16px 8px; }
              .container { border-radius: 8px; }
              .header { padding: 28px 20px; }
              .content { padding: 24px 20px; }
              .hero-card { padding: 20px 16px; }
              .price { font-size: 36px; }
              .cta-button { padding: 14px 32px; font-size: 13px; }
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <p class="brand">MORALES</p>
                <p class="subtext">Dental & Aesthetic Travel Concierge</p>
              </div>
              <div class="content">
                <p class="greeting">Dear ${caseRecord.client_name},</p>
                <p style="font-size: 15px; color: #4B5563; margin: 0 0 24px; line-height: 1.6;">Your personalized medical travel package is ready. Complete your booking now to secure your preferred dates.</p>
                <div class="hero-card">
                  <p class="price-label">Total Package Investment</p>
                  <p class="price">$${caseRecord.final_package_price.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                </div>
                <p class="section-title">What's Included</p>
                <div style="margin-bottom: 24px;">
                  <div class="package-item">
                    <span class="package-icon">🦷</span>
                    <span>Medical procedure with board-certified specialist in ${caseRecord.procedure_country}</span>
                  </div>
                  <div class="package-item">
                    <span class="package-icon">✈️</span>
                    <span>Hand-selected round-trip flights with premium comfort seating</span>
                  </div>
                  <div class="package-item">
                    <span class="package-icon">🏨</span>
                    <span>Luxury hotel accommodations near your treatment facility</span>
                  </div>
                  <div class="package-item">
                    <span class="package-icon">🚘</span>
                    <span>Private airport transfers and clinic transportation throughout your stay</span>
                  </div>
                </div>
                <div class="cta-container">
                  <a href="${paymentUrl}" class="cta-button">Complete Your Booking</a>
                </div>
                <p style="font-size: 13px; color: #6B7280; text-align: center; margin: 20px 0; font-style: italic;">Flexible payment options available: Pay in Full (5% discount), 50% deposit, or 25% deposit.</p>
              </div>
              <div class="footer">
                <p class="footer-text"><strong style="color: #1F2937;">Questions?</strong> Contact us at <strong style="color: #0F3A20;">concierge@morales-dental.com</strong></p>
                <p class="footer-text" style="margin-top: 16px; border-top: 1px solid #E5E7EB; padding-top: 16px;">Best regards,<br><strong>MORALES Medical Travel Concierge Team</strong></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});