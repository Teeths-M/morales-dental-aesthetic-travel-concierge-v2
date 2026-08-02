import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { linkOnlyEmail } from '../../shared/notify.ts';
import { verifyPortalToken } from '../../shared/portalToken.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, driver_type, leg_1_cost_usd, leg_2_cost_usd, leg_3_cost_usd, leg_4_cost_usd, leg_5_cost_usd, leg_6_cost_usd } = body;

    // SECURITY: consultation_id is derived only from a verified portal token —
    // this endpoint previously accepted a bare consultation_id from the body
    // with no proof the caller held the chauffeur's portal link for that case,
    // so anyone who knew/guessed one could inject fake leg costs straight into
    // Consultation.update() below (a pricing-fraud vector).
    const verified = await verifyPortalToken(token);
    if (!verified || verified.portal_type !== 'chauffeur') {
      return Response.json({ error: 'Invalid or expired portal token' }, { status: 403 });
    }
    const consultation_id = verified.consultation_id;

    if (!consultation_id) {
      return Response.json({ error: 'consultation_id is required' }, { status: 400 });
    }

    // Blackout guard
    const caseIdForBlackout = body.case_id || consultation_id;
    if (caseIdForBlackout) {
      const blackoutRes = await base44.functions.invoke('checkNotificationBlackout', {
        case_id: caseIdForBlackout,
        notification_type: 'email',
        recipient_role: 'vendor',
        recipient_identifier: '',
        event_trigger: 'sendChauffeurQuoteAlert',
        payload: body
      }).catch(() => ({ data: { suppressed: false } }));

      if (blackoutRes.data?.suppressed) {
        return Response.json({
          suppressed: true,
          reason: blackoutRes.data.reason,
          message: 'Notification suppressed — case is in SURGICAL_EXECUTION_WINDOW blackout'
        });
      }
    }

    const updateData = { status: 'Admin-Review' };

    if (driver_type === 'origin') {
      updateData.leg_1_cost_usd = Number(leg_1_cost_usd) || 0;
      updateData.leg_2_cost_usd = Number(leg_2_cost_usd) || 0;
    } else if (driver_type === 'destination') {
      updateData.leg_3_cost_usd = Number(leg_3_cost_usd) || 0;
      updateData.leg_4_cost_usd = Number(leg_4_cost_usd) || 0;
      updateData.leg_5_cost_usd = Number(leg_5_cost_usd) || 0;
      updateData.leg_6_cost_usd = Number(leg_6_cost_usd) || 0;
    }

    await base44.asServiceRole.entities.Consultation.update(consultation_id, updateData);

    // BUG-R13-03 FIX: filter({ id }) always returns [] — update first, then fetch with .get()
    const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);
    if (!consultation) {
      return Response.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // Calculate totals for admin notification
    const originTotal = (Number(updateData.leg_1_cost_usd) || 0) + (Number(updateData.leg_2_cost_usd) || 0);
    const destTotal = (Number(updateData.leg_3_cost_usd) || 0) + (Number(updateData.leg_4_cost_usd) || 0) + (Number(updateData.leg_5_cost_usd) || 0) + (Number(updateData.leg_6_cost_usd) || 0);
    const transferTotal = driver_type === 'origin' ? originTotal : destTotal;

    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const adminUrl = `${appUrl}/portal-hub/admin`;

    // BUG-R13-05 FIX: User.list() without a limit loads every user on every chauffeur quote.
    // Use ADMIN_EMAIL env var for direct admin notification — no full-table User scan needed.
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    const adminUsers = adminEmail ? [{ email: adminEmail }] : [];

    // Patient name and itemized leg pricing stay in the admin dashboard — the
    // notification only says a review is waiting, per the link-only comms policy.
    for (const admin of adminUsers) {
      if (!admin.email) continue;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: '⚡ Admin Review Required — Transfer Quote Submitted',
        body: linkOnlyEmail({
          title: 'A transfer quote needs markup approval',
          line: 'A chauffeur has submitted transfer pricing for a case now in Admin-Review.',
          ctaUrl: adminUrl,
          ctaLabel: 'Open Admin Dashboard',
          from: 'sendChauffeurQuoteAlert',
        }),
      }).catch(err => console.log(`Admin email skipped for ${admin.email}: ${err.message}`));
    }

    // ── Automation Gate: update CaseRecord + check if all 4 quotes are in ──
    // Non-blocking — chauffeur quote saved regardless of whether this call succeeds.
    base44.functions.invoke('submitPartnerQuote', {
      consultation_id,
      partner_type: 'driver',
      amount: transferTotal,
    }).catch(e => console.warn('[sendChauffeurQuoteAlert] submitPartnerQuote failed:', e.message));

    return Response.json({
      success: true,
      message: 'Transfer legs saved. Automation gate notified. Pipeline will advance when all 4 quotes confirmed.',
      transfer_total: transferTotal,
    });
  } catch (error) {
    // BUG-R13-02 FIX: SEC-10
    console.error('[sendChauffeurQuoteAlert]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'sendChauffeurQuoteAlert', requireAuth: false }));
