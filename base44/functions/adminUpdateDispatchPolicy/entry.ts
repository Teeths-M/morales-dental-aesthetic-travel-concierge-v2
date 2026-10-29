import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * adminUpdateDispatchPolicy — the ONLY write path for dispatch policy,
 * verification tier and clinical risk configuration.
 *
 * Admin-gated here AND by the entity's own RLS, so a non-admin cannot reach it
 * by either route. The M-Care agent has no grant on EmergencyDispatchPolicy at
 * all, which is what makes "the content tool cannot author these" true at the
 * permission layer rather than by convention.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'platform_admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const countryCode = String(body.country_code || '').toUpperCase().trim();
    if (!countryCode) return Response.json({ error: 'country_code is required' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.EmergencyDispatchPolicy
      .filter({ country_code: countryCode })
      .catch(() => []);
    const current = (existing as any[])[0] || null;

    // Only these fields may be authored. Anything else in the payload is
    // ignored rather than persisted, so an unexpected key cannot smuggle in a
    // behavioural change.
    const patch: Record<string, unknown> = {};
    const numericFields = ['offer_timeout_seconds', 'max_offers'];
    for (const field of numericFields) {
      if (body[field] !== undefined) {
        const n = Number(body[field]);
        if (!Number.isFinite(n) || n < 0) {
          return Response.json({ error: `${field} must be a positive number` }, { status: 400 });
        }
        patch[field] = n;
      }
    }

    const passthrough = [
      'country_name', 'emergency_number', 'emergency_number_label',
      'requires_emergency_call', 'notify_roles', 'responder_pool',
      'escalation_contacts', 'care_team_contact', 'clinical_risk_overrides', 'is_active',
    ];
    for (const field of passthrough) {
      if (body[field] !== undefined) patch[field] = body[field];
    }

    // The sequential-dispatch invariant is not configurable.
    patch.max_concurrent_offers = 1;
    patch.updated_by = user.email;
    patch.version = (Number(current?.version) || 0) + 1;

    if (current) {
      const updated = await base44.asServiceRole.entities.EmergencyDispatchPolicy.update(current.id, patch);
      return Response.json({ success: true, created: false, policy: updated });
    }

    const created = await base44.asServiceRole.entities.EmergencyDispatchPolicy.create({
      country_code: countryCode,
      offer_timeout_seconds: 90,
      max_offers: 5,
      is_active: true,
      ...patch,
    });

    return Response.json({ success: true, created: true, policy: created });
  } catch (error) {
    console.error('[adminUpdateDispatchPolicy]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});