import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { renderEmail } from '../_shared/emailTemplate.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
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
      const testItineraryItems = [
        ['✈️', 'Premium Flights', 'Round-trip international flights with selected routing'],
        ['🏨', 'Luxury Accommodation', 'Premium hotel located near your treatment facility'],
        ['🚗', 'Private Airport Transfers', 'Dedicated luxury ground transportation fully locked in'],
      ];
      const testBodyHtml = `
        <div style="padding:20px 22px;background:rgba(212,175,55,0.08);border-left:3px solid #D4AF37;border-radius:8px;margin:8px 0 28px;">
          <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(238,242,247,0.5);font-weight:700;">Your Procedure</div>
          <div style="font-size:19px;font-weight:700;color:#D4AF37;margin:8px 0 4px;">${(caseRecord.procedures || ['Your Procedure']).join(' + ')}</div>
          <div style="font-size:14px;color:rgba(238,242,247,0.7);">Performed in ${caseRecord.procedure_country} by our vetted specialist network</div>
        </div>
        <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:1.5px;">Your Complete Itinerary</p>
        <div style="margin-bottom:24px;">
          ${testItineraryItems.map(([icon, label, detail]) => `
            <div style="padding:16px 18px;background:rgba(255,255,255,0.03);border:1px solid #2A3F4A;border-radius:8px;margin-bottom:10px;">
              <div style="font-weight:700;color:#EEF2F7;font-size:14px;">${icon} ${label}</div>
              <div style="font-size:13px;color:rgba(238,242,247,0.55);margin-top:4px;">${detail}</div>
            </div>`).join('')}
        </div>
        <div style="padding:20px 22px;background:rgba(212,175,55,0.08);border-radius:8px;margin-bottom:24px;color:rgba(238,242,247,0.85);font-size:14px;line-height:1.8;">
          <strong style="color:#D4AF37;">🎯 Concierge Note:</strong> Your dedicated travel coordinator is now orchestrating every detail of your journey. From pre-procedure consultations to post-care logistics, our premium service team is at your complete disposal. Expect personalized follow-up within 24 hours.
        </div>
        <div style="padding:26px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.3);border-radius:12px;text-align:center;">
          <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(238,242,247,0.5);font-weight:700;">Payment Confirmation</div>
          <div style="font-size:32px;font-weight:900;color:#D4AF37;margin:10px 0;">$${caseRecord.final_package_price?.toLocaleString() || '0'}</div>
          <div style="display:inline-block;padding:7px 16px;background:#1a5c3a;color:#EEF2F7;border-radius:20px;font-size:12px;font-weight:700;">✓ PAID IN FULL</div>
        </div>
        <p style="margin:20px 0 0;font-size:11px;color:rgba(238,242,247,0.4);text-align:center;font-style:italic;">🧪 This is a test email transmission. No payment was processed.</p>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: caseRecord.client_email,
        subject: `[TEST] Your Medical Travel Journey Begins`,
        body: renderEmail({
          appUrl,
          eyebrow: 'Payment Confirmed',
          title: `Your journey begins here, ${caseRecord.client_name}`,
          intro: 'Your payment has been successfully processed. Your luxury medical travel experience is now secured.',
          bodyHtml: testBodyHtml,
          footer: 'Dedicated to your beautiful smile and wellness journey — The Morales Medical Travel Team',
        }),
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
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});