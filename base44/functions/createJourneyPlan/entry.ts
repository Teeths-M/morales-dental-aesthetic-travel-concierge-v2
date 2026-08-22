// createJourneyPlan — the only place a JourneyPlan is ever created. M-Care
// calls this for a genuinely multi-step request (RULE 32 in m_care.jsonc)
// to turn "the agent silently decides what to do next" into a real,
// persistent, auditable plan a patient — or M-Care itself, later — can
// actually look at. Every step is created pending, server-set, never a
// caller-supplied status; nothing here runs itself or bypasses any existing
// safety/consent gate — this is a record of intent, not an execution engine.

import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

const StepInput = strictObject({
  description: Fields.shortText(300),
  tool_name: Fields.optionalText(100).optional(),
});

const bodySchema = strictObject({
  case_id: Fields.shortText(100),
  goal: Fields.shortText(500),
  steps: z.array(StepInput).min(1, 'A plan needs at least one step').max(20, 'Keep a plan to at most 20 steps'),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id, goal, steps } = await body<{
    case_id: string;
    goal: string;
    steps: { description: string; tool_name?: string }[];
  }>();

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const isAdmin = user!.role === 'admin' || user!.role === 'platform_admin';
  if (!isAdmin && caseRecord.client_email !== user!.email) {
    return err('You can only create a plan for your own case.', 403);
  }

  const now = new Date().toISOString();
  const plannedSteps = steps.map((s, i) => ({
    step_number: i + 1,
    description: s.description,
    tool_name: s.tool_name || '',
    status: 'pending',
    notes: '',
    updated_at: now,
  }));

  const plan = await base44.asServiceRole.entities.JourneyPlan.create({
    client_email: caseRecord.client_email,
    case_id,
    goal,
    steps: plannedSteps,
    status: 'active',
    created_at: now,
  });

  await logJourneyEvent(base44, {
    case_id,
    client_email: caseRecord.client_email,
    event_type: 'journey_plan_created',
    source: 'createJourneyPlan',
    message_text: `I've put together a plan: ${goal}. ${plannedSteps.length} step${plannedSteps.length === 1 ? '' : 's'} to go.`,
    priority: 'low',
    action_taken: `Created a ${plannedSteps.length}-step JourneyPlan`,
    tool_result: { plan_id: plan.id, step_count: plannedSteps.length },
  }).catch(() => {});

  await base44.functions.invoke('logAuditEvent', {
    event_type: 'journey_plan_created',
    resource_type: 'JourneyPlan',
    resource_id: plan.id,
    resource_name: goal,
    case_id,
    details: { step_count: plannedSteps.length },
  }).catch(() => {});

  return ok({
    plan_id: plan.id,
    goal,
    steps: plannedSteps,
  });
}, { name: 'createJourneyPlan', requireAuth: true, bodySchema, rateLimit: { max: 20, windowSeconds: 300 } }));
