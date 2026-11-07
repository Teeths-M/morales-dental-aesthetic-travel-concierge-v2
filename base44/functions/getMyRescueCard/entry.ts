import { createHandler, ok } from '../../shared/createHandler.ts';
import { strictObject, z } from '../../shared/validate.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { generateRescueCode, languageForCountry, RESCUE_KEYWORD } from '../../shared/rescueCardText.ts';

/**
 * getMyRescueCard — the signed-in traveler's rescue card.
 *
 * The card is printed before a trip. If the traveler's phone dies, anyone
 * can scan its QR code, or type its code, to text the M-Care safety number
 * with only a phone signal (twilioSafetySmsWebhook -> rescueCardFlow.ts).
 *
 *   action 'get'      the active card, made on first use
 *   action 'replace'  a new code; the old card stops working
 *
 * The traveler is always the signed-in user, never a field in the request.
 * The card needs an active trip and a configured safety number, and says
 * honestly when either is missing instead of showing a card that can't work.
 */

const bodySchema = strictObject({
  action: z.enum(['get', 'replace']).optional().default('get'),
});

const TERMINAL = ['Completed', 'Closed', 'Cancelled'];

/**
 * The number printed on the card. A text to a number in the helper's own
 * country is cheaper for them and far more likely to arrive, so a local
 * M-Care number for the trip's country wins when one is set up:
 * TWILIO_LOCAL_SAFETY_NUMBERS is JSON like {"Mexico": "+52..."}, each number
 * pointing at the same safety webhook. Otherwise TWILIO_PHONE_NUMBER.
 */
function safetyNumberFor(country?: string | null): string {
  try {
    const map = JSON.parse(Deno.env.get('TWILIO_LOCAL_SAFETY_NUMBERS') || '{}');
    const local = country && typeof map?.[country] === 'string' ? map[country].trim() : '';
    if (/^\+\d{7,15}$/.test(local)) return local;
  } catch (_) { /* not set, or not valid JSON: use the default number */ }
  return (Deno.env.get('TWILIO_PHONE_NUMBER') || '').trim();
}

async function uniqueCode(base44: any): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = generateRescueCode();
    const taken = await base44.asServiceRole.entities.RescueCard.filter({ code }, '-created_at', 1).catch(() => []);
    if (!taken?.length) return code;
  }
  throw new Error('Could not make a unique rescue code');
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { action } = await body<{ action: 'get' | 'replace' }>();

  const cases = await base44.asServiceRole.entities.CaseRecord.filter({ client_email: user.email }, '-created_date', 5);
  const trip = (cases || []).find((c: any) => !TERMINAL.includes(c.status)) || null;
  if (!trip) return ok({ available: false, reason: 'no_active_trip' });

  const country = trip.procedure_country || null;
  const smsNumber = safetyNumberFor(country);
  if (!smsNumber) return ok({ available: false, reason: 'sms_not_configured' });

  const now = new Date().toISOString();
  const current = await base44.asServiceRole.entities.RescueCard
    .filter({ client_email: user.email, status: 'active' }, '-created_at', 1)
    .then((rows: any[]) => rows?.[0] || null)
    .catch(() => null);

  let card = current;
  if (action === 'replace' || !card) {
    if (current) {
      await base44.asServiceRole.entities.RescueCard.update(current.id, { status: 'replaced', replaced_at: now });
    }
    card = await base44.asServiceRole.entities.RescueCard.create({
      code: await uniqueCode(base44),
      client_email: user.email,
      case_id: trip.id,
      status: 'active',
      created_at: now,
      use_count: 0,
    });
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: current ? 'rescue_card_replaced' : 'rescue_card_created',
        actor_id: user.id,
        actor_role: user.role || 'user',
        actor_name: user.full_name || user.email,
        actor_email: user.email,
        resource_type: 'RescueCard',
        resource_id: card.id,
        case_id: trip.id,
        details: { replaced_card_id: current?.id || null },
        sensitive: false,
        timestamp: now,
        prev_hash: await computePrevHash(base44),
      });
    } catch (_) { /* best-effort */ }
  }

  let emergencyNumber: string | null = null;
  if (country) {
    const rows = await base44.asServiceRole.entities.EmergencyContacts.filter({ country_name: country }, '-created_date', 1)
      .catch(() => []);
    emergencyNumber = rows?.[0]?.emergency_number || null;
  }

  return ok({
    available: true,
    code: card.code,
    keyword: RESCUE_KEYWORD,
    sms_number: smsNumber,
    country,
    language: languageForCountry(country),
    emergency_number: emergencyNumber,
    created_at: card.created_at,
    use_count: card.use_count || 0,
  });
}, { name: 'getMyRescueCard', requireAuth: true, bodySchema }));
