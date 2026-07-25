import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

const roleByTenantType = {
  doctor: 'doctor',
  client: 'client',
  travel_agency: 'travel_agency',
  taxi_service: 'taxi_service',
};

const entityByTenantType = {
  doctor: 'Doctor',
  travel_agency: 'TravelAgency',
  taxi_service: 'TaxiService',
  client: 'Consultation',
};

// Roles that must never be grantable through this self-service tenant sync
// endpoint. Admin access is granted exclusively through inviteAdmin. Partner
// roles (doctor / travel_agency / taxi_service) are likewise blocked from
// client-controlled input here — a standard user could otherwise self-escalate
// to a partner role by passing tenant_type: 'doctor' (or user_role: 'doctor'),
// granting themselves access to partner dashboards and patient case data.
// Partner roles are assigned only by server-side verified onboarding/approval
// flows (e.g. activateVerifiedDoctor / activatePartner) or by an admin.
const FORBIDDEN_ROLES = new Set(['admin', 'platform_admin', 'doctor', 'travel_agency', 'taxi_service']);

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECURITY: this endpoint mutates a User's role — it must never be reachable
    // without authentication. The legitimate caller (saveUserOnboardingProfile)
    // always syncs the CALLER'S OWN account, so require auth and restrict the
    // target email to the caller's own email unless the caller is already an
    // admin fixing another user's tenant assignment.
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const membership = payload.data || payload;

    if (!membership?.tenant_id || !membership?.tenant_type || !membership?.user_email) {
      return Response.json({ error: 'Missing tenant_id, tenant_type, or user_email' }, { status: 400 });
    }

    const isAdmin = ['admin', 'platform_admin'].includes(user.role);
    if (!isAdmin && membership.user_email.toLowerCase() !== user.email.toLowerCase()) {
      return Response.json({ error: 'Forbidden: you may only sync your own account role' }, { status: 403 });
    }

    const userRole = membership.user_role || roleByTenantType[membership.tenant_type];
    if (!userRole) {
      return Response.json({ error: 'Invalid tenant type' }, { status: 400 });
    }
    if (FORBIDDEN_ROLES.has(userRole) && !isAdmin) {
      return Response.json({ error: 'Forbidden: admin roles cannot be granted through this endpoint' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ email: membership.user_email });
    if (users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        role: userRole,
        tenant_id: membership.tenant_id,
        tenant_type: membership.tenant_type,
        profile_entity_name: membership.linked_entity_name || 'UserOnboardingProfile',
        profile_entity_id: membership.linked_entity_id || membership.tenant_id,
        onboarding_profile_id: membership.linked_entity_name === 'UserOnboardingProfile' ? membership.linked_entity_id || membership.tenant_id : membership.onboarding_profile_id || '',
        onboarding_status: membership.onboarding_status || 'completed',
      });
    }

    const linkedEntityName = membership.linked_entity_name || entityByTenantType[membership.tenant_type];
    if (linkedEntityName && !['User', 'UserOnboardingProfile'].includes(linkedEntityName)) {
      const entityApi = base44.asServiceRole.entities[linkedEntityName];
      if (membership.linked_entity_id) {
        await entityApi.update(membership.linked_entity_id, {
          tenant_id: membership.tenant_id,
          tenant_type: membership.tenant_type,
          user_role: userRole,
        });
      } else {
        const matches = await entityApi.filter({ email: membership.user_email });
        await Promise.all(matches.map((record) => entityApi.update(record.id, {
          tenant_id: membership.tenant_id,
          tenant_type: membership.tenant_type,
          user_role: userRole,
        })));
      }
    }

    if (membership.id) {
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
      user_role: userRole,
      linked_entity_name: linkedEntityName,
    });
  } catch (error) {
    console.error('Tenant role sync failed:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'syncTenantRole', requireAuth: false }));