import React, { useState } from 'react';
import { Loader2, ChevronRight, ChevronDown } from 'lucide-react';

const GOLD = '#D4AF37';
const MINT = '#36DDB2';
const LIGHT_CARD = '#FFFFFF';
const LIGHT_BORDER = '#E5E7EB';
const LIGHT_TEXT = '#0F172A';
const LIGHT_TEXT_MUTED = '#64748B';

/**
 * LiveActivityCard — the "M-Care is working on this right now" status card
 * for the mobile M-Safe redesign (2026-08-28). Visually inspired by the
 * reference screenshot's "Searching & Verifying" card, but the title/
 * subtitle are NEVER hardcoded to that literal text regardless of what's
 * actually happening — this app has a strong, repeatedly-enforced
 * discipline (RULE 3 "no invented data") against narrating a specific claim
 * ("checking credentials, reviews, safety record") a real tool result
 * doesn't actually back. Title/subtitle are always derived from the same
 * real state MCareOrb.jsx already computes (orbState, activeRunningTool) —
 * the identical data source its own minimal typing-indicator row already
 * uses, just presented as a fuller card on mobile.
 *
 * `visible` is passed explicitly by the caller (mirrors the exact
 * `agentSending || activeRunningTool` condition the desktop branch's
 * minimal row already uses) rather than re-derived here from orbState alone,
 * so this card's visibility never drifts from that established behavior.
 */
export default function LiveActivityCard({ visible, orbState, activeRunningTool }) {
  const [expanded, setExpanded] = useState(false);
  if (!visible) return null;

  const toolLabel = activeRunningTool?.display_projection?.active_label;
  const title = toolLabel || (orbState === 'thinking' ? 'Thinking it through…' : 'Working on it…');
  const subtitle = toolLabel
    ? 'M-Care is coordinating this for you now.'
    : 'Please wait while I gather what you need.';
  const canExpand = !!activeRunningTool;
  const detail = activeRunningTool?.result ?? activeRunningTool?.params ?? activeRunningTool?.args ?? null;

  return (
    <button
      type="button"
      onClick={() => canExpand && setExpanded((v) => !v)}
      data-testid="live-activity-card"
      style={{
        display: 'flex', flexDirection: 'column', gap: 0, width: '100%', textAlign: 'left',
        background: LIGHT_CARD, border: `1px solid ${LIGHT_BORDER}`, borderRadius: 16,
        boxShadow: '0 2px 10px rgba(15,23,42,0.06)', padding: '12px 14px',
        cursor: canExpand ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          flexShrink: 0, width: 36, height: 36, borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(212,175,55,0.12)',
        }}>
          <Loader2 className="animate-spin" style={{ width: 18, height: 18, color: GOLD }} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: LIGHT_TEXT, lineHeight: 1.3 }}>{title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: LIGHT_TEXT_MUTED, lineHeight: 1.3 }}>{subtitle}</p>
        </div>
        <span style={{
          flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(54,221,178,0.14)',
          color: '#0D9C7A', borderRadius: 999, padding: '3px 9px', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: MINT }} /> LIVE
        </span>
        {canExpand && (expanded
          ? <ChevronDown style={{ width: 15, height: 15, color: LIGHT_TEXT_MUTED, flexShrink: 0 }} />
          : <ChevronRight style={{ width: 15, height: 15, color: LIGHT_TEXT_MUTED, flexShrink: 0 }} />)}
      </div>
      {expanded && canExpand && (
        <pre style={{
          margin: '10px 0 0', padding: 8, fontSize: 10.5, background: '#F8FAFC', border: `1px solid ${LIGHT_BORDER}`,
          borderRadius: 8, overflowX: 'auto', color: LIGHT_TEXT_MUTED, maxHeight: 140,
        }}>
          {detail ? JSON.stringify(detail, null, 2) : 'No further detail available yet.'}
        </pre>
      )}
    </button>
  );
}
