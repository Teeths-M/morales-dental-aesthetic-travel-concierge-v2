import React from 'react';
import { Home, Plane, Briefcase, User } from 'lucide-react';
import { P } from './plusTheme';

const ITEMS = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'journey', label: 'Journey', Icon: Plane },
  { key: 'services', label: 'Services', Icon: Briefcase },
  { key: 'profile', label: 'Profile', Icon: User },
];

const Tab = ({ label, Icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-1 flex-col items-center gap-1"
    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0' }}
  >
    <Icon size={19} strokeWidth={1.7} color="rgba(255,255,255,0.55)" aria-hidden="true" />
    <span style={{ fontSize: 8.5, letterSpacing: '0.02em', color: 'rgba(255,255,255,0.55)' }}>{label}</span>
  </button>
);

export default function PlusBottomNav({ onNavigate }) {
  return (
    <nav
      className="flex items-end justify-between px-2 pt-2"
      style={{
        borderTop: `1px solid rgba(197,160,89,0.18)`,
        background: 'rgba(10,20,32,0.94)',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
      }}
      aria-label="M-Safe navigation"
    >
      <Tab {...ITEMS[0]} onClick={() => onNavigate('home')} />
      <Tab {...ITEMS[1]} onClick={() => onNavigate('journey')} />

      {/* M-Safe — the active centre item */}
      <button
        type="button"
        onClick={() => onNavigate('msafe')}
        aria-current="page"
        className="flex flex-1 flex-col items-center"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
      >
        <span
          className="-mt-4 flex h-11 w-11 items-center justify-center rounded-full"
          style={{
            border: `1.5px solid ${P.gold}`,
            background: `radial-gradient(circle at 50% 35%, ${P.goldBright}, ${P.gold} 70%)`,
            boxShadow: '0 4px 18px rgba(197,160,89,0.4)',
          }}
        >
          <span style={{ fontFamily: P.fontSerif, fontSize: 22, fontWeight: 600, color: '#0A1420', lineHeight: 1 }}>M</span>
        </span>
        <span style={{ marginTop: 3, fontSize: 8.5, fontWeight: 700, color: P.gold, letterSpacing: '0.02em' }}>
          M-Safe
        </span>
      </button>

      <Tab {...ITEMS[2]} onClick={() => onNavigate('services')} />
      <Tab {...ITEMS[3]} onClick={() => onNavigate('profile')} />
    </nav>
  );
}