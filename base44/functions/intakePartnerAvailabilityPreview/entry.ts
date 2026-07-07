import { createHandler, ok, err } from '../_shared/createHandler.ts';

// ── intakePartnerAvailabilityPreview ─────────────────────────────────────────
// Read-only preview of travel/transfer partner coverage for a destination —
// powers the /intake conversation's "✓ Destination partners checked" progress
// item. No assignment side-effects (that happens later, in the real pipeline
// once a Consultation exists) — this only tells the narration how many
// vetted partners are already active there.

interface PreviewBody {
  destination_country?: string;
  destination_city?: string;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { destination_country, destination_city } = await body<PreviewBody>();

  if (!destination_country) {
    return err('destination_country is required');
  }

  const country = destination_country.toLowerCase();

  const [allAgencies, allTaxis] = await Promise.all([
    base44.asServiceRole.entities.TravelAgency.filter({ status: 'active', verification_status: 'verified' }, '-created_date', 500),
    base44.asServiceRole.entities.TaxiService.filter({ status: 'active', verification_status: 'verified' }, '-created_date', 500),
  ]);

  // Same best-effort country-in-region scoping already used elsewhere in this
  // codebase (pipelineOnDoctorConfirmed, onDoctorConfirmed) — service_regions
  // is broad ("Caribbean", "North America"), so an exact country match won't
  // always hit; fall back to the unscoped verified list rather than showing zero.
  let scopedAgencies = allAgencies.filter((a) =>
    a.service_regions?.some((r: string) => r.toLowerCase().includes(country))
  );
  if (scopedAgencies.length === 0) scopedAgencies = allAgencies;

  let scopedTaxis = allTaxis.filter((t) => t.operating_country?.toLowerCase() === country);
  if (destination_city) {
    const cityScoped = scopedTaxis.filter((t) => t.operating_city?.toLowerCase() === destination_city.toLowerCase());
    if (cityScoped.length > 0) scopedTaxis = cityScoped;
  }
  if (scopedTaxis.length === 0) scopedTaxis = allTaxis.filter((t) => t.operating_country?.toLowerCase() === country);

  return ok({
    travel_agency_count: scopedAgencies.length,
    taxi_service_count: scopedTaxis.length,
    sample_travel_agencies: scopedAgencies.slice(0, 3).map((a) => a.agency_name).filter(Boolean),
    sample_taxi_services: scopedTaxis.slice(0, 3).map((t) => t.driver_name || t.company_name).filter(Boolean),
  });
}, { name: 'intakePartnerAvailabilityPreview', requireAuth: false }));
