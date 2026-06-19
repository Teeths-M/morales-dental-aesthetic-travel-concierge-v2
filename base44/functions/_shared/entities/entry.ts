/**
 * _shared/entities.js  — REFERENCE ONLY
 *
 * Backend functions deploy independently and cannot import local files.
 * Inline the helpers below into each function that needs them.
 *
 * CRITICAL RULE: Never use .filter({ id: someId }) for primary-key lookups.
 * The Base44 SDK filter() does not support the built-in `id` field — it returns [].
 * Always use entityClient.get(id) for single-record fetches.
 *
 * Inline snippet:
 *
 *   // Get by primary key — NEVER filter({ id })
 *   async function getById(entityClient, id, name = 'record') {
 *     if (!id) throw Response.json({ error: `${name} id is required` }, { status: 400 });
 *     const rec = await entityClient.get(id);
 *     if (!rec) throw Response.json({ error: `${name} not found` }, { status: 404 });
 *     return rec;
 *   }
 *
 *   // Append to timeline_log
 *   function appendTimeline(existing, event) {
 *     return [...(Array.isArray(existing) ? existing : []), { timestamp: new Date().toISOString(), ...event }];
 *   }
 *
 *   // Stripe idempotency guard
 *   async function isEventAlreadyProcessed(entities, eventId) {
 *     const r = await entities.PaymentTransaction.filter({ event_id: eventId }, '-created_date', 1);
 *     return r.length > 0;
 *   }
 */

// Re-export as documentation artefact
export const ENTITY_RULES = {
  NO_FILTER_BY_ID: 'Use entityClient.get(id), never filter({ id: someId })',
  LIMIT_ALL_QUERIES: 'Always pass a limit to filter() — never scan unbounded',
};