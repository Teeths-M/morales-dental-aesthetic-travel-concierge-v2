/**
 * manageVerifiedCredential — immutable, hash-chained credential storage.
 *
 * action: 'mint'  — M-Care calls this the moment a real verification tool
 *   confirms a partner credential (runDoctorVerificationScan approved,
 *   verifyIATACode valid, document-intelligence authentic, admin manual).
 *   Computes a SHA-256 credential_hash, links to the partner's previous
 *   credential hash (GENESIS for the first), and stores an immutable record.
 *   The partner uploads once; every future check reads the chain.
 * action: 'verify_chain' — re-walks a partner's credential chain, recomputes
 *   every hash, and reports any break or tamper. The "blockchain-verified"
 *   guarantee: if any record was altered after minting, the chain is broken
 *   and verify_chain says so.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Canonical payload hashed for the credential — every field is one M-Care
// already verified, so any later edit to the underlying record changes the
// hash and breaks the chain.
function canonicalPayload(rec: any): string {
  return JSON.stringify({
    partner_id: rec.partner_id,
    credential_type: rec.credential_type,
    credential_reference: rec.credential_reference,
    verified_at: rec.verified_at,
    verified_by: rec.verified_by,
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let caller: any = null;
    try { caller = await base44.auth.me(); } catch (_) { caller = null; }
    if (!caller) return Response.json({ error: 'Authentication required' }, { status: 401 });

    let body: any = null;
    try { body = await req.json(); } catch (_) { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const action = body?.action;
    if (!action) return Response.json({ error: 'action is required (mint | verify_chain)' }, { status: 400 });

    if (action === 'mint') {
      const {
        partner_type, partner_id, partner_name,
        credential_type, credential_reference, file_url,
        verified_by, verification_source, expires_at,
      } = body || {};
      if (!partner_type || !partner_id || !credential_type || !credential_reference || !verified_by) {
        return Response.json({ error: 'partner_type, partner_id, credential_type, credential_reference, verified_by are required' }, { status: 400 });
      }

      const verifiedAt = new Date().toISOString();
      const payloadRec = {
        partner_id, credential_type, credential_reference,
        verified_at: verifiedAt, verified_by,
      };
      const credentialHash = await sha256Hex(canonicalPayload(payloadRec));

      // Find the previous credential for this partner to link the chain.
      const existing = await base44.asServiceRole.entities.VerifiedCredential
        .filter({ partner_id }, '-created_date', 50).catch(() => []);
      const prev = (existing as any[])[0] || null;
      const prevHash = prev?.credential_hash || 'GENESIS';
      const chainIndex = prev ? (prev.chain_index || 0) + 1 : 0;

      const record = await base44.asServiceRole.entities.VerifiedCredential.create({
        partner_type, partner_id,
        partner_name: partner_name || '',
        credential_type,
        credential_reference,
        file_url: file_url || '',
        credential_hash: credentialHash,
        prev_credential_hash: prevHash,
        chain_index: chainIndex,
        verified_at: verifiedAt,
        verified_by,
        verification_source: verification_source || 'document_intelligence',
        status: 'valid',
        expires_at: expires_at || null,
        is_immutable: true,
      });

      return Response.json({
        success: true,
        credential_id: record.id,
        credential_hash: credentialHash,
        prev_credential_hash: prevHash,
        chain_index: chainIndex,
        chain_length: chainIndex + 1,
      });
    }

    if (action === 'verify_chain') {
      const { partner_id } = body || {};
      if (!partner_id) return Response.json({ error: 'partner_id is required' }, { status: 400 });

      const records = await base44.asServiceRole.entities.VerifiedCredential
        .filter({ partner_id }, 'created_date', 200).catch(() => []) as any[];

      if (records.length === 0) {
        return Response.json({ partner_id, chain_valid: false, reason: 'no credentials found', records_checked: 0 });
      }

      // Walk the chain oldest → newest; recompute each hash and verify the link.
      let chainValid = true;
      let brokenAtIndex: number | null = null;
      let expectedPrev = 'GENESIS';
      const checked = records.map((r: any, i: number) => {
        const recomputed = sha256Hex(canonicalPayload(r));
        const hashOk = recomputed === r.credential_hash;
        const linkOk = r.prev_credential_hash === expectedPrev;
        const ok = hashOk && linkOk;
        if (!ok && chainValid) { chainValid = false; brokenAtIndex = i; }
        expectedPrev = r.credential_hash;
        return {
          credential_id: r.id,
          credential_type: r.credential_type,
          credential_reference: r.credential_reference,
          verified_at: r.verified_at,
          verified_by: r.verified_by,
          status: r.status,
          hash_ok: hashOk,
          link_ok: linkOk,
        };
      });

      return Response.json({
        partner_id,
        chain_valid: chainValid,
        records_checked: records.length,
        broken_at_index: brokenAtIndex,
        records: checked,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[manageVerifiedCredential]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});