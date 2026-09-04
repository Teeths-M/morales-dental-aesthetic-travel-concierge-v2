// verifyTwilioSignature — a real, reusable version of the HMAC-SHA1
// request-signature check already duplicated inline across 5 existing
// webhook functions (twilioSafetySmsWebhook, twilioSmsHandshakeWebhook,
// processSmsShortcode, processTwilioRecovery, processTwilioHandshake).
//
// Deliberately NOT retrofitted into those 5 — they're live, safety-critical
// (patient check-ins, SOS, driver handshakes), and rewiring five already-
// working webhooks under an unrelated feature is real, avoidable risk. Only
// twilioPartnerReplyWebhook (the new caller this was built for) uses this.
// A future dedicated pass could migrate the other 5 onto this same helper.
//
// M PRINCIPLE note (same reasoning as twilioSafetySmsWebhook's own comment):
// a forged inbound webhook here can put a fabricated price into a real
// case's pricing pipeline. Signature validation is mandatory, not optional.

import { createHmac } from 'node:crypto';

export interface VerifiedTwilioRequest {
  params: URLSearchParams;
  from: string;
  body: string;
  messageSid: string;
}

export interface VerifyTwilioSignatureResult {
  request: VerifiedTwilioRequest | null;
  /** Non-null means verification failed or config is missing — reply with this TwiML directly. */
  errorTwiml: Response | null;
}

function twimlReply(message: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { status: 200, headers: { 'Content-Type': 'application/xml' } },
  );
}

function validateSignature(url: string, params: Record<string, string>, signature: string, authToken: string): boolean {
  const sortedKeys = Object.keys(params).sort();
  const str = url + sortedKeys.map((k) => k + params[k]).join('');
  const expected = createHmac('sha1', authToken).update(str).digest('base64');
  return expected === signature;
}

/**
 * Reads the raw form-encoded Twilio webhook body, validates the
 * x-twilio-signature header against it, and returns the parsed
 * From/Body/MessageSid fields. `functionName` must match the real deployed
 * function name (used to rebuild the exact URL Twilio signed).
 */
export async function verifyTwilioSignature(req: Request, functionName: string): Promise<VerifyTwilioSignatureResult> {
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!authToken) {
    return { request: null, errorTwiml: twimlReply('Configuration error. Please contact support.') };
  }

  const text = await req.text();
  const paramsObj: Record<string, string> = {};
  new URLSearchParams(text).forEach((v, k) => { paramsObj[k] = v; });
  const params = new URLSearchParams(text);

  const twilioSig = req.headers.get('x-twilio-signature') || '';
  const appUrl = Deno.env.get('APP_URL') || '';
  const webhookUrl = `${appUrl}/api/functions/${functionName}`;
  if (!twilioSig || !appUrl || !validateSignature(webhookUrl, paramsObj, twilioSig, authToken)) {
    console.error(`[verifyTwilioSignature] rejected for ${functionName}: invalid or missing signature`);
    return { request: null, errorTwiml: twimlReply('Invalid request.') };
  }

  const from = params.get('From') || '';
  const body = (params.get('Body') || '').trim();
  const messageSid = params.get('MessageSid') || '';
  if (!from || !body) {
    return { request: null, errorTwiml: twimlReply('Invalid request.') };
  }

  return { request: { params, from, body, messageSid }, errorTwiml: null };
}

/** Last-10-digit-suffix phone comparison, same technique twilioSmsHandshakeWebhook already uses. */
export function phonesMatch(a?: string | null, b?: string | null): boolean {
  const na = (a || '').replace(/\D/g, '');
  const nb = (b || '').replace(/\D/g, '');
  if (!na || !nb) return false;
  const sa = na.slice(-10);
  const sb = nb.slice(-10);
  return sa.length >= 7 && sa === sb;
}

export { twimlReply };
