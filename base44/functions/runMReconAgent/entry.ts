import { createHandler, ok, err } from './createHandler.ts';
import { runMReconLoop, DECISION_SCHEMA } from './mRecon.ts';

// M Recon — agentic travel-readiness briefing (demo). See _shared/mRecon.ts
// for the loop/tool logic; this file only wires it to InvokeLLM and the
// handler middleware.

Deno.serve(createHandler(async ({ base44, body }) => {
  const tripDetails = await body<any>();

  if (!tripDetails.destination_country) {
    return err('destination_country is required');
  }

  const result = await runMReconLoop(tripDetails, async (prompt) => {
    return base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: DECISION_SCHEMA,
    });
  });

  return ok(result);
}, { name: 'runMReconAgent' }));
