import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin user
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { doctorId, action, notes } = await req.json();

    if (!doctorId || !action) {
      return Response.json({ error: 'Missing required fields: doctorId, action' }, { status: 400 });
    }

    // Get doctor record
    const doctor = await base44.asServiceRole.entities.Doctor.get(doctorId);
    if (!doctor) {
      return Response.json({ error: 'Doctor not found' }, { status: 404 });
    }

    let updateData = {};

    if (action === 'approve') {
      updateData = {
        verification_status: 'verified',
        license_verified: true,
        status: 'active',
        verification_notes: notes || `Manually verified by admin ${user.email} on ${new Date().toISOString()}`
      };
    } else if (action === 'reject') {
      updateData = {
        verification_status: 'rejected',
        license_verified: false,
        status: 'inactive',
        verification_notes: notes || `Rejected by admin ${user.email} on ${new Date().toISOString()}`
      };
    } else if (action === 'request_review') {
      updateData = {
        verification_status: 'manual_review',
        verification_notes: notes || `Flagged for review by admin ${user.email} on ${new Date().toISOString()}`
      };
    } else {
      return Response.json({ error: 'Invalid action. Must be: approve, reject, or request_review' }, { status: 400 });
    }

    // Update doctor record
    await base44.asServiceRole.entities.Doctor.update(doctorId, updateData);

    return Response.json({ 
      success: true, 
      message: `Doctor ${doctor.full_name} verification status updated to ${updateData.verification_status}`,
      doctor: { ...doctor, ...updateData }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});