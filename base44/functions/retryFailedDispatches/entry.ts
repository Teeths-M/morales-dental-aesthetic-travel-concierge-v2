import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all pending failures older than 10 minutes (give manual retry time first)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const pending = await base44.asServiceRole.entities.DispatchFailureLog.filter({
      status: 'pending_intervention',
    });

    const toRetry = pending.filter(f => f.logged_at < tenMinutesAgo);
    if (toRetry.length === 0) return Response.json({ retried: 0 });

    const results = [];
    for (const failure of toRetry) {
      try {
        // Re-invoke the workflow for this case
        await base44.asServiceRole.functions.invoke('portalHubWorkflow', {
          consultation_id: failure.consultation_id || failure.case_id,
        });
        await base44.asServiceRole.entities.DispatchFailureLog.update(failure.id, {
          status: 'auto_retried',
          retried_at: new Date().toISOString(),
        });
        results.push({ id: failure.id, status: 'retried' });
      } catch (err) {
        await base44.asServiceRole.entities.DispatchFailureLog.update(failure.id, {
          status: 'retry_failed',
          retry_error: err.message,
          retried_at: new Date().toISOString(),
        });
        results.push({ id: failure.id, status: 'retry_failed', error: err.message });
      }
    }

    return Response.json({ retried: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});