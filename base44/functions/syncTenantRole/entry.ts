import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const roleByTenantType = {
  doctor: 'doctor',
  client: 'client',
  travel_agency: 'travel_agency',
  taxi_service: 'taxi_service',
  platform_admin: 'platform_admin',
};

const entityByTenantType = {
  doctor: 'Doctor',
  travel_agency: 'TravelAgency',
  taxi_service: 'TaxiService',
  client: 'Consultation',
  platform_admin: 'User',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const membership = payload.data || payload;

    if (!membership?.tenant_id || !membership?.tenant_type || !membership?.user_email) {
      return Response.json({ error: 'Missing tenant_id, tenant_type, or user_email' }, { status: 400 });
    }

    const userRole = membership.user_role || roleByTenantType[membership.tenant_type];
    if (!userRole) {
      return Response.json({ error: 'Invalid tenant type' }, { status: 400 });
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});