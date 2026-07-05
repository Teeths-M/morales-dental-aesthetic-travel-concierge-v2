import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { requestId, action, notes } = await req.json();

    if (!requestId || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const request = await base44.entities.ProcedureRequest.get(requestId);
    if (!request) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Generate procedure ID
      const categoryPrefix = {
        'Facial': 'FACE', 'Breast': 'BREAST', 'Body': 'BODY',
        'Dental': 'DENTAL', 'Wellness': 'WELL', 'Other': 'OTHER'
      }[request.category] || 'PROC';
      
      const procedureId = `${categoryPrefix}-${request.procedure_name.toUpperCase().replace(/\s+/g, '-').slice(0, 10)}-${Date.now().toString().slice(-4)}`;

      // Create MasterProcedure
      await base44.entities.MasterProcedure.create({
        procedure_id: procedureId,
        en_name: request.procedure_name,
        es_name: request.procedure_name_es || request.procedure_name,
        fr_name: request.procedure_name_fr || request.procedure_name,
        pt_name: request.procedure_name_pt || request.procedure_name,
        de_name: request.procedure_name_de || request.procedure_name,
        category: request.category,
        category_emoji: request.category_emoji || '🏥',
        description: request.description,
        is_active: true,
      });

      // Update request
      await base44.entities.ProcedureRequest.update(requestId, {
        status: 'approved',
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString(),
        review_notes: notes || '',
        procedure_id: procedureId,
      });

      // Notify doctor
      await base44.functions.invoke('sendPartnerWelcomeEmail', {
        to: request.doctor_email,
        subject: `Procedure Approved: ${request.procedure_name}`,
        body: `Great news! Your procedure request for "${request.procedure_name}" has been approved and added to the Master catalog.\n\nProcedure ID: ${procedureId}\n\nThank you for contributing to our growing network.`,
      });

      return Response.json({ success: true, procedure_id: procedureId });
    }

    if (action === 'reject') {
      await base44.entities.ProcedureRequest.update(requestId, {
        status: 'rejected',
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString(),
        review_notes: notes || '',
      });

      // Notify doctor
      await base44.functions.invoke('sendPartnerWelcomeEmail', {
        to: request.doctor_email,
        subject: `Procedure Request Update: ${request.procedure_name}`,
        body: `Your procedure request for "${request.procedure_name}" has been reviewed.\n\nStatus: Rejected\n${notes ? `Notes: ${notes}` : ''}\n\nPlease contact admin if you have questions.`,
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});