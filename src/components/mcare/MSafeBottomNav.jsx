import React from 'react';
import { LayoutDashboard, Route, Stethoscope, User } from 'lucide-react';
import LivingOrb from './LivingOrb';
import { GOLD, GOLD_INK, LIGHT_CARD, LIGHT_BORDER, LIGHT_TEXT_MUTED, TYPE } from './panelPalette';

/**
 * MSafeBottomNav — the mobile M-Safe panel's own bottom navigation row:
 * Home / Journey / a raised center M-Safe orb / Services / Profile. This is a
 * self-contained footer for the full-bleed M-Care panel itself, NOT a live
 * mirror of the real site's own BottomTabBar.jsx (that bar still exists
 * globally and sits underneath, hidden while M-Care is open full-bleed).
 *
 * M-Safe is the lit item (design upgrade, 2026-10-31): this bar only exists
 * while you are inside M-Safe, so lighting "Home" told people they were
 * somewhere they weren't. The other four are plain ways out.
 *
 * The center orb genuinely renders <LivingOrb state={orbState} .../> — real,
 * reactive robot-avatar state, not a static icon — and has no onClick
 * (the panel is already open; tapping it is a no-op).
 */
export default function MSafeBottomNav({ orbState, onHome, onJourney, onServices, onProfile }) {
  /** @type {React.CSSProperties} */
  const itemStyle = {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px 4px', minHeight: 52,
  };
  /** @type {React.CSSProperties} */
  const labelStyle = { fontSize: TYPE.label, fontWeight: 500, color: LIGHT_TEXT_MUTED };
  const iconStyle = { width: 21, height: 21, color: LIGHT_TEXT_MUTED };

  return (
    <nav
      aria-label="M-Safe navigation"
      style={{
        display: 'flex', alignItems: 'flex-end', flexShrink: 0, background: LIGHT_CARD,
        borderTop: `1px solid ${LIGHT_BORDER}`, boxShadow: '0 -2px 12px rgba(15,23,42,0.05)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)', position: 'relative',
      }}
    >
      <button type="button" onClick={onHome} className="ms-press" style={itemStyle} aria-label="Home">
        <LayoutDashboard style={iconStyle} />
        <span style={labelStyle}>Home</span>
      </button>

      <button type="button" onClick={onJourney} className="ms-press" style={itemStyle} aria-label="Journey">
        <Route style={iconStyle} />
        <span style={labelStyle}>Journey</span>
      </button>

      <div aria-current="page" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '0 4px 4px' }}>
        <div
          style={{
            position: 'relative', top: -10, width: 54, height: 54, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: LIGHT_CARD,
            boxShadow: `0 4px 16px rgba(212,175,55,0.35), 0 0 0 4px ${LIGHT_CARD}`, border: `1.5px solid ${GOLD}`,
          }}
        >
          <LivingOrb state={orbState} size={44} />
        </div>
        <span style={{ ...labelStyle, marginTop: -8, fontWeight: 700, color: GOLD_INK }}>M-Safe</span>
      </div>

      <button type="button" onClick={onServices} className="ms-press" style={itemStyle} aria-label="Services">
        <Stethoscope style={iconStyle} />
        <span style={labelStyle}>Services</span>
      </button>

      <button type="button" onClick={onProfile} className="ms-press" style={itemStyle} aria-label="Profile">
        <User style={iconStyle} />
        <span style={labelStyle}>Profile</span>
      </button>
    </nav>
  );
}
