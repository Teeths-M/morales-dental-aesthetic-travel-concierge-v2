import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../_shared/cronAuth.ts';
import { renderEmail } from '../_shared/emailTemplate.ts';

const BRAND = 'Morales Medical Travel Safety';

const formatMoney = (value) => value ? `$${Number(value).toLocaleString('en-US')}` : 'To be confirmed';

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

    const { workflow_id, quoted_price, notes, only_agency_id, doctor_email, doctor_name } = await req.json();

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

    if (doctor_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND,
          to: doctor_email,
          subject: `Procedure confirmed for ${workflow.patient_name} | ${BRAND}`,
          body: renderEmail({
            appUrl,
            eyebrow: 'Doctor confirmation',
            title: `Confirmed case: ${workflow.patient_name}`,
            intro: `Hello ${doctor_name || 'Doctor'}, this case has been assigned to you and is now moving into travel coordination.`,
            rows: [
              ['Patient', workflow.patient_name],
              ['Quoted price', formatMoney(quoted_price)],
              ['Requested date', consultation?.preferred_date ? new Date(consultation.preferred_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified'],
              ['Duration of stay', consultation?.duration_of_stay || 'Not specified'],
              ['Portal', 'Doctor case management'],
            ],
            note: notes || '',
            ctaText: 'Open portal',
            ctaUrl: portalLink,
          }),
        });
        results.doctor = 'sent';
      } catch (e) {
        results.doctor = `failed: ${e.message}`;
      }
    }

    const filteredAgencies = only_agency_id ? travelAgencies.filter(a => a.id === only_agency_id) : travelAgencies;
    for (const agency of filteredAgencies) {
      const offersFlights = agency.services_offered?.includes('flights');
      const offersHotels = agency.services_offered?.includes('hotels');
      const name = agency.agency_name || agency.email;

      if (offersFlights) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND,
            to: agency.email,
            subject: `Travel coordination needed for ${workflow.patient_name} | ${BRAND}`,
            body: renderEmail({
              appUrl,
              eyebrow: 'Travel request',
              title: 'Flight and itinerary quote needed',
              intro: `Hello ${name}, a doctor has confirmed this patient and travel planning can begin.`,
              rows: [
                ['Patient', workflow.patient_name],
                ['Doctor quote', formatMoney(quoted_price)],
                ['Requested service', 'Flights and travel itinerary'],
              ],
              note: notes || '',
              footer: 'Please reply with availability, routing options, and pricing.',
            }),
          });
          results.travel.push({ email: agency.email, name, status: 'sent' });
        } catch (e) {
          results.travel.push({ email: agency.email, name, status: 'failed', error: e.message });
        }
      }

      if (offersHotels) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND,
            to: agency.email,
            subject: `Recovery lodging needed for ${workflow.patient_name} | ${BRAND}`,
            body: renderEmail({
              appUrl,
              eyebrow: 'Accommodation request',
              title: 'Recovery hotel quote needed',
              intro: `Hello ${name}, this confirmed patient requires recovery-focused accommodation options.`,
              rows: [
                ['Patient', workflow.patient_name],
                ['Requested service', 'Recovery lodging'],
                ['Status', 'Doctor confirmed'],
              ],
              note: notes || '',
              footer: 'Please reply with room availability, recovery suitability, and pricing.',
            }),
          });
          results.hotel.push({ email: agency.email, name, status: 'sent' });
        } catch (e) {
          results.hotel.push({ email: agency.email, name, status: 'failed', error: e.message });
        }
      }
    }

    for (const taxi of taxiServices) {
      const name = taxi.driver_name || taxi.company_name || taxi.email;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND,
          to: taxi.email,
          subject: `Transfer coordination needed for ${workflow.patient_name} | ${BRAND}`,
          body: renderEmail({
            appUrl,
            eyebrow: 'Transfer request',
            title: 'Patient transfer quote needed',
            intro: `Hello ${name}, this confirmed patient will need reliable local transportation support.`,
            rows: [
              ['Patient', workflow.patient_name],
              ['Requested service', 'Airport, clinic, and hotel transfers'],
              ['Status', 'Doctor confirmed'],
            ],
            note: notes || '',
            footer: 'Please reply with availability, vehicle details, and pricing.',
          }),
        });
        results.cab.push({ email: taxi.email, name, status: 'sent' });
      } catch (e) {
        results.cab.push({ email: taxi.email, name, status: 'failed', error: e.message });
      }
    }

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: workflow.patient_email,
        subject: `Your doctor has confirmed | ${BRAND}`,
        body: renderEmail({
          appUrl,
          eyebrow: 'Care journey update',
          title: 'Your doctor has confirmed',
          intro: `Dear ${workflow.patient_name}, your doctor has confirmed your procedure. Our concierge team is now coordinating the next steps around travel, lodging, and local transfers.`,
          rows: [
            ['Current stage', 'Travel coordination'],
            ['Next update', 'Full package summary within 24–48 hours'],
          ],
          footer: 'Your concierge team will keep you updated as each part of your care journey is confirmed.',
        }),
      });
      results.patient = 'sent';
    } catch (e) {
      results.patient = `failed: ${e.message}`;
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
        await base44.functions.invoke('sendAIPartnerBriefs', { case_id: cases[0].id, workflow_id });
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