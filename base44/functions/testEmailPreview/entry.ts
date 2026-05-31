import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { case_id } = await req.json();
    
    if (!case_id) {
      return Response.json({ error: 'case_id is required' }, { status: 400 });
    }

    // Get case record
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Get assigned partners
    const doctor = caseRecord.doctor_email ? await base44.asServiceRole.entities.Doctor.filter({ email: caseRecord.doctor_email }).then(results => results?.[0]) : null;
    const travelAgency = caseRecord.travel_vendor_id ? await base44.asServiceRole.entities.TravelAgency.get(caseRecord.travel_vendor_id) : null;
    const originDriver = caseRecord.origin_driver_id ? await base44.asServiceRole.entities.TaxiService.get(caseRecord.origin_driver_id) : null;
    const destDriver = caseRecord.destination_driver_id ? await base44.asServiceRole.entities.TaxiService.get(caseRecord.destination_driver_id) : null;

    const appUrl = 'https://sentinel-dental-care.base44.app';

    // Generate email previews
    const emailPreviews = {
      client: {
        to: caseRecord.client_email,
        subject: `Your Medical Travel Journey Begins - Payment Confirmed`,
        preview: `Luxury concierge email with procedure: ${(caseRecord.procedures || []).join(' + ')}, Total: $${caseRecord.final_package_price?.toLocaleString()}`
      },
      doctor: doctor ? {
        to: doctor.email,
        subject: `Payment Confirmed - Procedure Booking for ${caseRecord.client_name}`,
        preview: `Doctor: ${doctor.full_name}, Procedure: ${(caseRecord.procedures || []).join(', ')}, Treatment Cost: $${caseRecord.treatment_cost}`
      } : null,
      travel_agency: travelAgency ? {
        to: travelAgency.email,
        subject: `Payment Confirmed - Book Travel for ${caseRecord.client_name}`,
        preview: `Agency: ${travelAgency.agency_name}, Flight Budget: $${caseRecord.flight_cost}, Hotel: $${caseRecord.hotel_cost}`
      } : null,
      origin_driver: originDriver ? {
        to: originDriver.email,
        subject: `Payment Confirmed - Pickup Booking for ${caseRecord.client_name}`,
        preview: `Driver: ${originDriver.company_name}, Pickup: $${caseRecord.pickup_cost}`
      } : null,
      destination_driver: destDriver ? {
        to: destDriver.email,
        subject: `Payment Confirmed - Transfer Booking for ${caseRecord.client_name}`,
        preview: `Driver: ${destDriver.company_name}, Transfer: $${caseRecord.dropoff_cost + caseRecord.local_transfer_cost}`
      } : null
    };

    // Send ONLY to client (if they're in the app)
    let clientEmailSent = false;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: caseRecord.client_email,
        subject: `[TEST] Your Medical Travel Journey Begins`,
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
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
                        <div style="font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: #C5A059; font-weight: 600;">Dental & Aesthetic Travel Concierge</div>
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
      clientEmailSent = true;
    } catch (error) {
      clientEmailSent = false;
    }

    return Response.json({ 
      success: true, 
      case_id: caseRecord.id,
      message: 'Email preview generated',
      client_email_sent: clientEmailSent,
      partners_configured: {
        doctor: doctor ? { name: doctor.full_name, email: doctor.email } : null,
        travel_agency: travelAgency ? { name: travelAgency.agency_name, email: travelAgency.email } : null,
        origin_driver: originDriver ? { name: originDriver.company_name, email: originDriver.email } : null,
        destination_driver: destDriver ? { name: destDriver.company_name, email: destDriver.email } : null
      },
      email_previews: emailPreviews
    });

  } catch (error) {
    console.error('testEmailPreview error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});