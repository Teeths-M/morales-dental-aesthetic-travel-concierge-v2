import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { researchPartnerWebsiteCore } from '../../shared/partnerWebsiteResearch.ts';
import { sanitizePromptInput } from '../../shared/sanitizePromptInput.ts';
import { PARTNER_TYPE_CONFIG, type PartnerType } from '../../shared/partnerTypeConfig.ts';
import { SUPPORTED_LANGUAGE_CODES, LANGUAGE_LABELS, type LanguageCode } from '../../shared/partnerLanguage.ts';

// ── draftPartnerOutreach ─────────────────────────────────────────────────────
// Drafts a warm, specific message to an already-onboarded Morales partner on
// a traveler's behalf. Writes nothing, sends nothing -- pure draft.
//
// This is the one place in this codebase's provider-outreach machinery that
// lets an LLM freely author prose meant for a real external business.
// Everywhere else (assignTravelAgency, assignChauffeurServices) deliberately
// uses a fixed, code-reviewed template specifically because those functions
// send automatically with no human review. That reasoning doesn't apply
// here ONLY because the actual send (sendPartnerOutreach) is never an agent
// tool -- it is not listed in m_care.jsonc's tool_configs at all, so the
// LLM has no structural way to call it. It is only ever invoked directly
// from a real button tap inside OutreachDraftCard.jsx. A human reviewing
// (and editing, if they want) this exact text before it can leave the
// platform is what makes free-form drafting safe here -- see
// sendPartnerOutreach/entry.ts's own header.
//
// The message is drafted directly in the partner's own language --
// partnerLanguage.ts's resolvePartnerLanguage() deterministically senses it
// from the partner's on-file preference, then their country, before this
// function ever runs. The agent never picks the language itself; it may
// only override the sensed default with an explicit, validated code.

const bodySchema = strictObject({
  case_id: Fields.shortText(100),
  partner_type: z.enum(['doctor', 'travel_agency', 'taxi_service', 'companion', 'security_agency']),
  partner_id: Fields.shortText(100),
  intent: Fields.shortText(500),
  // Optional explicit override -- when omitted, the language is sensed
  // deterministically from the partner's own on-file preference/country
  // (see research.resolved_language below), never left to an LLM guess.
  // Validated against the exact supported set so an unchecked string can
  // never reach the drafting prompt.
  language: z.enum(SUPPORTED_LANGUAGE_CODES).optional(),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, partner_type, partner_id, intent, language } = await body();
  const cfg = PARTNER_TYPE_CONFIG[partner_type as PartnerType];

  const research = await researchPartnerWebsiteCore(base44, partner_type as PartnerType, partner_id).catch(() => null);
  if (!research || !research.found_partner) {
    return err(`No ${cfg.noun} record found for that id.`, 404);
  }

  const recipientEmail = research.partner_email || '';
  const recipientWhatsapp = research.partner_whatsapp || research.partner_phone || '';
  if (!recipientEmail && !recipientWhatsapp) {
    return ok({
      success: false,
      partner_name: research.partner_name,
      message: `${research.partner_name} has no email or phone on file -- I can't draft outreach with nowhere real to send it.`,
    });
  }

  // Real, brief case context -- this message is genuinely about a specific
  // patient's case, same as assignTravelAgency's real trip-detail emails.
  let caseContext = '';
  try {
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    if (caseRecord) {
      const procedures = Array.isArray(caseRecord.procedures) ? caseRecord.procedures.join(', ') : '';
      caseContext = [
        procedures ? `Procedure(s): ${procedures}.` : '',
        caseRecord.procedure_date ? `Date: ${new Date(caseRecord.procedure_date).toDateString()}.` : '',
      ].filter(Boolean).join(' ');
    }
  } catch (_) { /* draft still works without case context */ }

  const safeIntent = sanitizePromptInput(intent, 500).text;
  // Deterministic language: an explicit, validated caller override wins;
  // otherwise use what researchPartnerWebsiteCore already sensed from the
  // partner's own on-file preference/country (partnerLanguage.ts). The LLM
  // is only ever told the final answer -- it never picks the language itself.
  const targetLanguage: LanguageCode = (language as LanguageCode | undefined) ?? research.resolved_language;
  const languageSource = language ? 'override' : research.language_source;

  const prompt = `Write a short, warm, professional outreach message from a medical travel concierge (Morales) to a partner ${cfg.noun} named "${research.partner_name}".
The traveler's stated reason for reaching out: "${safeIntent}"
${caseContext ? `Relevant case context: ${caseContext}` : ''}
${research.summary ? `What we know about them from their own website: ${research.summary}` : ''}
Write in ${LANGUAGE_LABELS[targetLanguage]}. 2-4 short sentences, no subject line, no signature block beyond "Warmly, The Morales Concierge Team" on its own line at the end. Do not invent any fact not given above. Return ONLY the message text, nothing else.`;

  const invokeDraft = async (): Promise<string> => {
    try {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });
      const text = typeof result === 'string' ? result : (result?.data ?? result?.text ?? '');
      return typeof text === 'string' ? text.trim() : '';
    } catch (_) {
      return '';
    }
  };

  // One retry on an empty/failed first attempt -- same established
  // retry-once-on-transient-failure pattern as weatherEngine.ts.
  let draftMessage = await invokeDraft();
  if (!draftMessage) draftMessage = await invokeDraft();

  if (!draftMessage) {
    return ok({
      success: false,
      partner_name: research.partner_name,
      message: "Couldn't draft a message right now -- try again in a moment.",
    });
  }

  const suggestedChannel = recipientEmail ? 'email' : 'whatsapp';

  return ok({
    success: true,
    partner_type,
    partner_id,
    case_id,
    partner_name: research.partner_name,
    partner_email: recipientEmail,
    partner_whatsapp: recipientWhatsapp,
    suggested_channel: suggestedChannel,
    research_summary: research.website_url ? research.summary : null,
    contact_mismatch: research.on_file_contact_matches === false,
    draft_message: draftMessage,
    drafted_in_language: LANGUAGE_LABELS[targetLanguage],
    language_source: languageSource,
  });
}, { name: 'draftPartnerOutreach', requireAuth: false, bodySchema, rateLimit: { max: 8, windowSeconds: 300 } }));
