// updateJourneyPlanStep — the only place a JourneyPlan step's status is ever
// changed after creation. `pending` is server-set-only (createJourneyPlan);
// this function only ever moves a step forward from there, and only once
// the real thing it represents has actually happened — a doctor confirmed,
// a tool call succeeded, a traveler agreed. Deliberately does not fire a
// JourneyEvent on every single step transition (that would be noisy) —
// only when this update causes every step in the plan to reach 'done' does
// it fire one 'journey_plan_completed' event. A 'failed' step is recorded
// honestly with real notes; nothing here auto-replans or auto-notifies on
// failure — that's a later, separate piece of work.

import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

const STEP_STATUSES = ['in_progress', 'done', 'failed', 'skipped'] as const;

const bodySchema = strictObject({
  plan_id: Fields.shortText(100),
  step_number: Fields.boundedInt(1, 20),
  status: z.enum(STEP_STATUSES),
  notes: Fields.optionalText(500).optional(),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { plan_id, step_number, status, notes } = await body<{
    plan_id: string;
    step_number: number;
    status: typeof STEP_STATUSES[number];
    notes?: string;
  }>();

  const plan = await base44.asServiceRole.entities.JourneyPlan.get(plan_id).catch(() => null);
  if (!plan) return err('Plan not found', 404);

  const isAdmin = user!.role === 'admin' || user!.role === 'platform_admin';
  if (!isAdmin && plan.client_email !== user!.email) {
    return err('You can only update your own plan.', 403);
  }

  const steps = Array.isArray(plan.steps) ? [...plan.steps] : [];
  const idx = steps.findIndex((s: any) => s.step_number === step_number);
  if (idx === -1) return err('That step was not found on this plan.', 404);

  const now = new Date().toISOString();
  steps[idx] = {
    ...steps[idx],
    status,
    notes: notes || steps[idx].notes || '',
    updated_at: now,
  };

  const allDone = steps.length > 0 && steps.every((s: any) => s.status === 'done');
  const update: Record<string, any> = { steps };
  if (allDone && plan.status !== 'completed') {
    update.status = 'completed';
  }

  await base44.asServiceRole.entities.JourneyPlan.update(plan_id, update);

  if (allDone && plan.status !== 'completed') {
    await logJourneyEvent(base44, {
      case_id: plan.case_id,
      client_email: plan.client_email,
      event_type: 'journey_plan_completed',
      source: 'updateJourneyPlanStep',
      message_text: `All set — every step of "${plan.goal}" is done.`,
      priority: 'low',
      action_taken: `JourneyPlan ${plan_id} reached completed (all ${steps.length} steps done)`,
      tool_result: { plan_id, step_count: steps.length },
    }).catch(() => {});
  }

  await base44.functions.invoke('logAuditEvent', {
    event_type: allDone && plan.status !== 'completed' ? 'journey_plan_completed' : 'journey_plan_step_updated',
    resource_type: 'JourneyPlan',
    resource_id: plan_id,
    resource_name: plan.goal,
    case_id: plan.case_id,
    details: { step_number, status, notes: notes || '' },
  }).catch(() => {});

  return ok({
    plan_id,
    step_number,
    status,
    plan_status: update.status || plan.status,
  });
}, { name: 'updateJourneyPlanStep', requireAuth: true, bodySchema, rateLimit: { max: 40, windowSeconds: 300 } }));
