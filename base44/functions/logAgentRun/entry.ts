// logAgentRun — the only place an AgentRun is ever created. M-Care calls
// this once, after a genuinely multi-step autonomous pass actually
// completes (RULE 38 in m_care.jsonc), so "what M-Care checked, why, and
// what happened" becomes a real, persistent, one-click-explainable record
// instead of something only ever said once in a chat reply. Mirrors
// createJourneyPlan's own validation/ownership shape. Every array field is
// bounded so a pathological payload can't blow up the record; nothing here
// runs itself or bypasses any existing safety/consent gate — this is a
// record of what already happened, not an execution engine.

import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';

const TierEnum = z.enum(['auto', 'needs_consent', 'human_only']);

const RecordChecked = strictObject({
  entity_type: Fields.shortText(100),
  record_id: Fields.shortText(100),
  purpose: Fields.shortText(300),
});

const Finding = strictObject({
  summary: Fields.shortText(500),
  confidence: z.number().min(0).max(100).nullable().optional().default(null),
  source_url: Fields.optionalText(500).nullable().optional().default(''),
  requires_human_review: z.boolean().optional().default(false),
});

const ActionItem = strictObject({
  tool_name: Fields.shortText(100),
  description: Fields.shortText(300),
  tier: TierEnum,
});

const BlockedAction = strictObject({
  tool_name: Fields.shortText(100),
  description: Fields.shortText(300),
  reason: Fields.shortText(300),
});

const bodySchema = strictObject({
  case_id: Fields.shortText(100),
  trigger: z.enum(['patient_message', 'scheduled_check', 'tool_retry', 'replanning']),
  goal: Fields.shortText(500),
  journey_plan_id: Fields.optionalText(100),
  records_checked: z.array(RecordChecked).max(30).optional().default([]),
  findings: z.array(Finding).max(20).optional().default([]),
  actions_proposed: z.array(ActionItem).max(20).optional().default([]),
  actions_taken: z.array(ActionItem).max(20).optional().default([]),
  actions_blocked: z.array(BlockedAction).max(20).optional().default([]),
  outcome: z.enum(['completed', 'partial', 'blocked_on_approval', 'blocked_on_safety', 'failed']),
  started_at: Fields.optionalText(40),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const {
    case_id, trigger, goal, journey_plan_id,
    records_checked, findings, actions_proposed, actions_taken, actions_blocked,
    outcome, started_at,
  } = await body<{
    case_id: string; trigger: string; goal: string; journey_plan_id?: string;
    records_checked: unknown[]; findings: unknown[]; actions_proposed: unknown[];
    actions_taken: unknown[]; actions_blocked: unknown[];
    outcome: string; started_at?: string;
  }>();

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const isAdmin = user!.role === 'admin' || user!.role === 'platform_admin';
  if (!isAdmin && caseRecord.client_email !== user!.email) {
    return err('You can only log a run for your own case.', 403);
  }

  const nowISO = new Date().toISOString();
  const parsedStart = started_at ? new Date(started_at) : null;
  const startedAtISO = parsedStart && !Number.isNaN(parsedStart.getTime()) ? parsedStart.toISOString() : nowISO;

  const run = await base44.asServiceRole.entities.AgentRun.create({
    client_email: caseRecord.client_email,
    case_id,
    trigger,
    goal,
    journey_plan_id: journey_plan_id || '',
    records_checked,
    findings,
    actions_proposed,
    actions_taken,
    actions_blocked,
    outcome,
    started_at: startedAtISO,
    completed_at: nowISO,
  });

  await base44.functions.invoke('logAuditEvent', {
    event_type: 'mcare_stage_transition',
    resource_type: 'AgentRun',
    resource_id: run.id,
    resource_name: goal,
    case_id,
    details: { trigger, outcome, records_checked_count: records_checked.length, actions_taken_count: actions_taken.length, actions_blocked_count: actions_blocked.length },
  }).catch(() => {});

  return ok({ run_id: run.id, case_id, goal, outcome, completed_at: nowISO });
}, { name: 'logAgentRun', requireAuth: true, bodySchema, rateLimit: { max: 20, windowSeconds: 300 } }));
