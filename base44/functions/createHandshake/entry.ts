import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function verifyCaseAccess(base44, case_id, user) {
  const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: case_id });
  if (!cases.length) return { allowed: false, error: 'Case not found', status: 404 };

  const c = cases[0];
  const isAdmin = ['admin', 'platform_admin', 'coordinator'].includes(user.role);
  const isPatient = c.client_email === user.email;
  const isAssignedDoctor = user.role === 'doctor' && c.doctor_email === user.email;
  const isAssignedTravel = user.role === 'travel_agency' && c.travel_vendor_id === user.id;
  const isAssignedDriver = user.role === 'taxi_service' && (c.origin_driver_id === user.id || c.destination_driver_id === user.id);

  if (!isAdmin && !isPatient && !isAssignedDoctor && !isAssignedTravel && !isAssignedDriver) {
    const companionAssignments = await base44.asServiceRole.entities.CompanionAssignment.filter({ case_id });
    const isCompanion = user.role === 'companion' && companionAssignments.some(a => a.companion_user_id === user.id);
    if (!isCompanion) {
      return { allowed: false, error: 'Forbidden: not authorized for this case', status: 403 };
    }
  }
  return { allowed: true, caseRecord: c };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, case_id, checkpoint_type, checkpoint_label, required, expires_hours, handshake_id, notes } = body;

    if (action === 'create') {
      if (!case_id || !checkpoint_type) {
        return Response.json({ error: 'case_id and checkpoint_type required' }, { status: 400 });
      }

      const access = await verifyCaseAccess(base44, case_id, user);
      if (!access.allowed) {
        return Response.json({ error: access.error }, { status: access.status });
      }

      const expiresAt = expires_hours ? new Date(Date.now() + expires_hours * 3600000).toISOString() : null;

      const handshake = await base44.asServiceRole.entities.DigitalHandshake.create({
        case_id,
        patient_id: access.caseRecord.created_by_id || '',
        actor_user_id: user.id,
        actor_role: user.role,
        actor_name: user.full_name,
        actor_email: user.email,
        checkpoint_type,
        checkpoint_label: checkpoint_label || checkpoint_type.replace(/_/g, ' '),
        status: 'pending',
        required: required !== false,
        expires_at: expiresAt,
        audit_logged: false
      });

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'handshake_created',
        actor_id: user.id,
        actor_role: user.role,
        actor_name: user.full_name,
        actor_email: user.email,
        resource_type: 'digital_handshake',
        resource_id: handshake.id,
        case_id,
        details: { checkpoint_type, required: required !== false },
        sensitive: false,
        timestamp: new Date().toISOString()
      });

      return Response.json({ success: true, handshake });
    }

    if (action === 'complete') {
      if (!handshake_id) {
        return Response.json({ error: 'handshake_id required' }, { status: 400 });
      }

      const handshakes = await base44.asServiceRole.entities.DigitalHandshake.filter({ id: handshake_id });
      if (!handshakes.length) {
        return Response.json({ error: 'Handshake not found' }, { status: 404 });
      }

      const handshake = handshakes[0];

      const access = await verifyCaseAccess(base44, handshake.case_id, user);
      if (!access.allowed) {
        return Response.json({ error: access.error }, { status: access.status });
      }

      if (handshake.expires_at && new Date(handshake.expires_at) < new Date()) {
        await base44.asServiceRole.entities.DigitalHandshake.update(handshake_id, { status: 'expired' });
        return Response.json({ error: 'Handshake has expired' }, { status: 410 });
      }

      const updated = await base44.asServiceRole.entities.DigitalHandshake.update(handshake_id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        actor_user_id: user.id,
        actor_role: user.role,
        actor_name: user.full_name,
        actor_email: user.email,
        notes: notes || '',
        audit_logged: true
      });

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'handshake_completed',
        actor_id: user.id,
        actor_role: user.role,
        actor_name: user.full_name,
        actor_email: user.email,
        resource_type: 'digital_handshake',
        resource_id: handshake_id,
        case_id: handshake.case_id,
        details: { checkpoint_type: handshake.checkpoint_type },
        sensitive: false,
        timestamp: new Date().toISOString()
      });

      return Response.json({ success: true, handshake: updated });
    }

    if (action === 'list') {
      if (!case_id) {
        return Response.json({ error: 'case_id required' }, { status: 400 });
      }

      const access = await verifyCaseAccess(base44, case_id, user);
      if (!access.allowed) {
        return Response.json({ error: access.error }, { status: access.status });
      }

      const handshakes = await base44.asServiceRole.entities.DigitalHandshake.filter({ case_id });
      return Response.json({ success: true, handshakes });
    }

    return Response.json({ error: 'Invalid action. Use: create | complete | list' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});