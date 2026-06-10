import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Clock } from 'lucide-react';
import { searchProcedures } from './ProcedureData';
import { motion, AnimatePresence } from 'framer-motion';
import SmartFallback from './SmartFallback';
import { base44 } from '@/api/base44Client';

const popular = ['Dental Implants', 'Teeth Whitening', 'Porcelain Veneers', 'Rhinoplasty', 'Liposuction', 'All-on-4 Implants'];

export default function ProcedureSearch({ onSelect, onQueryChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [focused, setFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef();

  useEffect(() => {
    const r = searchProcedures(query);
    setResults(r);
    onQueryChange?.(query);
  }, [query]);

  // Load recent searches on mount
  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        try {
          const searches = await base44.entities.ProcedureSearch.filter({
            user_id: (await base44.auth.me()).id
          }, '-created_date', 5);
          setRecentSearches(searches);
        } catch (e) {
          console.error('Failed to load recent searches:', e);
        }
      }
    });
  }, []);

  const clear = () => { setQuery(''); setResults([]); onQueryChange?.(''); };

  const saveRecentSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    try {
      const user = await base44.auth.me();
      await base44.entities.ProcedureSearch.create({
        user_id: user.id,
        raw_query_text: searchQuery.trim()
      });
      setRecentSearches(prev => [
        { data: { raw_query_text: searchQuery.trim(), created_date: new Date().toISOString() } },
        ...prev.slice(0, 4)
      ]);
    } catch (e) {
      console.error('Failed to save recent search:', e);
    }
  };

  return (
    <div className="w-full">
      {/* Search Bar */}
      <div className="relative mb-3">
        <div className={`flex items-center gap-3 bg-white border-2 rounded-2xl px-5 py-3.5 shadow-sm transition-all ${focused ? 'border-emerald-400 shadow-emerald-100' : 'border-slate-200'}`}>
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Search procedures… try 'implants', 'veneers', 'rhinoplasty'"
            className="flex-1 text-sm text-slate-700 bg-transparent focus:outline-none placeholder:text-slate-400"
          />
          {query && (
            <button onClick={clear} className="p-1 rounded-lg hover:bg-slate-100">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mt-3 mb-2"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Recent:</span>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(search.data.raw_query_text)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs font-medium transition-all border border-slate-200 hover:border-emerald-200"
                >
                  {search.data.raw_query_text}
                  <Search className="w-3 h-3" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Dropdown Results */}
        <AnimatePresence>
          {focused && (
            <motion.div
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              {query.trim().length >= 2 ? (
                results.length > 0 ? (
                  <div className="p-2">
                    {results.map(p => (
                      <button
                        key={p.title}
                        onClick={() => { onSelect(p); saveRecentSearch(p.title); clear(); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-xl ${p.categoryColor.bg} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-sm">{p.categoryId.includes('dental') ? '🦷' : p.categoryId.includes('breast') ? '🌸' : p.categoryId.includes('body') ? '💪' : p.categoryId.includes('face') ? '💆' : '✨'}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{p.title}</p>
                          <p className="text-[11px] text-slate-400">{p.category} · {p.duration}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 text-center">
                    <p className="text-sm text-slate-400">No procedures found for "{query}"</p>
                  </div>
                )
              ) : (
                <div className="p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Popular Procedures</p>
                  <div className="flex flex-wrap gap-2">
                    {popular.map(name => (
                      <button
                        key={name}
                        onClick={() => { setQuery(name); saveRecentSearch(name); }}
                        className="text-xs font-medium px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors text-slate-600"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Smart Fallback - Separate Card Below Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4"
      >
        <SmartFallback 
          originalQuery={query}
          onProcedureSelect={(matchedProc) => {
            onSelect({
              title: matchedProc.procedure_name,
              procedure_id: matchedProc.procedure_id,
              isAiMatch: true,
              matchConfidence: matchedProc.match_confidence,
              rationale: matchedProc.rationale
            });
            saveRecentSearch(query);
            clear();
          }}
        />
      </motion.div>
    </div>
  );
}