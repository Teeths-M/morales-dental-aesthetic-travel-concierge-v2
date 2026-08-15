/**
 * guardianCheckIn — Silent Guardian Layer 4 backend.
 *
 * Sends a scheduled SMS check-in to the patient. The actual send/gate logic
 * lives in ../../shared/sendGuardianCheckIn.ts, shared with
 * runGuardianCheckInSweep (the cron-driven sweep that now actually fires
 * am/pm check-ins server-side — this endpoint alone was never wired to
 * anything real, client or server; see that function's header) so both
 * callers can never quietly diverge.
 *
 * Called by:
 *   - useGuardianMode hook (client-side, requires the patient's own session)
 *   - runGuardianCheckInSweep (cron, server-side, no user session needed)
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { z, strictObject, Fields } from '../../shared/validate.ts';
import { sendGuardianCheckIn } from '../../shared/sendGuardianCheckIn.ts';

const GuardianCheckInSchema = strictObject({
  consultation_id: Fields.shortText(100),
  reason: z.string().trim().max(50).optional().default('scheduled'),
  tz_offset: z.coerce.number().optional().default(0),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { consultation_id, reason = 'scheduled', tz_offset = 0 } = await body();

  if (!consultation_id) return err('consultation_id required');

  const result = await sendGuardianCheckIn(base44, consultation_id, reason, tz_offset);
  if (result.error) return err(result.error as string, 404);

  return ok(result);
}, { name: 'guardianCheckIn', requireAuth: true, bodySchema: GuardianCheckInSchema }));
