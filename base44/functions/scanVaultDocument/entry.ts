import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';
import { runLookup, resolveCountryISO } from '../../shared/registryLookup.ts';

// scanVaultDocument — the core M-Care Scanner pipeline: OCR -> classify ->
// extract fields -> quality check -> verification routing -> VaultDocument.
//
// Reuses the exact technique analyzeDocumentIntelligence already proved out
// (one schema-driven Core.InvokeLLM vision call) — not that function itself,
// since it's purpose-built for partner-fraud claims (IATA codes, claimed
// business names) and writes to the partner-specific FraudIndicator table,
// neither of which fits a patient uploading a passport.
//
// SECURITY: raw pages must already be uploaded to PRIVATE storage by the
// caller (Core.UploadPrivateFile) before this runs — this function never
// touches a public bucket, the exact discipline the extractPassportData
// plaintext-leak incident exists to enforce (see CLAUDE.md).
//
// NEVER treat OCR/classification confidence as verification. verification_status
// only ever becomes 'verified' when a real authoritative source (today: US/
// CO/MX doctor-license registries) actually confirmed it.

const DOCUMENT_TYPES = [
  'passport', 'national_id', 'drivers_license', 'medical_record', 'medical_report',
  'lab_result', 'prescription', 'doctor_license', 'professional_certificate',
  'insurance_document', 'visa', 'flight_document', 'hotel_confirmation', 'invoice',
  'consent_document', 'travel_document', 'partner_credential', 'security_credential', 'other',
] as const;

// Document types with real fraud/identity consequence route to a human
// reviewer when no authoritative source can confirm them. Purely
// informational/logistics types (flight confirmations, invoices, etc.) land
// at the honest 'not_applicable_no_authority' terminal state instead —
// a deterministic, documented judgment call, not the AI's.
const VERIFICATION_REQUIRED_TYPES = new Set([
  'passport', 'national_id', 'drivers_license', 'doctor_license', 'professional_certificate',
  'insurance_document', 'visa', 'partner_credential', 'security_credential',
]);

const CLASSIFICATION_CONFIDENCE_FLOOR = 60;

const bodySchema = strictObject({
  page_urls: z.array(z.string().url()).min(1).max(12),
  owner_type: z.enum(['patient', 'doctor', 'travel_agency', 'driver', 'companion', 'security_agency', 'other']),
  owner_email: Fields.email(),
  owner_id: Fields.optionalText(100),
  document_type_hint: z.string().trim().max(40).optional().nullable(),
  // Set only when the user explicitly confirmed a type after a low-confidence
  // classification prompt — never trusted as a substitute for the vision
  // model's own extraction, only for the final stored document_type.
  user_confirmed_type: z.enum(DOCUMENT_TYPES).optional().nullable(),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { page_urls, owner_type, owner_email, owner_id, document_type_hint, user_confirmed_type } = await body();

  const isAdmin = user!.role === 'admin' || user!.role === 'platform_admin';
  if (!isAdmin && owner_email !== user!.email) {
    return err('You can only scan documents into your own vault.', 403);
  }

  // ── 1. Vision LLM: OCR + classify + extract + quality assessment ────────────
  const prompt = `You are M-Care's document intelligence scanner for a medical-travel platform. Analyze the attached document image(s)/PDF — if there are multiple pages, treat them together as ONE logical document.

${document_type_hint ? `The user hinted this might be: ${document_type_hint}\n` : ''}Do ALL of the following:
1. OCR every visible line of text.
2. Classify the document into exactly one of: ${DOCUMENT_TYPES.join(', ')}. Give a confidence 0-100.
3. Extract every relevant field verbatim: full name, document/license number, issuing authority/jurisdiction, issue date, expiration date, and any other clearly labeled field.
4. Assess capture quality: is it blurry, does it have glare obscuring text, is the full document visible (not cropped/cut off), is the resolution adequate to read every field?
5. Note if this looks like a duplicate/re-scan of an already-common document type (informational only).
6. Write a 1-2 sentence plain-English summary.

Return JSON only matching the schema. Never guess a field you cannot actually read — leave it blank instead.`;

  let analysis: any = null;
  try {
    analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: page_urls,
      response_json_schema: {
        type: 'object',
        properties: {
          document_type: { type: 'string', enum: DOCUMENT_TYPES as unknown as string[] },
          document_type_confidence: { type: 'number' },
          detected_name: { type: 'string' },
          detected_document_number: { type: 'string' },
          detected_jurisdiction: { type: 'string' },
          detected_issue_date: { type: 'string' },
          detected_expiration_date: { type: 'string' },
          extracted_fields: { type: 'object' },
          is_blurry: { type: 'boolean' },
          has_glare: { type: 'boolean' },
          is_complete: { type: 'boolean' },
          resolution_adequate: { type: 'boolean' },
          plain_english_summary: { type: 'string' },
        },
      },
    });
  } catch (_e) {
    return err('Document analysis failed — the vision model could not process the file(s).', 502);
  }

  const confidence = Number(analysis?.document_type_confidence ?? 0);
  const lowConfidence = !confidence || confidence < CLASSIFICATION_CONFIDENCE_FLOOR;
  // A user-confirmed type always wins; otherwise use the model's guess only
  // if confident, else 'other' — the card asks the user directly rather than
  // silently classifying, matching the spec's own explicit rule.
  const document_type: string = user_confirmed_type
    || (!lowConfidence && DOCUMENT_TYPES.includes(analysis?.document_type) ? analysis.document_type : 'other');
  const needsTypeConfirmation = !user_confirmed_type && lowConfidence;

  // ── 2. Deterministic quality verdict ─────────────────────────────────────────
  const qualityIssues: string[] = [];
  if (analysis?.is_blurry) qualityIssues.push('Image appears blurry');
  if (analysis?.has_glare) qualityIssues.push('Glare is obscuring part of the text');
  if (analysis?.is_complete === false) qualityIssues.push('Document appears cropped or incomplete');
  if (analysis?.resolution_adequate === false) qualityIssues.push('Resolution too low to read reliably');

  let quality_status: string = 'passed';
  if (analysis?.is_blurry) quality_status = 'failed_blur';
  else if (analysis?.has_glare) quality_status = 'failed_glare';
  else if (analysis?.is_complete === false) quality_status = 'failed_incomplete';
  else if (analysis?.resolution_adequate === false) quality_status = 'failed_low_resolution';

  // ── 3. Deterministic duplicate check (same owner + type + document number) ──
  let is_duplicate_of = '';
  const docNumber = String(analysis?.detected_document_number || '').trim();
  if (docNumber) {
    try {
      const existing = await base44.asServiceRole.entities.VaultDocument.filter({ owner_email, document_type }, '-created_date', 20);
      const dup = (existing || []).find((d: any) =>
        String(d?.extracted_fields?.detected_document_number || '').trim() === docNumber && !d.deleted_at);
      if (dup) is_duplicate_of = dup.id;
    } catch (_) { /* best-effort */ }
  }

  // ── 4. Verification routing — only ever real, never AI-confidence-as-proof ──
  // Runs only once the earlier pipeline stages have genuinely cleared —
  // routing a document whose type is still unconfirmed or whose scan quality
  // failed would mean checking a registry against data we don't yet trust.
  let verification_status: string;
  let verification_source = '';
  let verification_timestamp = '';

  if (needsTypeConfirmation) {
    verification_status = 'fields_extracted';
  } else if (quality_status !== 'passed') {
    verification_status = 'ocr_complete';
  } else {
    verification_status = 'requires_human_review';

    if (document_type === 'doctor_license' && analysis?.detected_jurisdiction && docNumber) {
      const countryISO = resolveCountryISO(String(analysis.detected_jurisdiction));
      if (countryISO) {
        try {
          const result = await runLookup(countryISO, docNumber, String(analysis?.detected_name || ''));
          if (result?.supported) {
            verification_timestamp = new Date().toISOString();
            if (result.found && !result.route_to_manual) {
              verification_status = 'verified';
              verification_source = result.source || result.registry_name || `${countryISO} registry`;
            }
          }
        } catch (_) { /* falls through to requires_human_review */ }
      }
    }

    if (verification_status === 'requires_human_review' && !VERIFICATION_REQUIRED_TYPES.has(document_type)) {
      verification_status = 'not_applicable_no_authority';
    }
  }

  // ── 5. Create the VaultDocument row ──────────────────────────────────────────
  let vaultDoc: any;
  try {
    vaultDoc = await base44.asServiceRole.entities.VaultDocument.create({
      owner_type,
      owner_email,
      owner_id: owner_id || '',
      document_type,
      document_type_confidence: confidence,
      original_file_urls: page_urls,
      ocr_text: '', // populated below if extraction succeeded — kept separate from extracted_fields for a raw-text fallback
      extracted_fields: {
        detected_name: analysis?.detected_name || '',
        detected_document_number: docNumber,
        detected_jurisdiction: analysis?.detected_jurisdiction || '',
        detected_issue_date: analysis?.detected_issue_date || '',
        detected_expiration_date: analysis?.detected_expiration_date || '',
        ...(analysis?.extracted_fields && typeof analysis.extracted_fields === 'object' ? analysis.extracted_fields : {}),
      },
      quality_status,
      quality_issues: qualityIssues,
      verification_status,
      verification_source,
      verification_timestamp,
      expiration_date: /^\d{4}-\d{2}-\d{2}/.test(String(analysis?.detected_expiration_date || '')) ? analysis.detected_expiration_date : '',
      review_status: verification_status === 'requires_human_review' ? 'pending_review' : 'not_required',
      is_duplicate_of,
      source: 'scanner',
      created_by_email: user!.email,
    });
  } catch (createErr) {
    console.error('[scanVaultDocument] create failed:', (createErr as Error)?.message);
    return err('Could not save this document. Please try again.', 500);
  }

  // ── 6. Audit + proactive notification (best-effort, never blocks the result) ─
  try {
    await base44.functions.invoke('logAuditEvent', {
      event_type: 'vault_document_scanned',
      resource_type: 'VaultDocument',
      resource_id: vaultDoc.id,
      resource_name: `${document_type} scan`,
      details: { owner_type, quality_status, verification_status, page_count: page_urls.length },
    });
  } catch (_) { /* non-fatal */ }

  if (owner_type === 'patient') {
    try {
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ client_email: owner_email }, '-created_date', 1);
      const caseRecord = cases?.[0];
      if (caseRecord) {
        const label = document_type.replace(/_/g, ' ');
        const message = verification_status === 'verified'
          ? `Got it — your ${label} is readable and I've verified it against the real registry. It's in your vault.`
          : verification_status === 'not_applicable_no_authority'
          ? `Got it. The ${label} is readable and I've added it to your vault. I can't independently verify a document like this from the image alone, so it's stored as scanned, not verified.`
          : quality_status !== 'passed'
          ? `I scanned your ${label}, but ${qualityIssues[0] || 'the quality wasn\'t quite right'} — you may want to rescan it for the clearest record.`
          : `Got it. The ${label} is readable and I've added it to your vault. Verification is still pending.`;
        await logJourneyEvent(base44, {
          case_id: caseRecord.id,
          client_email: owner_email,
          event_type: 'document_vaulted',
          source: 'scanVaultDocument',
          message_text: message,
          priority: 'low',
          action_taken: `Scanned and vaulted a ${document_type} (quality: ${quality_status}, verification: ${verification_status}).`,
          tool_result: { vault_document_id: vaultDoc.id, document_type, quality_status, verification_status },
        });
      }
    } catch (_) { /* non-fatal */ }
  }

  return ok({
    vault_document_id: vaultDoc.id,
    document_type,
    document_type_confidence: confidence,
    needs_type_confirmation: needsTypeConfirmation,
    extracted_fields: vaultDoc.extracted_fields,
    quality_status,
    quality_issues: qualityIssues,
    verification_status,
    verification_source,
    is_duplicate_of,
    plain_english_summary: analysis?.plain_english_summary || '',
  });
}, { name: 'scanVaultDocument', requireAuth: true, bodySchema, rateLimit: { max: 20, windowSeconds: 300 } }));
