import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function RecentSearches({ onSearchClick }) {
  const { data: recentSearches, isLoading } = useQuery({
    queryKey: ['recentSearches'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        if (!user) return [];
        
        const searches = await base44.entities.ProcedureSearch.filter(
          { user_id: user.id },
          '-timestamp',
          10
        );
        
        // Get unique queries (last occurrence of each)
        const uniqueQueries = [];
        const seen = new Set();
        searches.forEach(search => {
          if (!seen.has(search.data.raw_query_text)) {
            seen.add(search.data.raw_query_text);
            uniqueQueries.push(search.data);
          }
        });
        
        return uniqueQueries.slice(0, 3);
      } catch {
        return [];
      }
    },
    enabled: true,
  });

  if (isLoading || !recentSearches || recentSearches.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 mt-3 mb-1"
    >
      <Clock className="w-3.5 h-3.5 text-slate-400" />
      <span className="text-xs font-medium text-slate-500">Recent:</span>
      <div className="flex flex-wrap gap-2">
        {recentSearches.map((search, idx) => (
          <button
            key={idx}
            onClick={() => onSearchClick(search.raw_query_text)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs font-medium transition-all border border-slate-200 hover:border-emerald-200"
          >
            {search.raw_query_text}
            <Search className="w-3 h-3" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}