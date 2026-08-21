import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { sendWhatsApp } from '../../shared/twilioWhatsApp.ts';
import { logProviderContactAttempt } from '../../shared/logProviderContactAttempt.ts';
import { PARTNER_TYPE_CONFIG, partnerDisplayName, type PartnerType } from '../../shared/partnerTypeConfig.ts';

// ── sendPartnerOutreach ──────────────────────────────────────────────────────
// The one and only place a real outreach message actually sends in this
// feature. DELIBERATELY NOT an M-Care agent tool -- it must never be added
// to m_care.jsonc's tool_configs, so the LLM has no structural way to call
// it under any circumstance. It is only ever invoked directly from a real
// button tap inside OutreachDraftCard.jsx (base44.functions.invoke straight
// from the client, the same pattern DocumentScannerCard.jsx already uses
// for scanVaultDocument) -- matching this codebase's own hard-learned
// lesson that a prompt instruction must never be the only thing standing
// between a request and a consequential write (see the Doctor/TravelAgency
// raw-write-grant fix this repo's history documents).
//
// Never trusts the caller for WHO gets contacted -- partner_id is
// re-resolved to a real, active partner record and its own on-file
// email/phone, never whatever the caller supplied. Requires a real session
// and a case the caller actually owns (or admin), and -- where CaseRecord
// has a real linkage field for this partner type -- confirms the partner is
// actually the one attached to that case. Companion/SecurityAgency have no
// direct id field on CaseRecord today, so for those two the honest level of
// scoping available is case ownership + an active-partner check, not a
// fabricated per-type linkage check.

const bodySchema = strictObject({
  case_id: Fields.shortText(100),
  partner_type: z.enum(['doctor', 'travel_agency', 'taxi_service', 'companion', 'security_agency']),
  partner_id: Fields.shortText(100),
  channel: z.enum(['email', 'whatsapp']),
  message: Fields.shortText(4000),
});

function isLinkedPartner(partner_type: PartnerType, partnerId: string, partnerEmail: string, caseRecord: any): boolean {
  switch (partner_type) {
    case 'doctor':
      return !!caseRecord.doctor_email && caseRecord.doctor_email === partnerEmail;
    case 'travel_agency':
      return !!caseRecord.travel_vendor_id && caseRecord.travel_vendor_id === partnerId;
    case 'taxi_service':
      return caseRecord.origin_driver_id === partnerId || caseRecord.destination_driver_id === partnerId;
    default:
      return true;
  }
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id, partner_type, partner_id, channel, message } = await body();
  const cfg = PARTNER_TYPE_CONFIG[partner_type as PartnerType];

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';
  if (!isAdmin && caseRecord.client_email !== user?.email) {
    return err('Forbidden', 403);
  }

  const partner = await base44.asServiceRole.entities[cfg.entity].get(partner_id).catch(() => null);
  if (!partner) return err(`${cfg.noun} not found`, 404);
  if (partner.status && partner.status !== 'active') {
    return err(`${cfg.noun} is not an active Morales partner.`, 400);
  }
  if (!isLinkedPartner(partner_type as PartnerType, partner_id, partner.email || '', caseRecord)) {
    return err('This partner is not linked to that case.', 403);
  }

  const partnerName = partnerDisplayName(cfg, partner);
  const recipient = channel === 'email' ? (partner.email || '') : (partner.whatsapp_number || partner.phone || '');
  if (!recipient) {
    return err(`No ${channel === 'email' ? 'email' : 'phone'} on file for ${partnerName}.`, 400);
  }

  let sendResult: { ok: boolean; error?: string };
  if (channel === 'email') {
    try {
      const escaped = String(message)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Medical Travel Safety',
        to: recipient,
        subject: 'A message from your Morales patient',
        body: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#1a1a1a;white-space:pre-wrap;">${escaped}</div>`,
      });
      sendResult = { ok: true };
    } catch (e: any) {
      sendResult = { ok: false, error: e?.message || 'Email send failed' };
    }
  } else {
    sendResult = await sendWhatsApp(recipient, String(message));
  }

  await logProviderContactAttempt(base44, {
    case_id,
    partner_type: partner_type as PartnerType,
    partner_id,
    partner_name: partnerName,
    channel: channel as 'email' | 'whatsapp',
    purpose: 'mcare_outreach',
    recipient,
    initiated_by: 'sendPartnerOutreach',
    result: sendResult.ok ? 'sent' : 'failed',
    error_detail: sendResult.ok ? undefined : sendResult.error,
  });

  if (!sendResult.ok) {
    return err(sendResult.error || 'Send failed', 502);
  }

  return ok({ success: true, partner_name: partnerName, recipient, channel });
}, { name: 'sendPartnerOutreach', requireAuth: true, bodySchema, rateLimit: { max: 10, windowSeconds: 600 } }));
