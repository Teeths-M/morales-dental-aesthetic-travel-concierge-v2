import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { cronAuthorized } from '../_shared/cronAuth.ts';
import { flagForReview } from '../_shared/freshness.ts';

/**
 * detectRegulatoryChanges — lightweight change-detection over the RegulatorySource
 * pages we depend on. For each active source it fetches the page, normalizes the
 * text, and compares a SHA-256 hash to the last one on file. A change flags the
 * admin/legal review queue IMMEDIATELY rather than waiting for the next monthly
 * cycle. Running daily makes this a superset of the monthly scheduled re-check.
 *
 * Nothing here changes what users see — a person reviews and confirms any real
 * regulatory update (consistent with our safety-review pattern).
 *
 * Cron-registered in Base44 (daily), runs under the scheduler's admin identity.
 */
function normalize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);
  const sources = await base44.asServiceRole.entities.RegulatorySource.filter({ active: true }, '-last_checked_at', 100).catch(() => []);
  const nowISO = new Date().toISOString();

  let checked = 0, changed = 0, unreachable = 0, baselined = 0;

  for (const src of sources) {
    checked++;
    let content = '';
    try {
      const res = await fetch(src.url, {
        signal: AbortSignal.timeout(12000),
        headers: { 'User-Agent': 'MoralesMedicalPlatform/1.0 (compliance-monitor)' },
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      content = normalize(await res.text());
    } catch (_) {
      unreachable++;
      await base44.asServiceRole.entities.RegulatorySource.update(src.id, { last_checked_at: nowISO }).catch(() => {});
      await flagForReview(base44, {
        subject_type: 'regulatory_rule', subject_id: src.id, subject_label: src.label,
        change_type: 'source_unavailable',
        detail: `Could not fetch monitored source ${src.url}. If it stays unreachable, the source may have moved — verify manually.`,
        detected_via: 'change_detection', severity: 'info',
      });
      continue;
    }

    if (!content) { // empty read — treat as unreachable, don't overwrite a good baseline
      unreachable++;
      await base44.asServiceRole.entities.RegulatorySource.update(src.id, { last_checked_at: nowISO }).catch(() => {});
      continue;
    }

    const hash = await sha256(content);

    if (!src.last_content_hash) {
      // First observation — store the baseline, no alert.
      baselined++;
      await base44.asServiceRole.entities.RegulatorySource.update(src.id, {
        last_content_hash: hash, last_checked_at: nowISO, last_changed_at: nowISO,
      }).catch(() => {});
      continue;
    }

    if (hash !== src.last_content_hash) {
      changed++;
      await base44.asServiceRole.entities.RegulatorySource.update(src.id, {
        last_content_hash: hash, last_checked_at: nowISO, last_changed_at: nowISO,
      }).catch(() => {});
      await flagForReview(base44, {
        subject_type: 'regulatory_rule', subject_id: src.id,
        subject_label: `${src.label}${src.country ? ` (${src.country})` : ''}`,
        change_type: 'source_changed',
        detail: `Monitored regulatory source changed: ${src.url}. Legal/compliance review needed to assess impact before anything is updated for users.`,
        detected_via: 'change_detection',
        previous_value: `hash ${String(src.last_content_hash).slice(0, 12)}…`,
        new_value: `hash ${hash.slice(0, 12)}…`,
        severity: 'warning',
      });
    } else {
      await base44.asServiceRole.entities.RegulatorySource.update(src.id, { last_checked_at: nowISO }).catch(() => {});
    }
  }

  console.log(`[detectRegulatoryChanges] checked=${checked} changed=${changed} baselined=${baselined} unreachable=${unreachable}`);
  return ok({ success: true, checked, changed, baselined, unreachable });
}, { name: 'detectRegulatoryChanges', requireAuth: false }));
