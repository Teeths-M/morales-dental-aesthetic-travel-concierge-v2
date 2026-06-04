import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, useInView, useAnimation } from 'framer-motion';
import { Search, ArrowRight, Sparkles, Shield, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const categoryEmojis = {
  Facial: '👤',
  Breast: '💎',
  Body: '✨',
  Dental: '🦷',
  Wellness: '🌿',
  Other: '🏥',
};

function ProcedureCard({ procedure, onClick, index, isActive }) {
  const category = procedure.category || 'Other';
  const emoji = categoryEmojis[category] || '🏥';
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.08, duration: 0.6 }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(procedure)}
      className="group bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer shadow-sm hover:shadow-2xl hover:border-emerald-200 transition-all duration-500"
    >
      <div className="flex items-start justify-between mb-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : {}}
          transition={{ delay: index * 0.08 + 0.3, duration: 0.4 }}
          className="text-4xl"
        >
          {emoji}
        </motion.div>
        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 transition-colors duration-300" />
      </div>
      <h3 className="font-display text-xl font-semibold text-slate-800 mb-2 group-hover:text-emerald-800 transition-colors duration-300">
        {procedure.en_name}
      </h3>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 group-hover:text-emerald-600 transition-colors duration-300">
        {category}
      </p>
      {procedure.cpt_code && (
        <p className="text-[11px] text-slate-400 font-mono">
          CPT: {procedure.cpt_code}
        </p>
      )}
    </motion.div>
  );
}

function ProcedureModal({ procedure, onClose }) {
  if (!procedure) return null;

  const category = procedure.category || 'Other';
  const emoji = categoryEmojis[category] || '🏥';

  return (
    <Dialog open={!!procedure} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white rounded-3xl p-0 overflow-hidden border-slate-200">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-slate-50 p-8 border-b border-slate-100"
        >
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center"
              >
                <span className="text-3xl">{emoji}</span>
              </motion.div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  {category} Procedure
                </p>
                <DialogTitle className="font-display text-3xl text-slate-800">
                  {procedure.en_name}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="p-8 space-y-6"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            {procedure.es_name && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-slate-50 rounded-xl p-4 border border-slate-100"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Spanish</p>
                <p className="text-sm font-semibold text-slate-700">{procedure.es_name}</p>
              </motion.div>
            )}
            {procedure.fr_name && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-slate-50 rounded-xl p-4 border border-slate-100"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">French</p>
                <p className="text-sm font-semibold text-slate-700">{procedure.fr_name}</p>
              </motion.div>
            )}
            {procedure.pt_name && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-slate-50 rounded-xl p-4 border border-slate-100"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Portuguese</p>
                <p className="text-sm font-semibold text-slate-700">{procedure.pt_name}</p>
              </motion.div>
            )}
            {procedure.de_name && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 }}
                className="bg-slate-50 rounded-xl p-4 border border-slate-100"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">German</p>
                <p className="text-sm font-semibold text-slate-700">{procedure.de_name}</p>
              </motion.div>
            )}
          </div>

          {procedure.cpt_code && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-slate-50 rounded-xl p-4 border border-slate-100"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">CPT Code</p>
              <p className="text-sm font-mono font-semibold text-slate-700">{procedure.cpt_code}</p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex gap-3 pt-4 border-t border-slate-100"
          >
            <Button className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white" onClick={onClose}>
              Start Consultation
            </Button>
            <Button variant="outline" onClick={onClose} className="border-slate-200">
              Close
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProceduresLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, margin: '-100px' });
  const lineControls = useAnimation();

  const { data: procedures = [], isLoading } = useQuery({
    queryKey: ['master-procedures'],
    queryFn: () => base44.entities.MasterProcedure.filter({ is_active: true }),
  });

  const categories = ['all', ...new Set(procedures.map(p => p.category).filter(Boolean))];

  const filteredProcedures = procedures.filter(proc => {
    const matchesSearch = proc.en_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         proc.es_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedProcedure === 'all' || !selectedProcedure || proc.category === selectedProcedure;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    if (isInView) {
      lineControls.start({ scaleX: 1, transition: { duration: 1.2, ease: 'easeInOut' } });
    } else {
      lineControls.set({ scaleX: 0 });
    }
  }, [isInView]);

  return (
    <section ref={sectionRef} className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-[0.2em]">
              Explore Options
            </span>
          </motion.div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-slate-800 leading-tight mb-4">
            Procedure Library
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed">
            Browse our comprehensive catalog of medical procedures. Find the right treatment for your needs.
          </p>
        </motion.div>

        {/* Animated Line */}
        <div className="relative mb-12">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-20 bg-gradient-to-b from-transparent via-emerald-200 to-transparent" />
          <div className="hidden lg:block absolute top-1/2 left-[20%] right-[20%] h-px overflow-hidden">
            <motion.div
              className="h-full origin-left"
              style={{
                background: 'linear-gradient(90deg, transparent, hsl(156,28%,24%), transparent)',
                boxShadow: '0 0 8px 2px hsl(156,28%,24%,0.3)',
              }}
              initial={{ scaleX: 0 }}
              animate={lineControls}
            />
          </div>
        </div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-12"
        >
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search procedures (e.g., Rhinoplasty, Implants)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-14 h-14 rounded-2xl text-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white"
            />
          </div>
        </motion.div>

        {/* Category Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          <button
            onClick={() => setSelectedProcedure('all')}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all border ${
              selectedProcedure === 'all' || !selectedProcedure
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-lg shadow-emerald-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
            }`}
          >
            All Procedures
          </button>
          {categories.filter(c => c !== 'all').map((cat, idx) => (
            <motion.button
              key={cat}
              onClick={() => setSelectedProcedure(cat)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.5 + idx * 0.05 }}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all border flex items-center gap-2 ${
                selectedProcedure === cat
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-lg shadow-emerald-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
              }`}
            >
              <span>{categoryEmojis[cat] || '🏥'}</span>
              <span>{cat}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Procedures Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : filteredProcedures.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-100"
          >
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No procedures found matching your search.</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredProcedures.map((procedure, index) => (
              <ProcedureCard
                key={procedure.id}
                procedure={procedure}
                onClick={setSelectedProcedure}
                index={index}
                isActive={isInView}
              />
            ))}
          </motion.div>
        )}

        {/* Stats */}
        {!isLoading && procedures.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.8, duration: 0.7 }}
            className="mt-20 text-center"
          >
            <div className="inline-flex items-center gap-12 bg-slate-50 border border-slate-200 rounded-3xl px-12 py-8 shadow-sm">
              <div>
                <p className="font-display text-4xl font-bold text-slate-800">{procedures.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Procedures</p>
              </div>
              <div className="w-px h-16 bg-slate-200" />
              <div>
                <p className="font-display text-4xl font-bold text-slate-800">{categories.length - 1}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Categories</p>
              </div>
              <div className="w-px h-16 bg-slate-200" />
              <div>
                <p className="font-display text-4xl font-bold text-slate-800">5</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Languages</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Procedure Detail Modal */}
      <ProcedureModal procedure={selectedProcedure} onClose={() => setSelectedProcedure(null)} />
    </section>
  );
}