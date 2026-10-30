import React from 'react';
import { Sparkles, Shield, Share2, CheckCircle2 } from 'lucide-react';
import { GOLD, MINT, TEXT_MUTED_DARK, LIGHT_TEXT, LIGHT_TEXT_MUTED } from './panelPalette';

/**
 * CapabilityRows — the Analyze / Protect / Coordinate / Resolve row, in its two
 * real layouts.
 *
 * Extracted verbatim from MCareOrb.jsx (which had outgrown its size budget) so
 * the orb could gain the wake-phrase offer without being rewritten. Nothing here
 * changed: same items, same ring colouring, same "lights up only for the real,
 * currently-active capability" rule — `active` is that capability's label, never
 * a fabricated highlight.
 */
export const CAPABILITY_ITEMS = [
  { icon: Sparkles, label: 'Analyze', subtitle: 'Intelligence', accent: GOLD },
  { icon: Shield, label: 'Protect', subtitle: 'Safety First', accent: MINT },
  { icon: Share2, label: 'Coordinate', subtitle: 'Everything', accent: MINT },
  { icon: CheckCircle2, label: 'Resolve', subtitle: 'Peace of Mind', accent: GOLD },
];

/**
 * Circles with labels underneath. Mobile also gets a subtitle per item, inside
 * its own white card (see CapabilityRowBlock); desktop shows the bare row.
 */
export function CapabilityItemsRow({ active, dark, desktop }) {
  return (
    <div style={{ display: 'flex', gap: desktop ? 16 : 10, marginTop: desktop ? 10 : 0, flexWrap: 'wrap', justifyContent: desktop ? 'flex-start' : 'space-between' }}>
      {CAPABILITY_ITEMS.map(({ icon: Icon, label, subtitle, accent }) => {
        const isActive = label === active;
        const ringColor = dark ? GOLD : accent;
        return (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: desktop ? 'none' : 1, minWidth: 0 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: isActive ? `1px solid ${ringColor}` : `1px solid ${ringColor}59`,
              background: isActive ? `${ringColor}3D` : `${ringColor}14`,
              boxShadow: isActive ? `0 0 8px ${ringColor}88` : 'none',
              color: dark ? (isActive ? '#F5D97A' : '#C9A227') : (isActive ? ringColor : `${ringColor}CC`),
              transition: 'all 0.25s ease',
            }}>
              <Icon style={{ width: 15, height: 15 }} />
            </div>
            <span style={{ fontSize: 10, color: dark ? (isActive ? '#F5D97A' : TEXT_MUTED_DARK) : LIGHT_TEXT, fontWeight: isActive ? 700 : 600, textAlign: 'center' }}>{label}</span>
            {!desktop && (
              <span style={{ fontSize: 9, color: LIGHT_TEXT_MUTED, textAlign: 'center', lineHeight: 1.1 }}>{subtitle}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Desktop-only reference-match variant: icon + label pills side by side, laid
 * out for the left panel, instead of an icon-in-a-circle with the label below.
 */
export function DesktopCapabilityPillsRow({ active, dark }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
      {CAPABILITY_ITEMS.map(({ icon: Icon, label, accent }) => {
        const isActive = label === active;
        const ringColor = dark ? GOLD : accent;
        return (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
            border: isActive ? `1px solid ${ringColor}` : `1px solid ${ringColor}59`,
            background: isActive ? `${ringColor}3D` : `${ringColor}14`,
            boxShadow: isActive ? `0 0 8px ${ringColor}88` : 'none',
            transition: 'all 0.25s ease',
          }}>
            <Icon style={{ width: 13, height: 13, color: dark ? (isActive ? '#F5D97A' : '#C9A227') : (isActive ? ringColor : `${ringColor}CC`) }} />
            <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 600, color: dark ? (isActive ? '#F5D97A' : TEXT_MUTED_DARK) : LIGHT_TEXT, whiteSpace: 'nowrap' }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}