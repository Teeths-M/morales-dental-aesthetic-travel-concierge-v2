import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'platform_admin'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    const request = (await base44.asServiceRole.entities.PatientRequest.filter({ id: body.patient_request_id }))[0];
    const patient = (await base44.asServiceRole.entities.Patient.filter({ id: request.patient_id }))[0];
    const procedure = (await base44.asServiceRole.entities.ConciergeProcedure.filter({ id: request.procedure_id }))[0];
    const travel = (await base44.asServiceRole.entities.TravelOffer.filter({ id: body.travel_offer_id }))[0];
    const origin = (await base44.asServiceRole.entities.OriginDriverQuote.filter({ id: body.origin_quote_id }))[0];
    const dest = (await base44.asServiceRole.entities.DestinationDriverQuote.filter({ id: body.destination_quote_id }))[0];
    if (!request || !patient || !travel || !origin || !dest) return Response.json({ error: 'Missing selected package item' }, { status: 400 });

    const destinationLegs = Number(dest.leg_airport_hotel) + Number(dest.leg_hotel_clinic) + Number(dest.leg_clinic_hotel) + Number(dest.leg_hotel_airport);
    const subtotal = Number(request.doctor_price_usd || 0) + Number(travel.total_price_usd || 0) + Number(origin.home_to_airport_price || 0) + Number(origin.airport_to_home_price || 0) + destinationLegs;
    const finalPrice = Math.round(subtotal * 1.35 * 100) / 100;
    const discountPrice = Math.round(finalPrice * 0.95 * 100) / 100;
    const paymentToken = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
    const appUrl = Deno.env.get('APP_URL') || 'https://yourapp.com';

    await base44.asServiceRole.entities.PatientRequest.update(request.id, { status: 'package_finalized', final_package_price: finalPrice, payment_token: paymentToken, selected_travel_offer_id: travel.id, selected_origin_quote_id: origin.id, selected_destination_quote_id: dest.id });
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: patient.email,
      subject: 'Your Morales Dental & Aesthetic Travel Concierge Package is Ready',
      body: `Dear ${patient.name},\n\nYour door-to-door concierge package for ${procedure?.name || 'your procedure'} is ready.\n\nTotal package price: $${finalPrice}\n\nChoose your payment option:\n\nPay in Full – Get 5% off! Price: $${discountPrice}\nClick here to pay in full: ${appUrl}/payment/full?token=${paymentToken}\n\nPay in Terms (installments) – Full price: $${finalPrice}\nClick here to pay in terms: ${appUrl}/payment/terms?token=${paymentToken}\n\nThank you for choosing Morales.`
    });
    return Response.json({ success: true, finalPrice, discountPrice });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
});