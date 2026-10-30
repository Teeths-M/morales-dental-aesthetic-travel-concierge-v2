/**
 * tripPacket — the object a responder actually receives.
 *
 * Distinct from the disclosure consent list on purpose: consent governs what may
 * be SAID, this is a document that was written while everyone was calm and is
 * sent in one action. It is assembled once, versioned on change, and never
 * composed during an emergency.
 *
 * The recipient decides the shape. A driver gets the body of a text message,
 * because a driver with someone on the floor is not opening a link. A clinic
 * gets the body of an email for the same reason. The care team already has an
 * internal view. Police are refused outright — the packet becomes what a
 * care-team human reads down the line, address first.
 */

export const PACKET_FIELDS: { key: string; label: string }[] = [
  { key: 'lodging_address', label: 'Lodging address' },
  { key: 'gate_code', label: 'Gate code' },
  { key: 'front_desk_number', label: 'Front desk' },
  { key: 'doctor_name', label: 'Doctor' },
  { key: 'clinic_name', label: 'Clinic' },
  { key: 'clinic_address', label: 'Clinic address' },
  { key: 'procedure_general', label: 'Procedure (general)' },
  { key: 'procedure_date', label: 'Procedure date' },
  { key: 'allergies', label: 'Allergies' },
  { key: 'current_medicines', label: 'Current medicines' },
  { key: 'language', label: 'Language' },
  { key: 'emergency_contact', label: 'Emergency contact' },
];

/** What a driver genuinely cannot do without. Everything else is a bonus. */
export const REQUIRED_PACKET_FIELDS = ['lodging_address', 'language', 'emergency_contact'];

export const POLICE_REFUSED = 'police';

const GENERAL_PROCEDURE_RULES: { match: RegExp; label: string }[] = [
  { match: /dent|tooth|teeth|implant|veneer|orthodont/i, label: 'dental procedure' },
  { match: /nose|rhino|face|facelift|eyelid|blepharo|liposuction|lipo|breast|abdominoplast|bbl/i, label: 'cosmetic procedure' },
  { match: /knee|hip|spine|spinal|shoulder|orthop|fracture/i, label: 'orthopaedic procedure' },
  { match: /bariatric|gastric|sleeve|bypass/i, label: 'bariatric procedure' },
  { match: /eye|lasik|cataract|retina/i, label: 'eye procedure' },
  { match: /hair|graft/i, label: 'hair restoration procedure' },
];

/**
 * Deliberately coarse. A packet that carried the operative note would be a
 * clinical record travelling in a text message; "dental procedure" is what a
 * driver or a clerk needs and all they should get.
 */
export function generalProcedure(procedures: string[] | undefined): string {
  const joined = (procedures || []).join(' ');
  if (!joined) return '';
  const rule = GENERAL_PROCEDURE_RULES.find((r) => r.match.test(joined));
  return rule ? rule.label : 'medical procedure';
}

export function formatPacketDate(value: string | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

/**
 * Derive version-1 values from the trip record. Anything absent is left empty
 * and named in missing_fields rather than guessed: a stale address presented as
 * confirmed is worse than a visible gap.
 */
export function buildPacketValues(opts: {
  caseRec: any;
  languageName: string;
  patientFirstName: string;
}): Record<string, string> {
  const { caseRec, languageName, patientFirstName } = opts;
  const contactParts = [
    caseRec?.emergency_contact,
    caseRec?.emergency_contact_number,
  ].filter(Boolean);

  return {
    lodging_address: [caseRec?.hotel_name, caseRec?.hotel_address].filter(Boolean).join(', '),
    gate_code: '',
    front_desk_number: '',
    doctor_name: caseRec?.doctor_selected || caseRec?.external_doctor_name || '',
    clinic_name: caseRec?.clinic_selected || caseRec?.external_clinic_name || '',
    clinic_address: caseRec?.clinic_address || '',
    procedure_general: generalProcedure(caseRec?.procedures),
    procedure_date: formatPacketDate(caseRec?.procedure_date || caseRec?.departure_date),
    allergies: caseRec?.allergies || '',
    current_medicines: caseRec?.medications || '',
    language: languageName,
    emergency_contact: contactParts.join(' · '),
    _patient_first_name: patientFirstName || '',
  };
}

export function missingPacketFields(values: Record<string, string>): string[] {
  return REQUIRED_PACKET_FIELDS.filter((key) => !String(values?.[key] || '').trim());
}

export function packetStatusFor(values: Record<string, string>): 'draft' | 'ready' {
  return missingPacketFields(values).length === 0 ? 'ready' : 'draft';
}

/** Only ever the fields a responder is meant to see, in a fixed order. */
export function packetPairs(packet: any): { key: string; label: string; value: string; missing: boolean }[] {
  return PACKET_FIELDS.map((f) => {
    const value = String(packet?.[f.key] || '').trim();
    return {
      key: f.key,
      label: f.label,
      value,
      missing: REQUIRED_PACKET_FIELDS.includes(f.key) && !value,
    };
  });
}

/**
 * The message body. Address FIRST — someone reading a phone at a doorway reads
 * the first line and stops, so the first line is where to go.
 */
export function renderPacketMessage(packet: any, recipientType: string): string {
  if (recipientType === POLICE_REFUSED) {
    throw new Error('The packet is never sent to police. Read the address down the line.');
  }

  const lines: string[] = [];
  lines.push(`M-CARE EMERGENCY PACKET v${packet?.version || 1}`);
  lines.push(`GO TO: ${packet?.lodging_address || 'address not on file'}`);
  if (packet?.gate_code) lines.push(`Gate: ${packet.gate_code}`);
  if (packet?.front_desk_number) lines.push(`Front desk: ${packet.front_desk_number}`);
  lines.push('');
  if (packet?.doctor_name) lines.push(`Doctor: ${packet.doctor_name}`);
  if (packet?.clinic_name) lines.push(`Clinic: ${packet.clinic_name}${packet?.clinic_address ? ` — ${packet.clinic_address}` : ''}`);
  if (packet?.procedure_general) {
    lines.push(
      `Procedure: ${packet.procedure_general}${packet?.procedure_date ? ` on ${packet.procedure_date}` : ''}`,
    );
  }
  if (packet?.allergies) lines.push(`Allergies: ${packet.allergies}`);
  if (packet?.current_medicines) lines.push(`Medicines: ${packet.current_medicines}`);
  if (packet?.language) lines.push(`Language: ${packet.language}`);
  if (packet?.emergency_contact) lines.push(`Emergency contact: ${packet.emergency_contact}`);
  lines.push('');
  lines.push('M-Care is on this case. Reply to this message if you cannot reach the address.');

  const text = lines.join('\n');
  // SMS is the tightest channel; trim rather than let a provider truncate mid-address.
  return recipientType === 'driver' || recipientType === 'clinic' ? text.slice(0, 1200) : text;
}

export const CHANNEL_FOR_RECIPIENT: Record<string, string> = {
  driver: 'sms',
  clinic: 'email',
  care_team: 'internal',
  hospital_handover: 'pdf',
};

export function contactForRecipient(packet: any, caseRec: any, recipientType: string): string {
  if (recipientType === 'driver') {
    return caseRec?.driver_phone || caseRec?.chauffeur_phone || '';
  }
  if (recipientType === 'clinic') {
    return caseRec?.doctor_email || caseRec?.clinic_email || '';
  }
  if (recipientType === 'care_team') {
    return String(Deno.env.get('ADMIN_EMAIL') || '');
  }
  return '';
}

/** Twilio SMS. A failure here is a phone call to make, never a resend. */
export async function sendPacketSms(
  to: string,
  body: string,
): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: 'Twilio credentials not configured' };
  }
  const form = new URLSearchParams();
  form.append('To', to);
  form.append('From', fromNumber);
  form.append('Body', body);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, error: `Twilio ${res.status}: ${errText.slice(0, 200)}` };
    }
    const json = await res.json();
    return { ok: true, sid: json.sid };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Twilio request failed' };
  }
}

export async function sendPacketWhatsApp(
  to: string,
  body: string,
): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: 'Twilio credentials not configured' };
  }
  const form = new URLSearchParams();
  form.append('To', `whatsapp:${to}`);
  form.append('From', `whatsapp:${fromNumber}`);
  form.append('Body', body);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, error: `Twilio ${res.status}: ${errText.slice(0, 200)}` };
    }
    const json = await res.json();
    return { ok: true, sid: json.sid };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Twilio request failed' };
  }
}