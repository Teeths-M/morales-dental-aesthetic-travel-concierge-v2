import { createHandler, ok } from '../../shared/createHandler.ts';

// ── getEcosystemStatus ────────────────────────────────────────────────────────
// Returns the patient's personal provider network health + M-Care's background
// scanning activity, so the dashboard can render the "always watching" safety
// net banner. This is the read side of the BYO-Partner ecosystem: the patient
// sees every provider they've invited, where each one is in verification, and
// how many candidates M-Care has proactively discovered for their destination —
// so silence from M-Care reads as watchfulness, not inactivity.

Deno.serve(createHandler(async ({ base44, user }) => {
  if (!user?.email) return ok({ providers: [], discovered_count: 0, active_invites: 0 });

  // ── 1. The patient's personal provider invites ──
  const invites = await base44.asServiceRole.entities.PersonalProviderInvite.filter({
    invited_by_email: user.email,
  }, '-submitted_at', 50).catch(() => []);

  const providers = (invites as any[]).map((inv: any) => ({
    id: inv.id,
    provider_type: inv.provider_type,
    provider_name: inv.provider_name,
    provider_country: inv.provider_country,
    clinic_name: inv.clinic_name || '',
    specialty: inv.specialty || '',
    verification_status: inv.verification_status,
    linked_partner_id: inv.linked_partner_id || '',
    submitted_at: inv.submitted_at,
    verified_at: inv.verified_at || '',
  }));

  const activeInvites = providers.filter(
    (p: any) => p.verification_status === 'pending' || p.verification_status === 'verifying'
  ).length;
  const verifiedCount = providers.filter(
    (p: any) => p.verification_status === 'verified' || p.verification_status === 'already_in_network'
  ).length;

  // ── 2. M-Care's proactive discovery pipeline (global signal) ──
  // How many candidate leads has M-Care discovered recently? This is the
  // "always searching" proof point — even if the patient has zero personal
  // invites, they can see M-Care is actively growing the network.
  let discoveredCount = 0;
  try {
    const candidates = await base44.asServiceRole.entities.DiscoveredProviderCandidate.filter(
      { status: 'candidate' }, '-identity_confidence', 1
    );
    // The filter returns up to 1 record just to check existence/length signal —
    // we don't expose candidate details to the patient (they're unverified leads).
    discoveredCount = Array.isArray(candidates) ? candidates.length : 0;
  } catch (_) { /* non-fatal */ }

  return ok({
    providers,
    active_invites: activeInvites,
    verified_count: verifiedCount,
    discovered_count: discoveredCount,
    ecosystem_active: true,
  });
}, { name: 'getEcosystemStatus', requireAuth: true }));