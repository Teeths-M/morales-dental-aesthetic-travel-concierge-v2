/**
 * accountActivity — the "Recent account activity" list in Settings. Turns the
 * account owner's own audit-log entries into short sentences in the page's
 * language, so they can spot a change they didn't make. Pure, so
 * tests/accountActivity.test.js checks it directly.
 *
 * Each of these events is written at the moment it happens:
 *   profile_updated, contact_phone_changed  updateMyProfile
 *   role_changed                            syncTenantRole
 *   guardian_access_granted                 generateGuardianLink
 *   safety_monitoring_paused / _resumed     setPrivateMode (M-Care's Private Mode)
 *   phone_lock_*                            managePasskeys (the Face ID lock)
 */

export const ACCOUNT_EVENT_TYPES = [
  'profile_updated',
  'contact_phone_changed',
  'role_changed',
  'guardian_access_granted',
  'safety_monitoring_paused',
  'safety_monitoring_resumed',
  'phone_lock_enabled',
  'phone_lock_device_added',
  'phone_lock_device_removed',
  'phone_lock_disabled',
];

const TEXT = {
  en: {
    profile_updated: 'Your profile details were changed',
    contact_phone_changed: 'Your contact phone number was changed',
    role_changed: 'Your account type was changed',
    role_changed_to: 'Your account type was set to {role}',
    guardian_access_granted: 'You shared your journey with {name}',
    guardian_access_granted_unnamed: 'You shared your journey with a family member',
    safety_monitoring_paused: 'Your safety check-ins were paused',
    safety_monitoring_resumed: 'Your safety check-ins were turned back on',
    phone_lock_enabled: 'The Face ID lock was turned on',
    phone_lock_device_added: 'A phone was added to your Face ID lock',
    phone_lock_device_removed: 'A phone was removed from your Face ID lock',
    phone_lock_disabled: 'The Face ID lock was turned off',
  },
  es: {
    profile_updated: 'Se cambiaron los datos de tu perfil',
    contact_phone_changed: 'Se cambió tu número de teléfono de contacto',
    role_changed: 'Se cambió el tipo de tu cuenta',
    role_changed_to: 'El tipo de tu cuenta ahora es {role}',
    guardian_access_granted: 'Compartiste tu viaje con {name}',
    guardian_access_granted_unnamed: 'Compartiste tu viaje con un familiar',
    safety_monitoring_paused: 'Se pausaron tus controles de seguridad',
    safety_monitoring_resumed: 'Se reactivaron tus controles de seguridad',
    phone_lock_enabled: 'Se activó el bloqueo con Face ID',
    phone_lock_device_added: 'Se agregó un teléfono a tu bloqueo con Face ID',
    phone_lock_device_removed: 'Se quitó un teléfono de tu bloqueo con Face ID',
    phone_lock_disabled: 'Se desactivó el bloqueo con Face ID',
  },
  fr: {
    profile_updated: 'Les informations de votre profil ont été modifiées',
    contact_phone_changed: 'Votre numéro de téléphone de contact a été modifié',
    role_changed: 'Le type de votre compte a été modifié',
    role_changed_to: 'Le type de votre compte est désormais : {role}',
    guardian_access_granted: 'Vous avez partagé votre voyage avec {name}',
    guardian_access_granted_unnamed: 'Vous avez partagé votre voyage avec un proche',
    safety_monitoring_paused: 'Vos points de contrôle de sécurité ont été mis en pause',
    safety_monitoring_resumed: 'Vos points de contrôle de sécurité ont été réactivés',
    phone_lock_enabled: 'Le verrouillage par Face ID a été activé',
    phone_lock_device_added: 'Un téléphone a été ajouté à votre verrouillage par Face ID',
    phone_lock_device_removed: 'Un téléphone a été retiré de votre verrouillage par Face ID',
    phone_lock_disabled: 'Le verrouillage par Face ID a été désactivé',
  },
  pt: {
    profile_updated: 'Os dados do seu perfil foram alterados',
    contact_phone_changed: 'Seu telefone de contato foi alterado',
    role_changed: 'O tipo da sua conta foi alterado',
    role_changed_to: 'O tipo da sua conta agora é {role}',
    guardian_access_granted: 'Você compartilhou sua viagem com {name}',
    guardian_access_granted_unnamed: 'Você compartilhou sua viagem com um familiar',
    safety_monitoring_paused: 'Seus check-ins de segurança foram pausados',
    safety_monitoring_resumed: 'Seus check-ins de segurança foram reativados',
    phone_lock_enabled: 'O bloqueio com Face ID foi ativado',
    phone_lock_device_added: 'Um telefone foi adicionado ao seu bloqueio com Face ID',
    phone_lock_device_removed: 'Um telefone foi removido do seu bloqueio com Face ID',
    phone_lock_disabled: 'O bloqueio com Face ID foi desativado',
  },
};

const ROLE_NAMES = {
  en: {
    client: 'patient', doctor: 'doctor', travel_agency: 'travel agency', taxi_service: 'driver service',
    companion: 'companion', security_agency: 'security agency', clinical_reviewer: 'clinical reviewer',
    local_doctor: 'home-country doctor',
  },
  es: {
    client: 'paciente', doctor: 'médico', travel_agency: 'agencia de viajes', taxi_service: 'servicio de conductores',
    companion: 'acompañante', security_agency: 'agencia de seguridad', clinical_reviewer: 'revisor clínico',
    local_doctor: 'médico en tu país',
  },
  fr: {
    client: 'patient', doctor: 'médecin', travel_agency: 'agence de voyages', taxi_service: 'service de chauffeurs',
    companion: 'accompagnant', security_agency: 'agence de sécurité', clinical_reviewer: 'réviseur clinique',
    local_doctor: 'médecin dans votre pays',
  },
  pt: {
    client: 'paciente', doctor: 'médico', travel_agency: 'agência de viagens', taxi_service: 'serviço de motoristas',
    companion: 'acompanhante', security_agency: 'agência de segurança', clinical_reviewer: 'revisor clínico',
    local_doctor: 'médico no seu país',
  },
};

const MAX_NAME = 40;

/** One audit entry as a sentence, or null when it isn't an account event. */
export function describeAccountEvent(entry, lang = 'en') {
  if (!entry || typeof entry !== 'object') return null;
  const t = TEXT[lang] || TEXT.en;
  const roles = ROLE_NAMES[lang] || ROLE_NAMES.en;
  const details = entry.details && typeof entry.details === 'object' ? entry.details : {};
  switch (entry.event_type) {
    case 'profile_updated':
    case 'contact_phone_changed':
    case 'safety_monitoring_paused':
    case 'safety_monitoring_resumed':
    case 'phone_lock_enabled':
    case 'phone_lock_device_added':
    case 'phone_lock_device_removed':
    case 'phone_lock_disabled':
      return t[entry.event_type];
    case 'role_changed': {
      const role = Object.prototype.hasOwnProperty.call(roles, details.to) ? roles[details.to] : null;
      return role ? t.role_changed_to.replace('{role}', () => role) : t.role_changed;
    }
    case 'guardian_access_granted': {
      const name = typeof entry.resource_name === 'string' ? entry.resource_name.trim().slice(0, MAX_NAME) : '';
      return name ? t.guardian_access_granted.replace('{name}', () => name) : t.guardian_access_granted_unnamed;
    }
    default:
      return null;
  }
}

/** The newest account events first, as { id, at, text }. */
export function recentAccountActivity(entries, { limit = 5, lang = 'en' } = {}) {
  return (Array.isArray(entries) ? entries : [])
    .map((e) => ({ id: e?.id ?? null, at: e?.timestamp || e?.created_date || null, text: describeAccountEvent(e, lang) }))
    .filter((e) => e.text)
    .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
    .slice(0, limit);
}
