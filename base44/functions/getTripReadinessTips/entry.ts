// Redeploy trigger — re-register as agent tool after GitHub sync.
/**
 * getTripReadinessTips — "how do I get ready for my trip" for ANY journey
 * type (medical AND leisure), unlike sendPreOpInstructions/
 * sendPostOpInstructions which are procedure-specific and MEDICAL/BYOJ only.
 *
 * Two layers, deliberately different in how they're sourced:
 *   1. universal_tips — deterministic, curated, timeless (getUniversalTravelTips)
 *      hydration/sleep/movement/comfort/jet-lag/packing. Always included.
 *   2. destination_tips — best-effort, live-web-grounded via
 *      mcareResearchAndLearn (same recall-then-research pattern already used
 *      for country-aware partner verification), covering climate/packing/
 *      local-customs specifics for this route. Advisory only — omitted
 *      entirely if research fails or isn't confident, never fabricated.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { getUniversalTravelTips } from '../../shared/tripReadinessTips.ts';

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id } = await body<{ case_id?: string }>();
  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const isMedical = caseRecord.booking_type !== 'travel_only';
  const originCountry = caseRecord.client_country || null;
  const destinationCountry = caseRecord.procedure_country || null;

  const universalTips = getUniversalTravelTips();

  let destinationTips: string | null = null;
  if (originCountry && destinationCountry) {
    try {
      const researchResult = await base44.functions.invoke('mcareResearchAndLearn', {
        question: `What should a traveler know before traveling from ${originCountry} to ${destinationCountry}? Cover general climate/packing considerations for a typical trip and a few practical, well-known travel tips a first-time visitor should know.`,
        context: 'Trip-readiness guidance for a travel concierge platform — general, practical, non-medical.',
      });
      const research = researchResult?.data;
      // Same >=80 bar used elsewhere (mcareResearchAndLearn's own "reliable
      // enough to memorize" threshold) — kept consistent rather than picking
      // a new number for this call site.
      if (research?.success && research.answer && Number(research.confidence_score) >= 80) {
        destinationTips = research.answer;
      }
    } catch (researchErr) {
      console.error('[getTripReadinessTips] destination research failed:', researchErr);
    }
  }

  return ok({
    success: true,
    case_id,
    is_medical: isMedical,
    origin_country: originCountry,
    destination_country: destinationCountry,
    universal_tips: universalTips,
    destination_tips: destinationTips,
    destination_tips_source: destinationTips ? 'researched' : 'none',
  });
}, { name: 'getTripReadinessTips', requireAuth: true }));