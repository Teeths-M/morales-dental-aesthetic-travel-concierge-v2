import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function LuxuryScarcityCounter() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['monthlyScarcityStats'],
    queryFn: () => base44.functions.invoke('getMonthlyScarcityStats', {}),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading || error || !data) {
    return null;
  }

  const { maxSlots, activeBookings, slotsRemaining, monthName } = data;
  const occupancyPercentage = (activeBookings / maxSlots) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm"
    >
      {/* Header Label */}
      <div className="mb-4">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-slate-500 mb-2">
          Morales Elite Network Allocation
        </p>
        <p className="text-sm font-semibold text-slate-700">
          <span className="text-emerald-600 font-bold">{activeBookings}</span>
          {' / '}
          <span className="text-slate-400">{maxSlots}</span>
          <span className="text-slate-500 ml-1">Spaces Secured for {monthName}</span>
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <Progress 
          value={occupancyPercentage} 
          className="h-2 bg-slate-100"
          indicatorClassName={
            occupancyPercentage >= 75 
              ? 'bg-gradient-to-r from-amber-500 to-red-500' 
              : occupancyPercentage >= 50
              ? 'bg-gradient-to-r from-blue-500 to-emerald-500'
              : 'bg-gradient-to-r from-emerald-400 to-blue-400'
          }
        />
      </div>

      {/* Dynamic Warning Badge */}
      {slotsRemaining <= 10 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <p className="text-xs font-bold text-amber-800">
            ⚠️ High Demand: Only{' '}
            <span className="text-amber-900 font-bold">{slotsRemaining}</span>
            {' '}private concierge allocations remaining for this cycle.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}