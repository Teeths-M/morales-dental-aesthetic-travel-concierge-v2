import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Phone, Globe, Clock, ExternalLink } from 'lucide-react';
import { EMBASSY_DATA, DESTINATIONS } from './visaData';

export default function EmbassyDirectory() {
  const [selectedDest, setSelectedDest] = useState('VE');
  const [search, setSearch] = useState('');

  const destEmbassies = EMBASSY_DATA[selectedDest];
  const filtered = destEmbassies?.embassies?.filter(e =>
    e.country.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-slate-800">Embassy & Consulate Finder</h2>
        <p className="text-slate-500 text-sm mt-1">Find embassy contact details, appointment info, and processing times</p>
      </div>

      {/* Destination selector */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <p className="text-sm font-semibold text-slate-600 mb-3">Select Destination Country</p>
        <div className="flex gap-2 flex-wrap">
          {Object.keys(EMBASSY_DATA).map(code => {
            const dest = DESTINATIONS.find(d => d.code === code) || { flag: '🌍', name: code };
            const data = EMBASSY_DATA[code];
            return (
              <button
                key={code}
                onClick={() => setSelectedDest(code)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  selectedDest === code
                    ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white border-transparent shadow-md'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{dest.flag || data.flag}</span> {data.name}
              </button>
            );
          })}
        </div>
      </div>

      {destEmbassies && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${destEmbassies.name} embassy by your country...`}
              className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {/* Embassy cards */}
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="text-3xl mb-2">🏛️</p>
                <p className="text-sm">No embassies found for your search.</p>
                <p className="text-xs mt-1">Try searching by country name.</p>
              </div>
            ) : (
              filtered.map((embassy, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{destEmbassies.flag}</span>
                        <h3 className="font-bold text-slate-800">{destEmbassies.name} Embassy</h3>
                      </div>
                      <p className="text-sm text-slate-500">{embassy.country}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
                      <Clock className="w-3 h-3" /> {embassy.processing}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{embassy.address}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{embassy.phone}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm">
                      <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <a
                        href={embassy.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {embassy.website.replace('https://', '')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <a
                      href={embassy.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-sm font-semibold hover:opacity-90 transition-all"
                    >
                      Visit Official Embassy Website <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Note */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
            <p className="text-xs text-amber-700">
              <strong>💡 Tip:</strong> Embassy websites and processing times change frequently. Always verify directly with the official embassy before applying.
            </p>
          </div>
        </>
      )}

      {/* Countries not in database note */}
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-5 text-center">
        <p className="text-2xl mb-2">🌍</p>
        <p className="text-sm font-semibold text-slate-700 mb-1">Don't see your destination?</p>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          Our embassy database is continuously expanding. For countries not listed, our concierge team can assist with embassy contact research.
        </p>
        <a
          href="/booking"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
        >
          Contact our concierge team →
        </a>
      </div>
    </div>
  );
}