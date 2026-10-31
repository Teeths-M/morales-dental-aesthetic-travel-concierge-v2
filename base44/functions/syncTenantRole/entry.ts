import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import {
  ADMIN_ROLES,
  SELF_SERVICE,
  keepsExistingRole,
  linkedEntityAllowed,
  resolveRequestedRole,
  sameEmail,
} from '../../shared/roleSync.ts';

// Records that only ever point at the caller's own onboarding profile, never
// written to here.
const NEVER_LINKED = new Set(['User', 'UserOnboardingProfile']);

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECURITY: this endpoint changes a User's role, so it must never run
    // without a signed-in caller. The legitimate callers (saveUserOnboardingProfile
    // and the mcareCreate*Pending functions) always sync the CALLER'S OWN
    // account; only an admin may sync someone else's. Which role a caller may
    // get is decided in base44/shared/roleSync.ts.
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const membership = payload.data || payload;

    if (!membership?.tenant_id || !membership?.tenant_type || !membership?.user_email) {
      return Response.json({ error: 'Missing tenant_id, tenant_type, or user_email' }, { status: 400 });
    }

    const isAdmin = ADMIN_ROLES.has(user.role);
    if (!isAdmin && !sameEmail(membership.user_email, user.email)) {
      return Response.json({ error: 'Forbidden: you may only sync your own account role' }, { status: 403 });
    }

    const decision = resolveRequestedRole({
      isAdmin,
      tenantType: membership.tenant_type,
      requestedRole: membership.user_role,
    });
    if ('error' in decision) {
      return Response.json({ error: decision.error }, { status: decision.status });
    }
    const userRole = decision.role;

    const linkedEntityName = membership.linked_entity_name || SELF_SERVICE[membership.tenant_type]?.entity;
    if (!linkedEntityAllowed({ isAdmin, tenantType: membership.tenant_type, linkedEntityName })) {
      return Response.json({ error: 'Forbidden: that record type does not match this onboarding flow' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ email: membership.user_email });
    const target = users[0];
    const previousRole: string | null = target?.role || null;
    const keepRole = keepsExistingRole(previousRole, isAdmin);
    let roleChanged = false;

    if (target) {
      await base44.asServiceRole.entities.User.update(target.id, {
        ...(keepRole ? {} : { role: userRole }),
        tenant_id: membership.tenant_id,
        tenant_type: membership.tenant_type,
        profile_entity_name: membership.linked_entity_name || 'UserOnboardingProfile',
        profile_entity_id: membership.linked_entity_id || membership.tenant_id,
        onboarding_profile_id: membership.linked_entity_name === 'UserOnboardingProfile' ? membership.linked_entity_id || membership.tenant_id : membership.onboarding_profile_id || '',
        onboarding_status: membership.onboarding_status || 'completed',
      });
      roleChanged = !keepRole && previousRole !== userRole;
    }

    if (roleChanged) {
      // A best-effort entry in the hash-chained audit log, so "I didn't ask
      // for that" can be answered later. Never blocks the role change itself.
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          event_type: 'role_changed',
          actor_id: user.id,
          actor_role: user.role || 'user',
          actor_name: user.full_name || '',
          actor_email: user.email || '',
          resource_type: 'User',
          resource_id: target.id,
          resource_name: membership.user_email,
          case_id: null,
          details: {
            from: previousRole,
            to: userRole,
            tenant_type: membership.tenant_type,
            granted_by: isAdmin ? 'admin' : 'self_service_onboarding',
          },
          sensitive: false,
          timestamp: new Date().toISOString(),
          prev_hash: await computePrevHash(base44),
        });
      } catch (auditError) {
        console.error('syncTenantRole: audit entry failed (role change still applied):', auditError);
      }
    }

    // The tenant fields go onto the linked record only when it belongs to
    // the account being synced, or an admin is doing it. A record that isn't
    // theirs is left untouched. Nothing in the app reads these three fields,
    // so skipping a record never breaks a flow.
    let linkedEntityUpdated = false;
    if (linkedEntityName && !NEVER_LINKED.has(linkedEntityName)) {
      const entityApi = base44.asServiceRole.entities[linkedEntityName];
      const tenantFields = {
        tenant_id: membership.tenant_id,
        tenant_type: membership.tenant_type,
        user_role: userRole,
      };
      if (entityApi && membership.linked_entity_id) {
        const record = await entityApi.get(membership.linked_entity_id).catch(() => null);
        if (record && (isAdmin || sameEmail(record.email, membership.user_email))) {
          await entityApi.update(record.id, tenantFields);
          linkedEntityUpdated = true;
        }
      } else if (entityApi) {
        const matches = await entityApi.filter({ email: membership.user_email });
        await Promise.all(matches.map((record) => entityApi.update(record.id, tenantFields)));
        linkedEntityUpdated = matches.length > 0;
      }
    }

    // No app flow sends a membership id; updating a TenantMembership record
    // is an admin-only repair tool.
    if (membership.id && isAdmin) {
      await base44.asServiceRole.entities.TenantMembership.update(membership.id, {
        user_role: userRole,
        linked_entity_name: linkedEntityName,
        sync_status: 'synced',
        synced_at: new Date().toISOString(),
        sync_error: '',
      });
    }

    return Response.json({
      success: true,
      user_found: users.length > 0,
      user_role: keepRole ? previousRole : userRole,
      role_changed: roleChanged,
      linked_entity_name: linkedEntityName,
      linked_entity_updated: linkedEntityUpdated,
    });
  } catch (error) {
    console.error('Tenant role sync failed:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'syncTenantRole', requireAuth: false }));
