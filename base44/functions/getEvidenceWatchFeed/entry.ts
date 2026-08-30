/**
 * getEvidenceWatchFeed — the public, patient-facing read for Medical
 * Evidence Watch. Public (requireAuth: false), matching /procedures's own
 * openness — a real "what's new in medical research" feed is useful
 * pre-signup trust-building content too, not gated behind an account.
 *
 * Returns ONLY status:'approved' MedicalDiscovery rows, with reviewer
 * identity, internal notes, the edit history, the dedup content_hash, and
 * the originating run id stripped from the response. Everything else
 * (title, summary, stage, confidence, real sources/urls, dates, study
 * detail, availability-by-country) is included as-is — that's literally
 * what the "View evidence" action on the feed needs to show.
 */
import { createHandler, ok } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44 }) => {
  const rows = await base44.asServiceRole.entities.MedicalDiscovery
    .filter({ status: 'approved' }, '-created_at', 100)
    .catch(() => []);

  const feed = (rows as any[]).map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    condition_or_procedure: r.condition_or_procedure,
    device_or_treatment_name: r.device_or_treatment_name,
    country: r.country,
    institution: r.institution,
    evidence_stage: r.evidence_stage,
    study_size: r.study_size,
    study_type: r.study_type,
    identifier: r.identifier,
    plain_language_summary: r.plain_language_summary,
    limitations_and_unknowns: r.limitations_and_unknowns,
    availability_by_country: Array.isArray(r.availability_by_country) ? r.availability_by_country : [],
    sources: (Array.isArray(r.sources) ? r.sources : []).map((s: any) => ({
      tier: s.tier, url: s.url, publisher_domain: s.publisher_domain,
    })),
    confidence: r.confidence,
    published_at: r.published_at,
    retrieved_at: r.retrieved_at,
    freshness_date: r.freshness_date,
  }));

  return ok({ success: true, feed });
}, { name: 'getEvidenceWatchFeed', requireAuth: false }));
