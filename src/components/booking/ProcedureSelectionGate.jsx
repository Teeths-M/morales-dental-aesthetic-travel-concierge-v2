import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const CARD  = '#0C1A1D';
const BORDER = '#2A3F4A';

const QUICK_PROCEDURES = [
  { emoji: '🦷', name: 'Dental Implants',    procedure_enum: 'dental_implants',  save: 'Save up to $12K', color: '#22c55e' },
  { emoji: '✨', name: 'Porcelain Veneers',   procedure_enum: 'porcelain_veneers', save: 'Save up to $8K',  color: GOLD },
  { emoji: '👃', name: 'Rhinoplasty',         procedure_enum: 'rhinoplasty',       save: 'Save up to $6K',  color: '#a855f7' },
  { emoji: '💫', name: 'All-on-4 Implants',   procedure_enum: 'all_on_4',          save: 'Save up to $20K', color: '#60a5fa' },
  { emoji: '🎯', name: 'Liposuction',         procedure_enum: 'liposuction',       save: 'Save up to $8K',  color: '#f97316' },
  { emoji: '🌟', name: 'Tummy Tuck',          procedure_enum: 'tummy_tuck',        save: 'Save up to $10K', color: '#ec4899' },
  { emoji: '😊', name: 'Smile Makeover',      procedure_enum: 'smile_makeover',    save: 'Save up to $18K', color: GOLD },
  { emoji: '🔍', name: 'Other / Not sure yet', procedure_enum: 'other',            save: 'We will help you choose', color: 'rgba(255,255,255,0.5)' },
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
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,11,22,0.92)', backdropFilter: 'blur(8px)', padding: 20, overflowY: 'auto' }}
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
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>
                  🏥
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                  What would you like to explore?
                </h2>
                <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  Select a procedure to begin your consultation. You can always change it later.
                </p>
              </div>

              {/* Procedure grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
                {QUICK_PROCEDURES.map((proc) => (
                  <motion.button
                    key={proc.procedure_enum}
                    onClick={() => handleSelect(proc)}
                    whileHover={{ scale: 1.02, y: -2, borderColor: proc.color + '60' }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: '16px 16px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                      background: CARD, border: `1px solid ${BORDER}`,
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{proc.emoji}</div>
                    <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{proc.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: proc.color, fontWeight: 600 }}>{proc.save}</p>
                  </motion.button>
                ))}
              </div>

              {/* Trust footnote */}
              <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
                🔒 No commitment required · Change anytime · Free consultation
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
