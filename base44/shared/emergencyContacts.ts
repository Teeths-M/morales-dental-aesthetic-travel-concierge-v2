/**
 * emergencyContacts — pure data-shaping for the Companion Network Alerts
 * cascade. No Twilio/email calls live here on purpose: escalateSoloCheckIn's
 * own sendSms/sendWhatsApp primitives are deliberately kept inline in that
 * file (its own header comment states this is the established convention),
 * so notification logic isn't split across a third module.
 */

export interface RankedContact {
  /** 1 = the CaseRecord primary, 2+ = an EmergencyContact row, ascending, gap-free. */
  priority: number;
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  source: 'case_primary' | 'ranked_contact';
  /** EmergencyContact row id — absent for the primary, which isn't a row here. */
  id?: string;
}

/**
 * CaseRecord.emergency_contact is a display label like "Jane Doe (Spouse)",
 * not a name field on its own — this is the one parse used everywhere that
 * label needs splitting into a name/relationship pair.
 */
export function parsePrimaryContactLabel(label?: string | null): { name: string; relationship?: string } {
  const raw = (label || '').trim();
  if (!raw) return { name: '' };
  const match = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) return { name: match[1].trim(), relationship: match[2].trim() };
  return { name: raw };
}

/**
 * getOrderedCaseContacts — the one unified, ordered contact list for a case's
 * safety-alert cascade. Priority 1 is the primary (built from CaseRecord's
 * three existing scalar fields, included only if a phone or email is present
 * — the same gate escalateSoloCheckIn's 2h tier already applies today).
 * Priority 2+ are EmergencyContact rows, sorted by their own priority field
 * and re-numbered contiguously so a deleted middle contact never leaves a
 * caller trusting a non-contiguous sequence.
 *
 * Fails OPEN: any lookup failure (bad connectivity, RLS hiccup) is caught and
 * swallowed — returns whatever was already resolved (the primary alone, or
 * an empty array), never throws. A contact-list read must never be able to
 * block the 2h/3h escalation tiers that call it.
 */
export async function getOrderedCaseContacts(
  base44: any,
  caseRecord: {
    id: string;
    emergency_contact?: string | null;
    emergency_contact_number?: string | null;
    emergency_contact_email?: string | null;
  },
): Promise<RankedContact[]> {
  const contacts: RankedContact[] = [];

  const primaryPhone = caseRecord.emergency_contact_number || '';
  const primaryEmail = caseRecord.emergency_contact_email || '';
  if (primaryPhone || primaryEmail) {
    const { name, relationship } = parsePrimaryContactLabel(caseRecord.emergency_contact);
    contacts.push({
      priority: 1,
      name: name || 'Emergency Contact',
      relationship,
      phone: primaryPhone || undefined,
      email: primaryEmail || undefined,
      source: 'case_primary',
    });
  }

  try {
    const ranked = await base44.asServiceRole.entities.EmergencyContact.filter(
      { case_id: caseRecord.id }, 'priority', 20,
    );
    const sorted = [...(ranked || [])].sort((a: any, b: any) => (a.priority ?? 999) - (b.priority ?? 999));
    let nextPriority = 2;
    for (const row of sorted) {
      if (!row.phone && !row.email) continue;
      contacts.push({
        priority: nextPriority++,
        name: row.name || 'Emergency Contact',
        relationship: row.relationship || undefined,
        phone: row.phone || undefined,
        email: row.email || undefined,
        source: 'ranked_contact',
        id: row.id,
      });
    }
  } catch (_) {
    // Non-blocking — the escalation ladder still gets the primary above.
  }

  return contacts;
}
