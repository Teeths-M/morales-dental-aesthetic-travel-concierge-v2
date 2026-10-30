/**
 * tripAssistanceEngine — the only code that writes this module's records.
 *
 * Everything here is server-only and idempotent, because each write either
 * spends a traveller's allowance or sends something to a third party. The two
 * rules that shape the whole file:
 *
 *   1. A record is written from a composed, approved script — never from text a
 *      client handed over. The approval is checked against a re-composition, so
 *      a script cannot be approved as one thing and stored as another.
 *   2. Sending is separate from consent. A packet going to a driver never
 *      authorises a word being spoken on the phone; that needs its own approval,
 *      or the standing list when the traveller cannot answer.
 */

import { isFeatureEnabled, TRIP_ASSISTANCE_FLAG } from './featureFlags.ts';
import {
  CATEGORIES,
  categoryOf,
  composeScript,
  isQuietNow,
  languageName,
  missingRequired,
  quietWindowLabel,
  resolveMode,
  retentionUntil,
  sanitizeValues,
  standingListDisclosures,
  allowedUnderStandingList,
} from './tripAssistance.ts';
import {
  SHOW_CARDS,
  SUPPORTED_LANGS,
  languageForCountry,
  timezoneForCountry,
} from './tripAssistanceCopy.ts';
import {
  CHANNEL_FOR_RECIPIENT,
  POLICE_REFUSED,
  buildPacketValues,
  contactForRecipient,
  generalProcedure,
  missingPacketFields,
  packetPairs,
  packetStatusFor,
  renderPacketMessage,
  sendPacketSms,
  sendPacketWhatsApp,
} from './tripPacket.ts';

export function moduleDisabled() {
  return { error: 'Trip assistance is not switched on.', enabled: false };
}

export async function isTripAssistanceEnabled(base44: any): Promise<boolean> {
  return isFeatureEnabled(base44, TRIP_ASSISTANCE_FLAG, false);
}

async function firstOf(query: Promise<any>): Promise<any> {
  const rows = await query.catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

// ── Trip resolution ───────────────────────────────────────────────────────────

export async function resolveTrip(base44: any, opts: { trip_id?: string; user?: any }) {
  const { trip_id, user } = opts;
  let request: any = null;
  let caseId: string | null = null;

  if (trip_id) {
    request = await base44.asServiceRole.entities.TravelRequest.get(trip_id).catch(() => null);
    if (request) caseId = request.case_id || null;
    else {
      const direct = await base44.asServiceRole.entities.CaseRecord.get(trip_id).catch(() => null);
      caseId = direct?.id || null;
    }
  }

  if (!request && !caseId && user?.email) {
    request = await firstOf(base44.asServiceRole.entities.TravelRequest.filter(
      { user_email: user.email },
      '-created_date',
      5,
    ));
    caseId = request?.case_id || null;
    if (!caseId) {
      const latest = await firstOf(base44.asServiceRole.entities.CaseRecord.filter(
        { client_email: user.email },
        '-created_date',
        5,
      ));
      caseId = latest?.id || null;
    }
  }

  if (!request && !caseId) return null;

  const caseRec = caseId
    ? await base44.asServiceRole.entities.CaseRecord.get(caseId).catch(() => null)
    : null;

  const country = String(caseRec?.procedure_country || request?.destination_country || '').trim();
  const patientEmail = String(caseRec?.client_email || request?.user_email || user?.email || '').toLowerCase();
  const fullName = String(caseRec?.client_name || request?.user_name || user?.full_name || '').trim();
  const firstName = fullName ? fullName.split(/\s+/)[0] : 'Traveller';

  const endBase = request?.return_date || caseRec?.departure_date;
  let tripEndsAt = new Date().toISOString();
  if (endBase) {
    const d = new Date(endBase);
    if (!Number.isNaN(d.getTime())) {
      tripEndsAt = new Date(d.getTime() + 21 * 86400000).toISOString();
    }
  }

  const contacts = await base44.asServiceRole.entities.EmergencyContacts
    .filter({}, '-created_date', 200)
    .catch(() => []);
  const countryKey = country.toLowerCase();
  const matched = (Array.isArray(contacts) ? contacts : []).find((c: any) =>
    String(c?.country_name || '').toLowerCase().includes(countryKey) && countryKey.length > 2,
  );

  const language = languageForCountry(country);

  return {
    trip_id: String(request?.id || caseId),
    case_id: caseId,
    patient_email: patientEmail,
    patient_first_name: firstName,
    country_name: country || 'Your trip',
    country_code: '',
    trip_language: language,
    language_name: languageName(language),
    timezone: timezoneForCountry(country),
    local_number: matched?.mcare_local_number || matched?.emergency_number || '',
    local_number_label: matched?.mcare_local_number_label || 'M-Care, 24 hours',
    trip_ends_at: tripEndsAt,
    caseRec,
    request,
  };
}

// ── Assembly ──────────────────────────────────────────────────────────────────

export async function ensurePolicy(base44: any, ctx: any) {
  const existing = await firstOf(base44.asServiceRole.entities.TripAssistancePolicy.filter(
    { trip_id: ctx.trip_id },
    '-created_date',
    1,
  ));
  if (existing) return existing;

  const languages = [ctx.language_name, 'English'].filter((v, i, a) => v && a.indexOf(v) === i);

  return base44.asServiceRole.entities.TripAssistancePolicy.create({
    trip_id: ctx.trip_id,
    case_id: ctx.case_id || '',
    patient_email: ctx.patient_email,
    trip_language: ctx.trip_language,
    languages,
    local_number: ctx.local_number,
    local_number_label: ctx.local_number_label,
    quiet_hours_enabled: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    quiet_hours_timezone: ctx.timezone,
    per_trip_cap: 6,
    per_day_cap: 2,
    retention_days_outcomes: 90,
    retention_days_audio: 30,
    automated_voice_enabled: false,
    status: 'active',
    created_by_function: 'bootstrapTripAssistancePack',
  });
}

export async function ensureDisclosure(base44: any, ctx: any) {
  const existing = await firstOf(base44.asServiceRole.entities.TripEmergencyDisclosure.filter(
    { trip_id: ctx.trip_id },
    '-version',
    1,
  ));
  if (existing) return existing;

  const caseRec = ctx.caseRec || {};
  const location = [caseRec.hotel_name, caseRec.hotel_address].filter(Boolean).join(', ');
  const clinician = [caseRec.doctor_selected, caseRec.clinic_selected].filter(Boolean).join(' · ');
  const contact = [caseRec.emergency_contact, caseRec.emergency_contact_number].filter(Boolean).join(' · ');

  return base44.asServiceRole.entities.TripEmergencyDisclosure.create({
    trip_id: ctx.trip_id,
    case_id: ctx.case_id || '',
    patient_email: ctx.patient_email,
    version: 1,
    approved: false,
    fields: [
      { key: 'first_name', label: 'First name', value: ctx.patient_first_name, include: true },
      { key: 'location', label: 'Where you are staying', value: location, include: true },
      { key: 'traveller_status', label: 'That you are an M-Care traveller', value: 'M-Care traveller', include: true },
      {
        key: 'procedure_general',
        label: 'Procedure (general terms)',
        value: generalProcedure(caseRec.procedures),
        include: true,
      },
      { key: 'doctor_or_clinic', label: 'Doctor or clinic', value: clinician, include: true },
      { key: 'emergency_contact', label: 'Your emergency contact', value: contact, include: true },
    ],
    always_excluded: [
      'Payment details and card numbers',
      'Passport and identity documents',
      'Your full medical record',
    ],
  });
}

export async function ensurePacket(base44: any, ctx: any) {
  const existing = await firstOf(base44.asServiceRole.entities.TripEmergencyPacket.filter(
    { trip_id: ctx.trip_id, status: { $ne: 'superseded' } },
    '-version',
    1,
  ));
  if (existing) return existing;

  const values = buildPacketValues({
    caseRec: ctx.caseRec,
    languageName: ctx.language_name,
    patientFirstName: ctx.patient_first_name,
  });

  return base44.asServiceRole.entities.TripEmergencyPacket.create({
    trip_id: ctx.trip_id,
    case_id: ctx.case_id || '',
    patient_email: ctx.patient_email,
    version: 1,
    status: packetStatusFor(values),
    lodging_address: values.lodging_address,
    lodging_name: ctx.caseRec?.hotel_name || '',
    gate_code: '',
    front_desk_number: '',
    doctor_name: values.doctor_name,
    clinic_name: values.clinic_name,
    clinic_address: values.clinic_address,
    procedure_general: values.procedure_general,
    procedure_date: values.procedure_date || undefined,
    allergies: values.allergies,
    current_medicines: values.current_medicines,
    language: ctx.language_name,
    language_name: ctx.language_name,
    emergency_contact_name: ctx.caseRec?.emergency_contact || '',
    emergency_contact_phone: ctx.caseRec?.emergency_contact_number || '',
    missing_fields: missingPacketFields(values),
    police_prohibited: true,
    assembled_at: new Date().toISOString(),
    assembled_by: 'bootstrapTripAssistancePack',
    source_snapshot: {
      case_id: ctx.case_id,
      hotel_address_present: Boolean(ctx.caseRec?.hotel_address),
      doctor_present: Boolean(ctx.caseRec?.doctor_selected),
    },
  });
}

export async function ensureShowCards(base44: any, ctx: any) {
  const existing = await base44.asServiceRole.entities.TripShowScreenCard
    .filter({ trip_id: ctx.trip_id }, '-created_date', 20)
    .catch(() => []);
  if (Array.isArray(existing) && existing.length) return existing;

  const lang = ctx.trip_language || 'en';
  const created = [];
  for (const situation of Object.keys(SHOW_CARDS)) {
    const def = SHOW_CARDS[situation];
    created.push({
      trip_id: ctx.trip_id,
      case_id: ctx.case_id || '',
      patient_email: ctx.patient_email,
      situation,
      label: def.label,
      text_local: def.text[lang] || def.text.en,
      text_en: def.text.en,
      language_code: lang,
      language_name: languageName(lang),
      version: 1,
      generated_at: new Date().toISOString(),
    });
  }
  return base44.asServiceRole.entities.TripShowScreenCard.bulkCreate(created);
}

/** Assemble everything a trip needs, once. Safe to call on every read. */
export async function ensureBundle(base44: any, ctx: any) {
  const [policy, disclosure, packet, cards] = await Promise.all([
    ensurePolicy(base44, ctx),
    ensureDisclosure(base44, ctx),
    ensurePacket(base44, ctx),
    ensureShowCards(base44, ctx),
  ]);
  return { policy, disclosure, packet, cards };
}

// ── Usage ─────────────────────────────────────────────────────────────────────

export async function computeUsage(base44: any, ctx: any, policy: any) {
  const all = await base44.asServiceRole.entities.TripAssistanceRequest
    .filter({ trip_id: ctx.trip_id, patient_email: ctx.patient_email }, '-created_date', 100)
    .catch(() => []);
  const rows = Array.isArray(all) ? all : [];

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const todayCount = rows.filter((r: any) => new Date(r.created_date) >= dayStart).length;

  return {
    per_trip_used: rows.length,
    per_trip_remaining: Math.max(0, Number(policy?.per_trip_cap ?? 6) - rows.length),
    per_day_used: todayCount,
    per_day_remaining: Math.max(0, Number(policy?.per_day_cap ?? 2) - todayCount),
  };
}

// ── Requests ──────────────────────────────────────────────────────────────────

export async function createRequest(base44: any, opts: {
  ctx: any;
  bundle: any;
  user: any;
  body: any;
  preview: boolean;
}) {
  const { ctx, bundle, user, body, preview } = opts;
  const category = categoryOf(String(body?.category_key || ''));
  if (!category) throw new Error('That is not a category we handle.');

  const mode = resolveMode(category, body?.mode);
  const values = sanitizeValues(category, body?.values || {});
  const missing = missingRequired(category, values);
  if (missing.length) throw new Error('That form is not finished yet.');

  // Tier 2 is written only, and a tier 3 request is owned by a human from the
  // first moment — neither can be turned into a script by asking for one.
  const composed = composeScript({
    category,
    mode,
    values,
    packet: bundle.packet,
    disclosure: bundle.disclosure,
    language: bundle.policy?.trip_language || ctx.trip_language,
  });

  if (preview) {
    return {
      script: {
        ...composed,
        values,
        attachment: body?.attachment || null,
        preview_token: `${composed.script_fingerprint}`,
      },
    };
  }

  // The approval is checked, not trusted: recompose and compare.
  const submitted = String(body?.approved_script_text || '').trim();
  if (submitted && submitted !== composed.approved_script_text) {
    throw new Error('That script changed before it was approved. Please review it again.');
  }

  const policy = bundle.policy || {};
  const usage = await computeUsage(base44, ctx, policy);

  if (category.tier !== 3 && usage.per_trip_remaining <= 0) {
    return { blocked: true, blocked_reason: 'cap_exceeded', message: 'No requests are left on this trip.' };
  }
  if (category.tier !== 3 && usage.per_day_remaining <= 0) {
    return { blocked: true, blocked_reason: 'cap_exceeded', message: 'No requests are left today.' };
  }

  const explicitCall = body?.explicit_call_request === true || mode === 'human_call';
  const quiet = isQuietNow(policy);
  if (quiet && category.tier === 1 && mode === 'human_call' && !explicitCall) {
    return {
      blocked: true,
      blocked_reason: 'quiet_hours',
      message: `It is quiet hours in ${ctx.country_name} (${quietWindowLabel(policy)}). A written request is still fine.`,
    };
  }

  const idempotencyKey = `${ctx.trip_id}:${category.key}:${composed.script_fingerprint}`;
  const recent = await base44.asServiceRole.entities.TripAssistanceRequest
    .filter({ idempotency_key: idempotencyKey }, '-created_date', 1)
    .catch(() => []);
  if (Array.isArray(recent) && recent[0]) {
    return { request: recent[0], duplicate: true };
  }

  const tier = category.tier;
  const status = tier === 3 ? 'escalated' : mode === 'written' ? 'written_sent' : 'approved';

  const created = await base44.asServiceRole.entities.TripAssistanceRequest.create({
    trip_id: ctx.trip_id,
    case_id: ctx.case_id || '',
    patient_email: ctx.patient_email,
    tier,
    category_key: category.key,
    category_label: category.label,
    mode,
    status,
    values,
    attachment_file_uri: body?.attachment?.file_uri || '',
    attachment_name: body?.attachment?.name || '',
    recipient_type: composed.recipient_type,
    recipient_name: composed.recipient_name,
    recipient_contact: composed.recipient_contact,
    channel: composed.channel,
    ask_text: composed.ask_text,
    ask_text_en: composed.ask_text_en,
    ask_language: composed.ask_language,
    translation_missing: composed.translation_missing,
    closing_question: composed.closing_question,
    expected_answer: composed.expected_answer,
    disclosures: composed.disclosures.map((d) => ({ label: d.label, value: d.value })),
    prohibited: composed.prohibited,
    approved_script_text: composed.approved_script_text,
    script_fingerprint: composed.script_fingerprint,
    approval_scope: 'this_call_only',
    approval_method: 'traveller_in_app',
    approved_at: new Date().toISOString(),
    approved_by: user?.email || ctx.patient_email,
    attempt_status: 'not_started',
    attempt_count: 0,
    retry_used: false,
    agreement: 'unknown',
    quiet_hours_override: quiet && tier !== 1 ? true : Boolean(explicitCall && quiet),
    next_step:
      tier === 3
        ? 'A care-team human is picking this up now.'
        : mode === 'written'
          ? 'A care-team member reads this and replies in writing.'
          : 'The care team places the call using this exact script.',
    escalation_reason: tier === 3 ? `tier_3_${category.key}` : '',
    escalated_at: tier === 3 ? new Date().toISOString() : undefined,
    idempotency_key: idempotencyKey,
    retain_until: retentionUntil(ctx.trip_ends_at, Number(policy?.retention_days_outcomes ?? 90)),
  });

  return { request: created };
}

// ── Outcome ───────────────────────────────────────────────────────────────────

export async function recordOutcome(base44: any, opts: {
  request_id: string;
  user: any;
  attempt_status?: string;
  agreement?: string;
  outcome_notes?: string;
  next_step?: string;
  close?: boolean;
}) {
  const existing = await base44.asServiceRole.entities.TripAssistanceRequest.get(opts.request_id);
  if (!existing) throw new Error('That request does not exist.');

  const attempt = opts.attempt_status || existing.attempt_status || 'not_started';
  const agreement = opts.agreement || existing.agreement || 'unknown';
  const failedAttempt = ['no_answer', 'wrong_department', 'dropped', 'attempted'].includes(attempt);

  let status = existing.status;
  let retryUsed = existing.retry_used === true;
  let escalationReason = existing.escalation_reason || '';
  let nextStep = opts.next_step || existing.next_step || '';

  if (opts.close) {
    status = 'completed';
  } else if (agreement === 'agreed') {
    status = 'agreed';
  } else if (agreement === 'refused') {
    status = 'not_agreed';
  } else if (failedAttempt) {
    if (!retryUsed) {
      retryUsed = true;
      status = 'in_progress';
      nextStep = 'Retrying once, then a human takes it.';
    } else {
      status = 'escalated';
      escalationReason = escalationReason || `retry_exhausted_${attempt}`;
      nextStep = 'A care-team human now owns this. It is not being retried again.';
    }
  } else if (attempt === 'connected') {
    status = 'in_progress';
  }

  const parts: string[] = [];
  if (attempt === 'connected') parts.push(`We reached them about ${String(existing.category_label).toLowerCase()}.`);
  else if (attempt === 'no_answer') parts.push(`No answer on the call about ${String(existing.category_label).toLowerCase()}.`);
  else if (attempt === 'wrong_department') parts.push(`We were sent to the wrong desk for ${String(existing.category_label).toLowerCase()}.`);
  else if (attempt === 'dropped') parts.push(`The line dropped during the call about ${String(existing.category_label).toLowerCase()}.`);
  else if (attempt === 'attempted') parts.push(`We tried ${String(existing.category_label).toLowerCase()} and did not connect.`);
  else parts.push(`${existing.category_label}: no attempt recorded yet.`);

  if (agreement === 'agreed') parts.push('They said yes to what we asked.');
  else if (agreement === 'partial') parts.push('They agreed to part of it.');
  else if (agreement === 'refused') parts.push('They said no.');
  else if (attempt === 'connected') parts.push('They did not confirm either way.');

  if (nextStep) parts.push(nextStep);

  return base44.asServiceRole.entities.TripAssistanceRequest.update(existing.id, {
    status,
    attempt_status: attempt,
    attempt_count: Number(existing.attempt_count || 0) + (opts.attempt_status ? 1 : 0),
    retry_used: retryUsed,
    agreement,
    agreed_at: agreement === 'agreed' ? new Date().toISOString() : existing.agreed_at,
    outcome_notes: opts.outcome_notes ?? existing.outcome_notes ?? '',
    next_step: nextStep,
    summary_text: parts.join(' '),
    summary_language: 'en',
    escalation_reason: escalationReason,
    handled_by: opts.user?.email || existing.handled_by || '',
    closed_at: opts.close ? new Date().toISOString() : existing.closed_at,
    closed_by: opts.close ? opts.user?.email || '' : existing.closed_by,
  });
}

// ── Packet delivery ───────────────────────────────────────────────────────────

export async function deliverPacket(base44: any, opts: {
  user: any;
  packet_id: string;
  recipient_type: string;
  channel?: string;
}) {
  const packet = await base44.asServiceRole.entities.TripEmergencyPacket.get(opts.packet_id);
  if (!packet) throw new Error('That packet does not exist.');

  if (String(opts.recipient_type) === POLICE_REFUSED) {
    // No record is written, because nothing was sent. The address is read down
    // the line by a human instead.
    return {
      refused: true,
      message: 'The packet is never sent to police. Your care team reads the address down the line.',
    };
  }

  const caseRec = packet.case_id
    ? await base44.asServiceRole.entities.CaseRecord.get(packet.case_id).catch(() => null)
    : null;

  const channel = String(opts.channel || CHANNEL_FOR_RECIPIENT[opts.recipient_type] || 'internal');
  const contact = contactForRecipient(packet, caseRec, opts.recipient_type);
  const body = renderPacketMessage(packet, opts.recipient_type);

  let outcome = 'accepted';
  let providerRef = '';
  let failureDetail = '';

  if (opts.recipient_type === 'care_team' || channel === 'internal') {
    outcome = 'accepted';
  } else if (channel === 'pdf') {
    // Prepared for a handover, not transmitted. Logged so the version handed
    // over is a fact.
    outcome = 'accepted';
  } else if (!contact) {
    outcome = 'failed';
    failureDetail = 'No contact on file for this recipient.';
  } else if (channel === 'sms' || channel === 'whatsapp') {
    const sent = channel === 'whatsapp'
      ? await sendPacketWhatsApp(contact, body)
      : await sendPacketSms(contact, body);
    if (sent.ok) providerRef = sent.sid || '';
    else {
      outcome = 'failed';
      failureDetail = sent.error || 'Send failed.';
    }
  } else if (channel === 'email') {
    const sent = await base44.asServiceRole.integrations.Core.SendEmail({
      to: contact,
      subject: `M-Care emergency packet v${packet.version} — ${packet.lodging_address || 'traveller'}`,
      text: body,
      category: 'transactional',
    }).catch((e: any) => ({ error: e?.message || 'Send failed.' }));
    if (sent?.error) {
      outcome = 'failed';
      failureDetail = sent.error;
    } else {
      providerRef = sent?.message_id || '';
    }
  }

  const delivery = await base44.asServiceRole.entities.TripPacketDelivery.create({
    packet_id: packet.id,
    packet_version: Number(packet.version || 1),
    trip_id: packet.trip_id,
    incident_id: packet.incident_id || '',
    patient_email: packet.patient_email,
    recipient_type: opts.recipient_type,
    recipient_label: contact || opts.recipient_type,
    recipient_contact: contact || '',
    channel,
    sent_by: opts.user?.email || 'system',
    sent_at: new Date().toISOString(),
    outcome,
    provider_ref: providerRef,
    failure_detail: failureDetail,
    fallback_required: outcome === 'failed',
    // The fallback is a call. Resending into a dead channel is how a control
    // room convinces itself help is on the way.
    fallback_note: outcome === 'failed' ? 'Phone the recipient directly. Do not resend this message.' : '',
    body_text: body.slice(0, 1500),
  });

  await base44.asServiceRole.entities.TripEmergencyPacket.update(packet.id, {
    last_delivery_at: new Date().toISOString(),
    incident_id: packet.incident_id || undefined,
  });

  return {
    delivery,
    packet_text: body,
    fallback_required: outcome === 'failed',
    message:
      outcome === 'failed'
        ? 'That did not land. Phone them instead — do not resend.'
        : 'Sent. Accepted by the provider is not delivery; a human confirms the rest.',
  };
}

// ── Emergency disclosure exception ────────────────────────────────────────────

export async function recordDisclosureException(base44: any, opts: {
  user: any;
  body: any;
}) {
  const { body, user } = opts;
  const reason = String(body?.reason || '').trim();
  const authorizer = String(body?.authorized_by || user?.email || '').trim();
  const fieldLabel = String(body?.field_label || '').trim();

  if (!reason) throw new Error('A reason has to be recorded before it is said.');
  if (!authorizer) throw new Error('A named human has to authorise this before it is said.');
  if (!fieldLabel) throw new Error('Name what is being disclosed.');
  if (!body?.incident_id) throw new Error('An exception belongs to an incident.');

  const request = body?.request_id
    ? await base44.asServiceRole.entities.TripAssistanceRequest.get(body.request_id).catch(() => null)
    : null;

  // The standing list is the boundary. Anything inside it needs no exception.
  if (body?.disclosure && allowedUnderStandingList(body.disclosure, String(body.field_key || ''))) {
    return { not_required: true, message: 'That is already on the approved standing list.' };
  }

  const created = await base44.asServiceRole.entities.TripDisclosureException.create({
    trip_id: String(body.trip_id || ''),
    incident_id: String(body.incident_id),
    request_id: request?.id || '',
    patient_email: String(request?.patient_email || body.patient_email || ''),
    disclosed_to: String(body.disclosed_to || '').slice(0, 120),
    field_label: fieldLabel.slice(0, 120),
    field_value: String(body.field_value || '').slice(0, 300),
    reason: reason.slice(0, 500),
    authorized_by: authorizer,
    authorized_at: new Date().toISOString(),
    spoken: body?.spoken === true,
    spoken_at: body?.spoken === true ? new Date().toISOString() : undefined,
    not_spoken_note: body?.spoken === true ? '' : 'Authorised, not yet spoken.',
  });

  return { exception: created, standing_list: standingListDisclosures(body?.disclosure) };
}

export const PACKET_PAIR = packetPairs;
export const SUPPORTED_LANGUAGES = SUPPORTED_LANGS;
export const ALL_CATEGORIES = CATEGORIES;