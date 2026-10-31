/**
 * updateMyCaseRecord — the only way a patient's own browser changes their case.
 *
 * CaseRecord's access rule used to let a signed-in patient write ANY field on
 * their own case straight from the browser. Base44 rules can't limit a write
 * to certain fields, so that included the package price, the payment status,
 * the booking status and the safety result. The rule is now admin-only, and the
 * five places the patient app wrote to its own case call this function instead.
 *
 * Every action:
 *   - checks the case (or consultation) belongs to the signed-in caller,
 *     answering "not found" for both missing and someone else's,
 *   - writes only its own short, fixed list of fields,
 *   - never touches money, partner, or safety-result fields.
 *
 * The high-risk hold is the one action that changes the booking status, and
 * only ever to the Admin-Review safety hold. It re-runs the deterministic safety
 * engine from the stored Consultation rather than trusting the browser's result,
 * places the hold through the booking state guard, and alerts a human.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { z, strictObject } from '../../shared/validate.ts';
import { getViolations } from '../../shared/procedureCompatibility.ts';
import { toSafetyEngineName } from '../../shared/procedureSafetyNameMap.ts';
import { guardedStatusUpdate, BOOKING } from '../../shared/bookingState.ts';

const text = (max: number) => z.string().trim().max(max);
const id = () => z.string().trim().min(1, 'Required').max(100);

// The medical-profile fields the patient's own Medical Profile screen edits.
// Same list MedicalProfileModule.jsx always wrote, nothing more.
const ProfileSchema = strictObject({
  client_name: text(200).optional(),
  date_of_birth: text(40).optional(),
  client_country: text(100).optional(),
  occupation: text(200).optional(),
  emergency_contact: text(300).optional(),
  emergency_phone: text(40).optional(),
  medical_conditions: text(4000).optional(),
  allergies: text(4000).optional(),
  smoking_status: z.boolean().optional(),
  alcohol_use: text(200).optional(),
  mental_health_notes: text(4000).optional(),
  pregnancy_status: z.boolean().optional(),
  cultural_preferences: text(2000).optional(),
});

const BodySchema = z.discriminatedUnion('action', [
  strictObject({
    action: z.literal('save_prep_checklist'),
    case_id: id(),
    // The browser sends its whole checklist back. Only each item's `completed`
    // flag is read; the item text always comes from the stored list.
    pre_op_checklist: z.array(z.object({ completed: z.boolean().optional() }).passthrough()).max(200),
  }),
  strictObject({
    action: z.literal('set_emergency_contact'),
    case_id: id(),
    emergency_contact: text(300),
    emergency_contact_number: text(40),
    emergency_contact_email: text(254),
  }),
  strictObject({
    action: z.literal('set_location_consent'),
    case_id: id(),
    granted: z.boolean(),
    consent_version: text(40).optional(),
  }),
  strictObject({
    action: z.literal('save_medical_profile'),
    case_id: id().optional(),
    profile: ProfileSchema,
  }),
  strictObject({
    action: z.literal('place_high_risk_hold'),
    consultation_id: id(),
  }),
]);

async function getOwnedCase(base44: any, caseId: string, email: string | undefined) {
  const c = await base44.asServiceRole.entities.CaseRecord.get(caseId).catch(() => null);
  if (!c || !email || c.client_email !== email) return null;
  return c;
}

async function latestOwnedCase(base44: any, email: string) {
  const rows = await base44.asServiceRole.entities.CaseRecord
    .filter({ client_email: email }, '-created_date', 1)
    .catch(() => []);
  return rows?.[0] || null;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const data: any = await body();
  const email = user?.email;
  if (!email) return err('Sign in to update your case.', 401);

  // ── Pre-op checklist: tick or untick an item ───────────────────────────────
  if (data.action === 'save_prep_checklist') {
    const c = await getOwnedCase(base44, data.case_id, email);
    if (!c) return err('Case not found', 404);
    const stored: any[] = Array.isArray(c.pre_op_checklist) ? c.pre_op_checklist : [];
    const incoming: any[] = data.pre_op_checklist;
    const merged = stored.map((item, i) => {
      const flag = incoming[i]?.completed;
      if (!item || typeof item !== 'object' || typeof flag !== 'boolean') return item;
      return { ...item, completed: flag };
    });
    await base44.asServiceRole.entities.CaseRecord.update(c.id, { pre_op_checklist: merged });
    return ok({ pre_op_checklist: merged });
  }

  // ── Primary emergency contact ──────────────────────────────────────────────
  if (data.action === 'set_emergency_contact') {
    const c = await getOwnedCase(base44, data.case_id, email);
    if (!c) return err('Case not found', 404);
    const patch = {
      emergency_contact: data.emergency_contact,
      emergency_contact_number: data.emergency_contact_number,
      emergency_contact_email: data.emergency_contact_email,
    };
    await base44.asServiceRole.entities.CaseRecord.update(c.id, patch);
    return ok(patch);
  }

  // ── Live location consent: turn on or off ──────────────────────────────────
  if (data.action === 'set_location_consent') {
    const c = await getOwnedCase(base44, data.case_id, email);
    if (!c) return err('Case not found', 404);
    const now = new Date().toISOString();
    const patch = data.granted
      ? {
        location_tracking_consent: true,
        location_tracking_consent_at: now,
        location_tracking_consent_version: data.consent_version || null,
        location_tracking_revoked_at: null,
      }
      : {
        location_tracking_consent: false,
        location_tracking_revoked_at: now,
      };
    await base44.asServiceRole.entities.CaseRecord.update(c.id, patch);
    return ok(patch);
  }

  // ── Medical profile: save, creating a minimal case if there is none yet ────
  if (data.action === 'save_medical_profile') {
    const profile = data.profile;
    if (data.case_id) {
      const c = await getOwnedCase(base44, data.case_id, email);
      if (!c) return err('Case not found', 404);
      await base44.asServiceRole.entities.CaseRecord.update(c.id, profile);
      return ok({ case_id: c.id, created: false });
    }
    // No case id: reuse the caller's latest case rather than making a second one.
    const existing = await latestOwnedCase(base44, email);
    if (existing) {
      await base44.asServiceRole.entities.CaseRecord.update(existing.id, profile);
      return ok({ case_id: existing.id, created: false });
    }
    const created = await base44.asServiceRole.entities.CaseRecord.create({
      ...profile,
      client_email: email,
      client_name: profile.client_name || user?.full_name || '',
      procedures: [],
      status: BOOKING.SUBMITTED,
    });
    return ok({ case_id: created?.id, created: true });
  }

  // ── High-risk hold after a late medical-history disclosure ─────────────────
  if (data.action === 'place_high_risk_hold') {
    const consultation = await base44.asServiceRole.entities.Consultation
      .get(data.consultation_id).catch(() => null);
    if (!consultation || consultation.email !== email) return err('Consultation not found', 404);

    // Re-derive from the stored record, the same way MedicalIntakeForm.jsx does.
    const enumKeys: string[] = Array.isArray(consultation.selected_procedures) && consultation.selected_procedures.length
      ? consultation.selected_procedures
      : (consultation.procedure_interest ? [consultation.procedure_interest] : []);
    const items = enumKeys.map(toSafetyEngineName).filter(Boolean).map((name) => ({ title: name as string, name: name as string }));
    const conditions: string[] = Array.isArray(consultation.medical_conditions) ? consultation.medical_conditions : [];
    const { violations, isBlocked } = getViolations(items, conditions);
    if (!isBlocked) return ok({ held: false });

    // No case yet: the Consultation's own high-risk flag is enough, because
    // case creation holds a flagged consultation at Admin-Review.
    const c = await latestOwnedCase(base44, email);
    if (!c) return ok({ held: false, reason: 'no_case_yet' });

    if (c.status === BOOKING.ADMIN_REVIEW) return ok({ held: true, already_held: true });

    const v = violations[0];
    let held = false;
    try {
      await guardedStatusUpdate(base44, c.id, BOOKING.ADMIN_REVIEW, {
        timeline_log: [
          ...(c.timeline_log || []),
          {
            timestamp: new Date().toISOString(),
            action: 'high_risk_hold',
            details: `Case held for Senior Medical Review — medical history disclosed after procedure selection: ${v.pairLabel}. ${v.reason}`,
          },
        ],
      });
      held = true;
    } catch (e) {
      // The guard refuses a finished case. A human still needs to hear about it.
      console.warn('[updateMyCaseRecord] hold not placed:', (e as Error)?.message);
    }

    await base44.asServiceRole.functions.invoke('notifySlackHighRisk', {
      case_id: c.id,
      internal_secret: Deno.env.get('CRON_SECRET'),
    }).catch(() => {});

    return ok({ held });
  }

  return err('Unknown action');
}, { name: 'updateMyCaseRecord', requireAuth: true, bodySchema: BodySchema, rateLimit: { max: 60, windowSeconds: 60 } }));
