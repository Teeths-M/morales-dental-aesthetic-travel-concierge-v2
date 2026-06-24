import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'platform_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch last 500 audit entries in chronological order (oldest first)
    const entries = await base44.asServiceRole.entities.AuditLog.filter({}, 'timestamp', 500);

    if (!entries || entries.length === 0) {
      return Response.json({ valid: true, checked_entries: 0, message: 'No audit entries to validate' });
    }

    let valid = true;
    let breakAt = null;
    let lastHash = 'GENESIS';
    const errors = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Verify this entry's prev_hash matches what we computed for the previous entry
      if (entry.prev_hash !== lastHash) {
        valid = false;
        breakAt = entry.id;
        errors.push({
          entry_id: entry.id,
          timestamp: entry.timestamp,
          expected_prev_hash: lastHash,
          actual_prev_hash: entry.prev_hash,
        });
        console.error(`[validateAuditLogChain] Chain break at entry ${entry.id}`);
        if (errors.length >= 5) break; // Report first 5 breaks
      }

      // Compute hash of this entry for the next iteration
      try {
        lastHash = await sha256(JSON.stringify(entry));
      } catch (hashErr) {
        console.error(`[validateAuditLogChain] Hash failed at ${entry.id}:`, hashErr.message);
        valid = false;
        break;
      }
    }

    if (!valid) {
      // Alert admin via email about chain break
      const adminEmail = Deno.env.get('ADMIN_EMAIL');
      if (adminEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: adminEmail,
          subject: '🚨 AUDIT LOG INTEGRITY BREACH DETECTED',
          body: `The audit log hash chain has been broken. This may indicate tampering.\n\nFirst break at entry: ${breakAt}\nTotal breaks found: ${errors.length}\n\nImmediate investigation required.`,
        }).catch(() => {});
      }
    }

    return Response.json({
      valid,
      checked_entries: entries.length,
      break_count: errors.length,
      first_break_at: breakAt,
      errors: errors.slice(0, 3), // Return first 3 errors max
    });

  } catch (err) {
    console.error('[validateAuditLogChain] Error:', err?.message);
    return Response.json({ error: 'Validation failed' }, { status: 500 });
  }
});
