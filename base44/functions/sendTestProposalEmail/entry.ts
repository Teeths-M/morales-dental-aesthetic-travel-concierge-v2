import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Create a mock case for testing
    const mockCase = await base44.asServiceRole.entities.CaseRecord.create({
      client_name: 'Test Patient',
      client_email: 'theonmorales@gmail.com',
      procedures: ['Dental Implants', 'Smile Makeover'],
      procedure_country: 'Venezuela',
      base_cost: 5000,
      markup_percentage: 0.35,
      final_package_price: 6750,
      treatment_cost: 3500,
      flight_cost: 800,
      hotel_cost: 500,
      pickup_cost: 100,
      dropoff_cost: 100,
      local_transfer_cost: 200,
      status: 'Proposal-Sent',
      timeline_log: [{
        timestamp: new Date().toISOString(),
        action: 'test_proposal',
        details: 'Test proposal email sent'
      }]
    });

    // Generate proposal token (CLEAN alphanumeric only - no timestamps or random hashes)
    const proposalToken = `prop_${mockCase.id}`;
    
    await base44.asServiceRole.entities.CaseRecord.update(mockCase.id, {
      proposal_token: proposalToken,
      proposal_sent_at: new Date().toISOString()
    });

    // Send proposal email - route to the genuinely public, no-login proposal page.
    // FIX: /pay-now is login-gated and doesn't preserve the token across the login
    // redirect (see iq200Pipeline's admin_approve_proposal for the full explanation).
    const appUrl = 'https://sentinel-dental-care.base44.app';
    const paymentUrl = `${appUrl}/portal/proposal/${proposalToken}`;
    
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'theonmorales@gmail.com',
      subject: `Your IQ200 Medical Travel Package Proposal`,
      body: `
        <!doctype html>
        <html>
        <body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;">
            <tr><td align="center">
              <table width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #dde5df;border-radius:16px;overflow:hidden;">
                <tr><td style="background:#0F3A20;padding:24px 32px;">
                  <div style="font-family:Georgia,serif;font-size:22px;color:#fff;">Morales Medical Travel Safety</div>
                  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C5A059;margin-top:6px;">MEDICAL TRAVEL PACKAGE</div>
                </td></tr>
                <tr><td style="padding:28px 32px;">
                  <h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:24px;color:#0F3A20;">Your Personalized Medical Travel Package</h2>
                  <p style="color:#555;font-size:14px;margin:0 0 20px;">Dear Test Patient,</p>
                  
                  <p style="color:#555;font-size:14px;margin:0 0 20px;">Your complete medical travel package is ready for review. This personalized itinerary includes everything you need for a seamless, luxury medical tourism experience.</p>
                  
                  <table width="100%" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                    <tr style="background:linear-gradient(135deg, rgba(15,58,32,0.08), rgba(197,160,89,0.08));">
                      <td style="padding:24px;text-align:center;">
                        <div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Total Package Investment</div>
                        <div style="font-size:36px;font-weight:700;color:#0F3A20;">$6,750.00</div>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color:#0F3A20;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:24px 0 12px;">What's Included</p>
                  <table width="100%" cellspacing="0" cellpadding="0">
                    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;"><span style="font-size:16px;margin-right:10px;">🦷</span><span style="font-size:13px;color:#374151;">Medical procedure with board-certified specialist in Venezuela</span></td></tr>
                    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;"><span style="font-size:16px;margin-right:10px;">✈️</span><span style="font-size:13px;color:#374151;">Hand-selected round-trip flights with premium comfort seating</span></td></tr>
                    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;"><span style="font-size:16px;margin-right:10px;">🏨</span><span style="font-size:13px;color:#374151;">Luxury hotel accommodations near your treatment facility</span></td></tr>
                    <tr><td style="padding:10px 0;"><span style="font-size:16px;margin-right:10px;">🚘</span><span style="font-size:13px;color:#374151;">Private airport transfers and clinic transportation throughout your stay</span></td></tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                    <tr>
                      <td align="center">
                        <a href="${paymentUrl}" style="display:inline-block;background:#0F3A20;color:#fff;text-decoration:none;padding:16px 48px;border-radius:999px;font-size:14px;font-weight:700;letter-spacing:0.5px;border:2px solid #0F3A20;transition:all 0.3s ease;">
                          Review & Accept Proposal
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="font-size:12px;color:#6B7280;text-align:center;font-style:italic;margin:16px 0;">Please review and confirm your package within 7 days to secure your dates.</p>
                  
                  <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;">
                    <p style="font-size:12px;color:#6B7280;margin:0 0 8px;"><strong style="color:#1F2937;">Next Steps:</strong> Upon acceptance, our concierge team will coordinate all logistics including doctor confirmations, travel itineraries, and pre-procedure requirements.</p>
                    <p style="font-size:12px;color:#6B7280;margin:0;">Questions? Contact us at <strong style="color:#0F3A20;">concierge@morales-dental.com</strong></p>
                  </div>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `
    });

    return Response.json({ 
      status: 'TEST_EMAIL_SENT', 
      case_id: mockCase.id,
      payment_url: paymentUrl,
      message: 'Test proposal email sent to theonmorales@gmail.com' 
    });

  } catch (error) {
    console.error('sendTestProposalEmail error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});