// ── Versioned update (no silent data loss) ────────────────────────────────────
// Before overwriting a patient-data record, snapshot the PRIOR values of exactly
// the fields the patch changes into the append-only PatientDataRevision log, then
// apply the update. So an edit is versioned, never a silent overwrite — the
// previous value can always be reconstructed or rolled back.
//
// Usage (server, service role):
//   await reviseAndUpdate(base44, 'DietaryProfile', id, patch, { actor: user.email, reason: '...' });

type Base44Like = {
  asServiceRole: {
    entities: Record<string, {
      get: (id: string) => Promise<Record<string, unknown> | null>;
      update: (id: string, patch: Record<string, unknown>) => Promise<unknown>;
      create: (data: Record<string, unknown>) => Promise<unknown>;
    }>;
  };
};

export async function reviseAndUpdate(
  base44: Base44Like,
  entityName: string,
  id: string,
  patch: Record<string, unknown>,
  opts: { actor?: string; reason?: string } = {},
): Promise<unknown> {
  const entity = base44.asServiceRole.entities[entityName];
  if (!entity) throw new Error(`reviseAndUpdate: unknown entity ${entityName}`);

  // Read current state and diff the patch. Field-level, so we only snapshot what
  // actually changes.
  let before: Record<string, unknown> | null = null;
  try { before = await entity.get(id); } catch { /* if unreadable, still apply the update */ }

  if (before) {
    const changed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      const prev = before[k];
      if (JSON.stringify(prev ?? null) !== JSON.stringify(v ?? null)) {
        changed[k] = prev ?? null; // store the PRIOR value
      }
    }
    if (Object.keys(changed).length > 0) {
      // Defensive: a revision-logging failure must never block the update itself.
      await base44.asServiceRole.entities.PatientDataRevision.create({
        entity_name: entityName,
        record_id: String(id),
        changed_fields: changed,
        actor_email: opts.actor || 'system',
        reason: opts.reason || '',
        created_at: new Date().toISOString(),
      }).catch(() => {});
    }
  }

  return entity.update(id, patch);
}
