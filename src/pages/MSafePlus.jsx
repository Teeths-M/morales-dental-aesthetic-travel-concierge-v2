import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import RobotAvatarImage from '@/components/mcare/RobotAvatarImage';
import { P } from '@/components/mcare/plus/plusTheme';
import PlusHeader from '@/components/mcare/plus/PlusHeader';
import PlusHero from '@/components/mcare/plus/PlusHero';
import CapabilityGrid from '@/components/mcare/plus/CapabilityGrid';
import QuickActions from '@/components/mcare/plus/QuickActions';
import PlusComposer from '@/components/mcare/plus/PlusComposer';
import PlusBottomNav from '@/components/mcare/plus/PlusBottomNav';

const MUTE_KEY = 'msafe_plus_muted';

// Where each control actually goes. The screen is a launcher: the conversation
// itself lives in the live session, and the safety surfaces are the real ones.
const ROUTES = {
  map: '/nearby-help',
  check: '/safe-t',
  home: '/',
  journey: '/trip-overview',
  services: '/travel-services',
  profile: '/dashboard',
};

/**
 * MSafePlus (/m-care) — the M-Safe+ home screen.
 *
 * Nothing on it claims live monitoring it cannot prove: the identity block is
 * the agent's own introduction, and every action opens the real screen behind
 * it rather than imitating one here.
 */
export default function MSafePlus() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
  });

  // The shell behind the screen is white by default; paint it navy so an
  // overscroll or the notch area never flashes.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { title: document.title, html: html.style.backgroundColor, body: body.style.backgroundColor };
    document.title = 'M-Safe+ · M-Care';
    html.style.backgroundColor = P.bg;
    body.style.backgroundColor = P.bg;
    return () => {
      document.title = prev.title;
      html.style.backgroundColor = prev.html;
      body.style.backgroundColor = prev.body;
    };
  }, []);

  const toggleMute = () => {
    setMuted((was) => {
      const next = !was;
      try { localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch { /* private mode */ }
      return next;
    });
  };

  const firstName = (user?.full_name || user?.name || '').trim().split(/\s+/)[0] || 'traveller';

  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col"
      style={{ background: P.bg, color: P.text, fontFamily: P.font }}
    >
      <div
        className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-4"
        style={{ paddingTop: 'calc(14px + env(safe-area-inset-top))' }}
      >
        <PlusHeader
          muted={muted}
          onToggleMute={toggleMute}
          onOpenAlerts={() => navigate('/dashboard')}
          onClose={() => navigate('/')}
        />

        <div className="mt-5">
          <PlusHero />
        </div>

        <div className="mt-5">
          <CapabilityGrid />
        </div>

        {/* Greeting */}
        <div className="mt-4 flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ border: `1px solid ${P.border}`, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}
          >
            <RobotAvatarImage size={22} activityState="idle" animated={false} />
          </span>
          <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.92)' }}>
            Welcome back, {firstName}.
          </p>
        </div>

        <div className="mt-4">
          <QuickActions onAction={(key) => navigate(ROUTES[key] || '/m-care/live')} />
        </div>

        <div className="mt-3">
          <PlusComposer
            onSend={() => navigate('/m-care/live')}
            onAttach={() => navigate('/m-care/live')}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[430px]">
        <PlusBottomNav
          onNavigate={(key) => {
            if (key === 'msafe') return;
            navigate(ROUTES[key] || '/');
          }}
        />
      </div>
    </div>
  );
}