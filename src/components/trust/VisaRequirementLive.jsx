import React from 'react';
import { CALM } from '@/lib/brandTokens';
import { VISA_STATUS_LABELS, getVisaHelpLinks } from '@/lib/visaMatrix';
import { useVisaRequirement } from '@/hooks/useVisaRequirement';
import LastVerified from './LastVerified';

/**
 * VisaRequirementLive — shows the CURRENT entry requirement for a nationality →
 * destination pair at decision time, plus — whenever a visa or e-visa is
 * actually needed — a real way to act on it: the official application portal
 * and a current video walkthrough. Never just a label with no next step.
 *
 * Reads through useVisaRequirement() — the same hook ReviewStep.jsx uses —
 * rather than its own separate query, so this panel and the review-step
 * "before you travel" check can never disagree with each other (they used to
 * share only the query key, not the actual priority logic, which is exactly
 * how they could drift). See that hook for the live-check-vs-curated-research
 * priority rule.
 *
 * Advisory only — never gates a booking. If there's no confirmed live check
 * and no explicit curated answer, this falls back to a broad regional guess,
 * LABELLED clearly as an unconfirmed estimate rather than presented as
 * current truth.
 */
export default function VisaRequirementLive({ nationality, destination, style = {} }) {
  const enabled = Boolean(nationality && destination);
  const {
    status, isLive, isExplicitMatrix, agreesWithLive,
    source, lastConfirmed, summary, medicalNotes, isLoading,
  } = useVisaRequirement(nationality, destination);

  if (!enabled) return null;

  // "Confirmed" detail (summary/medical notes/last-verified) is only shown
  // when it actually corroborates the status on screen. A live summary that
  // describes a DIFFERENT status than a curated override would be more
  // confusing than showing nothing — the offline-style footer below covers
  // that case with the same honest "not confirmed live" framing.
  const showLiveDetail = isLive && (agreesWithLive || !isExplicitMatrix);
  const label = VISA_STATUS_LABELS[status] || VISA_STATUS_LABELS.unknown;
  const needsVisa = status !== 'exempt' && status !== 'visa_free' && status !== 'unknown';
  const { portalUrl, videoSearchUrl } = needsVisa ? getVisaHelpLinks(nationality, destination) : {};

  return (
    <div
      style={{
        background: CALM.surface, border: `1px solid ${CALM.border}`, borderRadius: 14,
        padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: CALM.textSoft }}>
          Entry requirement · {nationality} → {destination}
        </span>
        {isLoading && <span style={{ fontSize: 11.5, color: CALM.textFaint }}>Checking current rules…</span>}
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: CALM.text }}>{label}</div>

      {!isLoading && showLiveDetail && summary && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: CALM.textSoft }}>{summary}</p>
      )}
      {!isLoading && showLiveDetail && medicalNotes && (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: CALM.textFaint }}>{medicalNotes}</p>
      )}

      {!isLoading && (showLiveDetail ? (
        <LastVerified
          timestamp={lastConfirmed}
          kind="visa_rule"
          sourceUrl={source || undefined}
          sourceLabel="official source"
        />
      ) : (
        <span style={{ fontSize: 11.5, color: CALM.textFaint }}>
          Offline estimate — your coordinator will confirm the current requirement with you directly.
        </span>
      ))}

      {/* Not just a label — a real next step. Only when a visa/e-visa is
          actually needed; never shown for exempt or unconfirmed. */}
      {!isLoading && needsVisa && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <a href={portalUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: CALM.action, textDecoration: 'none' }}>
            Apply for your visa →
          </a>
          <a href={videoSearchUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: CALM.action, textDecoration: 'none' }}>
            See how it works →
          </a>
        </div>
      )}

      <p style={{ margin: '2px 0 0', fontSize: 11, color: CALM.textFaint }}>
        Entry rules change — always confirm with the embassy before you travel. This never affects your booking.
      </p>
    </div>
  );
}
