import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const body = await req.json();
    const { event_type, resource_type, resource_id, resource_name, case_id, details, sensitive } = body;

    if (!event_type) {
      return Response.json({ error: 'event_type is required' }, { status: 400 });
    }

    const auditEntry = await base44.asServiceRole.entities.AuditLog.create({
      event_type,
      actor_id: user?.id || 'system',
      actor_role: user?.role || 'system',
      actor_name: user?.full_name || 'System',
      actor_email: user?.email || '',
      resource_type: resource_type || 'unknown',
      resource_id: resource_id || '',
      resource_name: resource_name || '',
      case_id: case_id || null,
      details: details || {},
      sensitive: sensitive || false,
      timestamp: new Date().toISOString()
    });

    return Response.json({ success: true, audit_id: auditEntry.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});