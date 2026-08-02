import { createHandler } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { luggage_id } = await body();
    if (!luggage_id) return Response.json({ error: 'luggage_id required' }, { status: 400 });

    const luggage = await base44.entities.LuggageToken.filter({ id: luggage_id });
    const bag = luggage[0];
    if (!bag) return Response.json({ error: 'Luggage token not found' }, { status: 404 });

    const claimRef = `CLAIM_${bag.token_code}_${Date.now()}`;
    const appUrl = Deno.env.get('APP_URL') || 'https://app.moralesmedical.com';
    const finderUrl = `${appUrl}/luggage/${bag.finder_contact_token}`;

    // Generate claim summary via AI — plain text fallback if LLM unavailable
    let claimSummary = `Lost baggage claim for ${bag.bag_label || 'suitcase'} on flight ${bag.airline_code || ''}${bag.flight_number || ''} (${bag.origin_airport || '?'} → ${bag.destination_airport || '?'}). Claim reference: ${claimRef}. Filed automatically by Morales Medical Concierge.`;
    try {
      const aiSummary = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: 'gpt_5_mini',
        prompt: `Generate a formal lost baggage claim report for submission to airline/iLost tracking network.

Patient: ${bag.patient_name || 'Medical Tourist'}
Bag Description: ${bag.bag_label || 'Suitcase'}
Airline: ${bag.airline_code || 'Unknown'} Flight ${bag.flight_number || 'Unknown'}
Route: ${bag.origin_airport || '?'} → ${bag.destination_airport || '?'}
PNR: ${bag.airline_pnr || 'Unknown'}
Claim Reference: ${claimRef}
Reported: ${new Date().toISOString()}

Write a professional 150-word claim body suitable for email submission to the airline's baggage services and iLost network. Include all key details.`
      });
      if (aiSummary && typeof aiSummary === 'string') claimSummary = aiSummary;
    } catch (_) {}

    // Update luggage status
    const updatedHistory = [...(bag.status_history || []), {
      status: 'lost',
      location: 'Unknown',
      timestamp: new Date().toISOString(),
      source: 'manual'
    }];

    await base44.entities.LuggageToken.update(bag.id, {
      current_status: 'lost',
      lost_reported_at: new Date().toISOString(),
      lost_claim_reference: claimRef,
      status_history: updatedHistory,
      last_updated_at: new Date().toISOString()
    });

    // Notify patient
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: bag.patient_email,
      subject: `🧳 Lost Baggage Claim Filed — ${claimRef}`,
      body: `Dear ${bag.patient_name || 'Traveller'},\n\nYour lost baggage claim has been filed automatically.\n\nClaim Reference: ${claimRef}\nBag: ${bag.bag_label}\nFlight: ${bag.airline_code}${bag.flight_number}\n\nQR Finder Portal (share publicly if needed): ${finderUrl}\n\nClaim Report:\n${claimSummary}\n\nOur team is tracking this case. We will notify you immediately when your bag is located.\n\nMorales Medical Concierge`
    });

    // Notify admin
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'admin@moralesmedical.com',
      subject: `🚨 Lost Baggage — ${bag.patient_name} (${claimRef})`,
      body: `Lost baggage reported for active medical tourist.\n\nPatient: ${bag.patient_name}\nEmail: ${bag.patient_email}\nBag: ${bag.bag_label}\nFlight: ${bag.airline_code}${bag.flight_number} | ${bag.origin_airport} → ${bag.destination_airport}\nClaim Ref: ${claimRef}\nFinder Portal: ${finderUrl}`
    });

    return Response.json({ success: true, claim_reference: claimRef, claim_body: claimSummary, finder_url: finderUrl });
}, { name: 'reportLostBaggage' }));
