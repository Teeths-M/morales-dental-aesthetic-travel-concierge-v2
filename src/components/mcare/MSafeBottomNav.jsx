import React from 'react';
import { House, Plane, BriefcaseBusiness, User } from 'lucide-react';
import { GOLD, NIGHT, TYPE } from './panelPalette';

/**
 * MSafeBottomNav — the M-Safe phone screen's own bottom bar: Home / Journey /
 * a raised gold M-Safe disc / Services / Profile. A footer for the full-screen
 * M-Care panel, not a mirror of the site's BottomTabBar.jsx (that bar still
 * exists underneath, hidden while M-Care is open).
 *
 * North-star redesign (2026-11-01): dark navy with a gold M in the centre, as
 * in Portia's mockup. M-Safe is the lit item, because this bar only exists
 * while you are inside M-Safe; the other four are ways out. The centre ring
 * turns amber only while M-Safe has a real safety alert on screen (orbState
 * 'alert', derived from a real safety result), never as decoration.
 */
export default function MSafeBottomNav({ orbState, onHome, onJourney, onServices, onProfile, servicesOpen = false }) {
  // Services opens the list of everything else M-Care does (Find Doctors first),
  // shown just above the message box; it lights gold while that list is open.
  const alertOn = orbState === 'alert';
  const ring = alertOn ? NIGHT.warn : GOLD;

  /** @type {React.CSSProperties} */
  const itemStyle = {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    background: 'none', border: 'none', cursor: 'pointer', padding: '10px 4px 6px', minHeight: 56,
  };
  /** @type {React.CSSProperties} */
  const labelStyle = { fontSize: TYPE.label + 1, fontWeight: 500, color: NIGHT.muted };
  const iconStyle = { width: 23, height: 23, color: NIGHT.muted, strokeWidth: 1.8 };

  return (
    <nav
      aria-label="M-Safe navigation"
      style={{
        display: 'flex', alignItems: 'flex-end', flexShrink: 0, position: 'relative',
        background: 'linear-gradient(180deg, rgba(10,17,32,0.96), rgba(6,11,22,0.99))',
        borderTop: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 -8px 24px rgba(0,0,0,0.35)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <button type="button" onClick={onHome} className="ms-press" style={itemStyle} aria-label="Home">
        <House style={iconStyle} />
        <span style={labelStyle}>Home</span>
      </button>

      <button type="button" onClick={onJourney} className="ms-press" style={itemStyle} aria-label="Journey">
        <Plane style={iconStyle} />
        <span style={labelStyle}>Journey</span>
      </button>

      <div aria-current="page" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '0 4px 6px' }}>
        <div
          aria-label={alertOn ? 'M-Safe, safety alert' : 'M-Safe'}
          role="img"
          style={{
            position: 'relative', top: -16, width: 60, height: 60, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at 35% 30%, #1B2740, #050A14 70%)',
            border: `2px solid ${ring}`,
            boxShadow: `0 0 0 4px ${NIGHT.canvas}, 0 0 22px ${alertOn ? 'rgba(242,181,68,0.55)' : 'rgba(212,175,55,0.55)'}, 0 6px 18px rgba(0,0,0,0.5)`,
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          <img src="/morales-m-mark.png" alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
        </div>
        <span style={{ ...labelStyle, marginTop: -14, fontWeight: 700, color: GOLD }}>M-Safe</span>
      </div>

      <button type="button" onClick={onServices} className="ms-press" style={itemStyle} aria-label="Services"
        aria-expanded={servicesOpen} aria-controls="msafe-services-list">
        <BriefcaseBusiness style={{ ...iconStyle, color: servicesOpen ? GOLD : NIGHT.muted }} />
        <span style={{ ...labelStyle, color: servicesOpen ? GOLD : NIGHT.muted, fontWeight: servicesOpen ? 700 : 500 }}>Services</span>
      </button>

      <button type="button" onClick={onProfile} className="ms-press" style={itemStyle} aria-label="Profile">
        <User style={iconStyle} />
        <span style={labelStyle}>Profile</span>
      </button>
    </nav>
  );
}
