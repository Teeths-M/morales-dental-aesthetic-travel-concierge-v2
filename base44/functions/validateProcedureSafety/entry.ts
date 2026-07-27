import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { getViolations } from '../_shared/procedureCompatibility.ts';

// M PRINCIPLE — RED is a hard block, always, with no bypass.
// src/lib/procedureCompatibility.js runs this same check client-side so the booking
// wizard can show the ProcedureStackingBlocker UI immediately — but a client-side-only
// check can be skipped by calling Consultation.create() directly. This function
// re-derives the verdict from the raw procedure names so the block cannot be bypassed
// by going around the frontend. Called from Booking.jsx before every Consultation.create().
Deno.serve(createHandler(async ({ body }) => {
  const { items, conditions } = await body();
  if (!Array.isArray(items)) return err('items array is required');

  const { violations, isBlocked } = getViolations(items, Array.isArray(conditions) ? conditions : []);

  return ok({
    isBlocked,
    violations,
    reason: isBlocked
      ? 'This combination requires enhanced medical review by a licensed provider before planning. This is not a restriction — it is a care standard.'
      : null,
  });
}, { name: 'validateProcedureSafety', requireAuth: false }));
