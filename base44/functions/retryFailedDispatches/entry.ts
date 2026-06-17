import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all pending failures older than 10 minutes (give manual retry time first)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    // BUG-R9-05 FIX: Bound the query — unbounded filter on DispatchFailureLog can load the
    // entire failure history on every cron run. Limit to 50 to prevent OOM in high-failure periods.
    const pending = await base44.asServiceRole.entities.DispatchFailureLog.filter(
      { status: 'pending_intervention' },
      '-logged_at',
      50
    );

    const toRetry = pending.filter(f => f.logged_at < tenMinutesAgo);
    if (toRetry.length === 0) return Response.json({ retried: 0 });

    const results = [];
    for (const failure of toRetry) {
      try {
        // BUG-R9-06 FIX: base44.asServiceRole.functions does not exist — the functions
        // namespace is only on the user-scoped client. Use base44.functions.invoke().
        // Also: retrying portalHubWorkflow with only consultation_id is insufficient —
        // the DispatchFailureLog records which pipeline_stage failed. Retry the correct
        // stage by invoking executeCaseWorkflow with the case_id so the state machine
        // picks up from the correct status rather than re-running the entire pipeline.
        const retryPayload = failure.case_id
          ? { caseId: failure.case_id }
          : { consultation_id: failure.consultation_id || failure.case_id };
        const fnName = failure.case_id ? 'executeCaseWorkflow' : 'portalHubWorkflow';
        await base44.functions.invoke(fnName, retryPayload);
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
    console.error('[retryFailedDispatches]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});