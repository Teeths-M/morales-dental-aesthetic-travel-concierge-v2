import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function SlotCounter({ className = '' }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    base44.functions.invoke('capacityCheck', {
      action: 'check',
      year_month: getCurrentYearMonth(),
    }).then(res => setData(res.data)).catch(() => {});
  }, []);

  if (!data || data.remaining >= data.capacity_limit) return null;

  const pct = Math.round((data.confirmed_count / data.capacity_limit) * 100);
  const isUrgent = data.remaining <= 5;
  const isNear = data.remaining <= data.capacity_limit * 0.25;

  if (!isNear && !isUrgent) return null; // Only show when ≤25% remaining

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full border ${
        isUrgent
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      } ${className}`}
    >
      <Zap className={`w-3.5 h-3.5 flex-shrink-0 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
      {data.is_full
        ? 'This month is fully booked — join the waiting list'
        : `Only ${data.remaining} slot${data.remaining === 1 ? '' : 's'} left for this month!`}
    </motion.div>
  );
}