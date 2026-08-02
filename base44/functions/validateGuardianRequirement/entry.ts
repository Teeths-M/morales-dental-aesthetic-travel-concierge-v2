import { createHandler, ok } from '../../shared/createHandler.ts';
import { evaluateGuardianGate } from '../../shared/guardianGate.ts';

// M PRINCIPLE — under-18 hard gate, server-side.
// A patient under 18 cannot proceed to booking without a captured guardian
// identity (name + valid contact). The /booking and /intake flows also gate this
// client-side so the user sees it immediately — but a client-only check can be
// skipped by calling Consultation.create() directly. This re-derives the verdict
// from the submitted age server-side so the block cannot be bypassed by going
// around the frontend. Called before every Consultation.create() in both flows.
// Mirrors validateProcedureSafety (the RED procedure block).
export default createHandler(async ({ body }) => {
  const { age, guardian_name, guardian_contact } = await body<{
    age?: unknown; guardian_name?: unknown; guardian_contact?: unknown;
  }>();

  const gate = evaluateGuardianGate({ age, guardian_name, guardian_contact });

  return ok({
    is_minor: gate.isMinor,
    blocked: gate.blocked,
    missing: gate.missing,
    reason: gate.reason,
  });
}, { name: 'validateGuardianRequirement', requireAuth: false });
