import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { linkOnlyEmail } from '../../shared/notify.ts';

const BRAND = 'Morales Medical Travel Safety';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cron secret OR admin session. This endpoint had NO guard at all: it is
    // reachable over HTTP like every deployed function, so anyone with the URL
    // could drive it — triggering real notifications, spend and state changes.
    // NOTE: a Base44-dashboard schedule driving this must send X-Cron-Secret.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { workflow_id, only_agency_id, doctor_email } = await req.json();

    if (!workflow_id) {
      return Response.json({ error: 'workflow_id is required' }, { status: 400 });
    }

    const workflow = await base44.asServiceRole.entities.WorkflowEvent.get(workflow_id);
    if (!workflow) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Fetch consultation to get preferred date and duration
    let consultation = null;
    if (workflow.consultation_id) {
      try {
        consultation = await base44.asServiceRole.entities.Consultation.get(workflow.consultation_id);
      } catch (e) {
        console.log('Could not fetch consultation:', e.message);
      }
    }

    // Scope the partner broadcast to the destination country instead of blasting every
    // active partner globally on every single confirmed case — at high booking volume
    // this is the difference between notifying a handful of relevant partners and
    // sequentially emailing/SMS'ing the entire partner network per case. Falls back to
    // the full unscoped list if the country-scoped query finds nothing, so a case never
    // silently gets zero quote opportunities (e.g. no country on file, or no partners
    // yet registered for that specific country).
    const procedureCountry = consultation?.procedure_country;
    let travelAgencies = procedureCountry
      ? await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }, '-created_date', 1000)
      : [];
    if (procedureCountry) {
      const scopedAgencies = travelAgencies.filter(a =>
        a.service_regions?.some((r: string) => r.toLowerCase().includes(procedureCountry.toLowerCase()))
      );
      if (scopedAgencies.length > 0) travelAgencies = scopedAgencies;
    } else {
      travelAgencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }, '-created_date', 1000);
    }

    let taxiServices = procedureCountry
      ? await base44.asServiceRole.entities.TaxiService.filter({ status: 'active', operating_country: procedureCountry }, '-created_date', 500)
      : [];
    if (taxiServices.length === 0) {
      taxiServices = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }, '-created_date', 1000);
    }

    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const portalLink = `${appUrl}/admin`;

    const results = { travel: [], hotel: [], cab: [], patient: null, doctor: null };

    // Real patient/quote/schedule detail stays in the portal each link opens —
    // these emails only say a new case or request is waiting.
    if (doctor_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND,
          to: doctor_email,
          subject: `A confirmed case is ready for your review | ${BRAND}`,
          body: linkOnlyEmail({
            title: 'A confirmed case is ready for your review',
            line: 'A case has been assigned to you and is now moving into travel coordination. Open your portal for the case detail and quote.',
            ctaUrl: portalLink,
            ctaLabel: 'Open Portal',
            brand: BRAND,
            from: 'onDoctorConfirmed',
          }),
        });
        results.doctor = 'sent';
      } catch (e) {
        results.doctor = 'failed';
      }
    }

    const filteredAgencies = only_agency_id ? travelAgencies.filter(a => a.id === only_agency_id) : travelAgencies;
    for (const agency of filteredAgencies) {
      const offersFlights = agency.services_offered?.includes('flights');
      const offersHotels = agency.services_offered?.includes('hotels');

      if (offersFlights) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND,
            to: agency.email,
            subject: `Travel coordination needed | ${BRAND}`,
            body: linkOnlyEmail({
              title: 'Flight and itinerary quote needed',
              line: 'A confirmed patient needs flight and travel itinerary coordination. Open your portal to submit availability, routing, and pricing.',
              ctaUrl: portalLink,
              ctaLabel: 'Open Portal',
              brand: BRAND,
              from: 'onDoctorConfirmed',
            }),
          });
          results.travel.push({ email: agency.email, status: 'sent' });
        } catch (e) {
          results.travel.push({ email: agency.email, status: 'failed' });
        }
      }

      if (offersHotels) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND,
            to: agency.email,
            subject: `Recovery lodging needed | ${BRAND}`,
            body: linkOnlyEmail({
              title: 'Recovery hotel quote needed',
              line: 'A confirmed patient needs recovery-focused accommodation options. Open your portal to submit availability and pricing.',
              ctaUrl: portalLink,
              ctaLabel: 'Open Portal',
              brand: BRAND,
              from: 'onDoctorConfirmed',
            }),
          });
          results.hotel.push({ email: agency.email, status: 'sent' });
        } catch (e) {
          results.hotel.push({ email: agency.email, status: 'failed' });
        }
      }
    }

    for (const taxi of taxiServices) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND,
          to: taxi.email,
          subject: `Transfer coordination needed | ${BRAND}`,
          body: linkOnlyEmail({
            title: 'Patient transfer quote needed',
            line: 'A confirmed patient will need local transportation support. Open your portal to submit availability and pricing.',
            ctaUrl: portalLink,
            ctaLabel: 'Open Portal',
            brand: BRAND,
            from: 'onDoctorConfirmed',
          }),
        });
        results.cab.push({ email: taxi.email, status: 'sent' });
      } catch (e) {
        results.cab.push({ email: taxi.email, status: 'failed' });
      }
    }

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: workflow.patient_email,
        subject: `Your doctor has confirmed | ${BRAND}`,
        body: linkOnlyEmail({
          title: 'Your doctor has confirmed',
          line: 'Your doctor has confirmed your procedure. Our concierge team is now coordinating the next steps around travel, lodging, and local transfers.',
          ctaUrl: `${appUrl}/dashboard`,
          ctaLabel: 'Open My Journey',
          brand: BRAND,
          from: 'onDoctorConfirmed',
        }),
      });
      results.patient = 'sent';
    } catch (e) {
      results.patient = 'failed';
    }

    await base44.asServiceRole.entities.WorkflowEvent.update(workflow_id, {
      stage: 'travel',
      travel_status: results.travel.length > 0 ? 'notified' : 'pending',
      hotel_status: results.hotel.length > 0 ? 'notified' : 'pending',
      cab_status: results.cab.length > 0 ? 'notified' : 'pending',
    });

    // Fire AI partner briefs — each partner receives a personalized brief in their own language
    try {
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ consultation_id: workflow.consultation_id });
      if (cases[0]?.id) {
        await base44.functions.invoke('sendAIPartnerBriefs', { case_id: cases[0].id, workflow_id, internal_secret: Deno.env.get('CRON_SECRET') });
      }
    } catch (e) {
      console.error('[onDoctorConfirmed] AI briefs (non-fatal):', e?.message);
    }

    return Response.json({ status: 'ok', results });
  } catch (error) {
    console.error('[onDoctorConfirmed]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
