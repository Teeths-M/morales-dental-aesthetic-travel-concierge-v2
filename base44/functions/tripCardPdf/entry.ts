import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { pdfForCard } from '../../shared/tripCardSetEngine.ts';

/**
 * tripCardPdf — the print-ready sheet.
 *
 * Rendered from the STORED tokens every time, which is why this is safe to call on
 * every resend: the cards that come back are the cards already in the world, not a
 * second set. Two card faces, credit-card size and A6, front and back, one QR each.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const tripCardId = String(body?.trip_card_id || '').trim();
    if (!tripCardId) return Response.json({ error: 'trip_card_id is required' }, { status: 400 });

    const card = await base44.asServiceRole.entities.TripEmergencyCard.get(tripCardId).catch(() => null);
    if (!card) return Response.json({ error: 'That trip card set could not be found.' }, { status: 404 });
    if (card.revoked) return Response.json({ error: 'This card set has been revoked.' }, { status: 409 });

    const isAdmin = ['admin', 'platform_admin'].includes(String(user.role || ''));
    if (!isAdmin && String(card.patient_email || '').toLowerCase() !== String(user.email || '').toLowerCase()) {
      return Response.json({ error: 'That trip card set is not yours.' }, { status: 403 });
    }

    const sheet = await pdfForCard(base44, card);
    if (!sheet) {
      return Response.json({
        error: 'There are no live cards on this trip, so there is nothing to print. Ask your care team to reissue.',
      }, { status: 409 });
    }

    await base44.asServiceRole.entities.TripEmergencyCard
      .update(card.id, { pdf_generated_at: new Date().toISOString() })
      .catch(() => {});

    return Response.json({
      success: true,
      filename: sheet.filename,
      pdf_url: `data:application/pdf;base64,${sheet.base64}`,
    });
  } catch (error) {
    console.error('[tripCardPdf]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});