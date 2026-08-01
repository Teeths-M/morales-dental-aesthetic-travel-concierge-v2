import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

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

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: max 20 uploads per hour per user
    const uploadKey = `vault_upload_${user.id}_${Math.floor(Date.now() / (60 * 60 * 1000))}`;
    const uploadBuckets = await base44.asServiceRole.entities.RateLimitBucket.filter(
      { bucket_key: uploadKey }, '-created_date', 1
    ).catch(() => []);

    const uploadBucket = uploadBuckets?.[0];
    if (uploadBucket && uploadBucket.count >= 20) {
      return Response.json({
        error: 'Upload limit reached. Maximum 20 uploads per hour.'
      }, { status: 429 });
    }

    // Increment counter (fire and forget)
    base44.asServiceRole.entities.RateLimitBucket.create({
      bucket_key: uploadKey,
      count: (uploadBucket?.count || 0) + 1,
      window_start: new Date().toISOString(),
    }).catch(() => {});

    // Parse body once — req.body is a single-read stream; calling req.text() after req.json() returns ''
    const body = await req.json();
    const {
      encrypted_file_uri,
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
    const FORBIDDEN_FIELDS = ['encryption_key_b64', 'password', 'key', 'secret', 'encrypted_file_b64'];
    for (const field of FORBIDDEN_FIELDS) {
      if (field in body) {
        return Response.json({ error: 'Security violation: keys/passwords must never be sent to the server.' }, { status: 400 });
      }
    }

    if (!encrypted_file_uri || !encryption_iv_b64 || !encryption_salt_b64) {
      return Response.json({ error: 'encrypted_file_uri, encryption_iv_b64, and encryption_salt_b64 are required' }, { status: 400 });
    }

    // Server-side file validation
    const ALLOWED_MIME_TYPES = new Set([
      'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'
    ]);
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

    if (!file_name || typeof file_name !== 'string') {
      return Response.json({ error: 'file_name is required' }, { status: 400 });
    }

    // SECURITY: mime_type/file_size_bytes must be REQUIRED, not conditionally
    // checked — a caller that simply omits either field previously skipped
    // validation entirely (the original `if (mime_type && ...)` guard only
    // validated when the field was present, so omitting it bypassed the check).
    if (!mime_type || typeof mime_type !== 'string' || !ALLOWED_MIME_TYPES.has(mime_type)) {
      return Response.json({ error: 'File type not allowed. Use PDF, JPG, PNG, or WebP.' }, { status: 400 });
    }

    if (!file_size_bytes || typeof file_size_bytes !== 'number' || file_size_bytes > MAX_FILE_SIZE_BYTES) {
      return Response.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 });
    }

    // Sanitize filename — remove path traversal chars
    const safeName = file_name.replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 255);

    // File is already uploaded to private storage by the frontend
    const file_uri = encrypted_file_uri;

    // Entity field is passport_token — not vault_token. Using the wrong name means
    // every downstream filter({ passport_token }) returns empty, breaking all downloads.
    const passport_token = await generateVaultToken();
    const expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year
    const now = new Date().toISOString();

    // Create vault record
    let vault;
    try {
      vault = await base44.entities.PassportVault.create({
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
        file_name: safeName,
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
    } catch (createErr) {
      console.error('[uploadToVault] Vault create failed:', createErr?.message);
      return Response.json({ error: 'Vault record creation failed. Please try again.' }, { status: 500 });
    }

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
        resource_name: `${document_type} - ${safeName}`,
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
    return Response.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
// Already rate-limited inline above via RateLimitBucket — rateLimit:false here
// avoids silently double-limiting through two independent mechanisms.
}, { name: 'uploadToVault', requireAuth: false, rateLimit: false }));
