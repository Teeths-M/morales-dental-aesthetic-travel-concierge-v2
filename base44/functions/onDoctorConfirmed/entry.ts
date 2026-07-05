import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BRAND = 'Morales Medical Travel Safety';
const TEAM = 'Morales Concierge Team';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const formatMoney = (value) => value ? `$${Number(value).toLocaleString('en-US')}` : 'To be confirmed';

const row = (label, value) => `
  <tr>
    <td style="padding:10px 0;color:#64746d;font-size:13px;width:38%;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(value || 'Not provided')}</td>
  </tr>`;

const emailLayout = ({ eyebrow, title, intro, rows = [], note, ctaText, ctaUrl, footer = 'Please reply to this email if you need assistance.' }) => `<!doctype html>
<html>
  <body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;color:#13221d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="background:#29483d;padding:28px 32px;color:#ffffff;">
                <div style="font-family:Georgia,serif;font-size:26px;letter-spacing:-0.3px;">${BRAND}</div>
                <div style="margin-top:8px;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">${escapeHtml(eyebrow)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:30px;line-height:1.15;color:#13221d;font-weight:400;">${escapeHtml(title)}</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#40514a;">${escapeHtml(intro)}</p>
                ${rows.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin:22px 0;">${rows.join('')}</table>` : ''}
                ${note ? `<div style="margin:22px 0;padding:16px 18px;background:#f8f4ee;border-left:4px solid #b68a52;border-radius:12px;color:#40514a;font-size:14px;line-height:1.6;">${escapeHtml(note)}</div>` : ''}
                ${ctaText && ctaUrl ? `<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;margin-top:6px;background:#29483d;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:999px;font-size:14px;font-weight:700;">${escapeHtml(ctaText)}</a>` : ''}
                <p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:#64746d;">${escapeHtml(footer)}</p>
                <p style="margin:18px 0 0;font-size:14px;color:#13221d;font-weight:700;">${TEAM}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

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
          body: emailLayout({
            eyebrow: 'Doctor confirmation',
            title: `Confirmed case: ${workflow.patient_name}`,
            intro: `Hello ${doctor_name || 'Doctor'}, this case has been assigned to you and is now moving into travel coordination.`,
            rows: [
              row('Patient', workflow.patient_name),
              row('Quoted price', formatMoney(quoted_price)),
              row('Requested date', consultation?.preferred_date ? new Date(consultation.preferred_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified'),
              row('Duration of stay', consultation?.duration_of_stay || 'Not specified'),
              row('Portal', 'Doctor case management'),
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
            body: emailLayout({
              eyebrow: 'Travel request',
              title: 'Flight and itinerary quote needed',
              intro: `Hello ${name}, a doctor has confirmed this patient and travel planning can begin.`,
              rows: [
                row('Patient', workflow.patient_name),
                row('Doctor quote', formatMoney(quoted_price)),
                row('Requested service', 'Flights and travel itinerary'),
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
            body: emailLayout({
              eyebrow: 'Accommodation request',
              title: 'Recovery hotel quote needed',
              intro: `Hello ${name}, this confirmed patient requires recovery-focused accommodation options.`,
              rows: [
                row('Patient', workflow.patient_name),
                row('Requested service', 'Recovery lodging'),
                row('Status', 'Doctor confirmed'),
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
          body: emailLayout({
            eyebrow: 'Transfer request',
            title: 'Patient transfer quote needed',
            intro: `Hello ${name}, this confirmed patient will need reliable local transportation support.`,
            rows: [
              row('Patient', workflow.patient_name),
              row('Requested service', 'Airport, clinic, and hotel transfers'),
              row('Status', 'Doctor confirmed'),
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
        body: emailLayout({
          eyebrow: 'Care journey update',
          title: 'Your doctor has confirmed',
          intro: `Dear ${workflow.patient_name}, your doctor has confirmed your procedure. Our concierge team is now coordinating the next steps around travel, lodging, and local transfers.`,
          rows: [
            row('Current stage', 'Travel coordination'),
            row('Next update', 'Full package summary within 24–48 hours'),
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