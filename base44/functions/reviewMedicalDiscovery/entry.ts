/**
 * reviewMedicalDiscovery — the ONE place a MedicalDiscovery's review
 * outcome (approved / rejected / needs_more_evidence / dismissed) is ever
 * recorded. Admin-only, unlike the sibling Evidence Monitoring (incident)
 * pipeline's simpler "admin clicks a button, client calls entities.update()
 * directly, RLS enforces it" pattern — this is a deliberate departure,
 * warranted because a MedicalDiscovery approval is immediately shown to
 * real patients (getEvidenceWatchFeed), unlike an internal
 * ProposedSafetyRule review, and because a real hash-chained AuditLog entry
 * needs server-side actor derivation (never a client-passed field).
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';

const bodySchema = strictObject({
  discovery_id: Fields.shortText(100),
  decision: z.enum(['approved', 'rejected', 'needs_more_evidence', 'dismissed']),
  reviewer_notes: Fields.optionalText(2000),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { discovery_id, decision, reviewer_notes } = await body<{
    discovery_id: string; decision: 'approved' | 'rejected' | 'needs_more_evidence' | 'dismissed'; reviewer_notes: string;
  }>();

  const discovery = await base44.asServiceRole.entities.MedicalDiscovery.get(discovery_id).catch(() => null);
  if (!discovery) return err('Discovery not found', 404);

  const nowISO = new Date().toISOString();
  const historyEntry = { at: nowISO, by: user!.email, action: decision, notes: reviewer_notes || '' };
  const history = Array.isArray(discovery.history) ? [...discovery.history, historyEntry] : [historyEntry];

  await base44.asServiceRole.entities.MedicalDiscovery.update(discovery_id, {
    status: decision,
    reviewer_id: user!.id,
    reviewer_name: user!.full_name || user!.email,
    reviewed_at: nowISO,
    reviewer_notes: reviewer_notes || '',
    history,
  });

  // Real, hash-chained audit trail — best-effort, must never block the real
  // review action. Uses the plain (session-forwarding) functions client,
  // same as reviewVaultDocument's own established call to logAuditEvent.
  try {
    await base44.functions.invoke('logAuditEvent', {
      event_type: decision === 'approved' ? 'medical_evidence_approved' : 'medical_evidence_rejected',
      resource_type: 'MedicalDiscovery',
      resource_id: discovery_id,
      resource_name: discovery.title || '',
      details: { decision, reviewer_notes: reviewer_notes || '' },
    });
  } catch (_) { /* audit logging must never block the real review action */ }

  return ok({ success: true, discovery_id, decision });
}, { name: 'reviewMedicalDiscovery', requireAuth: true, allowedRoles: ['admin', 'platform_admin'], bodySchema }));
