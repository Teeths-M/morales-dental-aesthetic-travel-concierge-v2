import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Sparkles, Shield } from 'lucide-react';
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

function ProcedureCard({ procedure, onClick }) {
  const category = procedure.category || 'Other';
  const emoji = categoryEmojis[category] || '🏥';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick(procedure)}
      className="group bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-3xl">{emoji}</span>
        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
      </div>
      <h3 className="font-display text-xl font-semibold text-slate-800 mb-2">
        {procedure.en_name}
      </h3>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
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
        <div className="bg-slate-50 p-8 border-b border-slate-100">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                <span className="text-3xl">{emoji}</span>
              </div>
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
        </div>
        
        <div className="p-8 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {procedure.es_name && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Spanish</p>
                <p className="text-sm font-semibold text-slate-700">{procedure.es_name}</p>
              </div>
            )}
            {procedure.fr_name && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">French</p>
                <p className="text-sm font-semibold text-slate-700">{procedure.fr_name}</p>
              </div>
            )}
            {procedure.pt_name && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Portuguese</p>
                <p className="text-sm font-semibold text-slate-700">{procedure.pt_name}</p>
              </div>
            )}
            {procedure.de_name && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">German</p>
                <p className="text-sm font-semibold text-slate-700">{procedure.de_name}</p>
              </div>
            )}
          </div>

          {procedure.cpt_code && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">CPT Code</p>
              <p className="text-sm font-mono font-semibold text-slate-700">{procedure.cpt_code}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white" onClick={onClose}>
              Start Consultation
            </Button>
            <Button variant="outline" onClick={onClose} className="border-slate-200">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProceduresLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState(null);

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

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-[0.2em]">
              Explore Options
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-slate-800 leading-tight mb-4">
            Procedure Library
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed">
            Browse our comprehensive catalog of medical procedures. Find the right treatment for your needs.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
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
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          <button
            onClick={() => setSelectedProcedure('all')}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all border ${
              selectedProcedure === 'all' || !selectedProcedure
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
            }`}
          >
            All Procedures
          </button>
          {categories.filter(c => c !== 'all').map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedProcedure(cat)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all border flex items-center gap-2 ${
                selectedProcedure === cat
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
              }`}
            >
              <span>{categoryEmojis[cat] || '🏥'}</span>
              <span>{cat}</span>
            </button>
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
          <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-100">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No procedures found matching your search.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredProcedures.map((procedure, index) => (
              <motion.div
                key={procedure.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <ProcedureCard procedure={procedure} onClick={setSelectedProcedure} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Stats */}
        {!isLoading && procedures.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 text-center"
          >
            <div className="inline-flex items-center gap-12 bg-slate-50 border border-slate-200 rounded-3xl px-12 py-8">
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