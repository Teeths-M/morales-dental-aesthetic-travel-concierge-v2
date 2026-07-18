/**
 * comms-audit — classify every outbound sender against the link-only policy.
 *
 * Email/SMS/WhatsApp may notify and link. They may not carry PHI, identity,
 * procedure detail, or money. This finds the bodies that do.
 */
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'base44/functions';

// Fields whose value becomes an outbound body.
const BODY_FIELD = /\b(body|html|message|text|body_html|sms_body|content|template)\s*:/;

// Interpolations that carry protected content out of the platform.
const LEAKS = [
  [/\$\{[^}]*\b(procedure|surgery|treatment)\w*\}/gi,          'procedure detail'],
  [/\$\{[^}]*\b(diagnos|condition|allerg|medication|medical|symptom|blood_type|dob|date_of_birth)\w*\}/gi, 'medical info'],
  [/\$\{[^}]*\b(patient_name|client_name|patient_email|client_email|full_name|first_name|last_name|patientName|clientName)\w*\}/gi, 'patient identity'],
  [/\$\{[^}]*\b(amount|price|total|cost|balance|fee|deposit|payout|usd|invoice)\w*\}/gi, 'financial detail'],
  [/\$\{[^}]*\b(passport|document_number|id_number|national_id)\w*\}/gi, 'identity document'],
  [/\$\{[^}]*\b(address|hotel|clinic_address|street)\w*\}/gi,   'location detail'],
];

// Asking for a reply makes the channel a conversation, not a notification.
const REPLY = [
  [/\breply\s+(yes|no|y\b|n\b|stop|confirm|with)/gi, 'asks for a reply'],
  [/\brespond\s+to\s+this\s+(email|message|sms)/gi,  'asks for a reply'],
  [/\bjust\s+reply\b/gi,                              'asks for a reply'],
];

const rows = [];
for (const name of readdirSync(DIR)) {
  if (name.startsWith('_')) continue;
  const p = join(DIR, name, 'entry.ts');
  if (!existsSync(p)) continue;
  const src = readFileSync(p, 'utf8');
  if (!/SendEmail|sendEmail|sendSmsNotification|twilio|whatsapp/i.test(src)) continue;

  // Strip comments so documentation about leaks is not counted as a leak.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const hits = new Map();
  // Only look inside template literals that plausibly form a body.
  const templates = code.match(/`[^`]*`/g) || [];
  const bodyish = BODY_FIELD.test(code);
  for (const t of templates) {
    if (t.length < 40) continue;
    for (const [re, label] of LEAKS) {
      const m = t.match(re);
      if (m) hits.set(label, (hits.get(label) || 0) + m.length);
    }
  }
  for (const [re, label] of REPLY) {
    const m = code.match(re);
    if (m) hits.set(label, (hits.get(label) || 0) + m.length);
  }
  if (hits.size) rows.push({ name, bodyish, hits: [...hits.entries()] });
}

rows.sort((a, b) => b.hits.reduce((s, h) => s + h[1], 0) - a.hits.reduce((s, h) => s + h[1], 0));
console.log(`SENDERS WITH SUSPECTED POLICY VIOLATIONS: ${rows.length}\n`);
for (const r of rows) {
  console.log(`${r.name}`);
  for (const [label, n] of r.hits) console.log(`    ${label} x${n}`);
}
