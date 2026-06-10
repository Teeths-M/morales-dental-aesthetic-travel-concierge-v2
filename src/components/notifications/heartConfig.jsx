export const HEART_ROLES = {
  patient:       { color: '#EF4444', label: 'Patient Portal',        emoji: '❤️' },
  doctor:        { color: '#D4AF37', label: 'Doctor Portal',         emoji: '💛' },
  travel_agency: { color: '#A855F7', label: 'Travel Agency Portal',  emoji: '💜' },
  taxi_service:  { color: '#22C55E', label: 'Driver Portal',         emoji: '💚' },
  companion:     { color: '#EC4899', label: 'Companion Portal',      emoji: '🩷' },
  admin:         { color: '#60A5FA', label: 'Admin',                 emoji: '💙' },
};

export function getRoleFromUser(user) {
  if (!user) return 'patient';
  return HEART_ROLES[user.role] ? user.role : 'patient';
}