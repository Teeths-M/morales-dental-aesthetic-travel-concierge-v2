import React, { useEffect, useState } from 'react';
import { McareAvatar } from '@/components/mcare-agent/McareAvatar';
import { useMcarePreferences } from '@/hooks/useMcarePreferences';
import { shouldOfferWakePhrase, wakeOfferPatch, WAKE_OFFER_COPY } from '@/lib/wakePhraseOffer';
import { isConversationalModeSupported } from '@/lib/conversationalMode';
import { parseMcareCommand } from '@/lib/voiceCommands';
import WakePhraseOfferCard from './WakePhraseOfferCard';
import {
  GOLD, CARD_BG, BORDER_DARK, TEXT_LIGHT, LIGHT_CARD, LIGHT_BORDER, LIGHT_TEXT,
} from './panelPalette';

/**
 * MCareGreetingBlock — the first thing M-Care says, plus the one-time
 * "Hey M-Care" offer that sits under it.
 *
 * The greeting itself moved here unchanged from MCareOrb.jsx (which is at its
 * size budget); the offer is new. They belong in one file because they are one
 * moment: the traveler opens M-Care, M-Care introduces itself, and only on the
 * very first eligible opening does it also ask whether it may listen for its
 * own name.
 *
 * Whether to ask is decided entirely by shouldOfferWakePhrase — signed in, a
 * browser that can really run continuous recognition, and not already answered.
 * The answer is saved on the traveler's record, so the question is asked once
 * on every device, never again.
 */
export default function MCareGreetingBlock({ user, greeting, dark = false, desktop = false }) {
  const { prefs, update, saving } = useMcarePreferences();
  // Prefs hydrate after first paint. Without this the offer would flash for one
  // frame for someone who already answered "Not now" months ago.
  const [hydrated, setHydrated] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  useEffect(() => { setHydrated(true); }, [user?.id]);

  const offerVisible = hydrated && shouldOfferWakePhrase({
    user,
    prefs,
    supported: isConversationalModeSupported(),
  });

  const answer = (turnOn) => {
    update(wakeOfferPatch(turnOn));
    if (!turnOn) return;
    // The SAME confirmation the spoken command gives, read from voiceCommands
    // so the wording (including its own honest limits) can never drift.
    const confirm = parseMcareCommand('enable wake phrase')?.confirmText;
    if (confirm) setConfirmation(confirm);
  };

  const firstName = user?.full_name?.trim()?.split(/\s+/)[0];

  return (
    <>
      {/* A small decorative "•••" accent above the greeting, echoing the
          reference image's own mark — desktop-only. Purely visual. */}
      {desktop && (
        <div style={{ display: 'flex', gap: 5, paddingLeft: 42, marginBottom: -2 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, opacity: 0.4 + i * 0.15 }} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
        <McareAvatar size={32} />
        <p style={{ margin: 0, fontSize: 13, color: dark ? TEXT_LIGHT : LIGHT_TEXT, lineHeight: 1.55, background: dark ? CARD_BG : LIGHT_CARD, border: `1px solid ${dark ? BORDER_DARK : LIGHT_BORDER}`, borderRadius: 14, padding: '10px 12px', maxWidth: '85%', boxShadow: dark ? 'none' : '0 2px 8px rgba(15,23,42,0.05)' }}>
          {firstName ? `Welcome back, ${firstName}. ${greeting}` : greeting}
        </p>
      </div>

      {offerVisible && (
        <WakePhraseOfferCard dark={dark} busy={saving} onTurnOn={() => answer(true)} onDismiss={() => answer(false)} />
      )}

      {confirmation && (
        <div style={{ marginLeft: 42, maxWidth: 380 }}>
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: dark ? TEXT_LIGHT : LIGHT_TEXT }}>
            {confirmation}
          </p>
          <button
            type="button"
            onClick={() => setConfirmation(null)}
            style={{ marginTop: 4, border: 'none', background: 'transparent', padding: 0, fontSize: 11, fontWeight: 600, color: dark ? '#9CA3AF' : '#64748B', cursor: 'pointer' }}
          >
            {WAKE_OFFER_COPY.notNow === 'Not now' ? 'Got it' : 'Got it'}
          </button>
        </div>
      )}
    </>
  );
}