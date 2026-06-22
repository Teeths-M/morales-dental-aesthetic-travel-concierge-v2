import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function generatePassportToken() {
  const rawBytes = new Uint8Array(24);
  crypto.getRandomValues(rawBytes);
  return 'PASS_' + Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // BUG-R4-01 FIX: Parse body ONCE into a variable. req.body is a single-read stream —
    // calling req.json() then req.text() always returns '' on the second read.
    // Check for forbidden key fields on the parsed object, not a re-read stream.
    const parsedBody = await req.json();
    const {
      encrypted_file_b64,
      encryption_iv_b64,
      redacted_for_display,
      file_size_bytes,
      file_hash_sha256,
      document_type = 'passport'
    } = parsedBody;

    // ZERO-KNOWLEDGE: reject if encryption key fields are present in the parsed body
    const FORBIDDEN_FIELDS = ['encryption_key_b64', 'password', 'key', 'secret'];
    for (const field of FORBIDDEN_FIELDS) {
      if (field in parsedBody) {
        return Response.json({ error: 'Security violation: encryption keys must never be sent to the server.' }, { status: 400 });
      }
    }

    if (!encrypted_file_b64 || !encryption_iv_b64) {
      return Response.json({ error: 'encrypted_file_b64 and encryption_iv_b64 are required' }, { status: 400 });
    }

    // Validate file size (max 10MB encrypted)
    const estimatedSize = (encrypted_file_b64.length * 3) / 4;
    if (estimatedSize > 11 * 1024 * 1024) {
      return Response.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 });
    }

    // Convert base64 to bytes and upload as private file
    const encryptedBytes = Uint8Array.from(atob(encrypted_file_b64), c => c.charCodeAt(0));
    const encryptedBlob = new Blob([encryptedBytes], { type: 'application/octet-stream' });

    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: encryptedBlob });

    const passport_token = await generatePassportToken();
    const expires_at = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

    // BUG-R4-02 FIX: PassportVault schema uses `user_email` not `patient_email`.
    // Storing in the wrong field caused user_email to be undefined, making every
    // downstream filter({ user_email }) and auth check fail with 403 for the owner.
    const vault = await base44.entities.PassportVault.create({
      passport_token,
      user_id: user.id,
      user_email: user.email,     // Correct field name per PassportVault schema
      document_type,
      encrypted_file_uri: file_uri,
      encryption_iv_b64,          // IV is not secret — needed to initiate client-side decryption
      redacted_for_display: redacted_for_display || {},
      file_size_bytes: file_size_bytes || 0,
      integrity_hash: file_hash_sha256 || '',
      status: 'active',
      virus_scan_status: 'passed',
      expires_at,
      access_count: 0,
      is_emergency_accessible: true,
    });

    await base44.asServiceRole.entities.PassportAuditLog.create({
      passport_token,
      patient_id: user.id,
      patient_email: user.email,
      actor_id: user.id,
      actor_role: 'patient',
      actor_name: user.full_name,
      action: 'upload',
      status: 'success',
      timestamp: new Date().toISOString(),
      metadata: { file_size_bytes, document_type }
    });

    return Response.json({ success: true, passport_token, vault_id: vault.id, expires_at, redacted_for_display });

  } catch (error) {
    // BUG-R4-08 FIX: SEC-10 — never expose internal error details
    console.error('[uploadEncryptedPassport]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});