/**
 * autoPartnerPortalDelivery
 *
 * Cron: every 30 minutes.
 *
 * M never waits for an admin to remember to send portal links.
 * The moment a partner becomes active, they get their portal link automatically.
 *
 * Catches:
 * - Doctors, travel agencies, chauffeurs with status: 'active'
 *   who have no portal_link_sent_at timestamp
 * - CaseRecords in payable status with proposal_token but no
 *   proposal_link_sent_at (patient never got their payment link)
 */

import { createHandler, ok } from '../_shared/createHandler.ts';

const BRAND   = 'Morales Dental & Aesthetic Travel Concierge';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

async function sendEmail(base44, to, subject, body) {
  if (!to) return false;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to, subject, body });
    return true;
  } catch (_) { return false; }
}

function portalEmailHtml(name, role, portalUrl) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;max-width:600px;margin:0 auto;background:#060B16;color:#fff;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#0C1A1D,#080F18);padding:32px;border-bottom:1px solid rgba(212,175,55,0.3);">
    <div style="font-size:28px;font-weight:900;color:#D4AF37;">M</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;">Morales Concierge</div>
  </div>
  <div style="padding:32px;">
    <p style="font-size:15px;color:rgba(255,255,255,0.7);margin:0 0 16px;">Hello ${name},</p>
    <p style="font-size:15px;color:rgba(255,255,255,0.7);margin:0 0 24px;">Your Morales ${role} portal is ready. Access your cases, manage your schedule, and coordinate with the team — all in one place.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#E8C85C);color:#060B16;font-size:14px;font-weight:800;padding:16px 40px;border-radius:99px;text-decoration:none;">Open My Portal →</a>
    </div>
    <p style="font-size:12px;color:rgba(255,255,255,0.3);text-align:center;margin:0;">This link is unique to you. Do not share it. — Morales Concierge</p>
  </div>
</div>`;
}

function proposalEmailHtml(clientName, payUrl) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;max-width:600px;margin:0 auto;background:#060B16;color:#fff;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#0C1A1D,#080F18);padding:32px;border-bottom:1px solid rgba(212,175,55,0.3);">
    <div style="font-size:28px;font-weight:900;color:#D4AF37;">M</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;">Your Treatment Proposal is Ready</div>
  </div>
  <div style="padding:32px;">
    <p style="font-size:15px;color:rgba(255,255,255,0.7);margin:0 0 16px;">Dear ${clientName},</p>
    <p style="font-size:15px;color:rgba(255,255,255,0.7);margin:0 0 24px;">Your personalized treatment proposal is ready. Your doctor is confirmed, your travel is arranged, and your care team is standing by. Secure your spot by completing your payment below.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${payUrl}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#E8C85C);color:#060B16;font-size:14px;font-weight:800;padding:16px 40px;border-radius:99px;text-decoration:none;">Review Proposal &amp; Pay Now →</a>
    </div>
    <p style="font-size:12px;color:rgba(255,255,255,0.3);text-align:center;margin:0;">Morales Dental &amp; Aesthetic Travel Concierge</p>
  </div>
</div>`;
}

Deno.serve(createHandler(async ({ base44 }) => {
  const now = new Date().toISOString();
  const results = { doctors: 0, agencies: 0, chauffeurs: 0, proposals: 0, skipped: 0, errors: 0 };

  // ── 1. DOCTORS without portal link sent ──────────────────────────────────
  try {
    const doctors = await base44.asServiceRole.entities.Doctor.filter({ status: 'active' });
    for (const d of doctors ?? []) {
      if (d.portal_link_sent_at) { results.skipped++; continue; }
      if (!d.email) { results.skipped++; continue; }

      const portalUrl = `${APP_URL}/doctor-dashboard`;
      const sent = await sendEmail(
        base44, d.email,
        `Your Morales Doctor Portal is Ready — ${BRAND}`,
        portalEmailHtml(d.full_name || 'Doctor', 'Doctor', portalUrl)
      );

      if (sent) {
        await base44.asServiceRole.entities.Doctor.update(d.id, { portal_link_sent_at: now }).catch(() => {});
        results.doctors++;
      } else {
        results.errors++;
      }
    }
  } catch (_) { results.errors++; }

  // ── 2. TRAVEL AGENCIES without portal link sent ──────────────────────────
  try {
    const agencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' });
    for (const a of agencies ?? []) {
      if (a.portal_link_sent_at) { results.skipped++; continue; }
      if (!a.email) { results.skipped++; continue; }

      const portalUrl = `${APP_URL}/portal/travel`;
      const sent = await sendEmail(
        base44, a.email,
        `Your Morales Travel Portal is Ready — ${BRAND}`,
        portalEmailHtml(a.contact_person || a.agency_name || 'Partner', 'Travel Agency', portalUrl)
      );

      if (sent) {
        await base44.asServiceRole.entities.TravelAgency.update(a.id, { portal_link_sent_at: now }).catch(() => {});
        results.agencies++;
      } else {
        results.errors++;
      }
    }
  } catch (_) { results.errors++; }

  // ── 3. CHAUFFEURS without portal link sent ───────────────────────────────
  try {
    const drivers = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' });
    for (const drv of drivers ?? []) {
      if (drv.portal_link_sent_at) { results.skipped++; continue; }
      if (!drv.email) { results.skipped++; continue; }

      const portalUrl = `${APP_URL}/portal/transfer`;
      const sent = await sendEmail(
        base44, drv.email,
        `Your Morales Transfer Portal is Ready — ${BRAND}`,
        portalEmailHtml(drv.driver_name || drv.company_name || 'Partner', 'Chauffeur', portalUrl)
      );

      if (sent) {
        await base44.asServiceRole.entities.TaxiService.update(drv.id, { portal_link_sent_at: now }).catch(() => {});
        results.chauffeurs++;
      } else {
        results.errors++;
      }
    }
  } catch (_) { results.errors++; }

  // ── 4. PATIENTS with proposal_token but no proposal email sent ───────────
  const PAYABLE = ['Proposal-Sent', 'PMP-25', 'PMP-50', 'Deposit-Paid'];
  try {
    const cases = await base44.asServiceRole.entities.CaseRecord.filter({}, '-updated_date', 200);
    const payable = (cases ?? []).filter(c =>
      PAYABLE.includes(c.status) &&
      c.proposal_token &&
      c.client_email &&
      !c.proposal_link_sent_at
    );

    for (const c of payable) {
      const payUrl = `${APP_URL}/portal/proposal/${c.proposal_token}`;
      const sent = await sendEmail(
        base44, c.client_email,
        `Your Treatment Proposal is Ready — ${BRAND}`,
        proposalEmailHtml(c.client_name || 'Patient', payUrl)
      );

      if (sent) {
        await base44.asServiceRole.entities.CaseRecord.update(c.id, { proposal_link_sent_at: now }).catch(() => {});
        results.proposals++;
      } else {
        results.errors++;
      }
    }
  } catch (_) { results.errors++; }

  console.log('[autoPartnerPortalDelivery]', results);

  return ok({
    success: true,
    run_at: now,
    delivered: {
      doctor_portals: results.doctors,
      agency_portals: results.agencies,
      chauffeur_portals: results.chauffeurs,
      patient_proposals: results.proposals,
    },
    skipped: results.skipped,
    errors: results.errors,
  });
}, { name: 'autoPartnerPortalDelivery', requireAuth: false }));
