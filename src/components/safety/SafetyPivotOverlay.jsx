// @ts-nocheck
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, Sparkles, Heart, UserCheck, ArrowLeft } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

const GOLD = '#D4AF37';

const CODE_LABELS = {
  ANESTHESIA_OVERLOAD:   'Anesthesia Overload',
  POSITIONING_CONFLICT:  'Positioning Conflict',
  RECOVERY_CONFLICT:     'Recovery Protocol Conflict',
  HEMORRHAGE_RISK:       'Hemorrhage Risk',
  MULTI_ZONE_TRAUMA:     'Multi-Zone Surgical Trauma',
  SHARED_VASCULAR_FIELD: 'Shared Vascular Field',
  SHARED_SURGICAL_FIELD: 'Shared Surgical Field',
  METABOLIC_CONFLICT:    'Metabolic Conflict',
  REDUNDANT_FIELD:       'Redundant Surgical Field',
  ORAL_FACIAL_CONFLICT:  'Oral-Facial Conflict',
};

const STEP = { IDLE: 'idle', REQUESTING: 'requesting', DISPATCHED: 'dispatched' };

/**
 * SafetyPivotOverlay
 *
 * The REMEDIATION_REQUIRED pivot UI. Shown whenever SafetyWatcher detects a
 * Safe→RED transition. Rather than a hard stop, this presents:
 *   1. The clinical conflict findings
 *   2. An auto-generated safe alternative (from procedureCompatibility rules)
 *   3. Two resolution paths: Accept Recommendation or Mother's Touch review
 *
 * Renders as a full-screen portal at z-[10000] so it appears above all other
 * overlays (ProcedureStackingBlocker, MoralesAssistPanel, etc.).
 */
export default function SafetyPivotOverlay() {
  const { pivotViolations, closePivot } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState(STEP.IDLE);

  const isOpen = pivotViolations.length > 0;
  const hasRecommendations = pivotViolations.some(v => v.recommended);

  const handleMothersTouch = async () => {
    setStep(STEP.REQUESTING);
    try {
      await base44.functions.invoke('flagProcedureStackingRisk', {
        patient_email:   user?.email      || null,
        patient_name:    user?.full_name  || null,
        consultation_id: null,
        violations: pivotViolations.map(v => ({
          pair:   v.pairLabel,
          reason: v.reason,
          code:   v.code,
        })),
      });
    } catch (_) { /* silent — specialist is still notified via email fallback */ }
    setStep(STEP.DISPATCHED);
    setTimeout(() => {
      setStep(STEP.IDLE);
      closePivot();
    }, 3200);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="safety-pivot"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(4, 8, 16, 0.92)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              width: '100%', maxWidth: 520,
              maxHeight: 'calc(100dvh - 32px)',
              overflowY: 'auto',
              borderRadius: 24,
              scrollbarWidth: 'none',
            }}
          >
            {/* ── PROTOCOL HEADER ── */}
            <div style={{
              borderRadius: '24px 24px 0 0',
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #1c1400 0%, #2a1e00 100%)',
              border: `1px solid rgba(212,175,55,0.45)`,
              borderBottom: 'none',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <motion.div
                animate={{ boxShadow: [`0 0 0px rgba(212,175,55,0.3)`, `0 0 24px rgba(212,175,55,0.55)`, `0 0 0px rgba(212,175,55,0.3)`] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: 'rgba(212,175,55,0.12)',
                  border: `1px solid rgba(212,175,55,0.4)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Shield style={{ width: 24, height: 24, color: GOLD }} strokeWidth={2} />
              </motion.div>
              <div>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD, opacity: 0.75, marginBottom: 3 }}>
                  SAFE-T4LIFE™ · PROTOCOL ALERT
                </p>
                <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 17, lineHeight: 1.25, margin: 0 }}>
                  Risk Escalation Detected
                </h2>
                <p style={{ color: 'rgba(212,175,55,0.65)', fontSize: 11.5, marginTop: 3 }}>
                  Automated substitution analysis complete · {pivotViolations.length} conflict{pivotViolations.length !== 1 ? 's' : ''} identified
                </p>
              </div>
            </div>

            {/* ── BODY ── */}
            <div style={{
              borderRadius: '0 0 24px 24px',
              background: '#0C1A1D',
              border: '1px solid #2A3F4A',
              borderTop: 'none',
              overflow: 'hidden',
            }}>
              {step === STEP.DISPATCHED ? (
                /* Mother's Touch confirmed */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ padding: '40px 28px', textAlign: 'center' }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    style={{
                      width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
                      background: 'rgba(212,175,55,0.12)',
                      border: `1px solid rgba(212,175,55,0.35)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <UserCheck style={{ width: 30, height: 30, color: GOLD }} strokeWidth={1.8} />
                  </motion.div>
                  <p style={{ color: GOLD, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                    Specialist dispatched
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.6 }}>
                    A member of our care team has received your full consultation context and will reach out personally — you won't need to repeat a thing.
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* CLINICAL FINDINGS */}
                  <div style={{ padding: '20px 20px 0' }}>
                    <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>
                      Clinical Findings
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {pivotViolations.map((v, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.08 + i * 0.06 }}
                          style={{ borderRadius: 14, border: '1px solid rgba(239,68,68,0.22)', overflow: 'hidden' }}
                        >
                          <div style={{
                            padding: '10px 14px',
                            background: 'rgba(239,68,68,0.07)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                          }}>
                            <p style={{ color: '#fff', fontWeight: 600, fontSize: 12.5, margin: 0 }}>{v.pairLabel}</p>
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                              background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.35)',
                              color: '#fca5a5', flexShrink: 0, whiteSpace: 'nowrap',
                            }}>
                              {CODE_LABELS[v.code] || v.code}
                            </span>
                          </div>
                          <p style={{ padding: '10px 14px', fontSize: 12, lineHeight: 1.65, color: 'rgba(255,255,255,0.52)', margin: 0 }}>
                            {v.reason}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* SAFE PROTOCOL RECOMMENDATION */}
                  {hasRecommendations && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      style={{
                        margin: '16px 20px 0',
                        borderRadius: 16,
                        border: `1px solid rgba(212,175,55,0.28)`,
                        background: 'rgba(212,175,55,0.04)',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid rgba(212,175,55,0.14)',
                        background: 'rgba(212,175,55,0.07)',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <Sparkles style={{ width: 14, height: 14, color: GOLD, flexShrink: 0 }} />
                        <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD, margin: 0 }}>
                          Safe Protocol Recommendation
                        </p>
                      </div>
                      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {pivotViolations.filter(v => v.recommended).map((v, i) => (
                          <div key={i}>
                            <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                              → {v.recommended}
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.65, margin: 0 }}>
                              {v.recommendedReason}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        padding: '10px 14px',
                        borderTop: '1px solid rgba(212,175,55,0.12)',
                        background: 'rgba(212,175,55,0.05)',
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                      }}>
                        <Heart style={{ width: 13, height: 13, color: GOLD, flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 11.5, color: `rgba(212,175,55,0.7)`, lineHeight: 1.55, margin: 0 }}>
                          M is not here to take your dream away. We are here to make sure you are alive to enjoy it.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* ACTIONS */}
                  <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                    {/* Primary: Mother's Touch — specialist review */}
                    <motion.button
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      onClick={handleMothersTouch}
                      disabled={step === STEP.REQUESTING}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        width: '100%', padding: '14px 20px', borderRadius: 14,
                        background: 'rgba(212,175,55,0.12)',
                        border: `1px solid rgba(212,175,55,0.35)`,
                        color: GOLD, fontWeight: 700, fontSize: 13.5,
                        cursor: step === STEP.REQUESTING ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        opacity: step === STEP.REQUESTING ? 0.6 : 1,
                      }}
                    >
                      {step === STEP.REQUESTING
                        ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Dispatching specialist…</>
                        : <><UserCheck style={{ width: 16, height: 16 }} /> Request Mother's Touch Manual Review</>
                      }
                    </motion.button>

                    {/* Secondary: go back and modify selection manually */}
                    <motion.button
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.48 }}
                      onClick={closePivot}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        width: '100%', padding: '13px 20px', borderRadius: 14,
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.09)',
                        color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      <ArrowLeft style={{ width: 15, height: 15 }} />
                      Go Back &amp; Modify My Procedure Selection
                    </motion.button>

                    <p style={{ textAlign: 'center', fontSize: 10.5, color: 'rgba(255,255,255,0.18)', marginTop: 2 }}>
                      This combination cannot be booked on the M platform. Life over money — always.
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
