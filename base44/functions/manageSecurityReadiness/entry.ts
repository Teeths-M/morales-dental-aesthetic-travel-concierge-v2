import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { hasTwoPersonApproval } from '../../shared/emergencyIncident.ts';

/**
 * manageSecurityReadiness — makes "a team covers this destination" a claim that
 * has to be earned, and taking it away a thing that is always possible.
 *
 * Two-person approval is enforced here structurally: the proposer can never be
 * the approver, so a single administrator cannot announce that M-Care has a
 * responder in a country. Suspension needs no second signature on purpose —
 * stopping a claim must never be harder than making one.
 *
 * A proposal that is missing any of the evidence an emergency actually needs
 * (coverage areas, on-duty hours, a verified contact, a real channel, an
 * escalation path that was tested) is stored as a DRAFT with the gaps named,
 * rather than as an approved promise.
 */
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const b = await body<any>();
  const now = new Date().toISOString();
  const email = user?.email || 'unknown';

  const loadProfile = async (id: string) => {
    const rows = await base44.asServiceRole.entities.SecurityReadinessProfile
      .filter({ id }, '-created_date', 1).catch(() => []);
    return rows?.[0] || null;
  };

  if (b?.action === 'suspend') {
    const profile = await loadProfile(String(b.profile_id || ''));
    if (!profile) return err('Profile not found.', 404);
    await base44.asServiceRole.entities.SecurityReadinessProfile.update(profile.id, {
      status: 'suspended',
      suspended_reason: b.reason ? String(b.reason).slice(0, 500) : 'Suspended by an administrator.',
    });
    return ok({ suspended: true });
  }

  if (b?.action === 'approve') {
    const profile = await loadProfile(String(b.profile_id || ''));
    if (!profile) return err('Profile not found.', 404);

    if (String(profile.proposed_by || '').toLowerCase() === String(email).toLowerCase()) {
      return err('A profile must be approved by a second administrator. You proposed this one.', 403);
    }
    if (profile.status === 'approved' && hasTwoPersonApproval(profile)) {
      return err('This profile is already approved.', 409);
    }
    if (!profile.contact_verified_at) {
      return err('Verify that the authorised contact actually answers before approving this team.', 400);
    }
    if (!profile.escalation_tested_at) {
      return err('A tested escalation path is required before approval.', 400);
    }

    const days = Number(profile.review_interval_days) > 0 ? Number(profile.review_interval_days) : 30;
    const validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const approvals = [...(profile.approvals || []), { approver_email: email, approved_at: now, note: b.note || null }];

    const updated = await base44.asServiceRole.entities.SecurityReadinessProfile.update(profile.id, {
      status: 'approved',
      approved_by: email,
      approved_at: now,
      valid_until: validUntil,
      approvals,
    });

    return ok({ approved: true, valid_until: validUntil, profile: updated });
  }

  // ── Propose a new current version ────────────────────────────────────────
  const missing: string[] = [];
  const countryCode = String(b.country_code || '').toUpperCase().slice(0, 2);
  const coverageAreas = Array.isArray(b.coverage_areas)
    ? b.coverage_areas.map((a: any) => String(a).trim()).filter(Boolean)
    : [];
  const windows = Array.isArray(b.on_duty_windows) ? b.on_duty_windows : [];
  const channels = Array.isArray(b.communication_channels) ? b.communication_channels : [];

  if (countryCode.length !== 2) missing.push('a country');
  if (!b.team_label) missing.push('a team name');
  if (coverageAreas.length === 0) missing.push('the areas the team covers');
  if (windows.length === 0) missing.push('the hours someone is on duty');
  if (!b.timezone) missing.push('the team\'s time zone');
  if (!(b.authorized_contact_phone || b.authorized_contact_email)) missing.push('an authorised contact');
  if (channels.length === 0) missing.push('a channel that reaches them');
  if (!(b.escalation_contact_name || b.escalation_contact_phone)) missing.push('an escalation contact');

  if (missing.length > 0) {
    return err(`This team cannot be recorded yet. Add ${missing.join(', ')}.`, 400);
  }

  // A superseded row keeps its history and stops being evaluated.
  const current = await base44.asServiceRole.entities.SecurityReadinessProfile
    .filter({ country_code: countryCode, is_current: true }, '-created_date', 10).catch(() => []);
  const previous = (current || [])[0] || null;

  const created = await base44.asServiceRole.entities.SecurityReadinessProfile.create({
    country_code: countryCode,
    country_name: b.country_name || null,
    coverage_areas: coverageAreas,
    coverage_notes: b.coverage_notes || null,
    agency_id: b.agency_id || null,
    agency_name: b.agency_name || null,
    team_label: String(b.team_label).slice(0, 160),
    operational_hours: b.operational_hours || null,
    on_duty_windows: windows,
    timezone: b.timezone,
    authorized_contact_name: b.authorized_contact_name || null,
    authorized_contact_role: b.authorized_contact_role || null,
    authorized_contact_phone: b.authorized_contact_phone || null,
    authorized_contact_email: b.authorized_contact_email || null,
    contact_verified_at: b.contact_verified_at || null,
    contact_verified_by: b.contact_verified_by || null,
    communication_channels: channels,
    escalation_contact_name: b.escalation_contact_name || null,
    escalation_contact_phone: b.escalation_contact_phone || null,
    escalation_contact_email: b.escalation_contact_email || null,
    escalation_procedure: b.escalation_procedure || null,
    escalation_tested_at: b.escalation_tested_at || null,
    escalation_test_notes: b.escalation_test_notes || null,
    response_time_assumption_minutes: Number(b.response_time_assumption_minutes) || null,
    staffing_notes: b.staffing_notes || null,
    status: 'pending_approval',
    proposed_by: email,
    proposed_at: now,
    approvals: [],
    version: previous ? Number(previous.version || 1) + 1 : 1,
    supersedes_profile_id: previous?.id || null,
    is_current: true,
    review_interval_days: Number(b.review_interval_days) || 30,
  });

  if (previous) {
    await base44.asServiceRole.entities.SecurityReadinessProfile.update(previous.id, {
      is_current: false,
      superseded_by_profile_id: created.id,
    }).catch(() => {});
  }

  return ok({
    profile: created,
    needs_approval_by: 'a different administrator',
    note: 'Nothing is confirmed for travellers until a second administrator approves this team.',
  });
}, { name: 'manageSecurityReadiness', allowedRoles: ['admin', 'platform_admin'] }));