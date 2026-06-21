import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function generateVaultToken() {
  const rawBytes = new Uint8Array(24);
  crypto.getRandomValues(rawBytes);
  return 'VAULT_' + Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateShareToken() {
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  return 'SHARE_' + Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Parse body once — req.body is a single-read stream; calling req.text() after req.json() returns ''
    const body = await req.json();
    const {
      encrypted_file_b64,
      encryption_iv_b64,
      encryption_salt_b64,
      file_hash_sha256,
      file_size_bytes,
      file_name,
      mime_type,
      document_type = 'passport',
      redacted_for_display = {},
      is_emergency_accessible = true
    } = body;

    // ZERO-KNOWLEDGE: reject if encryption key fields are present in the parsed object
    // (SEC-02: previously checked on already-consumed req.text() — always returned empty string)
    const FORBIDDEN_FIELDS = ['encryption_key_b64', 'password', 'key', 'secret'];
    for (const field of FORBIDDEN_FIELDS) {
      if (field in body) {
        return Response.json({ error: 'Security violation: keys/passwords must never be sent to the server.' }, { status: 400 });
      }
    }

    if (!encrypted_file_b64 || !encryption_iv_b64 || !encryption_salt_b64) {
      return Response.json({ error: 'encrypted_file_b64, encryption_iv_b64, and encryption_salt_b64 are required' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const estimatedSize = (encrypted_file_b64.length * 3) / 4;
    if (estimatedSize > 11 * 1024 * 1024) {
      return Response.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 });
    }

    // Convert base64 to bytes and upload as private file
    const encryptedBytes = Uint8Array.from(atob(encrypted_file_b64), c => c.charCodeAt(0));
    const encryptedBlob = new Blob([encryptedBytes], { type: 'application/octet-stream' });

    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: encryptedBlob });

    // Entity field is passport_token — not vault_token. Using the wrong name means
    // every downstream filter({ passport_token }) returns empty, breaking all downloads.
    const passport_token = await generateVaultToken();
    const expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year
    const now = new Date().toISOString();

    // Create vault record
    const vault = await base44.entities.PassportVault.create({
      passport_token,
      user_id: user.id,
      user_email: user.email,
      document_type,
      encrypted_file_uri: file_uri,
      encryption_iv_b64,
      encryption_salt_b64,  // Store salt (not secret, needed for PBKDF2)
      algorithm: 'AES-256-GCM',
      algorithm_version: 2,
      integrity_hash: file_hash_sha256,
      file_size_bytes,
      file_name,
      mime_type,
      redacted_for_display,
      status: 'active',
      // TODO: Wire real AV scanner (e.g. ClamAV/VirusTotal) before surfacing scan status to users.
      // Files are client-side AES-256-GCM encrypted before upload, limiting server-side exposure.
      // Status is intentionally 'not_scanned' — never claim 'passed' without a real scan.
      virus_scan_status: 'not_scanned',
      expires_at,
      uploaded_at: now,
      access_count: 0,
      is_emergency_accessible
    });

    // Log to AuditLog — use 'passport_access_requested' which is in the allowed event type list.
    // IMPORTANT: this must never fail the upload. The vault record above is already
    // committed; if the audit call throws (e.g. auth context isn't forwarded on
    // function-to-function invokes), we'd otherwise return a false "upload failed"
    // to the user even though their document was safely vaulted.
    try {
      await base44.functions.invoke('logAuditEvent', {
        event_type: 'passport_access_requested',
        actor_id: user.id,
        actor_role: user.role || 'client',
        actor_name: user.full_name,
        resource_type: 'PassportVault',
        resource_id: vault.id,
        resource_name: `${document_type} - ${file_name}`,
        details: {
          action: 'vault_upload',
          document_type,
          file_size_bytes,
          is_emergency_accessible,
        },
        sensitive: false,
      });
    } catch (auditError) {
      console.error('[uploadToVault] Non-fatal: audit log failed', auditError);
    }

    return Response.json({
      success: true,
      vault_token: passport_token,
      vault_id: vault.id,
      expires_at,
      redacted_for_display
    });

  } catch (error) {
    console.error('[uploadToVault]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});