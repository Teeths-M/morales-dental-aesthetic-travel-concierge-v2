import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mountain, X, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const LS_KEY = 'arrival_activity_prompt';

export default function ArrivalActivityPrompt({ caseId }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    const stored = localStorage.getItem(`${LS_KEY}_${caseId}`);
    if (!stored || stored === 'remind_later') {
      // Show after a brief delay so page settles
      const t = setTimeout(() => setShow(true), 1800);
      return () => clearTimeout(t);
    }
  }, [caseId]);

  const handleYes = () => {
    localStorage.setItem(`${LS_KEY}_${caseId}`, 'yes');
    setShow(false);
  };

  const handleNo = () => {
    localStorage.setItem(`${LS_KEY}_${caseId}`, 'no');
    setShow(false);
  };

  const handleRemindLater = () => {
    localStorage.setItem(`${LS_KEY}_${caseId}`, 'remind_later');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 22 }}
          >
            <button onClick={handleNo} className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100">
              <X className="w-4 h-4 text-slate-400" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                <Mountain className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base leading-tight">Adventure Activities?</p>
                <p className="text-xs text-slate-500 mt-0.5">Now that you've arrived at your destination</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you planning any adventure activities — zip-lining, scuba, ATV, hiking, or similar? 
              We'll activate ISO 21101 safety protocols and send you automated pre-activity checklists.
            </p>

            <div className="space-y-2">
              <Link to="/dashboard/adventure" onClick={handleYes}>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-2">
                  <Zap className="w-4 h-4" /> Yes, log my activities
                </Button>
              </Link>
              <button
                onClick={handleRemindLater}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                <Clock className="w-4 h-4" /> Remind me next time
              </button>
              <button
                onClick={handleNo}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                No thanks, I'm staying relaxed 😌
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}