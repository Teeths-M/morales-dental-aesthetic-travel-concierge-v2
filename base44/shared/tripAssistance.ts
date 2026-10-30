/**
 * tripAssistance — the server's rules for asking for help.
 *
 * Three things live here and nowhere else: the closed category list, the way a
 * script is composed, and the limits (quiet hours, allowance, retention). Every
 * one of them is enforced on the server because each is a promise made to a
 * traveller: that the sentence is the sentence, that nobody calls at 3am about a
 * pharmacy, and that the record does not outlive its retention.
 *
 * The category list is deliberately duplicated from the client. The client copy
 * decides what a screen may offer; this copy decides what may happen.
 */

import {
  CLOSING_QUESTION,
  EXPECTED_ANSWER,
  PROHIBITED_BY_TIER,
  TIER1_ASK,
  languageName,
  type TA_LANG,
} from './tripAssistanceCopy.ts';

export const TRIP_ASSISTANCE_FLAG = 'trip_assistance';

export type RequestMode = 'written' | 'human_call' | 'human_only';

export type FieldDef = {
  key: string;
  label: string;
  required: boolean;
  maxLength: number;
};

export type CategoryDef = {
  key: string;
  label: string;
  tier: 1 | 2 | 3;
  fields: FieldDef[];
  modes: RequestMode[];
};

export const CATEGORIES: Record<string, CategoryDef> = {
  front_desk_access: {
    key: 'front_desk_access',
    label: 'Front desk / room access',
    tier: 1,
    modes: ['written', 'human_call'],
    fields: [
      { key: 'room_number', label: 'Room number', required: true, maxLength: 12 },
      { key: 'detail', label: 'What is happening', required: true, maxLength: 160 },
    ],
  },
  pharmacy_availability: {
    key: 'pharmacy_availability',
    label: 'Pharmacy availability',
    tier: 1,
    modes: ['written', 'human_call'],
    fields: [
      { key: 'place_name', label: 'Area or landmark', required: true, maxLength: 80 },
      { key: 'detail', label: 'Anything else', required: false, maxLength: 160 },
    ],
  },
  opening_hours: {
    key: 'opening_hours',
    label: 'Opening hours',
    tier: 1,
    modes: ['written', 'human_call'],
    fields: [
      { key: 'place_name', label: 'Place', required: true, maxLength: 80 },
      { key: 'detail', label: 'Anything else', required: false, maxLength: 160 },
    ],
  },
  appointment_confirm: {
    key: 'appointment_confirm',
    label: 'Confirm an appointment',
    tier: 1,
    modes: ['written', 'human_call'],
    fields: [{ key: 'detail', label: 'Which appointment', required: true, maxLength: 160 }],
  },
  appointment_change: {
    key: 'appointment_change',
    label: 'Change an appointment',
    tier: 1,
    modes: ['written', 'human_call'],
    fields: [{ key: 'detail', label: 'Which appointment and the change', required: true, maxLength: 160 }],
  },
  callback_request: {
    key: 'callback_request',
    label: 'Ask for a callback',
    tier: 1,
    modes: ['written', 'human_call'],
    fields: [{ key: 'detail', label: 'What it is about', required: true, maxLength: 160 }],
  },
  medication_question: {
    key: 'medication_question',
    label: 'A medicine question',
    tier: 2,
    modes: ['written'],
    fields: [{ key: 'detail', label: 'What you need to know', required: true, maxLength: 300 }],
  },
  symptom_report: {
    key: 'symptom_report',
    label: 'Report a symptom',
    tier: 2,
    modes: ['written'],
    fields: [{ key: 'detail', label: 'What you are feeling', required: true, maxLength: 300 }],
  },
  wound_question: {
    key: 'wound_question',
    label: 'A wound question',
    tier: 2,
    modes: ['written'],
    fields: [{ key: 'detail', label: 'What you are seeing', required: true, maxLength: 300 }],
  },
  doctor_instruction: {
    key: 'doctor_instruction',
    label: "Don't understand my doctor's instruction",
    tier: 2,
    modes: ['written'],
    fields: [{ key: 'detail', label: 'Which instruction', required: true, maxLength: 300 }],
  },
  police: {
    key: 'police',
    label: 'Police needed',
    tier: 3,
    modes: ['human_only'],
    fields: [{ key: 'detail', label: 'What is happening', required: true, maxLength: 300 }],
  },
  threat: {
    key: 'threat',
    label: 'I am being threatened',
    tier: 3,
    modes: ['human_only'],
    fields: [{ key: 'detail', label: 'What is happening', required: true, maxLength: 300 }],
  },
  being_followed: {
    key: 'being_followed',
    label: 'I am being followed',
    tier: 3,
    modes: ['human_only'],
    fields: [{ key: 'detail', label: 'What is happening', required: true, maxLength: 300 }],
  },
  medical_emergency: {
    key: 'medical_emergency',
    label: 'Medical emergency',
    tier: 3,
    modes: ['human_only'],
    fields: [{ key: 'detail', label: 'What is happening', required: true, maxLength: 300 }],
  },
};

export function categoryOf(key: string): CategoryDef | null {
  return CATEGORIES[key] || null;
}

/** Keep only the keys the category declares, bounded and trimmed. */
export function sanitizeValues(category: CategoryDef, raw: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of category.fields) {
    const value = raw?.[field.key];
    if (typeof value === 'string' && value.trim()) {
      out[field.key] = value.trim().slice(0, field.maxLength);
    }
  }
  return out;
}

export function missingRequired(category: CategoryDef, values: Record<string, string>): string[] {
  return category.fields
    .filter((f) => f.required && !values[f.key])
    .map((f) => f.key);
}

/** A tier it does not allow is not a preference to be honoured. */
export function resolveMode(category: CategoryDef, requested: string): RequestMode {
  const wanted = String(requested || '').trim();
  if (category.modes.includes(wanted as RequestMode)) return wanted as RequestMode;
  return category.modes[0];
}

// ── Quiet hours ───────────────────────────────────────────────────────────────

function minutesOf(hhmm: string): number {
  const [h, m] = String(hhmm || '').split(':');
  const hours = Number.parseInt(h, 10);
  const mins = Number.parseInt(m, 10);
  if (Number.isNaN(hours)) return 0;
  return hours * 60 + (Number.isNaN(mins) ? 0 : mins);
}

export function localMinutes(timeZone: string, at = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(at);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0) % 24;
    const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);
    return hour * 60 + minute;
  } catch {
    return at.getUTCHours() * 60 + at.getUTCMinutes();
  }
}

export function isQuietNow(policy: any, at = new Date()): boolean {
  if (!policy || policy.quiet_hours_enabled === false) return false;
  const start = minutesOf(policy.quiet_hours_start || '22:00');
  const end = minutesOf(policy.quiet_hours_end || '07:00');
  if (start === end) return false;
  const now = localMinutes(policy.quiet_hours_timezone || 'UTC', at);
  return start < end ? now >= start && now < end : now >= start || now < end;
}

export function quietWindowLabel(policy: any): string {
  if (!policy || policy.quiet_hours_enabled === false) return 'None';
  return `${policy.quiet_hours_start || '22:00'}–${policy.quiet_hours_end || '07:00'}`;
}

// ── Retention ─────────────────────────────────────────────────────────────────

export function retentionUntil(tripEndsAt: string | undefined, days: number): string {
  const base = tripEndsAt ? new Date(tripEndsAt) : new Date();
  const ms = (Number.isNaN(base.getTime()) ? Date.now() : base.getTime()) + days * 86400000;
  return new Date(ms).toISOString();
}

// ── Script composition ────────────────────────────────────────────────────────

export type ComposedScript = {
  category_key: string;
  category_label: string;
  tier: number;
  mode: RequestMode;
  recipient_type: string;
  recipient_name: string;
  recipient_contact: string;
  channel: string;
  ask_text: string;
  ask_text_en: string;
  ask_language: string;
  translation_missing: boolean;
  closing_question: string;
  expected_answer: string;
  disclosures: { key: string; label: string; value: string }[];
  prohibited: string[];
  approved_script_text: string;
  script_fingerprint: string;
};

function fill(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_m, key) => tokens[key] ?? '');
}

function fingerprint(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

function disclosureValue(disclosure: any, key: string): string {
  const field = (disclosure?.fields || []).find((f: any) => f.key === key);
  return field?.include === false ? '' : String(field?.value || '');
}

export function composeScript(opts: {
  category: CategoryDef;
  mode: RequestMode;
  values: Record<string, string>;
  packet: any;
  disclosure: any;
  language: string;
}): ComposedScript {
  const { category, mode, values, packet, disclosure } = opts;
  const language = (opts.language || 'en') as TA_LANG;
  const lang = (['en', 'es', 'pt', 'fr', 'it', 'de'].includes(language) ? language : 'en') as TA_LANG;

  const firstName =
    disclosureValue(disclosure, 'first_name') || packet?.patient_first_name || 'the M-Care traveller';
  const procedureDate = packet?.procedure_date || 'the booked date';

  const tokens: Record<string, string> = {
    first_name: firstName,
    room_number: values.room_number || 'the room on file',
    place_name: values.place_name || 'the address on file',
    procedure_date: procedureDate,
  };

  const isTier1 = category.tier === 1;
  const template = isTier1 ? TIER1_ASK[category.key] : null;
  const translated = template ? template[lang] : null;
  const translationMissing = Boolean(template) && !translated;

  const askEn = template
    ? fill(template.en, tokens)
    : `${category.label} — a written request read by the M-Care care team.`;
  const askText = template ? fill(translated || template.en, tokens) : askEn;

  const disclosures: { key: string; label: string; value: string }[] = [];
  const push = (key: string, label: string, value: string) => {
    if (value) disclosures.push({ key, label, value });
  };

  if (isTier1) {
    push('first_name', 'First name', disclosureValue(disclosure, 'first_name') || '');
    push('traveller_status', 'That you are an M-Care traveller', 'Yes');
    if (values.room_number) push('room_number', 'Room number', values.room_number);
    if (values.place_name) push('place_name', 'Area named', values.place_name);
    if (/\{procedure_date\}/.test(template?.[lang] || template?.en || '')) {
      push('procedure_general', 'Procedure (general terms)', disclosureValue(disclosure, 'procedure_general'));
      push('doctor_or_clinic', 'Doctor or clinic', disclosureValue(disclosure, 'doctor_or_clinic'));
    }
  } else {
    push('first_name', 'First name', disclosureValue(disclosure, 'first_name') || '');
    push('traveller_status', 'That you are an M-Care traveller', 'Yes');
    push('location', 'Where you are staying', disclosureValue(disclosure, 'location'));
    push('emergency_contact', 'Emergency contact', disclosureValue(disclosure, 'emergency_contact'));
  }

  // Recipient: the place the ask is aimed at, described honestly. A contact we
  // do not hold is stated as one the care team confirms before dialling — not
  // rendered as a number that might be stale.
  let recipientType = 'care_team';
  let recipientName = 'M-Care care team';
  let recipientContact = 'the care team, internally';

  if (isTier1) {
    if (category.key === 'front_desk_access') {
      recipientType = 'front_desk';
      recipientName = `Hotel front desk${packet?.lodging_name ? ` — ${packet.lodging_name}` : ''}`;
      recipientContact = packet?.front_desk_number || 'number confirmed by the care team before dialling';
    } else if (category.key === 'appointment_confirm' || category.key === 'appointment_change') {
      recipientType = 'clinic';
      recipientName = packet?.clinic_name || packet?.doctor_name || 'Your clinic';
      recipientContact = 'clinic reception';
    } else if (values.place_name) {
      recipientType = 'named_place';
      recipientName = values.place_name;
      recipientContact = 'number confirmed by the care team before dialling';
    }
  } else if (category.tier === 3) {
    recipientType = 'care_team_on_call';
    recipientName = 'M-Care care team — on call';
  }

  const channel = mode === 'written' ? 'internal' : mode === 'human_call' ? 'phone' : 'internal';

  const approvedScriptText = isTier1
    ? [askText, CLOSING_QUESTION[lang] || CLOSING_QUESTION.en].join(' ')
    : askEn;

  return {
    category_key: category.key,
    category_label: category.label,
    tier: category.tier,
    mode,
    recipient_type: recipientType,
    recipient_name: recipientName,
    recipient_contact: recipientContact,
    channel,
    ask_text: askText,
    ask_text_en: askEn,
    ask_language: lang,
    translation_missing: translationMissing,
    closing_question: CLOSING_QUESTION[lang] || CLOSING_QUESTION.en,
    expected_answer: EXPECTED_ANSWER[category.key] || 'A clear yes or no.',
    disclosures,
    prohibited: PROHIBITED_BY_TIER[category.tier] || [],
    approved_script_text: approvedScriptText,
    script_fingerprint: fingerprint(`${approvedScriptText}|${mode}|${recipientName}`),
  };
}

/**
 * The emergency exception, made mechanical.
 *
 * When the traveller cannot answer, a human may say only what is on the
 * approved standing list. This returns the subset of a composed script that is
 * permissible under that list, so the caller never has to judge it at 3am.
 */
export function standingListDisclosures(disclosure: any): { key: string; label: string; value: string }[] {
  if (!disclosure || disclosure.approved !== true) return [];
  return (disclosure.fields || [])
    .filter((f: any) => f.include !== false && f.value)
    .map((f: any) => ({ key: f.key, label: f.label, value: f.value }));
}

export function allowedUnderStandingList(disclosure: any, key: string): boolean {
  if (!disclosure || disclosure.approved !== true) return false;
  return (disclosure.fields || []).some(
    (f: any) => f.key === key && f.include !== false && Boolean(f.value),
  );
}

export { languageName };