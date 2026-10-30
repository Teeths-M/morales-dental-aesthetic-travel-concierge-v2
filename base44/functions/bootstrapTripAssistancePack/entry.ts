import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  ensureBundle,
  isTripAssistanceEnabled,
  resolveTrip,
} from '../../shared/tripAssistanceEngine.ts';

/**
 * bootstrapTripAssistancePack — the booking-time assembly.
 *
 * Builds the three things that must exist before anything goes wrong: the
 * standing disclosure list (unapproved — the traveller still has to agree), the
 * emergency packet at version 1, and the show-this-screen sentences. All three
 * are idempotent: calling this again looks them up rather than minting a second
 * packet, because a resend must never change what is already in a traveller's
 * wallet.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

    if (!(await isTripAssistanceEnabled(base44))) {
      return Response.json({ enabled: false, error: 'Trip assistance is not switched on.' });
    }

    const body = await req.json().catch(() => ({}));
    const isAdmin = ['admin', 'platform_admin'].includes(String(user.role || ''));

    const ctx = await resolveTrip(base44, { trip_id: body?.trip_id, user });
    if (!ctx) return Response.json({ error: 'No trip to prepare yet.' }, { status: 404 });

    if (!isAdmin && ctx.patient_email !== String(user.email || '').toLowerCase()) {
      return Response.json({ error: 'That trip is not yours.' }, { status: 403 });
    }

    const bundle = await ensureBundle(base44, ctx);

    return Response.json({
      enabled: true,
      trip: {
        trip_id: ctx.trip_id,
        case_id: ctx.case_id,
        patient_first_name: ctx.patient_first_name,
        country_name: ctx.country_name,
        trip_language: ctx.trip_language,
      },
      disclosure: {
        id: bundle.disclosure.id,
        version: bundle.disclosure.version,
        approved: bundle.disclosure.approved === true,
        fields: bundle.disclosure.fields || [],
      },
      packet: {
        id: bundle.packet.id,
        version: bundle.packet.version,
        status: bundle.packet.status,
        missing_fields: bundle.packet.missing_fields || [],
      },
      cards: (bundle.cards || []).length,
    });
  } catch (error) {
    console.error('[bootstrapTripAssistancePack]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});