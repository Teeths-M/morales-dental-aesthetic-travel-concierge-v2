import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { event, data } = await req.json();
    const doctorId = data?.id || event?.entity_id;

    if (!doctorId) {
      return Response.json({ error: 'No doctor ID provided' }, { status: 400 });
    }

    const cleanup = {
      doctorId,
      deleted: {
        doctorPricing: 0,
        doctorSpecialty: 0,
        partnerMatches: 0
      },
      errors: []
    };

    try {
      // Delete all doctor pricing entries
      const pricingToDelete = await base44.asServiceRole.entities.DoctorPricing.filter(
        { doctor_id: doctorId }
      );
      for (const pricing of pricingToDelete) {
        await base44.asServiceRole.entities.DoctorPricing.delete(pricing.id);
        cleanup.deleted.doctorPricing++;
      }
    } catch (err) {
      cleanup.errors.push(`DoctorPricing cleanup: ${err.message}`);
    }

    try {
      // Delete all doctor specialty assignments
      const specialtiesToDelete = await base44.asServiceRole.entities.DoctorSpecialty.filter(
        { doctor_id: doctorId }
      );
      for (const specialty of specialtiesToDelete) {
        await base44.asServiceRole.entities.DoctorSpecialty.delete(specialty.id);
        cleanup.deleted.doctorSpecialty++;
      }
    } catch (err) {
      cleanup.errors.push(`DoctorSpecialty cleanup: ${err.message}`);
    }

    try {
      // Clean up any partner matches referencing this doctor
      const matchesToClean = await base44.asServiceRole.entities.PartnerMatch.filter(
        { partner_id: doctorId }
      );
      for (const match of matchesToClean) {
        await base44.asServiceRole.entities.PartnerMatch.delete(match.id);
        cleanup.deleted.partnerMatches++;
      }
    } catch (err) {
      cleanup.errors.push(`PartnerMatch cleanup: ${err.message}`);
    }

    return Response.json({
      status: cleanup.errors.length === 0 ? 'success' : 'partial_success',
      cleanup,
      message: `Cleaned up ${cleanup.deleted.doctorPricing + cleanup.deleted.doctorSpecialty + cleanup.deleted.partnerMatches} records for doctor ${doctorId}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});