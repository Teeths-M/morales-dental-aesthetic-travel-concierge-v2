import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../_shared/cronAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECURITY: this is a destructive bulk-delete action — must require admin auth.
    // The previous guard exempted sessionless calls so Base44 entity-delete
    // triggers could run, but that exemption is indistinguishable from an
    // anonymous POST: anyone could bulk-delete a doctor's procedure links.
    // A destructive action cannot be world-callable, so it now requires a cron
    // secret or an admin session. NOTE: if a Base44 entity-delete trigger drives
    // this, that trigger must send X-Cron-Secret or the cleanup will 403.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { data } = await req.json();

    if (!data || !data.doctor_id) {
      return Response.json({ error: 'No doctor_id provided' }, { status: 400 });
    }

    // When a DoctorPricing is deleted, remove the associated DoctorSpecialty
    const specialties = await base44.asServiceRole.entities.DoctorSpecialty.filter({ 
      doctor_id: data.doctor_id
    });

    let deletedCount = 0;
    if (specialties.length > 0) {
      for (const specialty of specialties) {
        await base44.asServiceRole.entities.DoctorSpecialty.delete(specialty.id);
        deletedCount++;
      }
    }

    return Response.json({ 
      success: true,
      message: `Removed ${deletedCount} procedure(s) for doctor ${data.doctor_id}`
    });
  } catch (error) {
    console.error('Error removing doctor from procedures:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});