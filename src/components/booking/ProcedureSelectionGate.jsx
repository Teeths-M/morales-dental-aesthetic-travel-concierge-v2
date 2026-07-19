import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Scan, Activity, HelpCircle, Stethoscope, ShieldCheck } from 'lucide-react';
import { useCart } from '@/context/CartContext';

const GOLD  = '#D4AF37';
const _DARK  = '#060B16';
const CARD  = '#0C1A1D';
const BORDER = '#2A3F4A';

/* Each card used to carry a hardcoded "Save up to $12K / $20K / $8K" in its own
 * accent colour. Those figures were string literals — not derived from any
 * pricing data, not true of any particular patient, and impossible to stand
 * behind if someone asked how we got them.
 *
 * They also framed the wrong product. Eight coloured savings badges is what a
 * discount marketplace looks like; Morales coordinates and protects a medical
 * journey. Opening on price sets up the whole relationship as a bargain hunt,
 * on the one screen where a patient is deciding whether to trust us with
 * surgery abroad.
 *
 * Real prices come from the doctor quotes the patient receives later, where
 * they are specific, sourced, and honest. Nothing is shown here that we cannot
 * back. Do not reintroduce an estimate without a computed source.
 */
/* These cards used to be labelled with emoji: 🎯 for liposuction, 🌟 for a
 * tummy tuck, 💫 for All-on-4. Beyond rendering as a different picture on every
 * operating system, they carried no meaning — a target and two sparkles tell a
 * patient nothing about which surgery is which, so the icon was pure decoration
 * on a screen where someone is choosing an operation. Where a mark can't be
 * meaningful, a consistent one is more honest than a decorative one: these are
 * neutral strokes that group the two families (dental vs body) and let the
 * procedure name do the work.
 */
const QUICK_PROCEDURES = [
  { Icon: Smile,     name: 'Dental Implants',     procedure_enum: 'dental_implants' },
  { Icon: Smile,     name: 'Porcelain Veneers',   procedure_enum: 'porcelain_veneers' },
  { Icon: Scan,      name: 'Rhinoplasty',         procedure_enum: 'rhinoplasty' },
  { Icon: Smile,     name: 'All-on-4 Implants',   procedure_enum: 'all_on_4' },
  { Icon: Activity,  name: 'Liposuction',         procedure_enum: 'liposuction' },
  { Icon: Activity,  name: 'Tummy Tuck',          procedure_enum: 'tummy_tuck' },
  { Icon: Smile,     name: 'Smile Makeover',      procedure_enum: 'smile_makeover' },
  { Icon: HelpCircle,name: 'Other / Not sure yet',procedure_enum: 'other', hint: "We'll help you choose" },
];

export default function ProcedureSelectionGate({ children }) {
  const { items, addItem } = useCart();
  const hasSelectedProcedure = items && items.length > 0;

  const handleSelect = (proc) => {
    addItem({ name: proc.name, procedure_enum: proc.procedure_enum, quantity: 1 });
  };

  return (
    <>
      {children}

      <AnimatePresence>
        {!hasSelectedProcedure && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            /* zIndex above the floating guide orb (9000/9001), below the
               first-time onboarding overlay (9999). This gate blocks the whole
               screen until a procedure is chosen, but sat at zIndex 50 — so the
               orb floated on top of it and covered the "Smile Makeover" card on
               a phone. Nothing should overlap a decision the user cannot skip. */
            style={{ position: 'fixed', inset: 0, zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,11,22,0.92)', backdropFilter: 'blur(8px)', padding: 20, overflowY: 'auto' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{ maxWidth: 560, width: '100%', fontFamily: '"SF Pro Display", system-ui, sans-serif' }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Stethoscope size={24} strokeWidth={1.5} style={{ color: GOLD }} />
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                  What would you like to explore?
                </h2>
                {/* Framing. This screen used to sell: coloured savings badges,
                    "Free consultation", "No commitment". The savings went
                    earlier; the rest goes now.

                    A patient choosing surgery abroad is not shopping, and the
                    thing that makes M worth choosing over a search engine isn't
                    price — it's that we check the combination before anyone
                    books it and we only list doctors whose licence we've
                    confirmed. Both are true (getViolations runs on every cart
                    and hard-blocks RED; the directories now gate on
                    isDoctorVerified), so we can lead with them. */}
                <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  Pick what you&rsquo;re considering — you can change it at any time.
                  We check every combination for safety before anything is booked.
                </p>
              </div>

              {/* Procedure grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
                {QUICK_PROCEDURES.map((proc) => (
                  <motion.button
                    key={proc.procedure_enum}
                    onClick={() => handleSelect(proc)}
                    whileHover={{ scale: 1.02, y: -2, borderColor: `${GOLD}60` }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: '16px 16px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                      background: CARD, border: `1px solid ${BORDER}`,
                    }}
                  >
                    <proc.Icon size={20} strokeWidth={1.75} style={{ color: GOLD, marginBottom: 8, display: 'block' }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{proc.name}</p>
                    {/* Only the "not sure" card carries a second line now. The
                        rest need no subtitle — a procedure name is the whole
                        decision at this point. */}
                    {proc.hint && (
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{proc.hint}</p>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Trust footnote */}
              {/* This read "No commitment required · Change anytime · Free
                  consultation". The consultation is NOT free — it is $49,
                  charged in ConsultationFeeModal. It is fully credited against
                  the package, which is a genuinely good deal, but "free" is not
                  what it is, and this was the first screen a patient read
                  before deciding to trust us with surgery abroad.

                  State the real number. A patient who learns the price here and
                  is told plainly that it comes back is in a better position
                  than one who meets an unexpected $49 three steps later. */}
              <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.28)', margin: 0, flexWrap: 'wrap' }}>
                <ShieldCheck size={12} strokeWidth={2} />
                $49 to start, credited to your package · Change anytime
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
