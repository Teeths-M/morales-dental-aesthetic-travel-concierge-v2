/**
 * mockProcessPayment — DEVELOPMENT/TEST ONLY
 *
 * Gated behind MOCK_PAYMENTS_ENABLED=true env var.
 * Returns 403 in production. Never confirms real payments.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { renderEmail } from '../_shared/emailTemplate.ts';

Deno.serve(async (req) => {
  const mockEnabled = Deno.env.get('MOCK_PAYMENTS_ENABLED') === 'true';
  if (!mockEnabled) {
    return Response.json({
      error: 'Mock payments are disabled in production.',
      message: 'Set MOCK_PAYMENTS_ENABLED=true in App Secrets to enable in development/test only.',
    }, { status: 403 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Allow admin or test mode
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { case_id, deposit_option } = await req.json();
    
    if (!case_id || !deposit_option) {
      return Response.json({ error: 'case_id and deposit_option are required' }, { status: 400 });
    }

    // Get case record
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Update payment status (MOCK - no actual payment processing)
    await base44.asServiceRole.entities.CaseRecord.update(case_id, {
      deposit_option: deposit_option,
      payment_status: deposit_option === 'Full' ? 'Paid In Full' : deposit_option === '50%' ? '50% Paid' : '25% Paid',
      status: 'Travel-Coordination',
      timeline_log: [
        ...(caseRecord.timeline_log || []),
        {
          timestamp: new Date().toISOString(),
          action: 'mock_payment_received',
          details: `MOCK: Deposit payment received: ${deposit_option}`
        }
      ]
    });

    const appUrl = 'https://sentinel-dental-care.base44.app';
    const mockNote = 'This is a TEST email as part of a mock payment simulation. No action is required.';

    // 1. Notify Travel Agency
    if (caseRecord.travel_vendor_id) {
      const travelAgency = await base44.asServiceRole.entities.TravelAgency.get(caseRecord.travel_vendor_id);
      if (travelAgency) {
        const portalUrl = `${appUrl}/portal/travel?token=${caseRecord.proposal_token}&case_id=${caseRecord.id}`;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: travelAgency.email,
          subject: `[MOCK TEST] Payment Confirmed - Book Travel for ${caseRecord.client_name}`,
          body: renderEmail({
            appUrl,
            eyebrow: 'Mock Test',
            title: 'Travel Booking Request',
            intro: `Dear ${travelAgency.agency_name || 'Travel Partner'}, payment has been confirmed for patient ${caseRecord.client_name}.`,
            rows: [
              ['Procedure', (caseRecord.procedures || []).join(', ')],
              ['Destination', caseRecord.procedure_country],
              ['Flight Budget', `$${caseRecord.flight_cost}`],
              ['Hotel Budget', `$${caseRecord.hotel_cost}`],
            ],
            note: mockNote,
            ctaText: 'Access Travel Portal',
            ctaUrl: portalUrl,
          }),
        });
      }
    }

    // 2. Notify Origin Driver
    if (caseRecord.origin_driver_id) {
      const originDriver = await base44.asServiceRole.entities.TaxiService.get(caseRecord.origin_driver_id);
      if (originDriver) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: originDriver.email,
          subject: `[MOCK TEST] Payment Confirmed - Pickup for ${caseRecord.client_name}`,
          body: renderEmail({
            appUrl,
            eyebrow: 'Mock Test',
            title: 'Transfer Booking Confirmed',
            intro: `Dear ${originDriver.company_name || originDriver.driver_name}, payment has been confirmed for patient ${caseRecord.client_name}.`,
            rows: [
              ['Pickup Location', caseRecord.client_pickup_address || 'Client Home'],
              ['Payment', `$${caseRecord.pickup_cost}`],
            ],
            note: mockNote,
          }),
        });
      }
    }

    // 3. Notify Destination Driver
    if (caseRecord.destination_driver_id) {
      const destDriver = await base44.asServiceRole.entities.TaxiService.get(caseRecord.destination_driver_id);
      if (destDriver) {
        const portalUrl = `${appUrl}/portal/transfer?token=${caseRecord.proposal_token}&case_id=${caseRecord.id}`;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: destDriver.email,
          subject: `[MOCK TEST] Payment Confirmed - Transfer for ${caseRecord.client_name}`,
          body: renderEmail({
            appUrl,
            eyebrow: 'Mock Test',
            title: 'Destination Transfer Confirmed',
            intro: `Dear ${destDriver.company_name || destDriver.driver_name}, payment has been confirmed for patient ${caseRecord.client_name}.`,
            rows: [
              ['Payment', `$${caseRecord.dropoff_cost + caseRecord.local_transfer_cost}`],
            ],
            note: mockNote,
            ctaText: 'Access Transfer Portal',
            ctaUrl: portalUrl,
          }),
        });
      }
    }

    // 4. Notify Doctor
    if (caseRecord.doctor_email) {
      const doctorPortalUrl = `${appUrl}/portal/doctor/${caseRecord.doctor_portal_token || caseRecord.proposal_token}`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: caseRecord.doctor_email,
        subject: `[MOCK TEST] Payment Confirmed - Procedure for ${caseRecord.client_name}`,
        body: renderEmail({
          appUrl,
          eyebrow: 'Mock Test',
          title: 'Procedure Booking Confirmed',
          intro: `Dear ${caseRecord.doctor_selected || 'Doctor'}, payment has been confirmed for patient ${caseRecord.client_name}.`,
          rows: [
            ['Procedure', (caseRecord.procedures || []).join(', ')],
            ['Treatment Cost', `$${caseRecord.treatment_cost}`],
          ],
          note: mockNote,
          ctaText: 'Access Doctor Portal',
          ctaUrl: doctorPortalUrl,
        }),
      });
    }

    // 5. Send confirmation to patient - LUXURY CONCIERGE TEMPLATE
    const mockItineraryItems = [
      ['✈️', 'Premium Flights', 'Round-trip international flights with selected routing', `Investment: $${caseRecord.flight_cost?.toLocaleString() || '0'}`],
      ['🏨', 'Luxury Accommodation', 'Premium hotel located near your treatment facility', `Investment: $${caseRecord.hotel_cost?.toLocaleString() || '0'}`],
      ['🚗', 'Private Airport Transfers', 'Dedicated luxury ground transportation fully locked in', `Investment: $${((caseRecord.pickup_cost || 0) + (caseRecord.dropoff_cost || 0) + (caseRecord.local_transfer_cost || 0)).toLocaleString() || '0'}`],
    ];
    const mockNextSteps = [
      ['Within 24 Hours', 'Your concierge coordinator sends a personalized pre-travel briefing'],
      ['Flight Confirmation', 'Complete airline itinerary with VIP check-in details'],
      ['Hotel & Transfers', 'Premium accommodation details with concierge contact'],
      ['Doctor Confirmation', 'Finalized procedure schedule with pre-care protocols'],
    ];
    const mockPatientBodyHtml = `
      <div style="padding:20px 22px;background:rgba(212,175,55,0.08);border-left:3px solid #D4AF37;border-radius:8px;margin:8px 0 28px;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(238,242,247,0.5);font-weight:700;">Your Procedure</div>
        <div style="font-size:19px;font-weight:700;color:#D4AF37;margin:8px 0 4px;">${(caseRecord.procedures || ['Your Procedure']).join(' + ')}</div>
        <div style="font-size:14px;color:rgba(238,242,247,0.7);">Performed in ${caseRecord.procedure_country} by our vetted specialist network</div>
      </div>
      <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:1.5px;">Your Complete Itinerary</p>
      <div style="margin-bottom:24px;">
        ${mockItineraryItems.map(([icon, label, detail, investment]) => `
          <div style="padding:16px 18px;background:rgba(255,255,255,0.03);border:1px solid #2A3F4A;border-radius:8px;margin-bottom:10px;">
            <div style="font-weight:700;color:#EEF2F7;font-size:14px;">${icon} ${label}</div>
            <div style="font-size:13px;color:rgba(238,242,247,0.55);margin-top:4px;">${detail}</div>
            <div style="font-size:13px;color:#D4AF37;font-weight:600;margin-top:8px;">${investment}</div>
          </div>`).join('')}
      </div>
      <div style="padding:20px 22px;background:rgba(212,175,55,0.08);border-radius:8px;margin-bottom:24px;color:rgba(238,242,247,0.85);font-size:14px;line-height:1.8;">
        <strong style="color:#D4AF37;">🎯 Concierge Note:</strong> Your dedicated travel coordinator is now orchestrating every detail of your journey. From pre-procedure consultations to post-care logistics, our premium service team is at your complete disposal. Expect personalized follow-up within 24 hours.
      </div>
      <div style="padding:26px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.3);border-radius:12px;text-align:center;margin-bottom:24px;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(238,242,247,0.5);font-weight:700;">Payment Confirmation</div>
        <div style="font-size:32px;font-weight:900;color:#D4AF37;margin:10px 0;">$${caseRecord.final_package_price?.toLocaleString() || '0'}</div>
        <div style="display:inline-block;padding:7px 16px;background:#1a5c3a;color:#EEF2F7;border-radius:20px;font-size:12px;font-weight:700;">✓ PAID IN FULL</div>
      </div>
      <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:1.5px;">What Happens Next</p>
      <div style="margin-bottom:8px;">
        ${mockNextSteps.map(([label, detail]) => `
          <div style="padding:10px 0;border-bottom:1px solid #2A3F4A;font-size:14px;color:rgba(238,242,247,0.8);line-height:1.6;">
            <strong style="color:#EEF2F7;">${label}:</strong> ${detail}
          </div>`).join('')}
      </div>
      <p style="margin:20px 0 0;font-size:11px;color:rgba(238,242,247,0.4);text-align:center;font-style:italic;">🧪 This is a test email transmission. No payment was processed.</p>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: caseRecord.client_email,
      subject: `Your Medical Travel Journey Begins - Payment Confirmed`,
      body: renderEmail({
        appUrl,
        eyebrow: 'Payment Confirmed',
        title: `Your journey begins here, ${caseRecord.client_name}`,
        intro: 'Your payment has been successfully processed. Your luxury medical travel experience is now secured.',
        bodyHtml: mockPatientBodyHtml,
        footer: 'Dedicated to your beautiful smile and wellness journey — The Morales Medical Travel Team',
      }),
    });

    return Response.json({ 
      success: true, 
      case_id: caseRecord.id,
      message: 'MOCK payment processed successfully - all emails sent',
      notifications_sent: {
        travel_agency: !!caseRecord.travel_vendor_id,
        origin_driver: !!caseRecord.origin_driver_id,
        destination_driver: !!caseRecord.destination_driver_id,
        doctor: !!caseRecord.doctor_email,
        patient: true
      }
    });

  } catch (error) {
    console.error('mockProcessPayment error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});