import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { CALM } from '@/lib/brandTokens';
import { travelReadiness, getPassportHelpLinks } from '@/lib/travelReadiness';

const CARD = CALM.surface;
const BORDER = CALM.border;

/**
 * Shown the moment the passport expiry date is known — right after that
 * question, not deferred to the final review — so a passport that won't
 * make the 6-month rule is never a surprise ten questions later. Modeled on
 * VisaReadinessStep.jsx: same card shell, one always-enabled "Continue"
 * button, no back button. Advisory only — never blocks progress.
 *
 * Unlike the visa check, `travelReadiness()` is pure/synchronous — no live
 * lookup involved — so this needs no hook of its own.
 */
export default function PassportReadinessStep({ passportExpiry, travelDate, nationality, onContinue }) {
  const { issues } = travelReadiness({ passportExpiry, travelDate });
  const passportIssue = issues.find((i) => i.code === 'passport_expired' || i.code === 'passport_expiring');
  const { renewalUrl, videoSearchUrl } = passportIssue ? getPassportHelpLinks(nationality) : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '32px 28px',
      }}
    >
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: CALM.text }}>
        Quick passport check
      </h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: CALM.textSoft, lineHeight: 1.5 }}>
        Most countries require at least 6 months of passport validity on arrival — let's make sure yours clears that.
      </p>

      <div
        style={{
          background: CALM.surface, border: `1px solid ${CALM.border}`, borderRadius: 14,
          padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        {passportIssue ? (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: passportIssue.severity === 'blocking' ? '#dc2626' : '#b45309', flexShrink: 0, marginTop: 2 }}
                aria-hidden="true"
              />
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: CALM.text }}>{passportIssue.title}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.55, color: CALM.textSoft }}>{passportIssue.detail}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 2 }}>
              <a href={renewalUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: CALM.action, textDecoration: 'none' }}>
                Renew your passport →
              </a>
              <a href={videoSearchUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: CALM.action, textDecoration: 'none' }}>
                See how it works →
              </a>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: '#059669', flexShrink: 0 }} aria-hidden="true" />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: CALM.text }}>Your passport is valid for this trip.</p>
          </div>
        )}
        <p style={{ margin: '2px 0 0', fontSize: 11, color: CALM.textFaint }}>
          Passport rules vary by destination — always confirm with the embassy before you travel. This never affects your booking.
        </p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        style={{
          marginTop: 20,
          width: '100%',
          padding: '13px 20px',
          borderRadius: 999,
          cursor: 'pointer',
          background: CALM.action,
          border: 'none',
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        Continue
      </button>
    </motion.div>
  );
}
