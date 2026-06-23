import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Trash2, Stethoscope, ChevronDown, ChevronUp, Plus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import CompatibilityFirewall from '@/components/procedures/CompatibilityFirewall';

const CATEGORY_ICONS = {
  dental: '🦷', cosmetic: '✨', bariatric: '⚖️', fertility: '🌸',
  oncology: '🎗️', orthopedic: '🦴', other: '🏥',
};

function getCategoryIcon(name = '') {
  const n = name.toLowerCase();
  if (n.includes('dental') || n.includes('implant') || n.includes('veneer') || n.includes('smile') || n.includes('teeth') || n.includes('bone regen')) return CATEGORY_ICONS.dental;
  if (n.includes('gastric') || n.includes('bariatric') || n.includes('sleeve') || n.includes('bypass')) return CATEGORY_ICONS.bariatric;
  if (n.includes('ivf') || n.includes('egg') || n.includes('gynec') || n.includes('fertility')) return CATEGORY_ICONS.fertility;
  if (n.includes('oncol') || n.includes('tumor') || n.includes('cancer')) return CATEGORY_ICONS.oncology;
  if (n.includes('joint') || n.includes('spine') || n.includes('ortho') || n.includes('fracture') || n.includes('arthro')) return CATEGORY_ICONS.orthopedic;
  if (n.includes('rhinoplasty') || n.includes('breast') || n.includes('lipo') || n.includes('tummy') || n.includes('facelift') || n.includes('brow') || n.includes('eyelid') || n.includes('ear') || n.includes('thigh') || n.includes('laser') || n.includes('mole') || n.includes('lipoma')) return CATEGORY_ICONS.cosmetic;
  return CATEGORY_ICONS.other;
}

export default function ConsultationMedicalCart() {
  const { items, removeItem, getTotalCount } = useCart();
  const [collapsed, setCollapsed] = useState(false);
  const totalCount = getTotalCount();

  return (
    <div className="bg-white/5 border border-white/15 rounded-2xl shadow-sm overflow-hidden backdrop-blur-xl">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-white/10 text-white hover:bg-white/15 transition-all border-b border-white/10"
      >
        <div className="flex items-center gap-2.5">
          <Stethoscope className="w-4 h-4 text-white/70" />
          <span className="text-sm font-semibold tracking-wide">Selected Procedures</span>
          {totalCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-400 text-slate-900 text-[10px] font-semibold">
              {totalCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalCount === 0 && <span className="text-[11px] text-white/40">None selected</span>}
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-white/50" />
            : <ChevronUp className="w-4 h-4 text-white/50" />
          }
        </div>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {items.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                  <Stethoscope className="w-5 h-5 text-white/40" />
                </div>
                <p className="text-sm text-white/70 font-medium mb-1">No procedures selected</p>
                <p className="text-xs text-white/50 mb-3">Add procedures from our services catalog before continuing.</p>
                <Link
                  to="/procedures"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" /> Browse Procedures
                </Link>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                <AnimatePresence>
                  {items.map((item, idx) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 transition-colors group"
                    >
                      <span className="text-lg flex-shrink-0">{getCategoryIcon(item.name)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                        {item.category && (
                          <p className="text-[10px] text-white/50 uppercase tracking-wide font-medium">{item.category}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.name)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-red-300 hover:bg-red-400/20 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* SAFE-T4LIFE™ Compact Firewall */}
                {items.length >= 2 && (
                  <div className="pt-1">
                    <CompatibilityFirewall items={items} compact={true} />
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 px-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-white/60 font-medium">
                      {items.length} procedure{items.length !== 1 ? 's' : ''} for consultation
                    </span>
                  </div>
                  <Link
                    to="/procedures"
                    className="text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add more
                  </Link>
                </div>
              </div>
            )}

            {/* Missing procedures warning */}
            {items.length === 0 && (
              <div className="mx-3 mb-3 flex items-start gap-2 bg-amber-400/10 border border-amber-400/30 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-300 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-200 leading-relaxed">
                  You must select at least one procedure to proceed with your consultation.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}