import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { searchProcedures } from './ProcedureData';
import { motion, AnimatePresence } from 'framer-motion';

const popular = ['Dental Implants', 'Teeth Whitening', 'Porcelain Veneers', 'Rhinoplasty', 'Liposuction', 'All-on-4 Implants'];

export default function ProcedureSearch({ onSelect, onQueryChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    const r = searchProcedures(query);
    setResults(r);
    onQueryChange?.(query);
  }, [query]);

  const clear = () => { setQuery(''); setResults([]); onQueryChange?.(''); };

  return (
    <div className="relative w-full">
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
                      onClick={() => { onSelect(p); clear(); }}
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
                      onClick={() => setQuery(name)}
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
  );
}