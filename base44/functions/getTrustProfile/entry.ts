// getTrustProfile — returns the explainable TrustProfile for a subject
// (a user's own profile, or a partner's public profile). Never exposes
// passport numbers, selfies, raw ID images, or unnecessary PII — only
// the sanitized evidence summary, verification level, dates, sources,
// limitations, and a 'report a concern' pointer. Audits every view.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { logTrustScanEvent } from '../../shared/trustScanAudit.ts';
import { VERIFICATION_LEVELS, defaultLimitations } from '../../shared/trustScanLevels.ts';

async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const subjectEmail = String(body.subjectEmail || body.email || '').toLowerCase();
    const partnerId = body.partnerId ? String(body.partnerId) : undefined;

    if (!subjectEmail && !partnerId) {
      return Response.json({ error: 'subjectEmail or partnerId is required.' }, { status: 400 });
    }

    // Find the TrustProfile. Public profiles (is_publicly_bookable) are
    // readable by any authenticated user; private ones only by the owner
    // or an admin — enforced by RLS on the entity.
    const filter: any = subjectEmail ? { subject_email: subjectEmail } : { subject_partner_id: partnerId };
    const matches = await base44.entities.TrustProfile.filter(filter, '-created_date', 1);
    const profile = matches && matches.length > 0 ? matches[0] : null;

    // If a partner is asking about their own profile by email but no
    // TrustProfile exists yet, return an honest 'not yet verified' shape
    // rather than a 404 — the UI explains the next safe action.
    if (!profile) {
      await logTrustScanEvent(base44.asServiceRole, {
        event_type: 'trustscan_profile_viewed',
        actor_id: user.id,
        actor_email: user.email,
        resource_type: 'TrustProfile',
        resource_id: subjectEmail || partnerId,
        details: { found: false, subject_email: subjectEmail },
        sensitive: false,
      });
      return Response.json({
        found: false,
        subject_email: subjectEmail,
        verification_level: 'basic',
        identity_verified: false,
        license_verified: false,
        facility_verified: false,
        documents_status: 'none',
        limitations: defaultLimitations('basic', true),
        message: 'This person has not completed identity verification yet.',
      });
    }

    await logTrustScanEvent(base44.asServiceRole, {
      event_type: 'trustscan_profile_viewed',
      actor_id: user.id,
      actor_email: user.email,
      resource_type: 'TrustProfile',
      resource_id: profile.id,
      details: { subject_email: profile.subject_email, level: profile.verification_level, public: !!profile.is_publicly_bookable },
      sensitive: false,
    });

    // Strip any field that could leak PII before returning.
    const level = VERIFICATION_LEVELS[profile.verification_level as keyof typeof VERIFICATION_LEVELS] || VERIFICATION_LEVELS.basic;
    return Response.json({
      found: true,
      id: profile.id,
      subject_type: profile.subject_type,
      subject_name: profile.subject_name,
      subject_partner_type: profile.subject_partner_type,
      verification_level: profile.verification_level,
      level_label: level.label,
      level_description: level.description,
      identity_verified: !!profile.identity_verified,
      identity_verified_at: profile.identity_verified_at,
      license_verified: !!profile.license_verified,
      license_source: profile.license_source,
      license_verified_at: profile.license_verified_at,
      facility_verified: !!profile.facility_verified,
      facility_verified_at: profile.facility_verified_at,
      documents_status: profile.documents_status,
      partner_since: profile.partner_since,
      limitations: profile.limitations?.length ? profile.limitations : defaultLimitations(profile.verification_level, profile.sandbox),
      evidence_summary: profile.evidence_summary || [],
      is_publicly_bookable: !!profile.is_publicly_bookable,
      suspended: !!profile.suspended,
      suspended_reason: profile.suspended_reason,
      sandbox: profile.sandbox ?? true,
      report_count: profile.report_count || 0,
      last_updated_at: profile.last_updated_at,
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

Deno.serve(handler);