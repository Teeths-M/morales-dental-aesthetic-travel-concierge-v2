import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { issueCardRow } from '../../shared/tripCardEngine.ts';
import { languageForCountry, SUPPORTED_LANGUAGES } from '../../shared/tripCard.ts';

/**
 * issueTripCard — the care team prints a card for a trip.
 *
 * Nothing identifying goes on the card. It carries a trip id, a first name, the
 * country's emergency number and a signed token — that is all. The card's live
 * expiry comes from the trip's real end, so this only has to be done once.
 */

const APP_URL = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');

function firstToken(name: string | null | undefined): string {
  const clean = String(name || '').trim();
  if (!clean) return 'Traveller';
  return clean.split(/\s+/)[0].slice(0, 40);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user || !['admin', 'platform_admin'].includes(user.role)) {
      return Response.json({ error: 'Only the care team can issue a trip card.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const caseId = String(body.case_id || '').trim();
    if (!caseId) return Response.json({ error: 'case_id is required' }, { status: 400 });

    const caseRow = await base44.asServiceRole.entities.CaseRecord.get(caseId).catch(() => null);
    if (!caseRow) return Response.json({ error: 'Case not found' }, { status: 404 });

    const countryCode = String(body.country_code || '').toUpperCase().slice(0, 2);
    if (!countryCode) {
      return Response.json({ error: 'country_code is required — it selects the emergency number and the card language.' }, { status: 400 });
    }

    let emergencyNumber = String(body.emergency_number || '').trim();
    let emergencyLabel = body.emergency_number_label ? String(body.emergency_number_label) : null;
    let countryName = body.country_name ? String(body.country_name) : null;

    if (!emergencyNumber) {
      const contacts = await base44.asServiceRole.entities.EmergencyContacts
        .filter(countryName ? { country_name: countryName } : {}, '-created_date', 20)
        .catch(() => []);
      const match = countryName
        ? (contacts as any[]).find((c) => String(c.country_name || '').toLowerCase() === countryName.toLowerCase())
        : null;
      if (match?.emergency_number) {
        emergencyNumber = String(match.emergency_number);
        emergencyLabel = emergencyLabel || match.country_name || null;
        countryName = countryName || match.country_name || null;
      }
    }

    if (!emergencyNumber) {
      return Response.json({
        error: 'No emergency number on file for this country. Enter one explicitly — the card never guesses a number.',
      }, { status: 400 });
    }

    let tripEndsAt = body.trip_ends_at ? new Date(body.trip_ends_at).toISOString() : null;
    if (!tripEndsAt) {
      const procedure = caseRow.procedure_date ? new Date(caseRow.procedure_date).getTime() : NaN;
      const departure = caseRow.departure_date ? new Date(caseRow.departure_date).getTime() : NaN;
      const recoveryDays = Number(caseRow.recovery_days) > 0 ? Number(caseRow.recovery_days) : 1;
      const candidates = [
        Number.isFinite(procedure) ? procedure + recoveryDays * 24 * 60 * 60 * 1000 : NaN,
        Number.isFinite(departure) ? departure : NaN,
      ].filter((n) => Number.isFinite(n));
      tripEndsAt = candidates.length
        ? new Date(Math.max(...candidates)).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const requestedLanguage = String(body.language || '').toLowerCase();
    const language = SUPPORTED_LANGUAGES.includes(requestedLanguage)
      ? requestedLanguage
      : languageForCountry(countryCode);

    const tripId = String(body.trip_id || caseRow.id || caseId);

    const { card, token } = await issueCardRow(base44, {
      tripId,
      caseId,
      patientId: caseRow.created_by_id || null,
      patientEmail: caseRow.client_email || null,
      firstName: firstToken(caseRow.client_name),
      countryCode,
      countryName,
      language,
      emergencyNumber,
      emergencyNumberLabel: emergencyLabel,
      tripEndsAt,
      actor: user.email,
    });

    return Response.json({
      success: true,
      card,
      token,
      card_url: `${APP_URL}/functions/tripCardPage?t=${encodeURIComponent(token)}`,
      expires_at: card.expires_at,
    });
  } catch (error) {
    console.error('[issueTripCard]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});