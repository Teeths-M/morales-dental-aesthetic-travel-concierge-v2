/**
 * Where a pilot signup came from.
 *
 * Kept as a client constant so the form and the entity schema can be checked
 * against each other — the parity test reads PilotSignup.jsonc and fails if the
 * two lists drift apart. A source value the schema rejects would otherwise fail
 * silently, and the signup would look saved when it was not.
 */
export const PILOT_SOURCES = ['landing_hero', 'landing_greeting', 'pilot_page', 'mcare_chat'];