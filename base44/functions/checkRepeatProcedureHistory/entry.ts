// checkRepeatProcedureHistory — lets M-Care answer honestly, in a live chat,
// whether a patient has had the SAME major procedure done before on an
// earlier trip through Morales, even before any current CaseRecord exists.
// Mirrors why validateProcedureSafety exists as its own callable tool
// separate from the real booking-time re-check.
//
// Deliberately does NOT create a DoctorReviewTask — a hypothetical chat
// question ("what if I wanted a 3rd BBL") is real signal to narrate honestly,
// but a real review task stays reserved for the real deterministic engine at
// actual scan time (safeT4LifeScan, wired into Booking.jsx's real flow).

import { createHandler, ok } from '../../shared/createHandler.ts';
import { strictObject, z } from '../../shared/validate.ts';
import { checkRepeatProcedureHistory } from '../../shared/repeatProcedureHistory.ts';

const bodySchema = strictObject({
  procedures: z.array(z.string().trim().min(1).max(200)).min(1).max(10),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { procedures } = await body<{ procedures: string[] }>();

  // patient_email is always the caller's own session — never a request field —
  // so one user can never probe another's surgical history by email.
  const result = await checkRepeatProcedureHistory(base44, user!.email, procedures);

  return ok(result);
}, { name: 'checkRepeatProcedureHistory', requireAuth: true, bodySchema, rateLimit: { max: 20, windowSeconds: 300 } }));
