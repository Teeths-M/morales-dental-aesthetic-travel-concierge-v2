import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, z } from '../../shared/validate.ts';
import { researchPartnerWebsiteCore } from '../../shared/partnerWebsiteResearch.ts';
import type { PartnerType } from '../../shared/partnerTypeConfig.ts';

// ── researchPartnerWebsite ───────────────────────────────────────────────────
// A standalone M-Care tool: "check this already-onboarded partner's
// website" -- real text/structured-data research (fetch + regex/JSON-LD
// extraction), no screenshot, no headless browser. See
// partnerWebsiteResearch.ts's own header for the full reasoning and its
// honest JS-rendered-page limitation. Scoped ONLY to a partner Morales
// already has a record for -- never an arbitrary caller-supplied URL.

const bodySchema = strictObject({
  partner_type: z.enum(['doctor', 'travel_agency', 'taxi_service', 'companion', 'security_agency']),
  partner_id: z.string().trim().min(1).max(100),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { partner_type, partner_id } = await body();
  const result = await researchPartnerWebsiteCore(base44, partner_type as PartnerType, partner_id);
  if (!result.found_partner) return err(result.summary, 404);
  return ok(result);
}, { name: 'researchPartnerWebsite', requireAuth: false, bodySchema, rateLimit: { max: 8, windowSeconds: 300 } }));
