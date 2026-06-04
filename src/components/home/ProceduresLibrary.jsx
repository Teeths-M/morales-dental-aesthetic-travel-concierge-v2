import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Filter, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const categoryColors = {
  Facial: 'from-rose-50 to-pink-50 border-rose-200',
  Breast: 'from-purple-50 to-fuchsia-50 border-purple-200',
  Body: 'from-amber-50 to-orange-50 border-amber-200',
  Dental: 'from-emerald-50 to-teal-50 border-emerald-200',
  Wellness: 'from-sky-50 to-blue-50 border-sky-200',
  Other: 'from-slate-50 to-gray-50 border-slate-200',
};

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
  const colorClass = categoryColors[category] || categoryColors.Other;
  const emoji = categoryEmojis[category] || '🏥';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(procedure)}
      className={`bg-gradient-to-br ${colorClass} border rounded-2xl p-5 cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{emoji}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/60 px-2 py-1 rounded-full">
          {category}
        </span>
      </div>
      <h3 className="font-display text-lg font-semibold text-slate-800 mb-2">
        {procedure.en_name}
      </h3>
      {procedure.cpt_code && (
        <p className="text-[11px] text-slate-500 font-mono mb-3">
          CPT: {procedure.cpt_code}
        </p>
      )}
      <div className="flex items-center text-xs text-slate-600 font-medium">
        <span>Learn more</span>
        <ArrowRight className="w-3 h-3 ml-1" />
      </div>
    </motion.div>
  );
}

function ProcedureModal({ procedure, onClose }) {
  if (!procedure) return null;

  const category = procedure.category || 'Other';
  const emoji = categoryEmojis[category] || '🏥';

  return (
    <Dialog open={!!procedure} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white rounded-3xl p-0 overflow-hidden">
        <div className={`bg-gradient-to-r ${categoryColors[category]?.replace('border', '') || categoryColors.Other} p-8`}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{emoji}</span>
              <div>
                <DialogTitle className="font-display text-3xl text-slate-800">
                  {procedure.en_name}
                </DialogTitle>
                <DialogDescription className="text-slate-600 font-medium mt-1">
                  {category} Procedure
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {procedure.es_name && (
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Spanish</p>
                <p className="text-sm font-semibold text-slate-700">{procedure.es_name}</p>
              </div>
            )}
            {procedure.fr_name && (
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">French</p>
                <p className="text-sm font-semibold text-slate-700">{procedure.fr_name}</p>
              </div>
            )}
            {procedure.pt_name && (
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Portuguese</p>
                <p className="text-sm font-semibold text-slate-700">{procedure.pt_name}</p>
              </div>
            )}
            {procedure.de_name && (
              <div className="bg-slate-50 rounded-xl p-4">
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

          <div className="flex gap-3 pt-4">
            <Button className="flex-1 bg-emerald-700 hover:bg-emerald-800" onClick={onClose}>
              Start Consultation
            </Button>
            <Button variant="outline" onClick={onClose}>
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProcedure, setSelectedProcedure] = useState(null);

  const { data: procedures = [], isLoading } = useQuery({
    queryKey: ['master-procedures'],
    queryFn: () => base44.entities.MasterProcedure.filter({ is_active: true }),
  });

  const categories = ['all', ...new Set(procedures.map(p => p.category).filter(Boolean))];

  const filteredProcedures = procedures.filter(proc => {
    const matchesSearch = proc.en_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         proc.es_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || proc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <section className="py-20 bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">
              Explore Options
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Procedure Library
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Browse our comprehensive catalog of medical procedures. Find the right treatment for your needs.
          </p>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mb-10 space-y-4"
        >
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search procedures (e.g., Rhinoplasty, Implants)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 rounded-2xl text-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full max-w-3xl mx-auto">
            <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-1.5 flex flex-wrap justify-center gap-1">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
              >
                All Procedures
              </TabsTrigger>
              {categories.filter(c => c !== 'all').map(cat => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
                >
                  {categoryEmojis[cat] || '🏥'} {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Procedures Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-slate-100 rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : filteredProcedures.length === 0 ? (
          <div className="text-center py-20">
            <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
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
            className="mt-16 text-center"
          >
            <div className="inline-flex items-center gap-6 bg-white border border-slate-200 rounded-2xl px-8 py-5 shadow-sm">
              <div className="text-center">
                <p className="font-display text-3xl font-bold text-emerald-700">{procedures.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Procedures</p>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div className="text-center">
                <p className="font-display text-3xl font-bold text-emerald-700">{categories.length - 1}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Categories</p>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div className="text-center">
                <p className="font-display text-3xl font-bold text-emerald-700">5</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Languages</p>
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