import React from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { CALM } from '@/lib/brandTokens';

/**
 * LastVerified — the freshness stamp shown anywhere a clinic, doctor, or
 * requirement is presented to a user. It never hides staleness: when data is
 * past its TTL it reads "Re-verifying…" instead of a confident date, so cached
 * data is never presented as current truth (fail-safe, not fail-silent).
 *
 * Mirrors the server TTLs in base44/functions/_shared/freshness.ts.
 */
const TTL_HOURS = {
  clinic_status: 24,
  doctor_license: 24 * 7,
  visa_rule: 24 * 7,
  regulatory_rule: 24 * 30,
};

export default function LastVerified({
  timestamp,
  kind = 'doctor_license',
  staleAfterHours = undefined,
  sourceUrl = undefined,
  sourceLabel = undefined,
  size = 'sm',
  style = undefined,
}) {
  const ttlH = staleAfterHours ?? TTL_HOURS[kind] ?? 168;
  const t = timestamp ? new Date(timestamp) : null;
  const valid = t && !Number.isNaN(t.getTime());
  const ageH = valid ? (Date.now() - t.getTime()) / 3_600_000 : Infinity;
  const fresh = valid && ageH <= ttlH;

  const fontSize = size === 'md' ? 12.5 : 11.5;
  const dot = { width: 7, height: 7, borderRadius: '50%', flexShrink: 0, display: 'inline-block' };

  let dotColor, text, title;
  if (fresh) {
    dotColor = CALM.action;
    text = `Last verified ${format(t, 'd MMM yyyy')}`;
    title = `Confirmed ${formatDistanceToNowStrict(t, { addSuffix: true })}`;
  } else if (valid) {
    dotColor = '#C9A227'; // amber — attention, not alarm (never red)
    text = 'Re-verifying…';
    title = `Last confirmed ${format(t, 'd MMM yyyy')} — past its freshness window, re-checking`;
  } else {
    dotColor = CALM.textFaint;
    text = 'Not yet verified';
    title = 'No verification on record yet';
  }

  return (
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize, color: fresh ? CALM.textSoft : CALM.textFaint,
        lineHeight: 1.4, ...style,
      }}
    >
      <span style={{ ...dot, background: dotColor }} aria-hidden="true" />
      {text}
      {sourceUrl && (
        <>
          <span aria-hidden="true" style={{ color: CALM.textFaint }}>·</span>
          <a
            href={sourceUrl} target="_blank" rel="noopener noreferrer"
            style={{ color: CALM.action, textDecoration: 'none', fontWeight: 600 }}
          >
            {sourceLabel || 'source'}
          </a>
        </>
      )}
    </span>
  );
}
