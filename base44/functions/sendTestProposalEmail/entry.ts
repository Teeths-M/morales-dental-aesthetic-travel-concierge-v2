import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
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

    // Generate proposal token
    const proposalToken = `prop_${mockCase.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await base44.asServiceRole.entities.CaseRecord.update(mockCase.id, {
      proposal_token: proposalToken,
      proposal_sent_at: new Date().toISOString()
    });

    // Send proposal email
    const proposalUrl = `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/portal/proposal/${proposalToken}`;
    
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
                  <div style="font-family:Georgia,serif;font-size:22px;color:#fff;">Morales Dental & Aesthetics</div>
                  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C5A059;margin-top:6px;">MEDICAL TRAVEL PACKAGE</div>
                </td></tr>
                <tr><td style="padding:28px 32px;">
                  <h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:24px;color:#0F3A20;">Your Personalized Medical Travel Package</h2>
                  <p style="color:#555;font-size:14px;margin:0 0 20px;">Dear Test Patient,</p>
                  
                  <p style="color:#555;font-size:14px;margin:0 0 20px;">Your complete medical travel package is ready for review:</p>
                  
                  <table width="100%" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                    <tr style="background:#f9fafb;">
                      <td style="padding:16px;font-size:13px;color:#888;">Total Package Price</td>
                      <td style="padding:16px;font-size:18px;font-weight:700;color:#0F3A20;">$6,750.00</td>
                    </tr>
                  </table>
                  
                  <p style="color:#555;font-size:14px;margin:0 0 12px;">Your package includes:</p>
                  <ul style="color:#555;font-size:14px;margin:0 0 24px;padding-left:20px;">
                    <li style="margin-bottom:8px;">Medical procedure with certified doctor</li>
                    <li style="margin-bottom:8px;">Round-trip flights</li>
                    <li style="margin-bottom:8px;">Hotel accommodation</li>
                    <li style="margin-bottom:8px;">All airport and clinic transfers</li>
                  </ul>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                    <tr>
                      <td align="center">
                        <a href="${proposalUrl}" style="display:inline-block;background:#0F3A20;color:#fff;text-decoration:none;padding:16px 32px;border-radius:999px;font-size:14px;font-weight:700;">
                          Review & Accept Proposal →
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin-top:24px;font-size:12px;color:#999;text-align:center;">Please review and accept within 7 days.</p>
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
      proposal_url: proposalUrl,
      message: 'Test proposal email sent to theonmorales@gmail.com' 
    });

  } catch (error) {
    console.error('sendTestProposalEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});