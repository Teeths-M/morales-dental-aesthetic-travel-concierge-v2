/**
 * emergencyIncidentNotify — who is told, in what words, and what is recorded.
 *
 * Three rules govern everything here:
 *
 *   1. Approved, versioned copy only. No emergency message is composed by a
 *      model at send time; each template key and version is stored on the row so
 *      a later edit cannot rewrite what someone was actually told.
 *   2. Minimum necessary data per recipient. The care team and an authorised
 *      guardian may receive a position; a responder receives the area and the
 *      destination, never a precise coordinate stream, because a driver does not
 *      need the traveller's path to reach the door.
 *   3. A send result is recorded as what it is. An accepted message is SENT and
 *      nothing more; a failure is FAILED with the reason, never a silent drop.
 */

export const TEMPLATE_CARE_TEAM = { key: 'incident_care_team_alert', version: 1 };
export const TEMPLATE_GUARDIAN = { key: 'incident_guardian_alert', version: 1 };
export const TEMPLATE_RESPONDER = { key: 'incident_responder_alert', version: 1 };
export const TEMPLATE_STAND_DOWN = { key: 'incident_stand_down', version: 1 };

const TYPE_WORDS: Record<string, string> = {
  security: 'personal safety',
  medical: 'medical',
  transport: 'transport',
  natural_disaster: 'natural disaster',
  lost: 'missing person',
  other: 'unspecified',
};

function typeWords(type: string): string {
  return TYPE_WORDS[type] || 'unspecified';
}

function coords(incident: any): string {
  if (typeof incident?.latitude !== 'number' || typeof incident?.longitude !== 'number') {
    return 'No position was captured.';
  }
  return `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}`;
}

export function careTeamMessage(incident: any, locationLabel: string): string {
  return [
    `CONFIRMED EMERGENCY ALERT — ${incident.incident_ref}`,
    `Traveller: ${incident.patient_name || incident.patient_email}`,
    `Type: ${typeWords(incident.type)}`,
    `Location: ${locationLabel}`,
    `Position: ${coords(incident)}`,
    incident.response_capability === 'confirmed'
      ? `Security: team acknowledged (${incident.response_blocker_summary || 'confirmed'}).`
      : `Security: NOT confirmed. ${(incident.response_blockers || []).join(' ')}`.trim(),
    'Acknowledge this alert in the care team console so the traveller is told someone has it.',
  ].join('\n');
}

export function guardianMessage(incident: any, locationLabel: string): string {
  return [
    `${incident.patient_name || 'Your contact'} has raised an emergency alert with M-Care (${incident.incident_ref}).`,
    `Reason given: ${typeWords(incident.type)}.`,
    `Last known location: ${locationLabel}.`,
    'M-Care is contacting them now. Please try to reach them as well.',
  ].join('\n');
}

export function responderMessage(incident: any, profile: any, locationLabel: string): string {
  return [
    `M-CARE EMERGENCY ASSIGNMENT — ${incident.incident_ref}`,
    `Area: ${locationLabel}`,
    `Traveller first name: ${(incident.patient_name || 'Traveller').split(' ')[0]}`,
    `Requirement: ${typeWords(incident.type)} support.`,
    profile?.team_label ? `Assigned team: ${profile.team_label}.` : '',
    'Reply to acknowledge. This alert is unconfirmed until you do.',
  ].filter(Boolean).join('\n');
}

export function standDownMessage(incident: any, reason: string): string {
  return [
    `STAND DOWN — ${incident.incident_ref}`,
    `The traveller has closed this alert as: ${String(reason).replace(/_/g, ' ')}.`,
    'No further response is required. If you are already with the traveller, confirm their safety directly.',
  ].join('\n');
}

// ── Senders ──────────────────────────────────────────────────────────────────

/** Twilio SMS, only when the account is actually configured. */
export async function sendSms(to: string, message: string): Promise<{ ok: boolean; provider_ref?: string; error?: string }> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from) return { ok: false, error: 'SMS provider is not configured.' };
  if (!to) return { ok: false, error: 'No phone number on file.' };
  try {
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: message }).toString(),
    });
    if (!resp.ok) return { ok: false, error: `SMS provider refused the message (${resp.status}).` };
    const data = await resp.json().catch(() => ({}));
    return { ok: true, provider_ref: data?.sid };
  } catch (e) {
    return { ok: false, error: 'SMS send failed.' };
  }
}

export async function sendEmail(
  base44: any,
  to: string,
  subject: string,
  body: string,
): Promise<{ ok: boolean; provider_ref?: string; error?: string }> {
  if (!to) return { ok: false, error: 'No email address on file.' };
  try {
    const res = await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject,
      body: `<pre style="font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap">${body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')}</pre>`,
    });
    if (res?.success === false) {
      return { ok: false, error: res?.message || res?.reason || 'Email provider did not accept the message.' };
    }
    return { ok: true, provider_ref: res?.id || res?.message_id };
  } catch (e) {
    return { ok: false, error: 'Email send failed.' };
  }
}

/**
 * Stands a row down on the channel that originally reached it. Reusing the same
 * channel matters: a driver reached by SMS will not read an email, and telling
 * nobody is how a pool learns that a 3am yes goes unanswered.
 */
export async function sendRowStandDown(
  base44: any,
  row: any,
  message: string,
): Promise<{ ok: boolean; error?: string; provider_ref?: string }> {
  const to = row?.recipient_ref;
  if (!to) return { ok: false, error: 'No contact address on the original alert.' };
  if (row.channel === 'sms') return sendSms(String(to), message);
  if (row.channel === 'email') {
    return sendEmail(base44, String(to), 'M-Care — stand down', message);
  }
  return { ok: false, error: `No stand-down channel for ${row.channel}.` };
}

// ── Row drafts ───────────────────────────────────────────────────────────────

export interface RecipientDraft {
  recipient_role: string;
  recipient_name: string;
  channel: string;
  recipient_ref: string | null;
  authorization: string;
  template_key: string;
  template_version: number;
  message_original: string;
  message_language: string;
  translation_state: string;
  acknowledgement_state: string;
  /** Send plan: what to actually attempt, or why nothing is attempted. */
  send: { kind: 'email' | 'sms' | 'none'; to?: string | null; subject?: string };
  pre_failed_reason?: string;
  recipient_id?: string | null;
}

function randomToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Builds the t=0 rows. A party that cannot be reached still gets a row: an
 * unreachable guardian must be a visible gap on the screen, not an absence the
 * traveller cannot see.
 */
export function buildRecipientDrafts(params: {
  incident: any;
  profile: any;
  careTeamEmail: string | null;
  guardianEmail: string | null;
  guardianName: string | null;
  structuralConfirmed: boolean;
  firstBlocker: string | null;
  locationLabel: string;
  blockedReason?: string | null;
  /** Emergency language templates are only used where one is approved. */
  tripLanguage?: string | null;
}): RecipientDraft[] {
  const { incident, profile, locationLabel } = params;
  const drafts: RecipientDraft[] = [];

  // Care team — always. This is the human escalation, independent of whether any
  // external team exists.
  drafts.push({
    recipient_role: 'care_team',
    recipient_name: 'M-Care duty coordinator',
    channel: 'email',
    recipient_ref: params.careTeamEmail,
    authorization: 'care_team',
    template_key: TEMPLATE_CARE_TEAM.key,
    template_version: TEMPLATE_CARE_TEAM.version,
    message_original: careTeamMessage(incident, locationLabel),
    message_language: 'en',
    translation_state: 'approved_template',
    acknowledgement_state: 'pending',
    send: { kind: 'email', to: params.careTeamEmail, subject: `CONFIRMED EMERGENCY — ${incident.incident_ref}` },
    pre_failed_reason: params.careTeamEmail ? undefined : 'No care-team address is configured (ADMIN_EMAIL).',
  });

  // Guardian — only when the traveller supplied a contact on their case.
  if (params.guardianEmail) {
    drafts.push({
      recipient_role: 'guardian',
      recipient_name: params.guardianName || 'Emergency contact',
      channel: 'email',
      recipient_ref: params.guardianEmail,
      authorization: 'guardian_consent',
      template_key: TEMPLATE_GUARDIAN.key,
      template_version: TEMPLATE_GUARDIAN.version,
      message_original: guardianMessage(incident, locationLabel),
      message_language: 'en',
      translation_state: 'approved_template',
      acknowledgement_state: 'not_required',
      send: { kind: 'email', to: params.guardianEmail, subject: `Emergency alert from ${incident.patient_name || 'your contact'}` },
    });
  }

  // Responder — only when a real, identified team exists. When the structural
  // checks fail, we record an escalated row naming the reason instead of
  // messaging an unvetted number and calling it a dispatch.
  if (params.structuralConfirmed && profile) {
    const channels = Array.isArray(profile.communication_channels) ? profile.communication_channels : [];
    const channel = channels.includes('sms') ? 'sms' : channels.includes('email') ? 'email' : channels[0] || 'app';
    const to = channel === 'sms' ? profile.authorized_contact_phone : profile.authorized_contact_email;
    drafts.push({
      recipient_role: 'responder',
      recipient_name: profile.team_label || profile.authorized_contact_name || 'Security team',
      channel,
      recipient_ref: to || null,
      recipient_id: profile.agency_id || profile.id || null,
      authorization: 'assigned_responder',
      template_key: TEMPLATE_RESPONDER.key,
      template_version: TEMPLATE_RESPONDER.version,
      message_original: responderMessage(incident, profile, locationLabel),
      message_language: 'en',
      translation_state: 'approved_template',
      acknowledgement_state: 'pending',
      send: {
        kind: channel === 'sms' ? 'sms' : channel === 'email' ? 'email' : 'none',
        to,
        subject: `M-Care emergency assignment — ${incident.incident_ref}`,
      },
      pre_failed_reason: to ? undefined : 'The authorised contact has no usable channel address.',
    });
  } else {
    drafts.push({
      recipient_role: 'responder',
      recipient_name: profile?.team_label || 'No operational security team',
      channel: 'app',
      recipient_ref: null,
      recipient_id: profile?.id || null,
      authorization: 'assigned_responder',
      template_key: TEMPLATE_RESPONDER.key,
      template_version: TEMPLATE_RESPONDER.version,
      message_original: responderMessage(incident, profile, locationLabel),
      message_language: 'en',
      translation_state: 'human_required',
      acknowledgement_state: 'escalated',
      send: { kind: 'none' },
      pre_failed_reason: params.firstBlocker || 'No operational security team covers this destination.',
    });
  }

  return drafts;
}

/**
 * Creates each row, attempts exactly one send, then records the real outcome.
 * Nothing here can throw past the caller: a failed send must degrade into a
 * FAILED row, not a lost incident.
 */
export async function createAndSendRows(
  base44: any,
  incident: any,
  drafts: RecipientDraft[],
  now: string,
  ackDeadlineAt: string,
): Promise<any[]> {
  const created: any[] = [];

  for (const d of drafts) {
    const isResponderPending = d.recipient_role === 'responder' && !d.pre_failed_reason && d.send.kind !== 'none';
    let row: any = null;

    try {
      row = await base44.asServiceRole.entities.IncidentNotification.create({
        incident_id: incident.id,
        patient_email: incident.patient_email,
        channel: d.channel,
        recipient_role: d.recipient_role,
        recipient_name: d.recipient_name,
        recipient_ref: d.recipient_ref,
        recipient_id: d.recipient_id || null,
        authorization: d.authorization,
        status: 'QUEUED',
        queued_at: now,
        is_live_fanout: true,
        ack_token: d.acknowledgement_state === 'pending' ? randomToken() : null,
        acknowledgement_deadline_at: d.acknowledgement_state === 'pending' ? ackDeadlineAt : null,
        acknowledgement_state: d.acknowledgement_state,
        template_key: d.template_key,
        template_version: d.template_version,
        message_original: d.message_original,
        message_language: d.message_language,
        translation_state: d.translation_state,
        status_source: 'server',
        attempt_count: 0,
      });
    } catch (_) {
      // A row that cannot be written is a real gap — surface it in the response
      // rather than pretending the party was told.
      created.push({
        id: null,
        recipient_role: d.recipient_role,
        channel: d.channel,
        status: 'FAILED',
        failure_reason: 'The notification record could not be written.',
      });
      continue;
    }

    if (d.pre_failed_reason) {
      const escalated = d.acknowledgement_state === 'escalated';
      await base44.asServiceRole.entities.IncidentNotification.update(row.id, {
        status: escalated ? 'ESCALATED' : 'FAILED',
        failed_at: escalated ? null : now,
        escalated_at: escalated ? now : null,
        escalated_to: escalated ? Deno.env.get('ADMIN_EMAIL') || null : null,
        failure_reason: d.pre_failed_reason,
        status_source: 'server',
      }).catch(() => {});
      created.push({ ...row, status: escalated ? 'ESCALATED' : 'FAILED', failure_reason: d.pre_failed_reason });
      continue;
    }

    if (d.send.kind === 'none' || !d.send.to) {
      await base44.asServiceRole.entities.IncidentNotification.update(row.id, {
        status: 'FAILED',
        failed_at: now,
        failure_reason: 'No configured channel reached this recipient.',
        status_source: 'server',
      }).catch(() => {});
      created.push({ ...row, status: 'FAILED' });
      continue;
    }

    const result = d.send.kind === 'sms'
      ? await sendSms(String(d.send.to), d.message_original)
      : await sendEmail(base44, String(d.send.to), d.send.subject || 'M-Care emergency', d.message_original);

    if (result.ok) {
      // SENT, explicitly not DELIVERED. Only a provider delivery receipt or a
      // human acknowledgement may move it further.
      await base44.asServiceRole.entities.IncidentNotification.update(row.id, {
        status: 'SENT',
        sent_at: now,
        provider_ref: result.provider_ref || null,
        attempt_count: 1,
        last_attempt_at: now,
        status_source: 'server',
      }).catch(() => {});
      created.push({ ...row, status: 'SENT' });
    } else {
      await base44.asServiceRole.entities.IncidentNotification.update(row.id, {
        status: 'FAILED',
        failed_at: now,
        failure_reason: result.error || 'Send failed.',
        attempt_count: 1,
        last_attempt_at: now,
        status_source: 'server',
      }).catch(() => {});
      created.push({ ...row, status: 'FAILED', failure_reason: result.error });
    }

    void isResponderPending;
  }

  return created;
}