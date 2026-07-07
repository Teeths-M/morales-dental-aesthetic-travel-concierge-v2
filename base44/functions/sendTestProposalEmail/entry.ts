import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { renderEmail } from '../_shared/emailTemplate.ts';

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

    const testPackageItems = [
      ['🦷', 'Medical procedure with board-certified specialist in Venezuela'],
      ['✈️', 'Hand-selected round-trip flights with premium comfort seating'],
      ['🏨', 'Luxury hotel accommodations near your treatment facility'],
      ['🚘', 'Private airport transfers and clinic transportation throughout your stay'],
    ];
    const testHeroHtml = `
      <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:28px 24px;margin:8px 0 28px;text-align:center;">
        <p style="margin:0;font-size:12px;color:rgba(238,242,247,0.5);text-transform:uppercase;letter-spacing:1.5px;">Total Package Investment</p>
        <p style="margin:8px 0 0;font-size:38px;font-weight:700;color:#D4AF37;line-height:1.2;">$6,750.00</p>
      </div>
      <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:1.5px;">What's Included</p>
      <div style="margin-bottom:8px;">
        ${testPackageItems.map(([icon, text]) => `
          <div style="display:flex;align-items:flex-start;padding:12px 0;border-bottom:1px solid #2A3F4A;font-size:14px;color:rgba(238,242,247,0.8);line-height:1.6;">
            <span style="font-size:20px;margin-right:12px;flex-shrink:0;">${icon}</span>
            <span>${text}</span>
          </div>`).join('')}
      </div>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'theonmorales@gmail.com',
      subject: `Your IQ200 Medical Travel Package Proposal`,
      body: renderEmail({
        appUrl,
        eyebrow: 'Your Proposal',
        title: 'Your Personalized Medical Travel Package',
        intro: 'Dear Test Patient, your complete medical travel package is ready for review. This personalized itinerary includes everything you need for a seamless, luxury medical tourism experience.',
        bodyHtml: testHeroHtml,
        note: 'Please review and confirm your package within 7 days to secure your dates. Upon acceptance, our concierge team will coordinate all logistics including doctor confirmations, travel itineraries, and pre-procedure requirements.',
        ctaText: 'Review & Accept Proposal',
        ctaUrl: paymentUrl,
      }),
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