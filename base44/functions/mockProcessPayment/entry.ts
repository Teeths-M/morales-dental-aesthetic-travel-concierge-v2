/**
 * mockProcessPayment — DEVELOPMENT/TEST ONLY
 *
 * Gated behind MOCK_PAYMENTS_ENABLED=true env var.
 * Returns 403 in production. Never confirms real payments.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    
    // 1. Notify Travel Agency
    if (caseRecord.travel_vendor_id) {
      const travelAgency = await base44.asServiceRole.entities.TravelAgency.get(caseRecord.travel_vendor_id);
      if (travelAgency) {
        const portalUrl = `${appUrl}/portal/travel?token=${caseRecord.proposal_token}&case_id=${caseRecord.id}`;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: travelAgency.email,
          subject: `[MOCK TEST] Payment Confirmed - Book Travel for ${caseRecord.client_name}`,
          body: `
            <h2>🧪 MOCK TEST - Travel Booking Request</h2>
            <p>Dear ${travelAgency.agency_name || 'Travel Partner'},</p>
            <p><strong style="color: #dc2626;">This is a TEST email. No action required.</strong></p>
            <p>Payment confirmed for patient <strong>${caseRecord.client_name}</strong>.</p>
            <p><strong>Procedure:</strong> ${(caseRecord.procedures || []).join(', ')}</p>
            <p><strong>Destination:</strong> ${caseRecord.procedure_country}</p>
            <p><strong>Flight Budget:</strong> $${caseRecord.flight_cost}</p>
            <p><strong>Hotel Budget:</strong> $${caseRecord.hotel_cost}</p>
            <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Access Travel Portal
            </a>
          `
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
          body: `
            <h2>🧪 MOCK TEST - Transfer Booking Confirmed</h2>
            <p>Dear ${originDriver.company_name || originDriver.driver_name},</p>
            <p><strong style="color: #dc2626;">This is a TEST email. No action required.</strong></p>
            <p>Payment confirmed for patient <strong>${caseRecord.client_name}</strong>.</p>
            <p><strong>Pickup Location:</strong> ${caseRecord.client_pickup_address || 'Client Home'}</p>
            <p><strong>Payment:</strong> $${caseRecord.pickup_cost}</p>
          `
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
          body: `
            <h2>🧪 MOCK TEST - Destination Transfer Confirmed</h2>
            <p>Dear ${destDriver.company_name || destDriver.driver_name},</p>
            <p><strong style="color: #dc2626;">This is a TEST email. No action required.</strong></p>
            <p>Payment confirmed for patient <strong>${caseRecord.client_name}</strong>.</p>
            <p><strong>Payment:</strong> $${caseRecord.dropoff_cost + caseRecord.local_transfer_cost}</p>
            <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Access Transfer Portal
            </a>
          `
        });
      }
    }

    // 4. Notify Doctor
    if (caseRecord.doctor_email) {
      const doctorPortalUrl = `${appUrl}/portal/doctor/${caseRecord.doctor_portal_token || caseRecord.proposal_token}`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: caseRecord.doctor_email,
        subject: `[MOCK TEST] Payment Confirmed - Procedure for ${caseRecord.client_name}`,
        body: `
          <h2>🧪 MOCK TEST - Procedure Booking Confirmed</h2>
          <p>Dear ${caseRecord.doctor_selected || 'Doctor'},</p>
          <p><strong style="color: #dc2626;">This is a TEST email. No action required.</strong></p>
          <p>Payment confirmed for patient <strong>${caseRecord.client_name}</strong>.</p>
          <p><strong>Procedure:</strong> ${(caseRecord.procedures || []).join(', ')}</p>
          <p><strong>Treatment Cost:</strong> $${caseRecord.treatment_cost}</p>
          <a href="${doctorPortalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Access Doctor Portal
          </a>
        `
      });
    }

    // 5. Send confirmation to patient - LUXURY CONCIERGE TEMPLATE
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: caseRecord.client_email,
      subject: `Your Medical Travel Journey Begins - Payment Confirmed`,
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0; padding:0; background: linear-gradient(135deg, #f5f7f4 0%, #e8eceb 100%); font-family: 'Segoe UI', -apple-system, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f5f7f4 0%, #e8eceb 100%);">
            <tr>
              <td align="center" style="padding: 48px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; background: #ffffff; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.08); overflow: hidden;">
                  
                  <!-- LUXURY HEADER -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #0F3A20 0%, #1a5c3a 100%); padding: 48px 40px; text-align: center;">
                      <div style="font-family: Georgia, serif; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 2px; margin-bottom: 8px;">MORALES</div>
                      <div style="font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: #C5A059; font-weight: 600;">Medical Travel Safety</div>
                      <div style="margin-top: 20px; font-size: 18px; font-style: italic; color: #f0f0f0; font-weight: 300;">Your Journey Begins Here, ${caseRecord.client_name}.</div>
                    </td>
                  </tr>

                  <!-- MAIN CONTENT -->
                  <tr>
                    <td style="padding: 48px 40px;">
                      
                      <!-- GREETING -->
                      <div style="margin-bottom: 32px;">
                        <p style="margin: 0 0 8px 0; font-size: 16px; color: #374151; line-height: 1.6;">Dear ${caseRecord.client_name},</p>
                        <p style="margin: 0; font-size: 18px; font-weight: 600; color: #0F3A20; line-height: 1.6;">Your payment has been successfully processed. Your luxury medical travel experience is now secured.</p>
                      </div>

                      <!-- PROCEDURE CARD -->
                      <div style="margin: 32px 0; padding: 24px; background: linear-gradient(135deg, rgba(15,58,32,0.05), rgba(197,160,89,0.05)); border-left: 4px solid #0F3A20; border-radius: 8px;">
                        <div style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #6B7280; margin-bottom: 8px; font-weight: 700;">Your Procedure</div>
                        <div style="font-size: 20px; font-weight: 700; color: #0F3A20; margin-bottom: 8px;">${(caseRecord.procedures || ['Your Procedure']).join(' + ')}</div>
                        <div style="font-size: 14px; color: #4B5563;">Performed in ${caseRecord.procedure_country} by our vetted specialist network</div>
                      </div>

                      <!-- LOGISTICS CARDS -->
                      <div style="margin: 32px 0;">
                        <div style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #6B7280; margin-bottom: 16px; font-weight: 700;">Your Complete Itinerary</div>
                        
                        <!-- Flight Card -->
                        <div style="margin-bottom: 16px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                          <div style="display: flex; align-items: flex-start;">
                            <div style="font-size: 24px; margin-right: 16px;">✈️</div>
                            <div>
                              <div style="font-weight: 700; color: #0F3A20; margin-bottom: 4px; font-size: 14px;">Premium Flights</div>
                              <div style="font-size: 13px; color: #6B7280;">Round-trip international flights with selected routing</div>
                              <div style="font-size: 13px; color: #0F3A20; font-weight: 600; margin-top: 8px;">Investment: $${caseRecord.flight_cost?.toLocaleString() || '0'}</div>
                            </div>
                          </div>
                        </div>

                        <!-- Hotel Card -->
                        <div style="margin-bottom: 16px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                          <div style="display: flex; align-items: flex-start;">
                            <div style="font-size: 24px; margin-right: 16px;">🏨</div>
                            <div>
                              <div style="font-weight: 700; color: #0F3A20; margin-bottom: 4px; font-size: 14px;">Luxury Accommodation</div>
                              <div style="font-size: 13px; color: #6B7280;">Premium hotel located near your treatment facility</div>
                              <div style="font-size: 13px; color: #0F3A20; font-weight: 600; margin-top: 8px;">Investment: $${caseRecord.hotel_cost?.toLocaleString() || '0'}</div>
                            </div>
                          </div>
                        </div>

                        <!-- Transfer Card -->
                        <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                          <div style="display: flex; align-items: flex-start;">
                            <div style="font-size: 24px; margin-right: 16px;">🚗</div>
                            <div>
                              <div style="font-weight: 700; color: #0F3A20; margin-bottom: 4px; font-size: 14px;">Private Airport Transfers</div>
                              <div style="font-size: 13px; color: #6B7280;">Dedicated luxury ground transportation fully locked in</div>
                              <div style="font-size: 13px; color: #0F3A20; font-weight: 600; margin-top: 8px;">Investment: $${((caseRecord.pickup_cost || 0) + (caseRecord.dropoff_cost || 0) + (caseRecord.local_transfer_cost || 0)).toLocaleString() || '0'}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- CONCIERGE CALLOUT -->
                      <div style="margin: 32px 0; padding: 24px; background: linear-gradient(135deg, #0F3A20 0%, #1a5c3a 100%); border-radius: 8px; color: #ffffff;">
                        <div style="font-size: 14px; line-height: 1.8;">
                          <strong>🎯 Concierge Note:</strong> Your dedicated travel coordinator is now orchestrating every detail of your journey. From pre-procedure consultations to post-care logistics, our premium service team is at your complete disposal. Expect personalized follow-up within 24 hours.
                        </div>
                      </div>

                      <!-- FINANCIAL SUMMARY -->
                      <div style="margin: 32px 0; padding: 28px; background: #f0f9ff; border: 2px solid #0F3A20; border-radius: 12px;">
                        <div style="text-align: center;">
                          <div style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #6B7280; margin-bottom: 12px; font-weight: 700;">Payment Confirmation</div>
                          <div style="font-size: 36px; font-weight: 900; color: #0F3A20; margin-bottom: 16px;">$${caseRecord.final_package_price?.toLocaleString() || '0'}</div>
                          <div style="display: inline-block; padding: 8px 16px; background: #10b981; color: #ffffff; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">✓ PAID IN FULL</div>
                          <div style="margin-top: 16px; font-size: 13px; color: #4B5563;">Your total investment for this comprehensive medical travel experience</div>
                        </div>
                      </div>

                      <!-- NEXT STEPS -->
                      <div style="margin: 32px 0;">
                        <div style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #6B7280; margin-bottom: 16px; font-weight: 700;">What Happens Next</div>
                        <ul style="margin: 0; padding: 0; list-style: none;">
                          <li style="margin-bottom: 12px; font-size: 14px; color: #374151; line-height: 1.6;">
                            <strong>Within 24 Hours:</strong> Your concierge coordinator sends personalized pre-travel briefing
                          </li>
                          <li style="margin-bottom: 12px; font-size: 14px; color: #374151; line-height: 1.6;">
                            <strong>Flight Confirmation:</strong> Complete airline itinerary with VIP check-in details
                          </li>
                          <li style="margin-bottom: 12px; font-size: 14px; color: #374151; line-height: 1.6;">
                            <strong>Hotel & Transfers:</strong> Premium accommodation details with concierge contact
                          </li>
                          <li style="font-size: 14px; color: #374151; line-height: 1.6;">
                            <strong>Doctor Confirmation:</strong> Finalized procedure schedule with pre-care protocols
                          </li>
                        </ul>
                      </div>

                      <!-- LUXURY CLOSING -->
                      <div style="margin-top: 48px; padding-top: 32px; border-top: 1px solid #e5e7eb; text-align: center;">
                        <p style="margin: 0 0 24px 0; font-size: 14px; color: #374151; line-height: 1.8;">Dedicated to your beautiful smile and wellness journey,</p>
                        <div style="font-family: Georgia, serif; font-size: 16px; font-weight: 600; color: #0F3A20; margin-bottom: 4px;">The IQ200 Medical Travel Team</div>
                        <div style="font-size: 12px; color: #6B7280; font-style: italic;">Premium Medical Tourism & Aesthetic Excellence</div>
                      </div>
                    </td>
                  </tr>

                  <!-- MOCK TEST FOOTER -->
                  <tr>
                    <td style="padding: 24px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                      <p style="margin: 0; font-size: 11px; color: #9ca3af; line-height: 1.5;">🧪 <em>This is a test email transmission. No payment was processed.</em></p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
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