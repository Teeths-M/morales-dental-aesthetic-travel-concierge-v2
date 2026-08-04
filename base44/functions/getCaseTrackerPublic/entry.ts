import { createHandler, ok, err } from '../../shared/createHandler.ts';

/**
 * getCaseTrackerPublic — public, token-verified read for the
 * Public Recovery Tracker (/track/:token — "the viral hook").
 *
 * No login required, no medical data exposed — only journey progress,
 * phase, display name, and destination. Mirrors getGuardianViewData's
 * shape: a public/token-gated page that calls a function via
 * base44.functions.invoke instead of a raw REST fetch.
 *
 * The token is minted by generateShareToken and stored verbatim on
 * CaseRecord.share_token — verification requires an EXACT match against
 * that stored value (not just "decodes cleanly"), since the token's
 * embedded nonce is what actually makes it unguessable.
 */
Deno.serve(createHandler(async ({ base44, body }) => {
  const { token } = await body();
  if (!token) return err('token is required');

  let decoded: { case_id?: string; expires_at?: number } | null = null;
  try {
    decoded = JSON.parse(atob(token));
  } catch (_) {
    decoded = null;
  }
  if (!decoded?.case_id) return err('This link is invalid or has expired', 404);

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(decoded.case_id).catch(() => null);
  if (!caseRecord) return err('This link is invalid or has expired', 404);

  if (
    !caseRecord.share_token ||
    caseRecord.share_token !== token ||
    !caseRecord.share_token_exp ||
    new Date(caseRecord.share_token_exp).getTime() < Date.now()
  ) {
    return err('This link has expired or is no longer available', 403);
  }

  const trips = await base44.asServiceRole.entities.TravelRequest.filter(
    { case_id: decoded.case_id }, '-updated_at', 1
  ).catch(() => []);
  const trip = trips?.[0];

  return ok({
    current_step:         trip?.current_step ?? 0,
    trip_phase:           trip?.trip_phase || 'pre_departure',
    patient_display_name: caseRecord.client_name || 'Traveler',
    destination:           caseRecord.procedure_country || '',
  });
}, { name: 'getCaseTrackerPublic', requireAuth: false }));
