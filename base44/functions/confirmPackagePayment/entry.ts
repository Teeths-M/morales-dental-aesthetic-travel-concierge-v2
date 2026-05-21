import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const request = (await base44.asServiceRole.entities.PatientRequest.filter({ payment_token: body.token }))[0];
    if (!request) return Response.json({ error: 'Invalid payment token' }, { status: 404 });
    const method = body.method === 'terms' ? 'terms' : 'full';
    await base44.asServiceRole.entities.PatientRequest.update(request.id, { payment_status: method === 'full' ? 'paid_full' : 'paying_terms', selected_payment_method: method });
    return Response.json({ success: true });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
});