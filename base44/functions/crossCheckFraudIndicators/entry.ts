import { createHandler, ok } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, body }) => {
    const {
      emails = [], phones = [], domains = [], names = [],
      partner_type = null, partner_id = null,
    } = await body() as Record<string, any>;

    const norm = (v: unknown) => (typeof v === 'string' ? v.toLowerCase().trim() : '');
    const values: string[] = [
      ...((emails as any[]) || []).map(norm),
      ...((phones as any[]) || []).map(norm),
      ...((domains as any[]) || []).map(norm),
      ...((names as any[]) || []).map(norm),
    ].filter(Boolean);

    if (!values.length) {
      return ok({
        risk_level: 'low',
        matched_indicators: [],
        match_count: 0,
        recommendation: 'No identifiers provided to cross-check.',
        checked_at: new Date().toISOString(),
      });
    }

    // ── 1. Pull recent FraudIndicator + FraudBlacklist, match in memory ──────────
    // Service-role reads bypass the admin-only RLS so M-Care (running as the app
    // user) can still cross-check. Resolved (false-positive) indicators are skipped.
    const indicators = (await base44.asServiceRole.entities.FraudIndicator
      .list('-created_date', 200).catch(() => [])) as any[];
    const blacklist = (await base44.asServiceRole.entities.FraudBlacklist
      .list('-blacklisted_at', 100).catch(() => [])) as any[];

    const matched: any[] = [];

    for (const ind of indicators) {
      if (ind.resolved) continue;
      const v = norm(ind.indicator_value);
      if (!v) continue;
      const hit = values.some((val) => {
        if (!val) return false;
        const dv = digits(val);
        if (dv && digits(v) && digits(v).length >= 5 && digits(v) === dv) return true;
        return v === val || v.includes(val) || val.includes(v);
      });
      if (hit) {
        matched.push({
          table: 'fraud_indicator',
          type: ind.indicator_type,
          value: ind.indicator_value,
          severity: ind.severity,
          source: ind.source,
          reason: ind.reason,
          created_at: ind.created_at,
        });
      }
    }

    for (const bl of blacklist) {
      if (bl.status === 'removed') continue;
      const em = norm(bl.entity_email);
      const ph = digits(bl.entity_phone);
      const nm = norm(bl.entity_name);
      const hit = values.some((val) => {
        if (!val) return false;
        if (em && (em === val || val.includes(em) || em.includes(val))) return true;
        if (ph && ph.length >= 5 && digits(val) === ph) return true;
        if (nm && nm.length >= 3 && (nm === val || val.includes(nm) || nm.includes(val))) return true;
        return false;
      });
      if (hit) {
        matched.push({
          table: 'fraud_blacklist',
          type: bl.partner_type,
          value: bl.entity_name || bl.entity_email || bl.entity_phone,
          severity: (bl.risk_level || '').toLowerCase() === 'high' ? 'CRITICAL' : 'HIGH',
          source: 'fraud_blacklist',
          reason: bl.blacklist_reason,
          created_at: bl.blacklisted_at,
        });
      }
    }

    const hasCritical = matched.some((m) => m.severity === 'CRITICAL');
    const hasHigh = matched.some((m) => m.severity === 'HIGH');
    const risk_level = hasCritical ? 'critical' : hasHigh ? 'high' : matched.length ? 'medium' : 'low';

    const recommendation =
      risk_level === 'critical' ? 'Block and escalate to human review immediately — matched a critical fraud indicator or a confirmed blacklist entry.'
      : risk_level === 'high' ? 'Hold for manual review — matched a high-severity fraud indicator. Do not approve.'
      : risk_level === 'medium' ? 'Proceed with onboarding but flag for human review — matched a lower-severity indicator.'
      : 'No fraud indicators matched. Safe to proceed with normal verification.';

    return ok({
      risk_level,
      matched_indicators: matched,
      match_count: matched.length,
      recommendation,
      checked_at: new Date().toISOString(),
    });
}, { name: 'crossCheckFraudIndicators' }));

function digits(v: string): string { return (v || '').replace(/\D/g, ''); }