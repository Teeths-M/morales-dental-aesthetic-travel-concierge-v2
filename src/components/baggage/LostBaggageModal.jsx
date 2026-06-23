import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function LostBaggageModal({ bag, onClose }) {
  const [step, setStep] = useState('confirm'); // confirm | filing | done
  const [result, setResult] = useState(null);

  const handleReport = async () => {
    setStep('filing');
    const res = await base44.functions.invoke('reportLostBaggage', { luggage_id: bag.id });
    setResult(res.data);
    setStep('done');
  };

  return (
    <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}>

        {step === 'confirm' && (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-xl text-center mb-2">Report Lost Baggage</h3>
            <p className="text-gray-500 text-sm text-center mb-2">
              Bag: <strong>{bag.bag_label || `Bag ${bag.bag_number}`}</strong>
            </p>
            <p className="text-gray-400 text-xs text-center mb-6">
              This will automatically file a lost baggage claim, notify your concierge team, and activate the secure finder portal for your QR tag.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
              <p className="text-xs text-amber-700 font-medium">Your QR tag remains active — if someone finds your bag and scans it, they'll be directed to a secure return portal without seeing your personal details.</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleReport} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl">
                File Claim Now
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            </div>
          </>
        )}

        {step === 'filing' && (
          <div className="text-center py-8">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="font-semibold text-gray-800 mb-1">Filing Your Claim...</p>
            <p className="text-sm text-gray-400">Generating claim document and notifying your concierge team</p>
          </div>
        )}

        {step === 'done' && result && (
          <>
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-xl text-center mb-2">Claim Filed Successfully</h3>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">Claim Reference</p>
              <p className="font-mono font-semibold text-gray-800 text-sm">{result.claim_reference}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 max-h-32 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-xs font-semibold text-gray-600">Auto-Generated Claim</p>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{result.claim_body}</p>
            </div>
            <p className="text-xs text-gray-400 text-center mb-4">
              A full copy has been emailed to you. Your concierge team has been notified.
            </p>
            <Button onClick={onClose} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              Done
            </Button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}