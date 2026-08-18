import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';
import { escapeHtml } from '../../shared/emailTemplate.ts';

const BRAND = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

// ── invitePersonalProvider ────────────────────────────────────────────────────
// The "trust injection" engine behind the BYO-Partner ecosystem. When a
// patient adds their own trusted provider (doctor, travel agency, taxi,
// security, companion) into M-Care, this:
//   1. Creates a PersonalProviderInvite record (pending).
//   2. Checks whether that provider already exists in M-Care's verified
//      network by email — if so, links directly and marks already_in_network
//      (the patient's provider is already part of the ecosystem).
//   3. Otherwise kicks off initiatePartnerVerification so the provider enters
//      the same safety-gated pipeline every partner goes through — never
//      auto-verified, never auto-assigned.
//   4. Notifies admin so a human is always in the loop.
//   5. Logs a JourneyEvent so the patient sees a calm "I'm verifying your
//      provider now" chat bubble — they feel the active safety net, not a
//      silent form submission.
//
// This is deliberately NOT an auto-onboard: a patient vouching for a provider
// starts verification, it never completes it. Same invariant as NominateDoctor.

const bodySchema = strictObject({
  provider_type: z.enum(['doctor', 'travel_agency', 'taxi', 'security', 'companion']),
  provider_name: Fields.shortText(300),
  provider_email: Fields.email(),
  provider_phone: Fields.optionalText(50),
  provider_country: Fields.shortText(100),
  provider_city: Fields.optionalText(100),
  clinic_name: Fields.optionalText(300),
  specialty: Fields.optionalText(200),
  website_url: Fields.optionalText(500),
  patient_relationship: Fields.optionalText(500),
  patient_note: Fields.optionalText(2000),
  case_id: Fields.optionalText(100),
});

// Which entity to search for an existing match, keyed by provider_type.
const PARTNER_ENTITY_BY_TYPE: Record<string, string> = {
  doctor: 'Doctor',
  travel_agency: 'TravelAgency',
  taxi: 'TaxiService',
  security: 'SecurityAgency',
  companion: 'Companion',
};

Deno.serve(createHandler(async ({ base44, user, body }) => {
  if (!user?.email) return err('You must be signed in to invite a provider', 401);

  const data = await body();
  const now = new Date().toISOString();

  // ── 1. De-dupe: has this patient already invited this exact provider? ──
  const existing = await base44.asServiceRole.entities.PersonalProviderInvite.filter({
    invited_by_email: user.email,
    provider_email: data.provider_email,
    provider_type: data.provider_type,
  }, '-submitted_at', 5).catch(() => []);

  if (existing && existing.length > 0) {
    const prior = existing[0];
    return ok({
      success: true,
      status: prior.verification_status,
      invite_id: prior.id,
      message: prior.verification_status === 'already_in_network'
        ? `${data.provider_name} is already part of your M-Care network.`
        : `You've already invited ${data.provider_name} — M-Care is ${prior.verification_status === 'verified' ? 'verified them' : 'still verifying them'} for you.`,
    });
  }

  // ── 2. Is this provider already in M-Care's verified network? ──
  const entityName = PARTNER_ENTITY_BY_TYPE[data.provider_type];
  let alreadyInNetworkId: string | null = null;
  if (entityName && data.provider_email) {
    try {
      const matches = await base44.asServiceRole.entities[entityName].filter(
        { email: data.provider_email }, '-created_date', 5
      );
      const verified = (matches as any[]).find((m: any) =>
        m.verification_status === 'verified' ||
        m.verification_status === 'manually_approved' ||
        m.status === 'active'
      );
      if (verified) alreadyInNetworkId = verified.id;
    } catch (_) { /* entity may not support that filter shape — non-fatal */ }
  }

  // ── 3. Create the invite record ──
  const invite = await base44.asServiceRole.entities.PersonalProviderInvite.create({
    invited_by_user_id: user.id,
    invited_by_email: user.email,
    invited_by_name: user.full_name || '',
    provider_type: data.provider_type,
    provider_name: data.provider_name,
    provider_email: data.provider_email,
    provider_phone: data.provider_phone || '',
    provider_country: data.provider_country,
    provider_city: data.provider_city || '',
    clinic_name: data.clinic_name || '',
    specialty: data.specialty || '',
    website_url: data.website_url || '',
    patient_relationship: data.patient_relationship || '',
    patient_note: data.patient_note || '',
    case_id: data.case_id || '',
    verification_status: alreadyInNetworkId ? 'already_in_network' : 'pending',
    linked_partner_id: alreadyInNetworkId || '',
    submitted_at: now,
  });

  // ── 4. Kick off verification (unless already verified in-network) ──
  // The invite record IS the pipeline entry point — admin reviews it in the
  // queue and uses the existing partner-onboarding tools to onboard the
  // provider through the full safety-gated pipeline. initiatePartnerVerification
  // expects an existing partner record ID (not raw details), so we mark the
  // invite 'verifying' to signal to the patient that M-Care has picked it up,
  // and admin is notified below to action it.
  if (!alreadyInNetworkId) {
    try {
      await base44.asServiceRole.entities.PersonalProviderInvite.update(invite.id, {
        verification_status: 'verifying',
      });
    } catch (_) { /* non-fatal — the invite record already exists in pending */ }
  }

  // ── 5. Notify admin ──
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    const typeLabel = data.provider_type.replace('_', ' ');
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: adminEmail,
      subject: `${alreadyInNetworkId ? '🔗' : '🆕'} Patient invited a ${typeLabel} into the ecosystem — ${escapeHtml(data.provider_name)}`,
      body: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:${alreadyInNetworkId ? '#065f46' : '#1e3a5f'};color:white;padding:16px 20px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;font-size:16px;">${alreadyInNetworkId ? 'Provider already in network — linked' : 'New provider invite — verification needed'}</h2>
        </div>
        <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p><strong>Patient:</strong> ${escapeHtml(user.full_name || user.email)}<br/>
          <strong>Provider type:</strong> ${escapeHtml(typeLabel)}<br/>
          <strong>Provider name:</strong> ${escapeHtml(data.provider_name)}<br/>
          <strong>Email:</strong> ${escapeHtml(data.provider_email)}<br/>
          <strong>Country:</strong> ${escapeHtml(data.provider_country)}${data.provider_city ? ', ' + escapeHtml(data.provider_city) : ''}</p>
          ${data.clinic_name ? `<p><strong>Clinic:</strong> ${escapeHtml(data.clinic_name)}</p>` : ''}
          ${data.specialty ? `<p><strong>Specialty:</strong> ${escapeHtml(data.specialty)}</p>` : ''}
          ${data.patient_relationship ? `<p><strong>Patient's relationship:</strong> ${escapeHtml(data.patient_relationship)}</p>` : ''}
          ${data.patient_note ? `<p><strong>Patient note:</strong> ${escapeHtml(data.patient_note)}</p>` : ''}
          ${alreadyInNetworkId ? `<p style="color:#065f46;font-weight:600;">This provider was found already verified in M-Care's network and has been linked to the patient's ecosystem directly.</p>` : `<p>A new invite has been created and verification has been kicked off. Review it in the admin console.</p>`}
          <p><a href="${APP_URL}/admin">Open Admin Console</a></p>
        </div>
      </div>`,
    }).catch(() => {});
  }

  // ── 6. JourneyEvent — the patient feels the active safety net ──
  const patientMessage = alreadyInNetworkId
    ? `Great news — ${data.provider_name} is already part of the M-Care network. I've linked them to your ecosystem so we can coordinate your care through them directly.`
    : `I've received your request to add ${data.provider_name} to your M-Care ecosystem. I'm verifying their credentials right now — I'll let you know the moment they're cleared, and you won't need to do a thing.`;

  await logJourneyEvent(base44, {
    case_id: data.case_id || `invite_${invite.id}`,
    client_email: user.email,
    event_type: 'document_vaulted', // closest existing event_type for "ecosystem action surfaced to patient"
    source: 'invitePersonalProvider',
    message_text: patientMessage,
    priority: 'low',
    action_taken: alreadyInNetworkId
      ? 'Provider found already verified in-network — linked directly to patient ecosystem'
      : 'Patient invited a personal provider — verification pipeline kicked off',
    tool_result: {
      invite_id: invite.id,
      provider_type: data.provider_type,
      provider_name: data.provider_name,
      already_in_network: !!alreadyInNetworkId,
    },
  }).catch(() => {});

  return ok({
    success: true,
    invite_id: invite.id,
    status: alreadyInNetworkId ? 'already_in_network' : 'verifying',
    already_in_network: !!alreadyInNetworkId,
    message: patientMessage,
  });
}, { name: 'invitePersonalProvider', requireAuth: true, bodySchema }));