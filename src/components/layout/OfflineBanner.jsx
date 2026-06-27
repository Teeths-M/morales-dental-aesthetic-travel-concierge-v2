import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-0 left-0 right-0 z-50 bg-amber-900/95 backdrop-blur-sm border-b border-amber-400/30 px-4 py-2.5 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5">
        <WifiOff className="w-4 h-4 text-amber-200" />
        <p className="text-[13px] font-semibold text-amber-100 tracking-wide">
          You are offline — your data is safe and will sync automatically when you reconnect
        </p>
      </div>
    </motion.div>
  );
}