import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Twilio SMS + WhatsApp alert sender for taxi/driver partners
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
  const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
  const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return Response.json({ error: 'Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment secrets.' }, { status: 500 });
  }

  const body = await req.json();
  const { phone, message, channels = ['sms', 'whatsapp'] } = body;

  if (!phone || !message) {
    return Response.json({ error: 'phone and message are required' }, { status: 400 });
  }

  const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const results = { sms: null, whatsapp: null };

  const sendTwilio = async (from, to, msg) => {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${twilioAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: from, To: to, Body: msg }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Twilio error');
    return { sid: data.sid, status: data.status };
  };

  // Send SMS
  if (channels.includes('sms')) {
    try {
      results.sms = await sendTwilio(TWILIO_PHONE_NUMBER, phone, message);
    } catch (e) {
      results.sms = { error: e.message };
    }
  }

  // Send WhatsApp
  if (channels.includes('whatsapp') && TWILIO_WHATSAPP_NUMBER) {
    try {
      const waPhone = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
      results.whatsapp = await sendTwilio(TWILIO_WHATSAPP_NUMBER, waPhone, message);
    } catch (e) {
      results.whatsapp = { error: e.message };
    }
  }

  return Response.json({ status: 'done', results });
});