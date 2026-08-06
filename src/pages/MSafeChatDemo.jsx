import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import MSafeChat from '@/components/msafe/MSafeChat';

// Demo host for the M-Safe floating window. Centered on a neutral backdrop;
// closing the window surfaces a relaunch button so the entrance/exit animation
// is visible without reloading.
export default function MSafeChatDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {open ? (
          <MSafeChat key="msafe" onClose={() => setOpen(false)} />
        ) : (
          <motion.button
            key="relaunch"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-full bg-[#6C47FF] px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#5A37D6] transition-colors focus-visible:ring-2 focus-visible:ring-[#6C47FF] focus-visible:ring-offset-2 outline-none"
          >
            <Shield className="w-4 h-4" fill="white" /> Reopen M-Safe
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}