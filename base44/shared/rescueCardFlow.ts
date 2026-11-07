/**
 * rescueCardFlow — what happens when someone texts a traveler's rescue code
 * to the M-Care safety number. Called by twilioSafetySmsWebhook after
 * Twilio's signature check, for every text that isn't a wilderness SOS
 * packet.
 *
 * The person texting is usually a stranger helping a traveler whose phone is
 * dead. Their phone needs only a signal. Everything else runs here, on the
 * server:
 *   - the traveler's emergency contacts, companion and doctor are alerted,
 *   - the care team gets a Tier 2 emergency packet (assembleTier2EmergencyPacket),
 *   - the helper gets short, fixed replies in their likely language
 *     (rescueCardText.ts), and never anything about the traveler.
 *
 * It never writes SoloCheckIn. A stranger's text can add alerts, but it can
 * never quiet the missed check-in ladder: a flag never closes a safety path.
 *
 * Two of Portia's decisions are filled in when the folder is applied (see
 * decisions.json): whether the helper is asked the three questions, and
 * whether the family's texts carry the traveler's name and reported place
 * (the emergency exception) or only a link.
 */
import { getOrderedCaseContacts } from './emergencyContacts.ts';
import { sendSms } from './twilioSms.ts';
import { sendWhatsApp } from './twilioWhatsApp.ts';
import { emergencyDispatch, linkOnlyEmail, linkOnlySms } from './notify.ts';
import { logJourneyEvent } from './logJourneyEvent.ts';
import { computePrevHash } from './auditHashChain.ts';
import { checkRateLimit } from './rateLimit.ts';
import { escapeHtml as esc } from './emailTemplate.ts';
import { digitsOnly, sameStoredPhone } from './phoneMatch.ts';
import {
  type AlertStage, type HelperStep, type RescueLang, type ReplyKey,
  LINK_ONLY_LINES, LINK_ONLY_PARTNER_LINES,
  clipText, emergencyAlertText, findRescueCodeCandidates, firstName, hasRescueKeyword,
  helperReply, isOptOut, languageForCountry, languageForPhone, nextHelperStep,
} from './rescueCardText.ts';

/** Ask the helper where the traveler is, whether they're awake, and whether family may call. */
const ASK_HELPER_QUESTIONS: boolean = true;
/** 'emergency': family texts name the traveler and pass on the reported place. 'link_only': a generic line and a link. */
const ALERT_DETAIL: 'emergency' | 'link_only' = "emergency";

/** A helper's conversation stays open this long after their last message. */
const SESSION_HOURS = 24;
/** New helpers per card per hour before family alerts pause (the care team still hears). */
const MAX_NEW_HELPERS_PER_HOUR = 5;
/** Codes one number may get wrong per hour before M-Care stops replying. */
const MAX_BAD_CODES_PER_HOUR = 10;
/** Messages kept on a conversation. */
const MAX_MESSAGES = 40;
const TERMINAL_CASE_STATUSES = ['Completed', 'Closed', 'Cancelled'];
const ACTIVE_COMPANION_STATUSES = ['assigned', 'confirmed', 'active'];

interface RescueSmsInput {
  from: string;
  body: string;
  now: string;
}

interface RescueContext {
  caseRecord: any | null;
  lang: RescueLang;
  emergencyNumber: string | null;
  country: string | null;
}

/**
 * The reply to text back to the helper, '' to send nothing (after STOP, or
 * to someone guessing codes), or null when this text isn't part of a rescue
 * and the webhook should handle it as before.
 */
export async function handleRescueSms(base44: any, input: RescueSmsInput): Promise<string | null> {
  const text = String(input.body || '').trim();
  if (!input.from || !text) return null;

  const candidates = findRescueCodeCandidates(text);
  if (candidates.length) {
    const card = await findCard(base44, candidates);
    if (card) return handleCodeText(base44, card, input, text);
  }

  // A reply in a conversation that's already open. A code-shaped word that
  // matched no card may simply be part of the helper's answer.
  const session = await findOpenSession(base44, input.from, input.now);
  if (session) return handleSessionReply(base44, session, input, text);

  if (candidates.length || hasRescueKeyword(text)) {
    const allowed = await checkRateLimit(base44, `rescue_bad_code_${digitsOnly(input.from)}`, 3600, MAX_BAD_CODES_PER_HOUR)
      .catch(() => true);
    if (!allowed) return '';
    // No card, so no trip country: go by the helper's own number.
    const lang = languageForPhone(input.from);
    return helperReply(lang, candidates.length ? 'unknown_code' : 'need_code');
  }
  return null;
}

// ---- A text carrying a code -------------------------------------------------

async function handleCodeText(base44: any, card: any, input: RescueSmsInput, text: string): Promise<string> {
  const ctx = await loadContext(base44, card);

  if (card.status !== 'active') {
    // The traveler replaced this card. Whoever has the old one may still be
    // with them, so the care team hears about it, but family isn't alerted.
    await emailCareTeam(base44, {
      subject: 'An old M-Care rescue code was used',
      heading: 'A replaced rescue code was texted',
      rows: [
        ['Traveler', card.client_email],
        ['Helper phone', input.from],
        ['Their message', clipText(text, 500)],
        ['What to do', 'This card was replaced, so family was not alerted. Check on the traveler.'],
      ],
    });
    return helperReply(ctx.lang, 'not_active', ctx.emergencyNumber);
  }

  // The same helper texting the code again picks up where they left off.
  const existing = await findOpenSession(base44, input.from, input.now, card.id);
  if (existing) {
    const again = repeatReply(existing.step);
    return helperReply(ctx.lang, again, ctx.emergencyNumber);
  }

  const familyAllowed = await checkRateLimit(base44, `rescue_card_${card.id}`, 3600, MAX_NEW_HELPERS_PER_HOUR)
    .catch(() => true);

  let session: any = null;
  try {
    session = await base44.asServiceRole.entities.RescueContact.create({
      rescue_card_id: card.id,
      case_id: ctx.caseRecord?.id || card.case_id || '',
      client_email: card.client_email,
      helper_phone: input.from,
      channel: 'sms',
      language: ctx.lang,
      status: 'open',
      step: (ASK_HELPER_QUESTIONS ? 'awaiting_location' : 'done') as HelperStep,
      messages: [{ at: input.now, from: 'helper', text: clipText(text, 500) }],
      opened_at: input.now,
      last_message_at: input.now,
    });
  } catch (e) {
    console.error('[rescueCardFlow] could not save the conversation:', e);
  }

  await base44.asServiceRole.entities.RescueCard.update(card.id, {
    use_count: (card.use_count || 0) + 1,
    last_used_at: input.now,
  }).catch(() => {});

  const delivered = familyAllowed && ctx.caseRecord
    ? await alertPeople(base44, ctx, card, session, 'opened')
    : { reached: 0, attempted: 0 };

  // The care team: a full Tier 2 packet, the same human-action-required
  // path SOS uses. Not awaited by the packet's own design.
  const lastKnown = ctx.caseRecord ? await lastKnownLocation(base44, ctx.caseRecord.id) : null;
  base44.asServiceRole.functions?.invoke?.('assembleTier2EmergencyPacket', {
    internal_secret: Deno.env.get('CRON_SECRET'),
    case_id: ctx.caseRecord?.id || null,
    source_function: 'rescueCard',
    source_event_id: session?.id || '',
    trigger_type: 'rescue_card',
    patient_email: card.client_email,
    patient_name: ctx.caseRecord?.client_name,
    latitude: lastKnown?.latitude ?? null,
    longitude: lastKnown?.longitude ?? null,
    location_label: lastKnown
      ? `Last position from the traveler's own phone, ${lastKnown.updated_at || 'time unknown'}`
      : 'Unknown. The helper is being asked.',
    situation_description:
      `Someone texted this traveler's rescue code to the M-Care safety number from ${input.from}. ` +
      `The traveler's phone may be dead. Their message: "${clipText(text, 300)}".` +
      (familyAllowed ? '' : ' This card was used by many numbers within an hour, so family alerts are paused. Check whether this is misuse.'),
  })?.catch?.(() => {});

  const careTeamTold = !!Deno.env.get('ADMIN_EMAIL');
  const reached = delivered.reached > 0 || careTeamTold;
  const replyKey: ReplyKey = ASK_HELPER_QUESTIONS
    ? (reached ? 'first_ask' : 'first_ask_unreached')
    : (reached ? 'first_ack' : 'first_ack_unreached');
  const reply = helperReply(ctx.lang, replyKey, ctx.emergencyNumber);

  if (session) {
    await base44.asServiceRole.entities.RescueContact.update(session.id, {
      messages: [...(session.messages || []), { at: input.now, from: 'morales', text: reply }],
      alerts: { opened: delivered },
    }).catch(() => {});
  }

  if (ctx.caseRecord) {
    await logJourneyEvent(base44, {
      case_id: ctx.caseRecord.id,
      client_email: card.client_email,
      event_type: 'rescue_card_used',
      source: 'rescueCard',
      message_text: "Someone used your rescue card to ask us for help. I've alerted your emergency contacts and our safety team.",
      priority: 'critical',
      action_taken: `rescue card used; people reached=${delivered.reached}`,
      tool_result: { rescue_contact_id: session?.id || '', family_alerted: familyAllowed },
      escalation_occurred: true,
    });
  }

  try {
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'rescue_card_used',
      actor_id: `sms_${digitsOnly(input.from).slice(-4)}`,
      actor_role: 'rescue_helper',
      actor_name: 'Rescue card helper',
      resource_type: 'RescueContact',
      resource_id: session?.id || '',
      case_id: ctx.caseRecord?.id || '',
      details: {
        rescue_card_id: card.id,
        language: ctx.lang,
        people_reached: delivered.reached,
        family_alerted: familyAllowed,
      },
      sensitive: true,
      timestamp: input.now,
      prev_hash: await computePrevHash(base44),
    });
  } catch (_) { /* best-effort */ }

  return reply;
}

/** What to resend when a helper texts the code again mid-conversation. */
function repeatReply(step?: string): ReplyKey {
  if (step === 'awaiting_location') return 'first_ask';
  if (step === 'awaiting_awake') return 'ask_awake';
  if (step === 'awaiting_callback') return 'ask_callback';
  return 'thanks';
}

// ---- A reply in an open conversation ----------------------------------------

async function handleSessionReply(base44: any, session: any, input: RescueSmsInput, text: string): Promise<string> {
  if (isOptOut(text)) {
    await base44.asServiceRole.entities.RescueContact.update(session.id, {
      status: 'opted_out',
      closed_at: input.now,
      last_message_at: input.now,
      messages: keepRecent([...(session.messages || []), { at: input.now, from: 'helper', text: clipText(text, 500) }]),
    }).catch(() => {});
    return '';
  }

  const card = await base44.asServiceRole.entities.RescueCard.get(session.rescue_card_id).catch(() => null);
  const ctx = card ? await loadContext(base44, card) : await contextForCase(base44, session.case_id);
  const { updates, replyKey, alertKind } = nextHelperStep(session.step, text);
  const reply = helperReply(ctx.lang, replyKey, ctx.emergencyNumber);
  const updated = { ...session, ...updates };

  await base44.asServiceRole.entities.RescueContact.update(session.id, {
    ...updates,
    last_message_at: input.now,
    messages: keepRecent([
      ...(session.messages || []),
      { at: input.now, from: 'helper', text: clipText(text, 500) },
      { at: input.now, from: 'morales', text: reply },
    ]),
  }).catch(() => {});

  if (ctx.caseRecord && card) {
    // A plain extra message updates family at most every 10 minutes.
    const send = alertKind !== 'message'
      || await checkRateLimit(base44, `rescue_msg_${session.id}`, 600, 1).catch(() => true);
    if (send) await alertPeople(base44, ctx, card, updated, alertKind);
  }

  await emailCareTeam(base44, {
    subject: alertKind === 'not_awake' ? 'URGENT: rescue card helper says the traveler is not awake' : 'Update from a rescue card helper',
    heading: alertKind === 'not_awake' ? 'The helper says the traveler is not awake or cannot talk' : 'A rescue card helper replied',
    rows: [
      ['Traveler', session.client_email],
      ['Case', session.case_id || 'unknown'],
      ['Helper phone', session.helper_phone],
      ['Their message', clipText(text, 500)],
      ['Where they say the traveler is', updated.reported_location || 'not answered yet'],
      ['Awake and able to talk', updated.reported_awake || 'not answered yet'],
      ['Family may call the helper', updated.callback_consent === true ? 'yes' : updated.callback_consent === false ? 'no' : 'not answered yet'],
    ],
  });

  return reply;
}

// ---- Alerts to the traveler's people ----------------------------------------

/**
 * Texts, WhatsApp and email to the traveler's emergency contacts, plus
 * their companion and doctor for the first alert and urgent updates.
 * Every outbound body comes from smsBody/emailBody below, which only ever
 * use emergencyDispatch (the emergency exception) or the link-only helpers.
 */
async function alertPeople(base44: any, ctx: RescueContext, card: any, session: any, stage: AlertStage) {
  const c = ctx.caseRecord;
  const name = firstName(c?.client_name);
  const appUrl = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');
  const guardianUrl = (await ensureCaseGuardianLink(base44, c, appUrl)) || `${appUrl}/guardian-access`;
  const facts = {
    name,
    location: session?.reported_location || '',
    helperPhone: session?.callback_consent === true ? session?.helper_phone : '',
  };

  const recipients: Array<{ phone?: string; email?: string; url: string; partner: boolean }> = [];
  for (const person of await getOrderedCaseContacts(base44, c)) {
    recipients.push({ phone: person.phone, email: person.email, url: guardianUrl, partner: false });
  }
  // The companion and doctor hear about the opening and urgent news, not
  // every small update. They never get the helper's number.
  if (stage === 'opened' || stage === 'not_awake') {
    for (const p of await partnerContacts(base44, c, appUrl)) recipients.push({ ...p, partner: true });
  }

  let reached = 0;
  let attempted = 0;
  await Promise.all(recipients.map(async (r) => {
    const factsFor = r.partner ? { ...facts, helperPhone: '' } : facts;
    const sms = smsBody(stage, factsFor, r.url, r.partner);
    const results = await Promise.allSettled([
      r.phone ? sendSms(r.phone, sms) : Promise.resolve(null),
      r.phone ? sendWhatsApp(r.phone, sms) : Promise.resolve(null),
      r.email ? sendEmail(base44, r.email, emailBody(stage, factsFor, r.url, r.partner)) : Promise.resolve(null),
    ]);
    const ok = results.some((x) => x.status === 'fulfilled' && x.value && (x.value as any).ok !== false);
    if (r.phone || r.email) attempted++;
    if (ok) reached++;
  }));
  return { reached, attempted };
}

function smsBody(stage: AlertStage, facts: any, url: string, partner: boolean): string {
  if (ALERT_DETAIL === 'emergency') {
    return emergencyDispatch({ reason: 'sos_triggered', from: 'rescueCard', body: emergencyAlertText(stage, { ...facts, url }) });
  }
  const line = partner ? LINK_ONLY_PARTNER_LINES.line : LINK_ONLY_LINES[stage].line;
  return linkOnlySms({ line, url, from: 'rescueCard' });
}

function emailBody(stage: AlertStage, facts: any, url: string, partner: boolean): { subject: string; html: string } {
  if (ALERT_DETAIL === 'emergency') {
    const text = emergencyAlertText(stage, { ...facts, url: null });
    const urgent = stage === 'opened' || stage === 'not_awake';
    const html = emergencyDispatch({
      reason: 'sos_triggered',
      from: 'rescueCard',
      body: `<div style="font-family:Arial,sans-serif;max-width:520px;">
<p style="font-size:15px;font-weight:700;color:${urgent ? '#b91c1c' : '#111827'};">${esc(text)}</p>
<p><a href="${esc(url)}" style="display:inline-block;background:#D4AF37;color:#060B16;font-weight:700;padding:10px 22px;border-radius:99px;text-decoration:none;">Open updates</a></p>
<p style="font-size:12px;color:#6b7280;">If you think they're in danger, call the local emergency number for where they are.</p>
</div>`,
    });
    return { subject: urgent ? 'URGENT: someone has asked M-Care for help for your traveler' : 'Update about your traveler', html };
  }
  const lines = partner ? LINK_ONLY_PARTNER_LINES : LINK_ONLY_LINES[stage];
  return {
    subject: lines.title,
    html: linkOnlyEmail({ title: lines.title, line: lines.line, ctaUrl: url, ctaLabel: 'Open now', from: 'rescueCard' }),
  };
}

async function sendEmail(base44: any, to: string, mail: { subject: string; html: string }) {
  if (!to.includes('@')) return { ok: false };
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'M-Care Safety',
      to,
      subject: mail.subject,
      body: mail.html,
    });
    return { ok: true };
  } catch (_) {
    return { ok: false };
  }
}

/** The companion and doctor on this trip, each with a link to their own portal. */
async function partnerContacts(base44: any, c: any, appUrl: string) {
  const out: Array<{ phone?: string; email?: string; url: string }> = [];
  try {
    const assignments = await base44.asServiceRole.entities.CompanionAssignment.filter({ case_id: c.id }, '-assigned_at', 5);
    const active = (assignments || []).find((a: any) => ACTIVE_COMPANION_STATUSES.includes(a.status));
    if (active) {
      const comp = active.companion_id
        ? await base44.asServiceRole.entities.Companion.get(active.companion_id).catch(() => null)
        : null;
      const phone = comp?.phone || '';
      const email = comp?.email || active.companion_email || '';
      if (phone || email) out.push({ phone, email, url: `${appUrl}/companion-dashboard` });
    }
  } catch (_) { /* best-effort */ }
  try {
    if (c.doctor_email) {
      const doctors = await base44.asServiceRole.entities.Doctor.filter({ email: c.doctor_email }, '-created_date', 1);
      const doc = doctors?.[0];
      const url = c.doctor_portal_token ? `${appUrl}/portal/doctor/${c.doctor_portal_token}` : `${appUrl}/portal/doctor/dashboard`;
      if (doc?.phone || c.doctor_email) out.push({ phone: doc?.phone || '', email: c.doctor_email, url });
    }
  } catch (_) { /* best-effort */ }
  return out;
}

/** The trip's guardian page link, made if there isn't a live one. Same as escalateSoloCheckIn's ensureGuardianLink. */
async function ensureCaseGuardianLink(base44: any, c: any, appUrl: string): Promise<string | null> {
  if (!c?.id) return null;
  try {
    const existing = await base44.asServiceRole.entities.GuardianSession.filter({ case_id: c.id, is_active: true });
    const live = (existing || []).find((s: any) => new Date(s.expires_at) > new Date() && s.shared_data_scope?.includes('location'));
    if (live) return `${appUrl}/guardian/${live.view_token}`;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const token = Array.from(bytes).map((b) => chars[b % chars.length]).join('');
    await base44.asServiceRole.entities.GuardianSession.create({
      case_id: c.id,
      patient_email: c.client_email,
      patient_name: c.client_name || c.client_email,
      guardian_name: 'Emergency Contact',
      guardian_email: c.emergency_contact_email || '',
      guardian_phone: c.emergency_contact_number || '',
      view_token: token,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      view_count: 0,
      shared_data_scope: ['case_status', 'journey_stage', 'location'],
      created_at: new Date().toISOString(),
    });
    return `${appUrl}/guardian/${token}`;
  } catch (_) {
    return null;
  }
}

// ---- The care team ------------------------------------------------------------

/** An internal email to the care team. Not a patient notification, so it carries the detail they need. */
async function emailCareTeam(base44: any, mail: { subject: string; heading: string; rows: Array<[string, string]> }) {
  const to = Deno.env.get('ADMIN_EMAIL');
  if (!to) return;
  const rows = mail.rows
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">${esc(k)}</td><td style="padding:4px 0;">${esc(v)}</td></tr>`)
    .join('');
  await base44.asServiceRole.integrations.Core.SendEmail({
    from_name: 'M-Care — Rescue Card',
    to,
    subject: mail.subject,
    body: `<div style="font-family:Arial,sans-serif;"><h3 style="margin:0 0 10px;color:#b91c1c;">${esc(mail.heading)}</h3><table>${rows}</table></div>`,
  }).catch(() => {});
}

// ---- Lookups ------------------------------------------------------------------

async function findCard(base44: any, codes: string[]) {
  for (const code of codes) {
    const rows = await base44.asServiceRole.entities.RescueCard.filter({ code }, '-created_at', 1).catch(() => []);
    if (rows?.[0]) return rows[0];
  }
  return null;
}

async function findOpenSession(base44: any, from: string, now: string, cardId?: string) {
  const rows = await base44.asServiceRole.entities.RescueContact
    .filter({ helper_phone: from, status: 'open' }, '-last_message_at', 5)
    .catch(() => []);
  const cutoff = new Date(now).getTime() - SESSION_HOURS * 60 * 60 * 1000;
  return (rows || []).find((r: any) =>
    new Date(r.last_message_at || r.opened_at).getTime() >= cutoff && (!cardId || r.rescue_card_id === cardId)) || null;
}

/**
 * Alerts go to the traveler's current trip, so a card keeps working from one
 * trip to the next. The card's own trip is the fallback.
 */
async function loadContext(base44: any, card: any): Promise<RescueContext> {
  let caseRecord: any = null;
  try {
    const cases = await base44.asServiceRole.entities.CaseRecord.filter({ client_email: card.client_email }, '-created_date', 5);
    caseRecord = (cases || []).find((c: any) => !TERMINAL_CASE_STATUSES.includes(c.status)) || null;
  } catch (_) { /* fall back below */ }
  if (!caseRecord && card.case_id) {
    caseRecord = await base44.asServiceRole.entities.CaseRecord.get(card.case_id).catch(() => null);
  }
  return withCountry(base44, caseRecord);
}

async function contextForCase(base44: any, caseId?: string): Promise<RescueContext> {
  const caseRecord = caseId ? await base44.asServiceRole.entities.CaseRecord.get(caseId).catch(() => null) : null;
  return withCountry(base44, caseRecord);
}

async function withCountry(base44: any, caseRecord: any): Promise<RescueContext> {
  const country = caseRecord?.procedure_country || null;
  let emergencyNumber: string | null = null;
  if (country) {
    const rows = await base44.asServiceRole.entities.EmergencyContacts.filter({ country_name: country }, '-created_date', 1)
      .catch(() => []);
    emergencyNumber = rows?.[0]?.emergency_number || null;
  }
  return { caseRecord, lang: languageForCountry(country), emergencyNumber, country };
}

async function lastKnownLocation(base44: any, caseId: string) {
  const rows = await base44.asServiceRole.entities.LiveLocation.filter({ case_id: caseId }, '-updated_at', 1).catch(() => []);
  const r = rows?.[0];
  return r && r.latitude != null && r.longitude != null ? r : null;
}

function keepRecent(messages: any[]) {
  return messages.slice(-MAX_MESSAGES);
}

// ---- For the SOS-text and wilderness-SOS paths in the webhook -----------------

/**
 * Alerts a traveler's emergency contacts that their own phone sent an SOS
 * text. Used when the SOS can't be tied to an active check-in, so the
 * check-in ladder isn't already handling it. Returns how many people were
 * reached.
 */
export async function alertContactsOfSosText(base44: any, caseRecord: any, o: {
  latitude?: number | null; longitude?: number | null;
}): Promise<number> {
  const appUrl = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');
  const url = (await ensureCaseGuardianLink(base44, caseRecord, appUrl)) || `${appUrl}/guardian-access`;
  const name = firstName(caseRecord?.client_name) || 'Your traveler';
  const where = o.latitude != null && o.longitude != null
    ? ` Their phone sent this location: https://maps.google.com/?q=${o.latitude},${o.longitude}`
    : '';
  const smsText = ALERT_DETAIL === 'emergency'
    ? emergencyDispatch({ reason: 'sos_triggered', from: 'sosText', body: `URGENT from M-Care: ${name} has texted SOS from their phone.${where} Updates: ${url}` })
    : linkOnlySms({ line: LINK_ONLY_LINES.opened.line, url, from: 'sosText' });
  const mail = ALERT_DETAIL === 'emergency'
    ? {
      subject: 'URGENT: your traveler has texted SOS',
      html: emergencyDispatch({
        reason: 'sos_triggered',
        from: 'sosText',
        body: `<div style="font-family:Arial,sans-serif;max-width:520px;"><p style="font-size:15px;font-weight:700;color:#b91c1c;">${esc(`${name} has texted SOS to the M-Care safety number.`)}</p>${o.latitude != null && o.longitude != null ? `<p><a href="https://maps.google.com/?q=${o.latitude},${o.longitude}">Open the location their phone sent</a></p>` : ''}<p><a href="${esc(url)}">Open updates</a></p></div>`,
      }),
    }
    : { subject: LINK_ONLY_LINES.opened.title, html: linkOnlyEmail({ title: LINK_ONLY_LINES.opened.title, line: LINK_ONLY_LINES.opened.line, ctaUrl: url, ctaLabel: 'Open now', from: 'sosText' }) };

  let reached = 0;
  await Promise.all((await getOrderedCaseContacts(base44, caseRecord)).map(async (person) => {
    const results = await Promise.allSettled([
      person.phone ? sendSms(person.phone, smsText) : Promise.resolve(null),
      person.phone ? sendWhatsApp(person.phone, smsText) : Promise.resolve(null),
      person.email ? sendEmail(base44, person.email, mail) : Promise.resolve(null),
    ]);
    if (results.some((x) => x.status === 'fulfilled' && x.value && (x.value as any).ok !== false)) reached++;
  }));
  return reached;
}

/**
 * The traveler's active trip, found from the number that texted, or from the
 * trip reference an offline SOS packet carries (the last 8 characters of the
 * case id). Used when an SOS text has no check-in to match. Numbers are
 * compared by digits, the same way the check-in lookup now does.
 */
export async function findActiveCaseForSender(base44: any, from: string, caseRef?: string) {
  const isActive = (c: any) => c && !TERMINAL_CASE_STATUSES.includes(c.status);
  const exact = await base44.asServiceRole.entities.CaseRecord.filter({ client_phone: from }, '-created_date', 5).catch(() => []);
  const hit = (exact || []).find(isActive);
  if (hit) return hit;

  const recent = await base44.asServiceRole.entities.CaseRecord.list('-created_date', 150).catch(() => []);
  const active = (recent || []).filter(isActive);
  const ref = String(caseRef || '').toUpperCase();
  if (/^[A-Z0-9]{8}$/.test(ref) && ref !== 'NOCASE') {
    const byRef = active.find((c: any) => String(c.id || '').slice(-8).toUpperCase() === ref);
    if (byRef) return byRef;
  }
  return active.find((c: any) => sameStoredPhone(c.client_phone, from)) || null;
}
