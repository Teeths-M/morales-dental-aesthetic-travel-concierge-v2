import { base44 } from '@/api/base44Client';

export async function saveUserOnboardingProfile({
  role,
  status = 'started',
  linkedEntityName = '',
  linkedEntityId = '',
  profileData = {}
}) {
  const user = await base44.auth.me();
  const now = new Date().toISOString();

  const data = {
    user_email: user.email,
    user_name: user.full_name || '',
    role,
    status,
    linked_entity_name: linkedEntityName,
    linked_entity_id: linkedEntityId,
    profile_data: profileData,
    last_updated_at: now,
    ...(status === 'started' ? { started_at: now } : {}),
    ...(status === 'completed' ? { completed_at: now } : {})
  };

  const existing = await base44.entities.UserOnboardingProfile.filter({ user_email: user.email, role });
  const profile = existing.length > 0
    ? await base44.entities.UserOnboardingProfile.update(existing[0].id, data)
    : await base44.entities.UserOnboardingProfile.create(data);

  // Fire-and-forget — syncTenantRole failure must never block the booking flow
  base44.functions.invoke('syncTenantRole', {
    tenant_id: profile.id,
    tenant_type: role,
    tenant_name: user.full_name || user.email,
    user_email: user.email,
    user_role: role,
    linked_entity_name: linkedEntityName || 'UserOnboardingProfile',
    linked_entity_id: linkedEntityId || profile.id,
    onboarding_status: status,
  }).catch(e => console.warn('syncTenantRole (non-blocking):', e.message));

  return profile;
}