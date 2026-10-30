import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { ensureCardSet, pdfForCard, loadInstances } from '../../shared/tripCardSetEngine.ts';
import { PRINT_INSTRUCTION } from '../../shared/tripCardSet.ts';
import { languageForCountry, SUPPORTED_LANGUAGES } from '../../shared/tripCard.ts';

/**
 * issueTripCard — issuing a trip's cards, from the trip pack.
 *
 * The pack is the only place a card gets into a hand, so this is where issuance
 * belongs. A card minted off a status flag but never delivered is a live token in
 * the world with nobody carrying it.
 *
 * Two facts gate it, and they are not alternatives: the booking is confirmed (the
 * condition) and payment is captured (the delivery route). Travel status is NOT the
 * authority — it is the downstream record, it moves when flights move, and anything
 * hung off it churns. Card expiry already follows the actual trip end, which is
 * where travel changes belong.
 *
 * It is idempotent and re-runnable: a resend retrieves the cards this trip already
 * has. Only an itinerary change replaces them, and only because a card printed
 * against a date that moved is a card pointing at the wrong day.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user || !['admin', 'platform_admin'].includes(String(user.role || ''))) {
      return Response.json({ error: 'Only the care team can issue a trip card set.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const caseId = String(body.case_id || '').trim();
    if (!caseId) return Response.json({ error: 'case_id is required' }, { status: 400 });

    const caseRow = await base44.asServiceRole.entities.CaseRecord.get(caseId).catch(() => null);
    if (!caseRow) return Response.json({ error: 'Case not found' }, { status: 404 });

    const countryCode = String(body.country_code || '').toUpperCase().slice(0, 2);
    if (!countryCode) {
      return Response.json({
        error: 'country_code is required — it selects the number, the language and the page language.',
      }, { status: 400 });
    }

    const requestedLanguage = String(body.language || '').toLowerCase();
    const language = SUPPORTED_LANGUAGES.includes(requestedLanguage)
      ? requestedLanguage
      : languageForCountry(countryCode);

    const reissue = String(body.reissue || '') === 'itinerary_change' ? 'itinerary_change' : null;

    const result = await ensureCardSet(base44, {
      caseRow,
      countryCode,
      countryName: body.country_name ? String(body.country_name) : caseRow.procedure_country || null,
      language,
      localNumberOverride: body.local_number ? String(body.local_number) : null,
      actor: user.email,
      now: new Date().toISOString(),
      reissueReason: reissue,
    });

    if (!result.ok) {
      const status = result.blocked_reason === 'module_disabled' ? 403
        : result.blocked_reason ? 409
          : 400;

      const messages: Record<string, string> = {
        module_disabled: 'The trip card set module is switched off. Turn it on before issuing.',
        booking_not_confirmed: 'The booking is not confirmed yet, so there is no pack to put a card in.',
        payment_not_captured: 'Payment has not been captured yet, so the pack is not being delivered.',
        no_local_number: 'This country has no local M-Care number on file. A card cannot be printed without one — add the number that answers at 3am to this country, then reissue.',
      };

      return Response.json({
        error: messages[result.blocked_reason] || result.error || 'The card set could not be issued.',
        blocked_reason: result.blocked_reason || null,
      }, { status });
    }

    const instances = result.instances?.length ? result.instances : await loadInstances(base44, result.card.id);
    const sheet = await pdfForCard(base44, result.card);

    return Response.json({
      success: true,
      created: result.created,
      card: {
        id: result.card.id,
        patient_first_name: result.card.patient_first_name,
        country_code: result.card.country_code,
        language: result.card.language,
        local_mcare_number: result.card.local_mcare_number || result.card.emergency_number,
        expires_at: result.card.expires_at,
        card_set_version: result.card.card_set_version || 1,
      },
      cards: instances.map((i) => ({
        id: i.id,
        short_ref: i.short_ref,
        card_url: i.card_url,
        status: i.status,
      })),
      instruction: PRINT_INSTRUCTION,
      pdf_filename: sheet?.filename || null,
      pdf_url: sheet ? `data:application/pdf;base64,${sheet.base64}` : null,
    });
  } catch (error) {
    console.error('[issueTripCard]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});