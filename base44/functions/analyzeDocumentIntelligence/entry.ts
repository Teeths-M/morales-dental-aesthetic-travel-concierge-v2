import { createHandler, ok, err } from '../../shared/createHandler.ts';

// ── Inline input normalizer (light sanitization of partner-supplied claims) ──
function norm(v: unknown, max = 120): string {
  if (typeof v !== 'string' || !v) return '';
  return v.replace(/[<>]/g, ' ').replace(/`{3,}/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function digits(v: string): string { return (v || '').replace(/\D/g, ''); }

Deno.serve(createHandler(async ({ base44, body }) => {
    const {
      file_url,
      partner_type = null,
      partner_id = null,
      claimed_iata_code = '',
      claimed_business_name = '',
      claimed_license_number = '',
      claimed_country = '',
      document_type_hint = '',
    } = await body() as Record<string, string>;

    if (!file_url) return err('file_url is required');

    // ── 1. Vision LLM: OCR + classify + extract + authenticity ─────────────────
    const claimedBlock = [
      claimed_iata_code      ? `Claimed IATA code: ${norm(claimed_iata_code, 20)}`      : '',
      claimed_business_name  ? `Claimed business name: ${norm(claimed_business_name)}`  : '',
      claimed_license_number ? `Claimed license number: ${norm(claimed_license_number,40)}` : '',
      claimed_country        ? `Claimed country: ${norm(claimed_country, 60)}`          : '',
      document_type_hint     ? `Partner says this document is: ${norm(document_type_hint,40)}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `You are M-Care, the document intelligence analyst for a medical-travel safety platform. Analyze the attached document image/PDF with forensic care.

${claimedBlock ? `Context the partner gave us:\n${claimedBlock}\n` : ''}
Do ALL of the following:
1. OCR every visible text — read numbers, codes, dates, names, addresses, logos, stamps, signatures.
2. Classify the document: is it an IATA certificate, business/trade license, medical license/credential, insurance certificate, passport/ID, accreditation (JCI/ISO), or other?
3. Extract every code, license number, and identifier verbatim.
4. Extract every name (person or business) verbatim.
5. Extract every date verbatim and label each (issue, expiry, birth, approval).
6. Detect the issuing authority/issuer.
7. Assess authenticity: look for font inconsistency, stamp alignment, metadata/edge anomalies, mismatched logos, signs of editing/photoshop. Classify as authentic | likely_authentic | suspicious | likely_forged | indeterminate.
8. List concrete fraud signals (e.g. "expiry date in the past", "name on doc ≠ claimed business name", "code format wrong length").
9. Flag if the document is expired (is_expired = true) and give the expiry date if visible.
10. Cross-check: do the extracted codes/names match the claimed values above? Note any mismatch in anomaly_notes.
11. Write a 2-3 sentence plain-English summary a partner or admin could read.

Return JSON only matching the schema.`;

    let analysis: any = null;
    try {
      analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            document_type: { type: 'string' },
            detected_issuer: { type: 'string' },
            extracted_codes: {
              type: 'array',
              items: { type: 'object', properties: { code: { type: 'string' }, label: { type: 'string' } } },
            },
            extracted_names: { type: 'array', items: { type: 'string' } },
            extracted_dates: {
              type: 'array',
              items: { type: 'object', properties: { date: { type: 'string' }, label: { type: 'string' } } },
            },
            expiry_date: { type: 'string' },
            is_expired: { type: 'boolean' },
            authenticity_assessment: { type: 'string', enum: ['authentic', 'likely_authentic', 'suspicious', 'likely_forged', 'indeterminate'] },
            fraud_signals: { type: 'array', items: { type: 'string' } },
            anomaly_notes: { type: 'array', items: { type: 'string' } },
            plain_english_summary: { type: 'string' },
          },
        },
      });
    } catch (e) {
      return err('Document analysis failed — the vision model could not process the file.', 502);
    }

    const codes = ((analysis?.extracted_codes as any[]) || []).map((c: any) => c?.code || '').filter(Boolean);
    const names = (analysis?.extracted_names as string[]) || [];

    // ── 2. Deterministic cross-check vs claimed values ──────────────────────────
    const mismatches: Array<{ field: string; claimed: string; document: string }> = [];
    if (claimed_iata_code) {
      const docIata = codes.map(digits);
      if (docIata.length && !docIata.includes(digits(claimed_iata_code))) {
        mismatches.push({ field: 'iata_code', claimed: claimed_iata_code, document: codes.join(', ') });
      }
    }
    if (claimed_license_number) {
      const docLic = codes.map(digits);
      if (docLic.length && !docLic.includes(digits(claimed_license_number))) {
        mismatches.push({ field: 'license_number', claimed: claimed_license_number, document: codes.join(', ') });
      }
    }
    if (claimed_business_name) {
      const seed = claimed_business_name.toLowerCase().slice(0, 8);
      if (names.length && !names.some((n) => n.toLowerCase().includes(seed))) {
        mismatches.push({ field: 'business_name', claimed: claimed_business_name, document: names.join(', ') });
      }
    }

    // ── 3. Risk score ───────────────────────────────────────────────────────────
    let risk_score = 0;
    const auth = analysis?.authenticity_assessment;
    if (auth === 'likely_forged') risk_score += 50;
    else if (auth === 'suspicious') risk_score += 30;
    else if (auth === 'indeterminate') risk_score += 5;
    if (analysis?.is_expired) risk_score += 25;
    risk_score += Math.min(((analysis?.fraud_signals as string[]) || []).length * 10, 30);
    risk_score += mismatches.length * 15;
    risk_score = Math.max(0, Math.min(100, risk_score));
    const risk_level = risk_score <= 25 ? 'low' : risk_score <= 55 ? 'medium' : 'high';

    // ── 4. Write HIGH/CRITICAL signals to the shared FraudIndicator table ────────
    const indicators: Array<Record<string, unknown>> = [];
    if (auth === 'likely_forged' || auth === 'suspicious') {
      indicators.push({
        indicator_type: 'document_hash',
        indicator_value: file_url.toLowerCase(),
        source: 'document_intelligence',
        severity: auth === 'likely_forged' ? 'CRITICAL' : 'HIGH',
        reason: `Document authenticity: ${auth}. ${((analysis?.fraud_signals as string[]) || []).join('; ')}`,
        associated_partner_type: partner_type,
        associated_partner_id: partner_id,
        associated_partner_name: norm(claimed_business_name, 120) || null,
      });
    }
    for (const m of mismatches) {
      indicators.push({
        indicator_type: m.field === 'iata_code' ? 'iata_code' : m.field === 'license_number' ? 'license_number' : 'name',
        indicator_value: `${m.field}:${m.claimed}`.toLowerCase(),
        source: 'document_cross_check',
        severity: 'HIGH',
        reason: `Claimed ${m.field} "${m.claimed}" does not match document value "${m.document}"`,
        associated_partner_type: partner_type,
        associated_partner_id: partner_id,
        associated_partner_name: norm(claimed_business_name, 120) || null,
      });
    }
    for (const ind of indicators) {
      await base44.asServiceRole.entities.FraudIndicator.create(ind).catch(() => {});
    }

    return ok({
      document_type: analysis?.document_type ?? null,
      detected_issuer: analysis?.detected_issuer ?? null,
      extracted_codes: codes,
      extracted_names: names,
      extracted_dates: analysis?.extracted_dates ?? [],
      expiry_date: analysis?.expiry_date ?? null,
      is_expired: !!analysis?.is_expired,
      authenticity_assessment: auth ?? 'indeterminate',
      fraud_signals: analysis?.fraud_signals ?? [],
      anomaly_notes: analysis?.anomaly_notes ?? [],
      cross_check_mismatches: mismatches,
      risk_score,
      risk_level,
      plain_english_summary: analysis?.plain_english_summary ?? 'Document analyzed; no narrative returned.',
      analyzed_at: new Date().toISOString(),
      indicators_written: indicators.length,
    });
}, { name: 'analyzeDocumentIntelligence' }));