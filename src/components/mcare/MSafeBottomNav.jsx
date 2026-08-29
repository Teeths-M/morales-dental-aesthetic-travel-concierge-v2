import React from 'react';
import { LayoutDashboard, Route, Stethoscope, User } from 'lucide-react';
import LivingOrb from './LivingOrb';

const GOLD = '#D4AF37';
const LIGHT_TEXT_MUTED = '#64748B';
const LIGHT_BORDER = '#E5E7EB';

/**
 * MSafeBottomNav — the mobile M-Safe redesign's (2026-08-28) internal bottom
 * navigation row: Home / Journey / a raised center M-Safe orb / Services /
 * Profile. This is a self-contained footer for the full-bleed M-Care panel
 * itself, NOT a live mirror of the real site's own BottomTabBar.jsx (that
 * bar still exists globally and sits underneath, hidden while M-Care is
 * open full-bleed). "Home" renders gold-highlighted by default — a static
 * design choice matching the reference screenshot, not derived from
 * useLocation(), since this nav represents "M-Care's own screen," not the
 * site router's real active tab.
 *
 * The center orb genuinely renders <LivingOrb state={orbState} .../> — real,
 * reactive robot-avatar state, not a static icon — and has no onClick
 * (the panel is already open; tapping it is a no-op).
 */
export default function MSafeBottomNav({ orbState, onHome, onJourney, onServices, onProfile }) {
  /** @type {React.CSSProperties} */
  const itemStyle = {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px 2px',
  };
  const labelStyle = (active) => ({ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? GOLD : LIGHT_TEXT_MUTED });
  const iconColor = (active) => (active ? GOLD : LIGHT_TEXT_MUTED);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-end', flexShrink: 0, background: '#FFFFFF',
        borderTop: `1px solid ${LIGHT_BORDER}`, boxShadow: '0 -2px 12px rgba(15,23,42,0.05)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)', position: 'relative',
      }}
    >
      <button type="button" onClick={onHome} style={itemStyle} aria-label="Home">
        <LayoutDashboard style={{ width: 20, height: 20, color: iconColor(true) }} />
        <span style={labelStyle(true)}>Home</span>
      </button>

      <button type="button" onClick={onJourney} style={itemStyle} aria-label="Journey">
        <Route style={{ width: 20, height: 20, color: iconColor(false) }} />
        <span style={labelStyle(false)}>Journey</span>
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '0 4px 2px' }}>
        <div
          style={{
            position: 'relative', top: -14, width: 54, height: 54, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF',
            boxShadow: `0 4px 16px rgba(212,175,55,0.35), 0 0 0 4px #FFFFFF`, border: `1px solid ${LIGHT_BORDER}`,
          }}
        >
          <LivingOrb state={orbState} size={44} />
        </div>
        <span style={{ ...labelStyle(false), marginTop: -10 }}>M-Safe</span>
      </div>

      <button type="button" onClick={onServices} style={itemStyle} aria-label="Services">
        <Stethoscope style={{ width: 20, height: 20, color: iconColor(false) }} />
        <span style={labelStyle(false)}>Services</span>
      </button>

      <button type="button" onClick={onProfile} style={itemStyle} aria-label="Profile">
        <User style={{ width: 20, height: 20, color: iconColor(false) }} />
        <span style={labelStyle(false)}>Profile</span>
      </button>
    </div>
  );
}
