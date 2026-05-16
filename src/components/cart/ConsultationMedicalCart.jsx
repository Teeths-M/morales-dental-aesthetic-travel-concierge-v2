import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Trash2, Stethoscope, ChevronDown, ChevronUp, Plus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function ConsultationMedicalCart() {
  const { items, removeItem } = useCart();
  const [collapsed, setCollapsed] = useState(false);

  if (items.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">No procedures selected</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Browse our{' '}
            <Link to="/procedures" className="underline font-semibold hover:text-amber-800 transition-colors">
              procedures catalogue
            </Link>{' '}
            and add treatments before submitting your consultation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-emerald-800 to-blue-900 text-white text-left"
      >
        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Consultation Procedure List</p>
          <p className="text-white/60 text-[10px] uppercase tracking-widest">
            {items.length} procedure{items.length !== 1 ? 's' : ''} selected for review
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-bold bg-white/20 border border-white/20 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-white/70" />
            : <ChevronUp className="w-4 h-4 text-white/70" />
          }
        </div>
      </button>

      {/* Items */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-slate-100">
              <AnimatePresence>
                {items.map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8, height: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-emerald-700">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                      {item.preparation_notes && (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.preparation_notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.name)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/procedures"
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add more procedures
              </Link>
              <p className="text-[10px] text-slate-400">Reviewed by your assigned doctor</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}