import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflineVaultBanner({ isOffline, pendingCount, onSync }) {
  if (!isOffline && pendingCount === 0) return null;

  return (
    <motion.div
      className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${
        isOffline
          ? 'border-amber-400/30 bg-amber-400/10'
          : 'border-emerald-400/30 bg-emerald-400/10'
      }`}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {isOffline ? (
        <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
      ) : (
        <RefreshCw className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-spin" />
      )}
      
      <div className="flex-1">
        <p className="text-[13px] font-semibold text-amber-100">
          {isOffline
            ? 'Offline Mode: Viewing cached vault data'
            : `Syncing ${pendingCount} pending action${pendingCount !== 1 ? 's' : ''}...`}
        </p>
        {isOffline && (
          <p className="text-[11px] text-amber-200/80 mt-0.5">
            Your documents are secure and accessible. Changes will sync when reconnected.
          </p>
        )}
      </div>

      {isOffline && (
        <Button
          onClick={onSync}
          variant="outline"
          size="sm"
          className="h-8 text-[11px] border-amber-400/40 text-amber-100 hover:bg-amber-400/20"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry Sync
        </Button>
      )}
    </motion.div>
  );
}