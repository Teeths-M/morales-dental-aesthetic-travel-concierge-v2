import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SMS_TEMPLATES = {
  booking_confirmation: (name, procedure, date) =>
    `Hi ${name}! Your booking for ${procedure} on ${date} has been confirmed. We'll be in touch soon with your full itinerary. - Morales Dental & Aesthetics`,

  appointment_reminder: (name, procedure, date, time) =>
    `Reminder: ${name}, your ${procedure} appointment is on ${date} at ${time}. Please reply CONFIRM or call us if you need to reschedule. - Morales Dental & Aesthetics`,

  status_update: (name, status) =>
    `Hi ${name}, your case status has been updated to: ${status}. Log in to your dashboard for details. - Morales Dental & Aesthetics`,

  travel_confirmed: (name, destination, date) =>
    `Great news ${name}! Your travel to ${destination} on ${date} has been confirmed. Check your email for full itinerary. - Morales Dental & Aesthetics`,

  payment_received: (name, amount) =>
    `Hi ${name}, we've received your payment of $${amount}. Your medical travel package is now secured! - Morales Dental & Aesthetics`,

  proposal_ready: (name, url) =>
    `Hi ${name}, your personalized treatment proposal is ready! View it here: ${url} - Morales Dental & Aesthetics`,

  custom: (message) => message,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to, type, params = {}, dry_run = false } = body;

    if (!to || !type) {
      return Response.json({ error: 'Missing required fields: to, type' }, { status: 400 });
    }

    // Blackout guard
    const caseIdForBlackout = body.case_id || body.consultation_id || null;
    if (caseIdForBlackout) {
      const blackoutRes = await base44.functions.invoke('checkNotificationBlackout', {
        case_id: caseIdForBlackout,
        notification_type: 'sms',
        recipient_role: 'patient',
        recipient_identifier: body.to || '',
        event_trigger: 'sendSmsNotification',
        payload: body
      }).catch(() => ({ data: { suppressed: false } }));

      if (blackoutRes.data?.suppressed) {
        return Response.json({
          suppressed: true,
          reason: blackoutRes.data.reason,
          message: 'Notification suppressed — case is in SURGICAL_EXECUTION_WINDOW blackout'
        });
      }
    }

    // Build message from template
    let message;
    if (type === 'booking_confirmation') {
      message = SMS_TEMPLATES.booking_confirmation(params.name, params.procedure, params.date);
    } else if (type === 'appointment_reminder') {
      message = SMS_TEMPLATES.appointment_reminder(params.name, params.procedure, params.date, params.time);
    } else if (type === 'status_update') {
      message = SMS_TEMPLATES.status_update(params.name, params.status);
    } else if (type === 'travel_confirmed') {
      message = SMS_TEMPLATES.travel_confirmed(params.name, params.destination, params.date);
    } else if (type === 'payment_received') {
      message = SMS_TEMPLATES.payment_received(params.name, params.amount);
    } else if (type === 'proposal_ready') {
      message = SMS_TEMPLATES.proposal_ready(params.name, params.url);
    } else if (type === 'custom') {
      message = SMS_TEMPLATES.custom(params.message);
    } else {
      return Response.json({ error: `Unknown SMS type: ${type}` }, { status: 400 });
    }

    // Dry run: return message preview without sending
    if (dry_run) {
      return Response.json({ success: true, dry_run: true, preview: message, to });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return Response.json({
        success: false,
        error: 'Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your app secrets.',
        dry_run_preview: message,
      }, { status: 503 });
    }

    if (!accountSid.startsWith('AC')) {
      return Response.json({
        success: false,
        error: 'Invalid TWILIO_ACCOUNT_SID. It should start with "AC" (e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx). Please check your app secrets.',
      }, { status: 400 });
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('To', to);
    formData.append('From', fromNumber);
    formData.append('Body', message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json({ success: false, error: result.message || 'Twilio error', code: result.code }, { status: 400 });
    }

    return Response.json({ success: true, message_sid: result.sid, to, type });
  } catch (error) {
    console.error('[sendSmsNotification]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});