import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, z, Fields } from '../../shared/validate.ts';

// ── applyDoctorAvailability ──────────────────────────────────────────────────
// M-Care super-agent Phase 2C, second half — parseAvailabilityIntent already
// turned a doctor's sentence into { days, weeks } and the doctor already
// confirmed the plan on screen. This function does the actual write, and it
// is 100% deterministic: no LLM anywhere in this file. It expands the
// day-of-week pattern into concrete calendar dates and writes real
// DoctorAvailability rows — the exact entity DoctorAvailabilityCalendar.jsx
// already reads, unmodified, so the existing calendar UI just shows more
// pre-populated data.
//
// The one rule that matters here: a bulk "I'm free Tuesdays" update must
// NEVER silently unlock or overwrite a date a patient's case already has
// locked (DoctorAvailability.locked_case_id, set by confirmProcedureDate at
// booking time) — that would be a real, patient-visible trust break, not
// just a data inconsistency. Locked dates are always read first and always
// skipped, counted, and reported back rather than silently dropped.
//
// Self-service only: the doctor_id is derived from the CALLER's own email
// (Doctor.filter({email: user.email})) — never caller-supplied — so one
// doctor can never touch another doctor's calendar through this function,
// regardless of what DoctorAvailability's own (currently open) RLS allows.

const DAY_VALUES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MAX_WEEKS = 12;

const BodySchema = strictObject({
  days: z.array(z.enum(DAY_VALUES as [string, ...string[]])).min(1).max(7),
  weeks: Fields.boundedInt(1, MAX_WEEKS),
});

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { days, weeks } = await body<{ days: string[]; weeks: number }>();

  const doctors = await base44.entities.Doctor.filter({ email: user.email });
  const doctor = doctors?.[0];
  if (!doctor) return err('No doctor profile found for this account', 404);

  // Deterministic expansion: every date in [today, today + weeks*7 days]
  // whose weekday is in `days`.
  const targetDates: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const totalDays = weeks * 7;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    const weekday = DAY_VALUES[(d.getUTCDay() + 6) % 7]; // getUTCDay: 0=Sunday -> shift so 0=Monday
    if (days.includes(weekday)) targetDates.push(isoDate(d));
  }

  if (targetDates.length === 0) return ok({ updated: 0, skipped_locked: 0, dates: [] });

  // Read existing rows for this doctor across the whole window ONCE, so
  // already-locked dates can be skipped instead of overwritten.
  const existing = await base44.entities.DoctorAvailability.filter({ doctor_id: doctor.id });
  const existingByDate = new Map(existing.map((r: any) => [r.date, r]));

  let updated = 0;
  let skippedLocked = 0;
  const appliedDates: string[] = [];

  for (const date of targetDates) {
    const row = existingByDate.get(date);
    if (row?.locked_case_id) {
      skippedLocked++;
      continue;
    }
    if (row) {
      await base44.entities.DoctorAvailability.update(row.id, { is_available: true });
    } else {
      await base44.entities.DoctorAvailability.create({
        doctor_id: doctor.id,
        doctor_email: doctor.email,
        date,
        is_available: true,
      });
    }
    updated++;
    appliedDates.push(date);
  }

  return ok({ updated, skipped_locked: skippedLocked, dates: appliedDates });
}, { name: 'applyDoctorAvailability', requireAuth: true, allowedRoles: ['doctor'], bodySchema: BodySchema }));
