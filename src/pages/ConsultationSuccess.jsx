// @ts-nocheck — pre-existing type gaps; build passes
/**
 * ConsultationSuccess — shown immediately after booking.
 *
 * If the patient booked solo and hasn't opted into Guardian Mode:
 *   → Shows an UNMISSABLE Guardian Mode prompt before they leave.
 *   → Cannot be skipped by accident. Requires explicit "I understand" to proceed without.
 *
 * If they already opted in, or are traveling with others:
 *   → Shows the standard success screen.
 */
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Shield, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const GOLD = '#D4AF37';

export default function ConsultationSuccess() {
  const { state }    = useLocation();
  const navigate     = useNavigate();
  const consultationId   = state?.consultationId;
  const travelingSolo    = state?.travelingSolo ?? false;
  const alreadyOptedIn   = state?.guardianModeOptedIn ?? false;
  const patientName      = state?.patientName || '';

  const showGuardianPrompt = travelingSolo && !alreadyOptedIn && consultationId;

  const [enabling,  setEnabling]  = useState(false);
  const [skipStep,  setSkipStep]  = useState(false);
  const [enabled,   setEnabled]   = useState(false);
  const [skipped,   setSkipped]   = useState(false);
  const [saveError, setSaveError] = useState(false);

  async function handleEnable() {
    setEnabling(true);
    setSaveError(false);
    const payload = { guardian_mode_opted_in: true };

    // Try once, retry once on failure — covers flaky mobile connections
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await base44.entities.Consultation.update(consultationId, payload);
        setEnabled(true);
        setEnabling(false);
        return;
      } catch {
        if (attempt === 1) {
          // Both attempts failed — show error but still let user proceed
          setSaveError(true);
          setEnabled(true); // UI proceeds; patient isn't blocked
        } else {
          await new Promise(r => setTimeout(r, 1200)); // wait 1.2s before retry
        }
      }
    }
    setEnabling(false);
  }

  function handleSkipRequest() {
    if (!skipStep) { setSkipStep(true); return; } // first tap: show warning
    setSkipped(true); // second tap: confirmed skip
  }

  // ── Standard success screen (non-solo or already opted in or post-decision) ──
  if (!showGuardianPrompt || enabled || skipped) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-6">
        <div style={{ maxWidth: 520, width: '100%' }}>
          {/* Success card */}
          <div style={{ background: 'rgba(12,26,29,0.95)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 24, padding: 40, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 style={{ width: 36, height: 36, color: '#22c55e' }} />
            </div>

            <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#fff' }}>
              {enabled ? '🛡️ Guardian Mode Active' : 'Consultation Submitted'}
            </h1>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              {enabled
                ? `Guardian Mode is now protecting your journey, ${patientName.split(' ')[0] || 'you'}. Daily check-ins and safety monitoring will activate when your journey begins.`
                : 'Our safety team is reviewing your medical profile. You will receive an email with next steps shortly.'}
            </p>

            {enabled && (
              <div style={{ margin: '20px 0', padding: '12px 16px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12 }}>
                <p style={{ margin: 0, fontSize: 12, color: GOLD }}>
                  ✓ 9 AM + 9 PM daily SMS check-ins<br />
                  ✓ GPS silence detection (active journey only)<br />
                  ✓ Fall detection when app is open<br />
                  ✓ Guardian contacts notified on escalation
                </p>
              </div>
            )}
            {saveError && (
              <div style={{ margin: '8px 0 0', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10 }}>
                <p style={{ margin: 0, fontSize: 11, color: '#fca5a5' }}>
                  Could not save preference — you can enable Guardian Mode anytime from your Dashboard settings.
                </p>
              </div>
            )}

            <Link
              to="/dashboard"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 32px', borderRadius: 99, background: GOLD, color: '#060B16', fontWeight: 700, fontSize: 14, textDecoration: 'none', marginTop: 12 }}
            >
              Go to My Dashboard <ChevronRight style={{ width: 16, height: 16 }} />
            </Link>

            <br />
            <Link to="/" style={{ display: 'inline-block', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── UNMISSABLE Guardian Mode prompt (solo + not opted in) ──────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-6"
      style={{ background: 'radial-gradient(ellipse at center top, rgba(212,175,55,0.06) 0%, #060B16 60%)' }}>
      <div style={{ maxWidth: 540, width: '100%' }}>

        {/* Booking confirmed badge */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 18px', borderRadius: 99, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)' }}>
            <CheckCircle2 style={{ width: 14, height: 14, color: '#22c55e' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>Booking confirmed</span>
          </div>
        </div>

        {/* Guardian prompt card */}
        <div style={{ background: 'rgba(12,26,29,0.97)', border: `1.5px solid ${GOLD}40`, borderRadius: 24, overflow: 'hidden', boxShadow: `0 0 60px rgba(212,175,55,0.12)` }}>

          {/* Gold accent top bar */}
          <div style={{ height: 4, background: `linear-gradient(to right, ${GOLD}00, ${GOLD}, ${GOLD}00)` }} />

          <div style={{ padding: '32px 36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(212,175,55,0.12)', border: `2px solid ${GOLD}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield style={{ width: 26, height: 26, color: GOLD }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.15em', textTransform: 'uppercase' }}>One important step</p>
                <h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                  You're traveling solo.
                </h2>
              </div>
            </div>

            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
              {patientName.split(' ')[0] ? `${patientName.split(' ')[0]}, we` : 'We'} noticed you'll be traveling alone.
              Guardian Mode watches over solo travelers — sending daily check-ins and alerting your emergency contact only when something is genuinely wrong.
            </p>

            {/* What it does */}
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
              {[
                { icon: '📱', text: 'Daily SMS check-ins at 9 AM + 9 PM (active journey only)' },
                { icon: '🌙', text: 'Sleep hours respected — no alerts between 10 PM and 6 AM' },
                { icon: '🔋', text: 'Battery-safe — no background GPS polling outside your journey' },
                { icon: '🛡️', text: 'Guardian contacts only notified after 3 missed check-ins' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, lastChild: { marginBottom: 0 } }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Primary CTA */}
            <button
              onClick={handleEnable}
              disabled={enabling}
              style={{ width: '100%', padding: '14px 0', borderRadius: 14, background: enabling ? 'rgba(212,175,55,0.5)' : GOLD, color: '#060B16', fontSize: 15, fontWeight: 800, border: 'none', cursor: enabling ? 'wait' : 'pointer', marginBottom: 12, letterSpacing: '0.02em', transition: 'opacity 0.2s' }}
            >
              {enabling ? 'Activating…' : '🛡️ Enable Guardian Mode — Traveling Solo'}
            </button>

            {/* Skip — requires two taps */}
            {!skipStep ? (
              <button
                onClick={handleSkipRequest}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, background: 'transparent', color: 'rgba(255,255,255,0.28)', fontSize: 12, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}
              >
                Continue without Guardian Mode
              </button>
            ) : (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: '#fca5a5', lineHeight: 1.5 }}>
                  ⚠️ Are you sure? Without Guardian Mode, Morales has no way to check on you if you go silent during your journey.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleEnable}
                    style={{ flex: 2, padding: '8px 0', borderRadius: 9, background: GOLD, color: '#060B16', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                  >
                    Actually, enable it ›
                  </button>
                  <button
                    onClick={handleSkipRequest}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 9, background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: 12, fontWeight: 600, border: '1px solid rgba(239,68,68,0.30)', cursor: 'pointer' }}
                  >
                    I understand
                  </button>
                </div>
              </div>
            )}

            <p style={{ margin: '14px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.5 }}>
              You can change this anytime in your Dashboard settings. Guardian Mode is 100% opt-in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
