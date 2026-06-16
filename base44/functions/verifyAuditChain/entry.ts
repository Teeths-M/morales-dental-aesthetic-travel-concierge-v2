import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch (_) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    // Fetch all audit log entries in ascending timestamp order
    // We page through in batches to avoid loading everything at once
    const PAGE_SIZE = 200;
    let allEntries = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.AuditLog.list('timestamp', PAGE_SIZE, skip);
      if (!batch || batch.length === 0) break;
      allEntries = allEntries.concat(batch);
      if (batch.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    if (allEntries.length === 0) {
      return Response.json({ status: 'empty', message: 'No audit log entries found.', broken_entries: [], total_entries: 0 });
    }

    const broken_entries = [];
    let chainIntact = true;

    for (let i = 0; i < allEntries.length; i++) {
      const entry = allEntries[i];

      if (i === 0) {
        // First entry must have prev_hash of GENESIS or GENESIS_FALLBACK
        if (entry.prev_hash !== 'GENESIS' && entry.prev_hash !== 'GENESIS_FALLBACK') {
          broken_entries.push({
            index: i,
            id: entry.id,
            timestamp: entry.timestamp,
            issue: 'First entry does not have GENESIS prev_hash',
            expected: 'GENESIS',
            found: entry.prev_hash,
          });
          chainIntact = false;
        }
        continue;
      }

      // Compute the hash of the previous entry (excluding its own prev_hash from the computation
      // mirrors how logAuditEvent hashes the full stored record)
      const prevEntry = allEntries[i - 1];
      const expectedPrevHash = await sha256(JSON.stringify(prevEntry));

      if (entry.prev_hash !== expectedPrevHash) {
        broken_entries.push({
          index: i,
          id: entry.id,
          timestamp: entry.timestamp,
          event_type: entry.event_type,
          issue: 'Hash chain broken — previous entry was modified or deleted',
          expected: expectedPrevHash,
          found: entry.prev_hash,
        });
        chainIntact = false;
      }
    }

    // If chain is broken, send a critical alert email to admin
    if (!chainIntact) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: Deno.env.get('ADMIN_EMAIL'),
          subject: '🚨 CRITICAL: Audit Chain Integrity Violation Detected',
          body: `The Morales Platform audit log hash chain has been broken.\n\n${broken_entries.length} broken link(s) detected.\n\nFirst broken entry:\n- ID: ${broken_entries[0].id}\n- Timestamp: ${broken_entries[0].timestamp}\n- Issue: ${broken_entries[0].issue}\n\nPlease investigate immediately via /admin/audit-chain.`,
        });
      } catch (_) {
        // Email failure must not prevent returning the report
      }
    }

    return Response.json({
      status: chainIntact ? 'intact' : 'broken',
      chain_intact: chainIntact,
      total_entries: allEntries.length,
      broken_count: broken_entries.length,
      broken_entries,
      verified_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});