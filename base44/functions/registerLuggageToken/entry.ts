import { createHandler } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { case_id, bag_label, bag_number, airline_pnr, airline_code, flight_number, origin_airport, destination_airport } = await body();
    if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

    // Generate unique luggage token
    const randomPart = crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 8);
    const token_code = `LUG_${randomPart}`;
    const finder_contact_token = `FIND_${crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 12)}`;

    const appUrl = Deno.env.get('APP_URL') || 'https://app.moralesmedical.com';
    const qr_url = `${appUrl}/luggage/${finder_contact_token}`;

    const luggage = await base44.entities.LuggageToken.create({
      case_id,
      patient_id: user.id,
      patient_email: user.email,
      patient_name: user.full_name,
      token_code,
      finder_contact_token,
      bag_label: bag_label || 'Bag',
      bag_number: bag_number || 1,
      airline_pnr: airline_pnr || null,
      airline_code: airline_code || null,
      flight_number: flight_number || null,
      origin_airport: origin_airport || null,
      destination_airport: destination_airport || null,
      current_status: 'registered',
      status_history: [{
        status: 'registered',
        location: origin_airport || 'Origin',
        timestamp: new Date().toISOString(),
        source: 'manual'
      }],
      registered_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString()
    });

    return Response.json({ success: true, luggage, qr_url, token_code, finder_contact_token });
}, { name: 'registerLuggageToken' }));
