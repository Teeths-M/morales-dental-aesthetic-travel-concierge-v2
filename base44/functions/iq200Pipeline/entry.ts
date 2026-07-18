import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { renderEmail } from '../_shared/emailTemplate.ts';
import { createHandler } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, consultation_id, case_id, payload } = await req.json();

    // GET_CASE: Retrieve case by proposal token (no auth required - public link)
    if (action === 'get_case') {
      const { token, type } = payload;
      
      if (!token) {
        return Response.json({ error: 'No token provided' }, { status: 400 });
      }

      // Find case by proposal token
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ proposal_token: token });
      
      if (!cases || cases.length === 0) {
        return Response.json({ case: null, error: 'Proposal not found' }, { status: 404 });
      }

      const caseRecord = cases[0];
      // SECURITY: Return only client-safe proposal fields.
      // NEVER expose PHI, medical history, passport tokens, signatures, or internal data.
      const proposalDTO = {
        id: caseRecord.id,
        status: caseRecord.status,
        client_name: caseRecord.client_name,
        procedures: caseRecord.procedures,
        procedure_country: caseRecord.procedure_country,
        final_package_price: caseRecord.final_package_price,
        deposit_option: caseRecord.deposit_option,
        payment_status: caseRecord.payment_status,
        amount_paid: caseRecord.amount_paid,
        amount_remaining: caseRecord.amount_remaining,
        treatment_duration: caseRecord.treatment_duration,
        recovery_days: caseRecord.recovery_days,
        hotel_name: caseRecord.hotel_name,
        hotel_address: caseRecord.hotel_address,
        flight_details: caseRecord.flight_details,
        proposal_sent_at: caseRecord.proposal_sent_at,
        doctor_selected: caseRecord.doctor_selected,
        clinic_selected: caseRecord.clinic_selected,
        consultation_fee_paid: caseRecord.consultation_fee_paid,
        consultation_fee_amount: caseRecord.consultation_fee_amount,
        // Explicitly excluded: medications, allergies, medical_conditions, anesthesia_history,
        // mental_health_notes, signature_data, doctor_portal_token, admin_notes, timeline_log,
        // safe_t_result, safe_t_flags, risk_score, client_email, client_phone, client_country,
        // stripe_payment_id, consultation_id, informed_consent_email_html, passport tokens,
        // base_cost, markup_percentage (internal commission data — RBAC_AUDIT_PLAN.md P1-F)
      };
      return Response.json({ case: proposalDTO });
    }

    // GET_MY_CASE: the authenticated patient's own case status, for their dashboard poll.
    // BUG FIX: this action was called by CaseStatusModule.jsx every 30s but never existed
    // in this function — every action below requires admin auth, so the poll has always
    // either 403'd or silently returned nothing for real patients. Must sit before the
    // admin gate below since a regular client (not an admin) needs to reach it.
    if (action === 'get_my_case') {
      const me = await base44.auth.me().catch(() => null);
      if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const cases = await base44.asServiceRole.entities.CaseRecord.filter(
        { client_email: me.email }, '-created_date', 5
      );

      // SECURITY: this is the owner's own data, but still exclude internal-only /
      // admin-facing fields that a patient dashboard has no reason to receive.
      const safeCases = cases.map((c) => ({
        id: c.id,
        consultation_id: c.consultation_id,
        case_record_id: c.id,
        status: c.status,
        workflow_stage: c.workflow_stage,
        safe_t_result: c.safe_t_result,
        risk_flags: c.risk_flags,
        payment_status: c.payment_status,
        final_package_price: c.final_package_price,
        amount_paid: c.amount_paid,
        amount_remaining: c.amount_remaining,
        consultation_fee_paid: c.consultation_fee_paid,
        consultation_fee_amount: c.consultation_fee_amount,
        proposal_token: c.proposal_token,
        created_date: c.created_date,
      }));

      return Response.json({ cases: safeCases });
    }

    // All other actions require admin authentication
    const user = await base44.auth.me().catch(() => null);
    // BUG-R9-03 FIX: platform_admin must also be allowed — isAdmin only checked 'admin',
    // blocking platform_admin users from all create/approve/escalate/process actions.
    const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';

    if (!isAdmin) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // CREATE: Ingest consultation into IQ200 pipeline
    if (action === 'create') {
      // BUG-R9-01 FIX: use asServiceRole — consultations are owned by the patient user,
      // not by the admin triggering the pipeline. user-scoped .get() returns 404.
      const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);
      
      if (!consultation) {
        return Response.json({ error: 'Consultation not found' }, { status: 404 });
      }

      // IDEMPOTENCY: return existing CaseRecord if already created
      const existing = await base44.asServiceRole.entities.CaseRecord.filter({ consultation_id });
      if (existing && existing.length > 0) {
        return Response.json({
          success: true,
          case_record: existing[0],
          already_exists: true,
          message: 'CaseRecord already exists for this consultation',
        });
      }

      // Safe to create — no existing record
      // BUG-R9-01 FIX: use asServiceRole for the create so the record is system-owned
      // and visible to all admin functions that query it with asServiceRole.
      const caseRecord = await base44.asServiceRole.entities.CaseRecord.create({
        consultation_id: consultation.id,
        client_name: consultation.patient_name,
        client_email: consultation.email,
        client_phone: consultation.phone,
        client_country: consultation.client_country,
        emergency_contact: consultation.emergency_contact_name,
        procedure_country: consultation.destination_country,
        procedures: [consultation.procedure_interest],
        consultation_summary: consultation.notes || 'No summary provided',
        medications: consultation.takes_medications ? consultation.medication_types?.join(', ') : 'None',
        allergies: consultation.allergies?.join(', ') || 'None',
        smoking_status: consultation.lifestyle_habits?.includes('Smoking'),
        alcohol_use: consultation.lifestyle_habits?.includes('Alcohol') ? 'Moderate' : 'None',
        medical_conditions: consultation.medical_conditions?.join(', ') || 'None',
        anesthesia_history: consultation.anesthesia_complications ? 'Previous complications' : 'No complications',
        mental_health_notes: consultation.emotional_notes || 'N/A',
        pregnancy_status: consultation.pregnancy_status === 'Yes',
        exercise_level: consultation.activity_level || 'Moderate',
        status: 'Submitted',
        safe_t_result: 'PENDING',
        timeline_log: [{
          timestamp: new Date().toISOString(),
          action: 'created',
          details: 'Case created from consultation'
        }]
      });

      // AUTO-ASSIGN: Fetch default doctor from DB (admin-configurable via DefaultDoctorConfig entity)
      // HIGH-RISK GATE: Skip auto-assignment entirely for flagged consultations.
      // These stay at Admin-Review until a concierge admin manually clears and assigns.
      if (consultation.high_risk_medical_review === true) {
        await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
          status: 'Admin-Review',
          timeline_log: [
            ...(caseRecord.timeline_log || []),
            {
              timestamp: new Date().toISOString(),
              action: 'high_risk_hold',
              details: `Case held for Senior Medical Review — flagged condition: ${consultation.high_risk_flagged_condition || 'high-risk condition'}. Doctor assignment blocked until admin clears.`
            }
          ]
        });

        // Notify Slack — fire-and-forget, never blocks the pipeline
        base44.functions.invoke('notifySlackHighRisk', {
          patient_name: consultation.patient_name,
          flagged_condition: consultation.high_risk_flagged_condition || 'High-risk condition',
          procedure: consultation.procedure_interest,
          case_id: caseRecord.id,
        }).catch(e => console.error('[iq200Pipeline] Slack notify failed (non-fatal):', e.message));
      }

      // ── SAFETY-FIRST: deterministic Safe-T scan BEFORE any doctor is contacted ─
      // MARKETPLACE MODEL: the old single-doctor auto-assignment / load-balancer was
      // removed. After Safe-T clears, matched specialist doctors are INVITED to quote
      // and the PATIENT chooses (requestDoctorQuotes → selectDoctorQuote). No doctor is
      // contacted, and no proposal is sent, until Safe-T has genuinely cleared.
      try {
        await base44.functions.invoke('safeT4LifeScan', { caseId: caseRecord.id });
      } catch (scanError) {
        console.error('SAFE-T scan failed:', scanError);
      }

      // Re-read the authoritative safe_t_result the scan wrote to the case.
      const scanned = await base44.asServiceRole.entities.CaseRecord.get(caseRecord.id).catch(() => caseRecord);
      const safeTCleared = scanned?.safe_t_result === 'PASSED';

      // A harmless proposal token for later. The proposal is now sent only AFTER the
      // patient picks a doctor and the package is assembled — NEVER here. Status is no
      // longer advanced to 'Proposal-Sent' at case creation.
      const proposalToken = `prop_${caseRecord.id}`;
      await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, { proposal_token: proposalToken }).catch(() => {});

      // ── MARKETPLACE FAN-OUT — FAIL-CLOSED ────────────────────────────────────
      // Invite matched specialists to quote ONLY when Safe-T cleared AND the case is
      // not held for high-risk review. Otherwise no doctor is contacted; the case waits
      // for a human (Admin-Review) or a signed waiver. requestDoctorQuotes re-checks the
      // same gate defensively.
      let doctorsInvited = false;
      if (safeTCleared && consultation.high_risk_medical_review !== true) {
        try {
          const r = await base44.functions.invoke('requestDoctorQuotes', { case_id: caseRecord.id });
          doctorsInvited = !!(r?.data?.fanned_out ?? r?.fanned_out);
        } catch (e) {
          console.error('[iq200Pipeline] requestDoctorQuotes failed (non-fatal):', e.message);
        }
      }

      return Response.json({
        status: 'CREATED',
        case_id: caseRecord.id,
        proposal_token: proposalToken,
        safe_t_result: scanned?.safe_t_result || 'PENDING',
        doctors_invited: doctorsInvited,
        message: doctorsInvited
          ? 'Case created. Safe-T cleared — matched specialist doctors invited to quote; the patient will choose.'
          : (consultation.high_risk_medical_review === true
            ? 'Case created and held for Senior Medical Review — no doctor contacted.'
            : 'Case created. Safe-T review initiated — no doctor contacted until it clears.'),
      });
    }

    // ADMIN_APPROVE_PROPOSAL: Send proposal to client
    if (action === 'admin_approve_proposal') {
      // BUG-R9-01 FIX: asServiceRole throughout this action
      const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
      if (!caseRecord) {
        return Response.json({ error: 'Case not found' }, { status: 404 });
      }

      // BUG-R9-02 FIX: markup_percentage may be stored as a decimal (0.3 = 30%) or integer (30).
      // Normalise to an integer percentage so (1 + markupPct/100) is always correct.
      const rawMarkup = payload?.markup_percentage ?? caseRecord.markup_percentage ?? 35;
      const markupPct = rawMarkup > 1 ? rawMarkup : rawMarkup * 100;

      // Update with approved markup
      await base44.asServiceRole.entities.CaseRecord.update(case_id, {
        markup_percentage: markupPct,
        final_package_price: caseRecord.base_cost * (1 + markupPct / 100),
        profit: caseRecord.base_cost * (markupPct / 100),
        status: 'Proposal-Sent'
      });

      const proposalToken = `prop_${case_id}`;
      await base44.asServiceRole.entities.CaseRecord.update(case_id, {
        proposal_token: proposalToken,
        proposal_sent_at: new Date().toISOString(),
        final_package_price: caseRecord.base_cost * (1 + markupPct / 100),
        profit: caseRecord.base_cost * (markupPct / 100)
      });

      // Send proposal email to client with absolute URL.
      // FIX: this used to point at /pay-now?token=..., which is behind ProtectedRoute —
      // any client who isn't already logged in on that device hits a login wall, and
      // ProtectedRoute's login button doesn't actually preserve the return URL (it's
      // wired as a raw onClick handler, so it receives a click event instead of a URL
      // string and falls back to /dashboard), permanently losing the token. Point
      // directly at the genuinely public, no-login /portal/proposal/:token page instead.
      const appUrl = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');
      const paymentUrl = `${appUrl}/portal/proposal/${proposalToken}`;
      
      // BUG-R9-01 FIX: use asServiceRole for integrations in admin-scoped actions
      const proposalPackageItems = [
        ['🦷', `Medical procedure with board-certified specialist in ${caseRecord.procedure_country}`],
        ['✈️', 'Hand-selected round-trip flights with premium comfort seating'],
        ['🏨', 'Luxury hotel accommodations near your treatment facility'],
        ['🚘', 'Private airport transfers and clinic transportation throughout your stay'],
      ];
      const proposalHeroHtml = `
        <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:28px 24px;margin:8px 0 28px;text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(238,242,247,0.5);text-transform:uppercase;letter-spacing:1.5px;">Total Package Investment</p>
          <p style="margin:8px 0 0;font-size:38px;font-weight:700;color:#D4AF37;line-height:1.2;">$${caseRecord.final_package_price.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
        </div>
        <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:1.5px;">What's Included</p>
        <div style="margin-bottom:8px;">
          ${proposalPackageItems.map(([icon, text]) => `
            <div style="display:flex;align-items:flex-start;padding:12px 0;border-bottom:1px solid #2A3F4A;font-size:14px;color:rgba(238,242,247,0.8);line-height:1.6;">
              <span style="font-size:20px;margin-right:12px;flex-shrink:0;">${icon}</span>
              <span>${text}</span>
            </div>`).join('')}
        </div>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: caseRecord.client_email,
        subject: `Your Personalized Medical Travel Package — MORALES Concierge`,
        body: renderEmail({
          appUrl,
          eyebrow: 'Your Proposal',
          title: `Your journey is ready, ${caseRecord.client_name}`,
          intro: 'Your complete medical travel package is ready for review. This personalized itinerary includes everything you need for a seamless, luxury medical tourism experience.',
          bodyHtml: proposalHeroHtml,
          note: 'Please review and confirm your package within 7 days to secure your dates. Upon acceptance, our concierge team will coordinate all logistics including doctor confirmations, travel itineraries, and pre-procedure requirements.',
          ctaText: 'Review & Accept Proposal',
          ctaUrl: paymentUrl,
        }),
      });

      return Response.json({ 
        status: 'PROPOSAL_SENT', 
        payment_url: paymentUrl,
        message: 'Proposal sent to client successfully' 
      });
    }

    // PROCESS_PAYMENT: Dispatch post-payment partner notifications (admin only).
    // SECURITY: This action NEVER sets payment_status or case status.
    // Payment state transitions are EXCLUSIVELY controlled by stripePaymentWebhook.
    if (action === 'process_payment') {
      const { token, deposit_option } = payload;
      
      if (!token) {
        return Response.json({ error: 'No token provided' }, { status: 400 });
      }

      // Find case by proposal token
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ proposal_token: token });
      
      if (!cases || cases.length === 0) {
        return Response.json({ success: false, error: 'Proposal not found' }, { status: 404 });
      }

      const caseRecord = cases[0];

      // SECURITY: Verify Stripe webhook has already confirmed payment before dispatching notifications.
      // This function MUST NOT update payment_status — only stripePaymentWebhook may do that.
      const paidStatuses = ['Paid In Full', '50% Paid', '25% Paid'];
      if (!paidStatuses.includes(caseRecord.payment_status)) {
        return Response.json({
          error: 'Payment not confirmed by Stripe webhook. Cannot dispatch notifications until payment is verified.',
          current_payment_status: caseRecord.payment_status,
          code: 'PAYMENT_NOT_VERIFIED',
        }, { status: 402 });
      }

      // Idempotency guard: prevent duplicate notification dispatch
      if (caseRecord.final_confirmation_sent) {
        return Response.json({ success: true, already_processed: true, case_id: caseRecord.id, payment_status: caseRecord.payment_status });
      }

      // AUTO-TRIGGER: 5-way email notifications (concurrent)
      const appUrl = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');
      const emailPromises = [];

      // 1. PATIENT - Luxury itinerary welcome package
      const itineraryItems = [
        ['✈️', 'Premium Flights', caseRecord.flight_details || 'Round-trip international flights'],
        ['🏨', 'Luxury Accommodation', `${caseRecord.hotel_name || 'Premium hotel'} - ${caseRecord.hotel_address || 'Near treatment facility'}`],
        ['🚗', 'Private Transfers', 'Airport transfers and clinic transportation'],
      ];
      const patientBodyHtml = `
        <div style="padding:20px 22px;background:rgba(212,175,55,0.08);border-left:3px solid #D4AF37;border-radius:8px;margin:8px 0 28px;">
          <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(238,242,247,0.5);font-weight:700;">Your Procedure</div>
          <div style="font-size:19px;font-weight:700;color:#D4AF37;margin:8px 0 4px;">${(caseRecord.procedures || ['Your Procedure']).join(' + ')}</div>
          <div style="font-size:14px;color:rgba(238,242,247,0.7);">${caseRecord.procedure_country}</div>
        </div>
        <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:1.5px;">Your Complete Itinerary</p>
        <div style="margin-bottom:24px;">
          ${itineraryItems.map(([icon, label, detail]) => `
            <div style="padding:16px 18px;background:rgba(255,255,255,0.03);border:1px solid #2A3F4A;border-radius:8px;margin-bottom:10px;">
              <div style="font-weight:700;color:#EEF2F7;font-size:14px;">${icon} ${label}</div>
              <div style="font-size:13px;color:rgba(238,242,247,0.55);margin-top:4px;">${detail}</div>
            </div>`).join('')}
        </div>
        <div style="padding:26px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.3);border-radius:12px;text-align:center;">
          <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(238,242,247,0.5);font-weight:700;">Total Investment</div>
          <div style="font-size:32px;font-weight:900;color:#D4AF37;margin:10px 0;">$${caseRecord.final_package_price?.toLocaleString() || '0'}</div>
          <div style="display:inline-block;padding:7px 16px;background:#1a5c3a;color:#EEF2F7;border-radius:20px;font-size:12px;font-weight:700;">✓ PAID IN FULL</div>
          ${caseRecord.consultation_fee_paid ? `<p style="margin-top:12px;font-size:12px;color:#D4AF37;font-weight:600;">Your $${caseRecord.consultation_fee_amount || 49}.00 consultation fee has been credited</p>` : ''}
        </div>`;

      // BUG-R9-01 FIX: asServiceRole for all email dispatches in process_payment (admin-triggered)
      emailPromises.push(base44.asServiceRole.integrations.Core.SendEmail({
        to: caseRecord.client_email,
        subject: `Your Confirmed Medical Travel Itinerary – Morales Concierge`,
        body: renderEmail({
          appUrl,
          eyebrow: 'Payment Confirmed',
          title: `Your journey is secured, ${caseRecord.client_name}`,
          intro: 'Your payment has been successfully processed. Your luxury medical travel experience is now secured.',
          bodyHtml: patientBodyHtml,
          footer: 'Dedicated to your beautiful smile and wellness journey — The Morales Medical Travel Team',
        }),
      }));

      // 2. TRAVEL AGENCY / ADMIN - Master portal notification
      const travelAgency = caseRecord.travel_vendor_id ? await base44.asServiceRole.entities.TravelAgency.get(caseRecord.travel_vendor_id) : null;
      const adminPortalUrl = `${appUrl}/admin/portal-viewer?case_id=${caseRecord.id}`;
      const adminLogsHtml = (caseRecord.timeline_log || []).length
        ? `<div style="margin:22px 0;font-size:13px;color:rgba(238,242,247,0.6);line-height:1.8;">${(caseRecord.timeline_log || []).map(log => `${log.timestamp}: ${log.action} — ${log.details}`).join('<br/>')}</div>`
        : '';
      const adminEmailBody = renderEmail({
        appUrl,
        eyebrow: 'Master Portal Notification',
        title: `Payment confirmed — Case #${caseRecord.id}`,
        intro: `Payment confirmed for ${caseRecord.client_name}.`,
        rows: [
          ['Total Package', `$${caseRecord.final_package_price?.toLocaleString()}`],
          ['Deposit', deposit_option],
          ['Status', caseRecord.payment_status],
          ['Travel Agency', travelAgency ? travelAgency.agency_name : 'Not assigned'],
          ['Doctor', caseRecord.doctor_selected || 'Not assigned'],
        ],
        bodyHtml: adminLogsHtml,
        ctaText: 'View Case',
        ctaUrl: adminPortalUrl,
      });
      const adminEmail = Deno.env.get('ADMIN_EMAIL');
      if (adminEmail) {
        emailPromises.push(base44.asServiceRole.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `[Admin] Payment Confirmed - Case ${caseRecord.id}`,
          body: adminEmailBody
        }));
      } else {
        console.error('[iq200Pipeline] ADMIN_EMAIL not set — admin payment notification skipped.');
      }

      // 3. DOCTOR PORTAL - Case confirmation to assigned doctor (dynamic — no hardcoded name)
      const doctorPortalUrl = `${appUrl}/portal/doctor/${caseRecord.doctor_portal_token || caseRecord.proposal_token}`;
      const doctorName = caseRecord.doctor_selected || 'Doctor';
      const procedureList = (caseRecord.procedures || ['Procedure']).join(', ');
      const doctorEmailBody = renderEmail({
        appUrl,
        eyebrow: 'Case Confirmation',
        title: `New case confirmed: ${caseRecord.client_name}`,
        intro: `Dear ${doctorName}, a new ${procedureList} procedure has been confirmed for ${caseRecord.client_name}. Please confirm the procedure date via your portal.`,
        rows: [
          ['Procedure', procedureList],
          ['Treatment Cost', `$${caseRecord.treatment_cost}`],
        ],
        ctaText: 'Access Doctor Portal',
        ctaUrl: doctorPortalUrl,
      });
      if (caseRecord.doctor_email) {
        emailPromises.push(base44.asServiceRole.integrations.Core.SendEmail({
          to: caseRecord.doctor_email,
          subject: `Case Confirmation: ${(caseRecord.procedures || ['Procedure']).join(', ')} - ${caseRecord.client_name}`,
          body: doctorEmailBody
        }));
      }

      // 4. DRIVER - ORIGIN - Local pickup ticket
      const originDriver = caseRecord.origin_driver_id ? await base44.asServiceRole.entities.TaxiService.get(caseRecord.origin_driver_id) : null;
      const originDriverPortalUrl = `${appUrl}/portal/transfer?token=${caseRecord.proposal_token}&case_id=${caseRecord.id}`;
      const originDriverEmailBody = renderEmail({
        appUrl,
        eyebrow: 'Local Pickup Ticket',
        title: `Pickup confirmed: ${caseRecord.client_name}`,
        intro: `Dear ${originDriver ? originDriver.company_name || originDriver.driver_name : 'Origin Driver'}, a pickup has been confirmed for ${caseRecord.client_name}.`,
        rows: [
          ['Pickup', caseRecord.client_pickup_address || 'Client Home'],
          ['Destination', 'Local Airport'],
        ],
        ctaText: 'Access Portal',
        ctaUrl: originDriverPortalUrl,
      });
      if (originDriver?.email) {
        emailPromises.push(base44.asServiceRole.integrations.Core.SendEmail({
          to: originDriver.email,
          subject: `Pickup Request: ${caseRecord.client_name}`,
          body: originDriverEmailBody
        }));
      }

      // 5. DRIVER - DESTINATION - Airport arrival ticket
      const destDriver = caseRecord.destination_driver_id ? await base44.asServiceRole.entities.TaxiService.get(caseRecord.destination_driver_id) : null;
      const destDriverPortalUrl = `${appUrl}/portal/transfer?token=${caseRecord.proposal_token}&case_id=${caseRecord.id}`;
      const destDriverEmailBody = renderEmail({
        appUrl,
        eyebrow: 'International Arrival Transfer',
        title: `Arrival transfer confirmed: ${caseRecord.client_name}`,
        intro: `Dear ${destDriver ? destDriver.company_name || destDriver.driver_name : 'Destination Driver'}, an arrival transfer has been confirmed for ${caseRecord.client_name}.`,
        rows: [
          ['Destination', `${caseRecord.hotel_name || 'Hotel'} - ${caseRecord.hotel_address || 'TBD'}`],
        ],
        ctaText: 'Access Portal',
        ctaUrl: destDriverPortalUrl,
      });
      if (destDriver?.email) {
        emailPromises.push(base44.asServiceRole.integrations.Core.SendEmail({
          to: destDriver.email,
          subject: `Arrival Transfer: ${caseRecord.client_name}`,
          body: destDriverEmailBody
        }));
      }

      // ── FAULT-TOLERANT DISPATCH: Promise.allSettled — isolated failures, no cascade ──
      const dispatchLabels = [
        { label: 'Patient Itinerary Email', provider_type: 'patient', provider_name: caseRecord.client_name, provider_email: caseRecord.client_email },
        { label: 'Admin Portal Notification', provider_type: 'admin', provider_name: 'Admin Team', provider_email: 'admin@internal' },
        { label: 'Doctor Portal Confirmation', provider_type: 'doctor', provider_name: caseRecord.doctor_selected || 'Assigned Doctor', provider_email: caseRecord.doctor_email },
        { label: 'Chauffeur Network — Origin Pickup', provider_type: 'chauffeur_origin', provider_name: originDriver?.company_name || 'Origin Driver', provider_email: originDriver?.email },
        { label: 'Chauffeur Network — Destination Transfer', provider_type: 'chauffeur_destination', provider_name: destDriver?.company_name || 'Destination Driver', provider_email: destDriver?.email },
      ];

      const settled = await Promise.allSettled(emailPromises);
      const failureWrites = [];
      const notifications_sent = {};

      for (let i = 0; i < settled.length; i++) {
        const s = settled[i];
        const d = dispatchLabels[i];
        if (s.status === 'rejected') {
          notifications_sent[d.provider_type] = { success: false, error: s.reason?.message };
          failureWrites.push(
            base44.asServiceRole.entities.DispatchFailureLog.create({
              case_id: caseRecord.id,
              case_name: caseRecord.client_name,
              pipeline_stage: 'iq200Pipeline.process_payment',
              provider_type: d.provider_type,
              provider_name: d.label,
              provider_email: d.provider_email || 'unknown',
              dispatch_type: 'email',
              error_message: `${d.label} offline — ${s.reason?.message || 'Dispatch failed'}`,
              status: 'pending_intervention',
              logged_at: new Date().toISOString(),
            })
          );
        } else {
          notifications_sent[d.provider_type] = { success: true };
        }
      }

      if (failureWrites.length > 0) {
        await Promise.allSettled(failureWrites);
      }

      const failedCount = failureWrites.length;
      return Response.json({
        success: true,
        case_id: caseRecord.id,
        notifications_sent,
        fault_tolerance: {
          total_dispatches: settled.length,
          succeeded: settled.filter(s => s.status === 'fulfilled').length,
          failed: failedCount,
          admin_action_required: failedCount > 0,
        }
      });
    }

    // ADMIN_ESCALATE: Manual stage override
    if (action === 'admin_escalate') {
      // BUG-R9-01 FIX: asServiceRole throughout
      const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
      if (!caseRecord) {
        return Response.json({ error: 'Case not found' }, { status: 404 });
      }

      const newStatus = payload.new_status;
      const notes = payload.notes || 'Manual escalation';

      const timelineEntry = {
        timestamp: new Date().toISOString(),
        action: 'admin_escalation',
        status_before: caseRecord.status,
        status_after: newStatus,
        notes
      };

      const updatedTimeline = caseRecord.timeline_log ? [...caseRecord.timeline_log, timelineEntry] : [timelineEntry];
      await base44.asServiceRole.entities.CaseRecord.update(case_id, {
        status: newStatus,
        admin_notes: notes,
        timeline_log: updatedTimeline
      });

      return Response.json({ 
        status: 'ESCALATED', 
        new_status: newStatus,
        message: 'Case escalated successfully' 
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[iq200Pipeline]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'iq200Pipeline', requireAuth: false }));
