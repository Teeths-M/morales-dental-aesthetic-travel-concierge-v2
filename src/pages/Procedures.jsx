import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mic, ArrowRight, ChevronRight, Plus, Check, Info, Clock, Calendar } from 'lucide-react';
import ProcedureModal from '@/components/procedures/ProcedureModal';
import { Button } from '@/components/ui/button';
import { procedureCategories } from '@/components/procedures/ProcedureData';
import ProcedureSearch from '@/components/procedures/ProcedureSearch';
import MyProceduresList from '@/components/procedures/MyProceduresList';
import VoiceMode from '@/components/procedures/VoiceMode';

const parentFilters = [
  { id: 'all', label: 'All', emoji: '🏥' },
  { id: 'dental', label: 'Dental', emoji: '🦷' },
  { id: 'aesthetic', label: 'Aesthetic', emoji: '✨' },
  { id: 'wellness', label: 'Wellness', emoji: '🌿' },
];

function ProcedureCard({ proc, isSelected, onAdd, onRemove, onLearnMore }) {
  const c = proc.categoryColor;
  return (
    <motion.div
      className={`relative bg-white rounded-2xl border overflow-hidden transition-all group ${isSelected ? 'border-emerald-400 shadow-md shadow-emerald-100' : 'border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'}`}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {/* Image */}
      {proc.image && (
        <div className="w-full h-36 overflow-hidden relative">
          <img
            src={proc.image}
            alt={proc.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent" />
          <span className={`absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-sm bg-white/70 ${c.text}`}>{proc.tag}</span>
          {isSelected && (
            <div className="absolute top-2.5 right-2.5 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <h3 className="font-semibold text-slate-800 text-sm mb-1 leading-tight">{proc.title}</h3>
        {proc.desc && <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-3">{proc.desc}</p>}

        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock className="w-3 h-3" />{proc.duration}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Calendar className="w-3 h-3" />{proc.recovery}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onLearnMore(proc)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-1"
          >
            Learn More <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => isSelected ? onRemove(proc) : onAdd(proc)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              isSelected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                : `${c.bg} ${c.text} border ${c.border} hover:opacity-80`
            }`}
          >
            {isSelected ? '✓ Added' : '+ Select'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Procedures() {
  const [activeParent, setActiveParent] = useState('all');
  const [selectedProcs, setSelectedProcs] = useState([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [selectedModal, setSelectedModal] = useState(null);

  const addProc = (proc) => {
    if (!selectedProcs.find(p => p.title === proc.title)) {
      setSelectedProcs(prev => [...prev, proc]);
    }
  };

  const removeProc = (proc) => {
    setSelectedProcs(prev => prev.filter(p => p.title !== proc.title));
  };

  const handleVoiceDetected = (procs) => {
    procs.forEach(p => addProc(p));
  };

  const filteredCategories = activeParent === 'all'
    ? procedureCategories
    : procedureCategories.filter(c => c.parent === activeParent);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">Our Services</p>
            <h1 className="font-display text-3xl lg:text-5xl text-slate-900 mb-4">Procedures & Treatments</h1>
            <p className="text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
              World-class dental, aesthetic, and wellness care. Browse below, search, or simply <span className="font-semibold text-emerald-700">speak your goals</span> using Voice Mode.
            </p>
          </motion.div>

          {/* Search + Voice */}
          <div className="max-w-2xl mx-auto flex gap-3">
            <div className="flex-1">
              <ProcedureSearch onSelect={addProc} />
            </div>
            <button
              onClick={() => setVoiceOpen(true)}
              className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white font-semibold px-5 py-3.5 rounded-2xl shadow-md text-sm transition-all"
            >
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline">Voice Mode</span>
            </button>
          </div>

          {/* Voice hint */}
          <p className="text-center text-xs text-slate-400 mt-3">
            💡 Try Voice Mode: <em>"I want veneers, whitening, and implants on the upper jaw"</em>
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Category filter */}
            <div className="flex gap-2 flex-wrap mb-8">
              {parentFilters.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveParent(f.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    activeParent === f.id
                      ? 'bg-gradient-to-r from-emerald-700 to-blue-800 text-white border-transparent shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{f.emoji}</span>{f.label}
                </button>
              ))}
            </div>

            {/* Procedure categories */}
            <div className="space-y-10">
              {filteredCategories.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-xl">{cat.icon}</span>
                    <h2 className={`text-sm font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${cat.color.bg} ${cat.color.text} ${cat.color.border}`}>
                      {cat.label}
                    </h2>
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-xs text-slate-400 font-medium">{cat.procedures.length} treatments</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {cat.procedures.map(proc => {
                      const enriched = { ...proc, category: cat.label, categoryId: cat.id, categoryColor: cat.color };
                      return (
                        <ProcedureCard
                          key={proc.title}
                          proc={enriched}
                          isSelected={!!selectedProcs.find(p => p.title === proc.title)}
                          onAdd={addProc}
                          onRemove={removeProc}
                          onLearnMore={setSelectedModal}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <motion.div
              className="text-center bg-white border border-slate-100 rounded-2xl p-8 lg:p-12 mt-12 shadow-sm"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Not Sure Where to Start?</p>
              <h2 className="font-display text-2xl lg:text-3xl text-slate-900 mb-3">Talk to Our Concierge Team</h2>
              <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                Our specialists will guide you to the right treatment based on your goals, health profile, and budget.
              </p>
              <Link to="/booking">
                <Button size="lg" className="bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white font-semibold px-10 shadow-md">
                  Book a Free Consultation <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Sticky sidebar — My Procedures */}
          <div className="hidden lg:block w-72 flex-shrink-0 sticky top-24">
            {selectedProcs.length > 0 ? (
              <MyProceduresList
                items={selectedProcs}
                onRemove={removeProc}
                onClear={() => setSelectedProcs([])}
              />
            ) : (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🗒️</span>
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">My Procedures</p>
                <p className="text-xs text-slate-400 leading-relaxed">Select procedures from the list or use Voice Mode to build your treatment plan.</p>
              </div>
            )}

            {/* Voice mode promo */}
            <button
              onClick={() => setVoiceOpen(true)}
              className="mt-4 w-full flex items-center gap-3 bg-gradient-to-r from-emerald-800 to-blue-900 rounded-2xl px-4 py-4 hover:opacity-90 transition-all"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-bold text-xs">Voice Mode</p>
                <p className="text-white/70 text-[10px]">Speak your treatments</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile My List sticky bar */}
      <AnimatePresence>
        {selectedProcs.length > 0 && (
          <motion.div
            className="lg:hidden fixed bottom-6 left-4 right-4 z-40"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
          >
            <Link to="/booking">
              <div className="bg-gradient-to-r from-emerald-700 to-blue-800 rounded-2xl px-5 py-4 shadow-2xl flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">{selectedProcs.length} Treatment{selectedProcs.length !== 1 ? 's' : ''} Selected</p>
                  <p className="text-white/70 text-xs">Tap to continue to consultation</p>
                </div>
                <ArrowRight className="w-5 h-5 text-white" />
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Modal */}
      <AnimatePresence>
        {voiceOpen && (
          <VoiceMode
            onProceduresDetected={handleVoiceDetected}
            onClose={() => setVoiceOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Learn More Modal */}
      <ProcedureModal procedure={selectedModal} onClose={() => setSelectedModal(null)} />
    </div>
  );
}