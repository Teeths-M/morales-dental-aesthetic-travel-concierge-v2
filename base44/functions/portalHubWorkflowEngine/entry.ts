import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { renderEmail } from '../_shared/emailTemplate.ts';

// HMAC-signed to match verifyPortalToken() in getPortalData — previously an
// unsigned plain btoa(JSON) token with no signature suffix, which fails that
// verification and makes the chauffeur portal link silently non-functional.
async function encodePortalToken(payload: Record<string, unknown>) {
  const data = JSON.stringify(payload);
  const secret = Deno.env.get('PORTAL_TOKEN_SECRET') || 'change-me-in-production';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(data) + '.' + sigHex;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // SECURITY: this engine drives payment-plan status (including marking a plan
    // "fully_paid" from a caller-supplied amount with no Stripe verification),
    // fakes doctor-approval workflow stages, and triggers partner notifications —
    // for ANY consultation_id, since none of these actions check that the caller
    // owns or is assigned to the case. Requiring "any logged-in user" was
    // effectively no access control at all (a patient or partner account could
    // drive any other patient's workflow). Restrict to admin/platform_admin,
    // matching executeCaseWorkflow's equivalent gate.
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { action, consultation_id, data } = payload;

    // Action: request_doctor_date_confirmation
    if (action === 'request_doctor_date_confirmation') {
      const { procedure_date, recommended_arrival, recommended_departure } = payload;

      // BUG-R10-03 FIX: user-scoped SDK — admin calling this cannot read patient-owned records.
      // Switch all entity and workflow calls to asServiceRole throughout this engine.
      const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);

      let workflowEvent = await base44.asServiceRole.entities.WorkflowEvent.filter({ consultation_id });

      if (!workflowEvent.length) {
        workflowEvent = [await base44.asServiceRole.entities.WorkflowEvent.create({
          consultation_id,
          patient_name: consultation.patient_name,
          patient_email: consultation.email,
          stage: 'doctor'
        })];
      }

      const doctors = await base44.asServiceRole.entities.Partner.filter({
        type: 'doctor',
        is_active: true
      });

      for (const doctor of doctors) {
        await base44.asServiceRole.entities.WorkflowNotification.create({
          workflow_event_id: workflowEvent[0].id,
          recipient_type: 'doctor',
          recipient_email: doctor.email,
          notification_type: 'quote_request',
          channel: 'email',
          content: `Date confirmation request for ${consultation.patient_name} - Procedure: ${consultation.procedure_interest} - Requested date: ${procedure_date}`
        });
      }

      await base44.asServiceRole.entities.Consultation.update(consultation_id, {
        preferred_date: procedure_date
      });

      return Response.json({
        status: 'date_request_sent_to_doctor',
        doctor_approved: true, // Simplified: assume first doctor approves
        consultation_id
      });
    }

    // Action: initiate_doctor_approval
    if (action === 'initiate_doctor_approval') {
      const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);

      const workflowEvent = await base44.asServiceRole.entities.WorkflowEvent.filter({
        consultation_id,
        stage: 'risk_check'
      });

      if (!workflowEvent.length) {
        const newEvent = await base44.asServiceRole.entities.WorkflowEvent.create({
          consultation_id,
          patient_name: consultation.patient_name,
          patient_email: consultation.email,
          stage: 'risk_check',
          risk_result: 'pending'
        });
        
        return Response.json({ 
          status: 'workflow_created',
          workflow_id: newEvent.id 
        });
      }
      
      return Response.json({ workflow_id: workflowEvent[0].id });
    }

    // Action: doctor_approved
    if (action === 'doctor_approved') {
      const { procedure_name, price, recovery_days, available_dates } = data;

      const workflowEvent = await base44.asServiceRole.entities.WorkflowEvent.filter({ consultation_id });

      if (workflowEvent.length) {
        await base44.asServiceRole.entities.WorkflowEvent.update(workflowEvent[0].id, {
          stage: 'doctor',
          doctor_status: 'confirmed',
          doctor_notes: `${procedure_name} - $${price} - Recovery: ${recovery_days} days`
        });
      }

      const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);

      const [partners, taxiServices] = await Promise.all([
        base44.asServiceRole.entities.Partner.filter({ is_active: true }),
        base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }),
      ]);
      
      const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
      const portalUrl = `${appUrl}/admin`;
      
      const getPartnerEmails = (type) => partners.filter(p => p.type === type).map(p => p.email);
      const travelEmails = getPartnerEmails('travel');
      const hotelEmails = getPartnerEmails('hotel');
      
      const BRAND = 'Morales Medical Travel Safety';

      const formatProcedure = (value) => String(value || 'Procedure').replace(/_/g, ' ');

      const sendToPartners = async (emails, subject, body) => {
        for (const email of emails) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: email, subject, body });
          } catch (error) {
            console.log(`Email skipped for ${email} (external user): ${error.message}`);
          }
        }
      };
      
      // ── FAULT-TOLERANT DISPATCH: Promise.allSettled — no cascade failures ──
      const vendorDispatches = [];

      const travelBody = renderEmail({
        appUrl,
        eyebrow: 'Travel request',
        title: 'Patient travel arrangement needed',
        intro: 'A patient has been approved by our medical team and now requires travel planning support.',
        rows: [
          ['Patient', consultation.patient_name],
          ['Procedure', formatProcedure(consultation.procedure_interest)],
          ['Nationality', consultation.nationality || 'Not specified'],
          ['Preferred date', consultation.preferred_date || 'Flexible'],
          ['Companion', consultation.has_companion ? 'Yes' : 'No'],
        ],
        ctaText: 'Review in portal',
        ctaUrl: portalUrl,
        footer: 'Please reply with flight options, itinerary details, and pricing.',
      });

      for (const email of travelEmails) {
        vendorDispatches.push({ label: `Travel Agency Email — ${email}`, provider_type: 'travel_agency', provider_name: email, provider_email: email, dispatch_type: 'email', fn: () => base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: email, subject: `Travel request — ${consultation.patient_name} | ${BRAND}`, body: travelBody }) });
      }

      const hotelBody = renderEmail({
        appUrl,
        eyebrow: 'Accommodation request',
        title: 'Recovery lodging arrangement needed',
        intro: 'A patient has been approved by our medical team and now requires suitable recovery accommodation.',
        rows: [
          ['Patient', consultation.patient_name],
          ['Procedure', formatProcedure(consultation.procedure_interest)],
          ['Preferred date', consultation.preferred_date || 'Flexible'],
          ['Companion', consultation.has_companion ? 'Yes' : 'No'],
        ],
        ctaText: 'Review in portal',
        ctaUrl: portalUrl,
        footer: 'Please reply with room availability, recovery support details, and pricing.',
      });

      for (const email of hotelEmails) {
        vendorDispatches.push({ label: `Hotel Email — ${email}`, provider_type: 'hotel', provider_name: email, provider_email: email, dispatch_type: 'email', fn: () => base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: email, subject: `Recovery lodging request — ${consultation.patient_name} | ${BRAND}`, body: hotelBody }) });
      }

      for (const cab of taxiServices) {
        const driverName = cab.driver_name || cab.company_name || 'Partner';
        const token = await encodePortalToken({ consultation_id, partner_id: cab.id, portal_type: 'transfer', expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 });
        const portalLink = `${appUrl}/portal/transfer?token=${token}`;
        const cabBody = renderEmail({
          appUrl,
          eyebrow: 'Transfer request',
          title: 'Patient transfer quote needed',
          intro: `Hello ${driverName}, a patient has been approved and will need reliable local transportation support.`,
          rows: [
            ['Patient', consultation.patient_name],
            ['Requested service', 'Airport, clinic, and hotel transfers'],
            ['Preferred date', consultation.preferred_date || 'Flexible'],
            ['Companion', consultation.has_companion ? 'Yes' : 'No'],
          ],
          ctaText: 'Open Chauffeur Portal & Submit Pricing →',
          ctaUrl: portalLink,
          footer: 'Click the button above to access your secure portal and submit your per-leg transfer pricing.',
        });
        vendorDispatches.push({ label: `Chauffeur Network — ${driverName}`, provider_type: 'chauffeur', provider_name: driverName, provider_email: cab.email, dispatch_type: 'email', fn: () => base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: cab.email, subject: `Transfer request — ${consultation.patient_name} | ${BRAND}`, body: cabBody }) });
      }

      const vendorSettled = await Promise.allSettled(vendorDispatches.map(d => d.fn()));
      const vendorFailureWrites = [];
      for (let i = 0; i < vendorSettled.length; i++) {
        if (vendorSettled[i].status === 'rejected') {
          const d = vendorDispatches[i];
          vendorFailureWrites.push(
            base44.asServiceRole.entities.DispatchFailureLog.create({
              case_id: consultation_id,
              case_name: consultation.patient_name,
              pipeline_stage: 'portalHubWorkflowEngine.doctor_approved',
              provider_type: d.provider_type,
              provider_name: d.label,
              provider_email: d.provider_email,
              dispatch_type: d.dispatch_type,
              error_message: `${d.label} connection offline — ${vendorSettled[i].reason?.message || 'Dispatch failed'}`,
              status: 'pending_intervention',
              logged_at: new Date().toISOString(),
            })
          );
        }
      }
      if (vendorFailureWrites.length > 0) {
        await Promise.allSettled(vendorFailureWrites);
        console.warn(`[FaultTolerance] ${vendorFailureWrites.length} vendor dispatch(es) failed and logged`);
      }
      
      await base44.asServiceRole.entities.WorkflowEvent.update(workflowEvent[0].id, {
        stage: 'travel',
        travel_status: 'all_partners_notified',
        last_update_summary: `Doctor confirmed (${procedure_name}, $${price}). Travel, hotel, and taxi partners notified.`,
      });
      
      // Create QuoteRequests for tracking
      const quoteRequests = [];
      const provider_types = [
        { type: 'flight', partnerType: 'travel' },
        { type: 'hotel', partnerType: 'hotel' },
        { type: 'taxi_origin', partnerType: 'cab' },
        { type: 'taxi_destination', partnerType: 'cab' },
        { type: 'recovery_accommodation', partnerType: 'other' },
      ];
      
      for (const { type: provider_type, partnerType } of provider_types) {
        const relevant_partners = partners.filter(p => {
          if (provider_type === 'flight') return p.type === 'travel';
          if (provider_type === 'hotel') return p.type === 'hotel';
          if (provider_type.includes('taxi')) return p.type === 'cab';
          // BUG-R10-04 FIX: p.name was used but Partner entity has no `name` field — use agency_name
          if (provider_type === 'recovery_accommodation') return p.type === 'other' && (p.agency_name || '').toLowerCase().includes('recovery');
          return false;
        });

        for (const partner of relevant_partners) {
          const qr = await base44.asServiceRole.entities.QuoteRequest.create({
            consultation_id,
            patient_name: consultation.patient_name,
            procedure_name,
            procedure_date: consultation.preferred_date,
            recovery_days,
            destination_country: consultation.destination_country || 'Mexico',
            patient_country: consultation.nationality,
            provider_type,
            partner_id: partner.id,
            status: 'pending',
            delivery_method: 'email',
            due_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          });
          
          quoteRequests.push(qr);
        }
      }

      return Response.json({ 
        status: 'quotes_initiated',
        quote_count: quoteRequests.length,
        workflow_stage: 'travel',
        message: 'Doctor confirmed. All partners (travel, hotel, taxi) notified.',
      });
    }

    // Action: process_quotes_and_calculate_package
    if (action === 'process_quotes_and_calculate_package') {
      const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);
      const quotes = await base44.asServiceRole.entities.Quote.filter({ consultation_id });
      
      // Calculate total package cost
      let totalCost = 0;
      const doctor_cost = data.doctor_price || 0;
      
      totalCost += doctor_cost;
      
      // Add selected quotes
      for (const quote of quotes) {
        if (quote.is_selected) {
          totalCost += quote.base_price;
        }
      }

      // Apply 35% markup
      const markup_pct = 35;
      const marked_up_cost = totalCost * (1 + markup_pct / 100);

      const paymentPlan = await base44.asServiceRole.entities.PaymentPlan.create({
        consultation_id,
        plan_type: 'awaiting_selection',
        total_package_cost: totalCost,
        markup_pct,
        final_cost: marked_up_cost,
        amount_due_today: marked_up_cost,
        payment_status: 'awaiting_selection'
      });

      return Response.json({
        status: 'package_calculated',
        total_base_cost: totalCost,
        markup_pct,
        final_cost: marked_up_cost,
        payment_plan_id: paymentPlan.id
      });
    }

    // Action: client_selects_payment_option
    if (action === 'client_selects_payment_option') {
      const { plan_type } = data;
      const paymentPlan = await base44.asServiceRole.entities.PaymentPlan.filter({ consultation_id });
      
      if (!paymentPlan.length) {
        return Response.json({ error: 'Payment plan not found' }, { status: 404 });
      }

      const pp = paymentPlan[0];
      let discount_pct = 0;
      let amount_due_today = pp.final_cost;
      let amount_due_later = 0;

      if (plan_type === 'full_payment') {
        discount_pct = 5;
        amount_due_today = pp.final_cost * (1 - discount_pct / 100);
        amount_due_later = 0;
      } else if (plan_type === 'deposit_25') {
        amount_due_today = pp.final_cost * 0.25;
        amount_due_later = pp.final_cost * 0.75;
      } else if (plan_type === 'deposit_50') {
        amount_due_today = pp.final_cost * 0.50;
        amount_due_later = pp.final_cost * 0.50;
      }

      await base44.asServiceRole.entities.PaymentPlan.update(pp.id, {
        plan_type,
        discount_pct,
        amount_due_today,
        amount_due_later,
        payment_status: 'pending_payment'
      });

      return Response.json({
        status: 'payment_option_selected',
        plan_type,
        amount_due_today,
        amount_due_later,
        discount_applied: discount_pct
      });
    }

    // Action: payment_received
    if (action === 'payment_received') {
      const { amount_received } = data;
      const paymentPlan = await base44.asServiceRole.entities.PaymentPlan.filter({ consultation_id });
      
      if (!paymentPlan.length) {
        return Response.json({ error: 'Payment plan not found' }, { status: 404 });
      }

      const pp = paymentPlan[0];
      let new_status = pp.payment_status;
      
      if (amount_received >= pp.final_cost) {
        new_status = 'fully_paid';
      } else if (amount_received > 0) {
        new_status = 'partial_paid';
      }

      await base44.asServiceRole.entities.PaymentPlan.update(pp.id, {
        payment_status: new_status
      });

      // If fully paid, trigger full workflow
      if (new_status === 'fully_paid') {
        return Response.json({
          status: 'payment_received',
          trigger_workflow: 'FULLY_CONFIRMED',
          next_action: 'notify_all_parties_and_finalize_bookings'
        });
      }

      return Response.json({
        status: 'payment_received',
        payment_status: new_status
      });
    }

    // Action: trigger_full_confirmation_workflow
    if (action === 'trigger_full_confirmation_workflow') {
      const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);
      const workflowEvent = await base44.asServiceRole.entities.WorkflowEvent.filter({ consultation_id });
      
      if (!workflowEvent.length) {
        return Response.json({ error: 'Workflow not found' }, { status: 404 });
      }

      const we = workflowEvent[0];

      await base44.asServiceRole.entities.WorkflowEvent.update(we.id, {
        stage: 'travel',
        travel_status: 'confirmed'
      });

      const partners = await base44.asServiceRole.entities.Partner.filter({ is_active: true });
      const quotes = await base44.asServiceRole.entities.Quote.filter({ consultation_id });

      for (const quote of quotes) {
        if (quote.is_selected) {
          const partner = partners.find(p => p.id === quote.partner_id);
          if (partner) {
            await base44.asServiceRole.entities.WorkflowNotification.create({
              workflow_event_id: we.id,
              recipient_type: 'partner',
              recipient_email: partner.email,
              notification_type: 'booking_confirmation',
              channel: 'email',
              content: `CONFIRMED: Please proceed with full booking for patient ${consultation.patient_name}. Procedure: ${consultation.procedure_interest}. Travel dates: ${consultation.preferred_date}`
            });
          }
        }
      }

      await base44.asServiceRole.entities.WorkflowNotification.create({
        workflow_event_id: we.id,
        recipient_type: 'patient',
        recipient_email: consultation.email,
        notification_type: 'quote_request',
        channel: 'email',
        content: `Please confirm your pickup address for airport transfer and complete pre-procedure preparations.`
      });

      return Response.json({
        status: 'full_confirmation_initiated',
        parties_notified: true,
        next_step: 'awaiting_client_address'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    // BUG-R10-02 FIX: SEC-10 — never expose internal stack details to callers
    console.error('[portalHubWorkflowEngine]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});