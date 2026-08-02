import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ req, user }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data || !data.id) {
      return Response.json({ error: 'No doctor data' }, { status: 400 });
    }

    const doctor = data;

    // SECURITY: this creates a real Partner record — a caller may only sync
    // their own doctor identity, never an arbitrary one.
    if (!doctor.email || doctor.email.toLowerCase() !== user?.email?.toLowerCase()) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // BUG-R12-04 FIX: Partner entity has no `name` field — the correct field is `email`.
    // Matching by full_name is also unsafe: two doctors with the same name would block the second.
    // Use email as the unique key for idempotency — it's always present and unique.
    const existingPartners = await base44.asServiceRole.entities.Partner.filter({
      type: 'doctor',
      email: doctor.email
    });

    if (existingPartners.length === 0) {
      await base44.asServiceRole.entities.Partner.create({
        type: 'doctor',
        // BUG-R12-04 FIX: use agency_name (the Partner entity's display name field),
        // not `name` which does not exist on the Partner schema.
        agency_name: doctor.full_name,
        email: doctor.email,
        phone: doctor.phone,
        notes: `${doctor.clinic_name || 'Clinic'} - ${doctor.clinic_country}`,
      });
    }

    return Response.json({ 
      success: true,
      message: `Doctor ${doctor.full_name} synced to Portal Hub`,
      doctor_id: doctor.id
    });
  } catch (error) {
    // BUG-R12-01 FIX: SEC-10
    console.error('[syncDoctorToPortalHub]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'syncDoctorToPortalHub', requireAuth: true }));
