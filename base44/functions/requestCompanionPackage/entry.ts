/**
 * requestCompanionPackage
 *
 * Called when the patient toggles the Companion Package ON or OFF in BookingsModule.
 *
 * ON (action: 'request'):
 *   1. Adds companion_package_fee: 650 to the active CaseRecord
 *   2. Finds verified companions in the same procedure_country
 *   3. Creates a CompanionAssignment (status: 'offered') for each
 *   4. Sends push notification + email to each companion with the job brief
 *   5. Returns { companions_notified, destination, job_brief }
 *
 * OFF (action: 'cancel'):
 *   Clears companion_package_requested and status on the case.
 */
import { createHandler } from '../_shared/createHandler.ts';
import { z, strictObject } from '../_shared/validate.ts';

const RequestCompanionPackageSchema = strictObject({
  action: z.enum(['request', 'cancel']).optional().default('request'),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
    // FIX: this used to redeclare `body` as `const body = await body()` —
    // redeclaring a destructured parameter with const/let is a SyntaxError
    // in JS ("Identifier 'body' has already been declared"), confirmed by
    // running the exact pattern directly. That means this file could not
    // parse at all, so every call to this function was failing outright.
    // Renamed the local to `payload`.
    const payload = await body().catch(() => ({}));
    const action: string = payload.action || 'request';

    // ── Fetch patient's active case ───────────────────────────────────────────
    const cases = await base44.entities.CaseRecord.filter(
      { client_email: user.email }, '-created_date', 1
    );
    const activeCase = cases[0];
    if (!activeCase) return Response.json({ error: 'No active case found' }, { status: 404 });

    // ── Cancel path ───────────────────────────────────────────────────────────
    if (action === 'cancel') {
      await base44.entities.CaseRecord.update(activeCase.id, {
        companion_package_requested: false,
        companion_package_fee: 0,
        companion_status: 'not_requested',
      }).catch(() => {});
      // Rescind outstanding offers
      try {
        const openOffers = await base44.asServiceRole.entities.CompanionAssignment.filter({
          case_id: activeCase.id, status: 'offered'
        });
        for (const offer of openOffers) {
          await base44.asServiceRole.entities.CompanionAssignment.update(offer.id, { status: 'cancelled' });
        }
      } catch (_) {}
      return Response.json({ success: true, action: 'cancelled' });
    }

    // ── Request path ──────────────────────────────────────────────────────────
    const country: string = activeCase.procedure_country || activeCase.destination_country || '';
    const now = new Date().toISOString();

    await base44.entities.CaseRecord.update(activeCase.id, {
      companion_package_requested: true,
      companion_package_fee: 650,
      companion_status: 'searching_companions',
      companion_requested_at: now,
    }).catch(() => {});

    // ── Find companions in destination country ────────────────────────────────
    let companions: any[] = [];
    try {
      companions = await base44.asServiceRole.entities.Companion.filter(
        { service_regions: country }
      );
    } catch (_) {}
    if (companions.length === 0) {
      try {
        companions = await base44.asServiceRole.entities.Companion.filter({});
      } catch (_) {}
    }
    companions = companions.slice(0, 15);

    // ── Job brief details ─────────────────────────────────────────────────────
    const patientFirstName = (activeCase.client_name || user.full_name || 'Patient').split(' ')[0];
    const procedures       = (activeCase.procedures || []).join(', ') || 'Dental / Aesthetic';
    const appUrl           = Deno.env.get('APP_URL') || 'https://morales.app';
    const adminEmail       = Deno.env.get('ADMIN_EMAIL') || '';

    const arrivalLabel = activeCase.arrival_date
      ? new Date(activeCase.arrival_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null;
    const departureLabel = activeCase.departure_date
      ? new Date(activeCase.departure_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null;

    const jobBrief = {
      patient_first_name: patientFirstName,
      destination_country: country,
      hotel_name:          activeCase.hotel_name || '',
      hotel_address:       activeCase.hotel_address || '',
      arrival_date:        activeCase.arrival_date || null,
      departure_date:      activeCase.departure_date || null,
      duration_of_stay:    activeCase.duration_of_stay || null,
      procedures,
      meals_included:      true,
      package_fee:         650,
    };

    // ── Notify each companion ─────────────────────────────────────────────────
    const notified: string[] = [];

    for (const companion of companions) {
      try {
        const companionEmail: string = companion.email || companion.contact_email || '';

        // Look up the companion's user ID so CompanionDashboard query works
        let companionUserId: string = '';
        if (companionEmail) {
          const users = await base44.asServiceRole.entities.User.filter({ email: companionEmail });
          companionUserId = users[0]?.id || '';
        }

        // Create CompanionAssignment offer record
        await base44.asServiceRole.entities.CompanionAssignment.create({
          companion_user_id:   companionUserId,
          companion_email:     companionEmail,
          companion_name:      companion.full_name || companion.name || companionEmail.split('@')[0],
          case_id:             activeCase.id,
          patient_first_name:  patientFirstName,
          destination_country: country,
          hotel_name:          jobBrief.hotel_name,
          hotel_address:       jobBrief.hotel_address,
          arrival_date:        jobBrief.arrival_date,
          departure_date:      jobBrief.departure_date,
          duration_of_stay:    String(jobBrief.duration_of_stay || ''),
          procedure_types:     activeCase.procedures || [],
          meals_included:      true,
          package_fee:         650,
          status:              'offered',
          offered_at:          now,
        });

        // Push notification
        if (companion.push_subscription) {
          await base44.asServiceRole.functions.invoke('sendPushNotification', {
            subscription: companion.push_subscription,
            title: '🌟 New Companion Job Available',
            body: `${patientFirstName} needs a companion in ${country || 'your area'}. $650 package — tap to accept or decline.`,
            url: '/companion-dashboard',
            type: 'companion',
          }).catch(() => {});
        }

        // Email
        if (companionEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Morales Concierge — Job Offer',
            to: companionEmail,
            subject: `New Job: Companion in ${country} — $650 Package`,
            body: `<div style="font-family:sans-serif;max-width:600px;padding:24px;">
<h2 style="color:#D4AF37;margin:0 0 4px;">🌟 New Companion Job Offer</h2>
<p style="color:#6b7280;margin:0 0 20px;font-size:13px;">You've been matched for a new patient. Accept or decline on your dashboard.</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;width:140px;">Patient</td><td style="font-size:13px;"><strong>${patientFirstName}</strong> (first name only — full details after acceptance)</td></tr>
    <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Destination</td><td style="font-size:13px;"><strong>${country}</strong></td></tr>
    ${jobBrief.hotel_name ? `<tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Hotel</td><td style="font-size:13px;">${jobBrief.hotel_name}${jobBrief.hotel_address ? '<br><span style="color:#94a3b8;font-size:12px;">' + jobBrief.hotel_address + '</span>' : ''}</td></tr>` : ''}
    ${arrivalLabel ? `<tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Arrival</td><td style="font-size:13px;">${arrivalLabel}</td></tr>` : ''}
    ${departureLabel ? `<tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Departure</td><td style="font-size:13px;">${departureLabel}</td></tr>` : ''}
    ${jobBrief.duration_of_stay ? `<tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Duration</td><td style="font-size:13px;">${jobBrief.duration_of_stay}</td></tr>` : ''}
    <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Procedures</td><td style="font-size:13px;">${procedures}</td></tr>
    <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Meals</td><td style="font-size:13px;">✅ Included in package</td></tr>
    <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Package Fee</td><td><strong style="color:#16a34a;font-size:18px;">$${jobBrief.package_fee}</strong></td></tr>
  </table>
</div>
<div style="display:flex;gap:12px;flex-wrap:wrap;">
  <a href="${appUrl}/companion-dashboard" style="display:inline-block;background:#D4AF37;color:#060B16;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">Accept on Dashboard →</a>
</div>
<p style="color:#9ca3af;font-size:11px;margin-top:20px;">This offer expires in 24 hours. First companion to accept receives the full assignment.</p>
</div>`,
          }).catch(() => {});
        }

        notified.push(companion.id);
      } catch (_) {}
    }

    // Admin alert
    if (adminEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `🤝 Companion Package — ${activeCase.client_name} (${country})`,
        body: `${activeCase.client_name} has requested the companion package ($650). ${notified.length} companion(s) notified in ${country}.`,
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      companions_notified: notified.length,
      destination: country,
      job_brief: jobBrief,
    });
}, { name: 'requestCompanionPackage', bodySchema: RequestCompanionPackageSchema }));
