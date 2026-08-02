import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';

const STATUS_MESSAGES = {
  en: {
    'Submitted': 'Your case has been received and is under review. We\'ll be in touch shortly.',
    'Safe-T-Reviewed': 'Your medical profile has been reviewed by our safety team. ✅',
    'Doctor-Pending': 'Your case has been assigned to a specialist doctor for review.',
    'Vendor-Pending': 'We are coordinating travel and logistics for your procedure.',
    'Admin-Review': 'Your case is under admin review. Our team will follow up soon.',
    'Proposal-Sent': 'Your personalized package proposal has been sent! Please check your email. 📧',
    'PMP-25': 'Your 25% deposit has been confirmed. Your journey is underway! 🎉',
    'PMP-50': 'Your 50% deposit has been confirmed. We\'re securing your arrangements!',
    'Deposit-Paid': 'Payment confirmed! Our concierge team is now finalizing your itinerary.',
    'Travel-Coordination': 'We are actively coordinating your flights, hotel, and transfers. ✈️🏨',
    'Ready-For-Travel': 'Everything is confirmed — you are ready to travel! 🌟 Check your email for full details.',
    'Procedure-In-Progress': 'You are in good hands. Our team is monitoring your journey closely.',
    'Recovery': 'Wishing you a smooth and speedy recovery. We are here if you need anything. 💚',
    'Completed': 'Your procedure journey is complete. Thank you for trusting Morales Concierge! 🙏',
  },
  es: {
    'Submitted': 'Su caso ha sido recibido y está en revisión. Nos pondremos en contacto pronto.',
    'Safe-T-Reviewed': 'Su perfil médico ha sido revisado por nuestro equipo de seguridad. ✅',
    'Doctor-Pending': 'Su caso ha sido asignado a un médico especialista para revisión.',
    'Vendor-Pending': 'Estamos coordinando viaje y logística para su procedimiento.',
    'Admin-Review': 'Su caso está bajo revisión administrativa. Nuestro equipo le dará seguimiento pronto.',
    'Proposal-Sent': '¡Su propuesta de paquete personalizado ha sido enviada! Revise su correo. 📧',
    'PMP-25': '¡Su depósito del 25% ha sido confirmado. Su viaje está en marcha! 🎉',
    'PMP-50': '¡Su depósito del 50% ha sido confirmado. Estamos asegurando sus arreglos!',
    'Deposit-Paid': '¡Pago confirmado! Nuestro equipo de conserjería está finalizando su itinerario.',
    'Travel-Coordination': 'Estamos coordinando activamente sus vuelos, hotel y traslados. ✈️🏨',
    'Ready-For-Travel': '¡Todo está confirmado — está listo para viajar! 🌟 Revise su correo para detalles completos.',
    'Procedure-In-Progress': 'Está en buenas manos. Nuestro equipo monitorea su journey de cerca.',
    'Recovery': 'Le deseamos una recuperación rápida y sin complicaciones. Estamos aquí si necesita algo. 💚',
    'Completed': '¡Su viaje médico ha concluido. Gracias por confiar en Morales Concierge! 🙏',
  }
};

const SPANISH_NATIONALITIES = [
  'venezuela', 'colombia', 'mexico', 'argentina', 'chile', 'peru', 'ecuador',
  'bolivia', 'paraguay', 'uruguay', 'cuba', 'dominican republic', 'puerto rico',
  'panama', 'costa rica', 'honduras', 'guatemala', 'el salvador', 'nicaragua',
  'spain', 'españa', 'venezolano', 'colombiano', 'mexicano'
];

function isSpanish(caseData) {
  const nat = (caseData.client_country || caseData.nationality || '').toLowerCase();
  return SPANISH_NATIONALITIES.some(n => nat.includes(n));
}

function toE164(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return null;
  if (phone.trim().startsWith('+')) return '+' + digits;
  if (digits.startsWith('1') && digits.length === 11) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  return '+' + digits;
}

async function sendWhatsApp(to, message) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    console.error('[sendWhatsAppCaseUpdate] Twilio credentials not configured');
    return { skipped: true, sid: null };
  }

  const form = new URLSearchParams();
  form.append('To', `whatsapp:${to}`);
  form.append('From', `whatsapp:${fromNumber}`);
  form.append('Body', message);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error(`[sendWhatsAppCaseUpdate] Twilio error ${res.status}: ${err}`);
    return { skipped: true, sid: null };
  }
  return await res.json();
}

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
    const body = await req.json();

    const { data: bodyCaseData, old_data, changed_fields, event } = body;

    // Only process status changes
    if (!changed_fields?.includes('status')) {
      return Response.json({ skipped: true, reason: 'No status change' });
    }

    const caseId = bodyCaseData?.id || event?.entity_id;
    if (!caseId) {
      return Response.json({ skipped: true, reason: 'No case_id on payload' });
    }

    // SECURITY: This is an entity-trigger endpoint with no user session, so the
    // request body cannot be trusted at face value — an unauthenticated caller
    // could otherwise forge an arbitrary client_name/client_phone/status and use
    // this endpoint as a free WhatsApp-send relay via Morales' own Twilio account
    // to any phone number. Re-fetch the real CaseRecord and use its fields only.
    const caseData = await base44.asServiceRole.entities.CaseRecord.get(caseId).catch(() => null);
    if (!caseData) {
      return Response.json({ skipped: true, reason: 'Case not found' });
    }

    const newStatus = caseData.status;
    const patientName = caseData.client_name || 'Valued Patient';
    const patientPhone = toE164(caseData.client_phone);

    // Guard: opt-in required
    if (!caseData?.whatsapp_opt_in) {
      return Response.json({ skipped: true, reason: 'Patient has not opted in to WhatsApp notifications' });
    }

    // Guard: valid phone
    if (!patientPhone) {
      return Response.json({ skipped: true, reason: 'No valid E.164 phone number on record' });
    }

    // Guard: Stage 11 blackout check (inline flag + checkNotificationBlackout function)
    if (caseData?.notification_blackout_active) {
      await base44.asServiceRole.entities.NotificationLog.create({
        case_id: caseId,
        notification_type: 'sms',
        recipient_role: 'patient',
        recipient_identifier: patientPhone,
        event_trigger: 'sendWhatsAppCaseUpdate',
        suppressed_payload: { status: newStatus, old_status: old_data?.status, message: 'WhatsApp suppressed during blackout' },
        suppression_reason: 'SURGICAL_EXECUTION_WINDOW_BLACKOUT',
        blackout_case_status: newStatus,
        logged_at: new Date().toISOString(),
        replay_status: 'pending',
      });
      return Response.json({ skipped: true, reason: 'Notification blackout active (Stage 11)', logged: true });
    }

    // Guard: checkNotificationBlackout function (catches cases where flag may not yet be set)
    const blackoutRes = await base44.asServiceRole.functions.invoke('checkNotificationBlackout', {
      case_id: caseId,
      notification_type: 'sms',
      recipient_role: 'patient',
      recipient_identifier: patientPhone,
      event_trigger: 'sendWhatsAppCaseUpdate',
      payload: { status: newStatus }
    }).catch(() => ({ suppressed: false }));

    if (blackoutRes?.suppressed || blackoutRes?.data?.suppressed) {
      return Response.json({ skipped: true, reason: 'Notification suppressed by checkNotificationBlackout', logged: true });
    }

    // Choose language
    const lang = isSpanish(caseData) ? 'es' : 'en';
    const messages = STATUS_MESSAGES[lang];
    const statusMsg = messages[newStatus];

    if (!statusMsg) {
      return Response.json({ skipped: true, reason: `No template for status: ${newStatus}` });
    }

    const BRAND = lang === 'es' ? 'Morales Medical Travel Safety' : 'Morales Medical Travel Safety';
    const fullMessage = `${BRAND}\n\nHello ${patientName} 👋\n\n${statusMsg}\n\nCase update: *${newStatus}*\n\nQuestions? Reply to this message or contact our concierge team.`;

    await sendWhatsApp(patientPhone, fullMessage);

    return Response.json({
      success: true,
      patient: patientName,
      phone: patientPhone,
      status: newStatus,
      language: lang,
    });

  } catch (error) {
    console.error('sendWhatsAppCaseUpdate error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});