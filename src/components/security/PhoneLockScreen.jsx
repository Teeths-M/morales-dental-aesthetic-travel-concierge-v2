import React, { useEffect, useRef, useState } from 'react';
import { Fingerprint, Loader2, LifeBuoy } from 'lucide-react';
import SOSDropdown from '@/components/emergency/SOSDropdown';
import { CONTACT_EMAIL } from '@/lib/constants';
import { phoneLockErrorMessage, unlockPhoneLock } from '@/lib/phoneLock';
import { signOutAndClear } from '@/lib/deviceDataCleanup';
import { BORDER_DARK, CARD_BG, DARK, GOLD, TEXT_LIGHT, TEXT_MUTED_DARK } from '@/components/mcare/panelPalette';

/**
 * PhoneLockScreen — covers M-Care while the Face ID lock is on (useAppLock).
 *
 * Help never locks: SOS and the emergency page stay one tap away here, and a check-in reminder still shows on top
 * of this screen (FloatingCheckInAlert sits above it, and marking safe still needs the check-in code). Everything
 * else in the app stays mounted underneath, so check-ins, alerts and background safety keep running.
 *
 * `checking` covers the screen for the moment the app is still asking whether a just-signed-in account has the lock.
 */
export default function PhoneLockScreen({ user, credentialIds = [], checking = false, onUnlocked }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const buttonRef = useRef(null);

  useEffect(() => { if (!checking) buttonRef.current?.focus(); }, [checking]);

  const unlock = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await unlockPhoneLock({ credentialIds });
      if (result.unlocked) onUnlocked?.();
      else setMessage("That didn't unlock M-Care. Try again.");
    } catch (error) {
      setMessage(phoneLockErrorMessage(error, "That didn't unlock M-Care. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-lock-title"
      data-testid="phone-lock-screen"
      style={{
        position: 'fixed', inset: 0, zIndex: 9989, background: DARK, color: TEXT_LIGHT,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto',
        padding: 'max(24px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
        <img src="/morales-m-mark.png" alt="" width={56} height={56} style={{ margin: '0 auto', objectFit: 'contain' }} />

        {checking ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }} aria-live="polite">
            <Loader2 className="animate-spin" size="22" color={GOLD} aria-hidden="true" />
            <p id="phone-lock-title" style={{ margin: 0, fontSize: 15, color: TEXT_MUTED_DARK }}>Opening M-Care…</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 id="phone-lock-title" style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
                M-Care is locked
              </h1>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: TEXT_MUTED_DARK }}>
                Unlock with Face ID or your fingerprint to see your trip, messages and documents.
              </p>
            </div>

            <button
              ref={buttonRef}
              type="button"
              onClick={unlock}
              disabled={busy}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52,
                borderRadius: 999, border: 'none', cursor: busy ? 'default' : 'pointer',
                background: GOLD, color: DARK, fontSize: 16, fontWeight: 600, opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? <Loader2 className="animate-spin" size="20" aria-hidden="true" /> : <Fingerprint size="20" aria-hidden="true" />}
              {busy ? 'Checking…' : 'Unlock'}
            </button>
            {message && (
              <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#FCA5A5' }}>{message}</p>
            )}
          </>
        )}

        <section
          aria-labelledby="phone-lock-help"
          style={{ background: CARD_BG, border: `1px solid ${BORDER_DARK}`, borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LifeBuoy size="16" color={GOLD} aria-hidden="true" />
            <h2 id="phone-lock-help" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Need help now?</h2>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: TEXT_MUTED_DARK }}>
            These always work, even while M-Care is locked.
          </p>
          <SOSDropdown patientEmail={user?.email} patientName={user?.full_name} />
          <a
            href="/emergency"
            style={{ fontSize: 13, fontWeight: 600, color: GOLD, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Open the emergency page
          </a>
        </section>

        {!checking && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: TEXT_MUTED_DARK }}>
              Face ID or your fingerprint no longer works on this phone? Email {CONTACT_EMAIL} and our care team can
              reset the lock once they've checked it's you.
            </p>
            <button
              type="button"
              onClick={() => signOutAndClear('/')}
              style={{ background: 'none', border: 'none', color: TEXT_MUTED_DARK, fontSize: 12, textDecoration: 'underline', cursor: 'pointer', minHeight: 40 }}
            >
              Sign out of this phone
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
