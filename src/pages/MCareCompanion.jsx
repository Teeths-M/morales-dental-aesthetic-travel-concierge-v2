import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { C } from '@/components/mcare/companion/companionTheme';
import GoldenAura from '@/components/mcare/companion/GoldenAura';
import GoldenRing from '@/components/mcare/companion/GoldenRing';
import SafetyAlertCard from '@/components/mcare/companion/SafetyAlertCard';
import SavedPlacesCard from '@/components/mcare/companion/SavedPlacesCard';
import CompanionControls from '@/components/mcare/companion/CompanionControls';
import PreviewBadge, { PreviewNoticeSheet } from '@/components/mcare/companion/PreviewNoticeSheet';

const COAST_IMAGE =
  'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/4cf3d9907_generated_image.png';

// The supplied reference copy, reproduced exactly. Everything here is artwork:
// the badge and the sheet beside it are what keep it from reading as live
// safety information, and the live screen is one tap away.
const PREVIEW = {
  welcome: 'Welcome to Brazil! 🇧🇷',
  intro: "I've saved your places, and I'm monitoring local safety in real-time. Here's what you should know:",
  alertTitle: 'Safety Alert',
  alertBody: 'Increased police activity reported near Copacabana Beach tonight.',
  alertTail: 'Consider alternative routes.',
  placesTitle: 'Your Saved Places',
  placesSubtitle: '4 destinations • 2 areas to avoid',
  status: "I'll keep an eye on your surroundings and alert you if anything changes. 💛",
};

/**
 * MCareCompanion (/m-care): the golden-ring companion screen.
 *
 * Interaction — voice, text, history — is handled by the existing M-Care app,
 * which this screen opens; nothing is re-implemented here. The ring is drawn at
 * idle because no microphone or playback is active on this screen, and it says
 * nothing about monitoring, which is a separate, server-confirmed fact.
 */
export default function MCareCompanion() {
  const navigate = useNavigate();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { title: document.title, html: html.style.backgroundColor, body: body.style.backgroundColor };
    document.title = 'M-Care';
    html.style.backgroundColor = C.bgDeep;
    body.style.backgroundColor = C.bgDeep;
    return () => {
      document.title = prev.title;
      html.style.backgroundColor = prev.html;
      body.style.backgroundColor = prev.body;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  const openLive = () => navigate('/m-care/live');
  const openHistory = () => navigate('/m-care/history');

  return (
    <GoldenAura reduced={reduced}>
      <div
        style={{
          fontFamily: C.font,
          color: C.text,
          background: 'transparent',
        }}
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-5"
      >
        <div style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))' }} />

        {/* Wordmark + the honest label for what this screen is */}
        <div className="flex flex-col items-center gap-3">
          <h1
            style={{
              margin: 0,
              fontFamily: C.fontDisplay,
              fontSize: 13,
              fontWeight: 300,
              letterSpacing: '0.42em',
              textIndent: '0.42em',
              color: 'rgba(255,255,255,0.94)',
            }}
          >
            M-CARE
          </h1>
          <PreviewBadge onClick={() => setNoticeOpen(true)} />
        </div>

        {/* The ring */}
        <div className="mt-1 flex justify-center">
          <GoldenRing state="idle" size={232} reduced={reduced} />
        </div>

        {/* Greeting */}
        <div className="-mt-1 text-center">
          <h2
            style={{
              margin: 0,
              fontFamily: C.fontDisplay,
              fontSize: 26,
              fontWeight: 600,
              lineHeight: 1.22,
              letterSpacing: '-0.022em',
              color: C.text,
            }}
          >
            {PREVIEW.welcome}
          </h2>
          <p
            style={{
              margin: '9px auto 0',
              maxWidth: 330,
              fontSize: 13,
              lineHeight: 1.62,
              color: C.textMuted,
            }}
          >
            {PREVIEW.intro}
          </p>
        </div>

        {/* Cards */}
        <div className="mt-5 flex flex-col gap-2.5">
          <SafetyAlertCard
            title={PREVIEW.alertTitle}
            body={PREVIEW.alertBody}
            tail={PREVIEW.alertTail}
            imageUrl={COAST_IMAGE}
            onOpen={() => setNoticeOpen(true)}
          />
          <SavedPlacesCard
            title={PREVIEW.placesTitle}
            subtitle={PREVIEW.placesSubtitle}
            onOpen={() => setNoticeOpen(true)}
          />
        </div>

        <p
          style={{
            margin: '16px auto 0',
            maxWidth: 320,
            textAlign: 'center',
            fontSize: 12.5,
            lineHeight: 1.6,
            color: C.textMuted,
          }}
        >
          {PREVIEW.status}
        </p>

        {/* Controls, held at the bottom of the screen */}
        <div
          className="mt-auto"
          style={{ paddingTop: 22, paddingBottom: 'calc(18px + env(safe-area-inset-bottom))' }}
        >
          <CompanionControls
            onSpeak={openLive}
            onHistory={openHistory}
            onType={openLive}
            reduced={reduced}
          />
        </div>
      </div>

      <PreviewNoticeSheet
        open={noticeOpen}
        onClose={() => setNoticeOpen(false)}
        onOpenLive={openLive}
        onOpenHistory={openHistory}
      />
    </GoldenAura>
  );
}