import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProcedureWelcomeModal({ isOpen, onClose, userEmail, isFirstTimeSignup = false }) {
  const navigate = useNavigate();
  const [procedures, setProcedures] = useState([]);
  const [selected, setSelected] = useState([]);
  const [customRequest, setCustomRequest] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProcedures();
    }
  }, [isOpen]);

  const loadProcedures = async () => {
    try {
      const data = await base44.entities.MasterProcedure.filter({ is_active: true });
      setProcedures(data);
    } catch (e) {
      console.error('Failed to load procedures:', e);
      toast.error('Could not load procedures');
    } finally {
      setLoading(false);
    }
  };

  const toggleProcedure = (proc) => {
    setSelected(prev => 
      prev.includes(proc) 
        ? prev.filter(p => p !== proc)
        : [...prev, proc]
    );
  };

  const handleSubmit = async () => {
    if (selected.length === 0 && !customRequest.trim()) {
      toast.error('Please select at least one procedure or specify your interest');
      return;
    }

    setSubmitting(true);

    try {
      // Create Consultation with procedure interest
      const procedureNames = selected.map(p => p.en_name).join(', ');
      const finalInterest = customRequest.trim() 
        ? (procedureNames ? `${procedureNames}, ${customRequest.trim()}` : customRequest.trim())
        : procedureNames;

      const consultation = await base44.entities.Consultation.create({
        patient_name: userEmail?.split('@')[0],
        email: userEmail,
        procedure_interest: 'other',
        notes: `Initial interest from welcome screen: ${finalInterest}`,
        status: 'pending',
        journey_stage: 'consultation'
      });

      // Trigger smart doctor matching for first procedure
      const firstProcedure = selected[0]?.en_name || customRequest.trim();
      if (firstProcedure) {
        const matchResult = await base44.functions.invoke('matchDoctorsForProcedure', {
          procedure_interest: firstProcedure,
          client_email: userEmail,
          client_id: consultation.id
        });

        if (matchResult.data.outreach_sent) {
          toast.info(matchResult.data.message);
        } else {
          toast.success(`${matchResult.data.message} - Check your dashboard!`);
        }
      }

      onClose();
      if (isFirstTimeSignup) {
        navigate('/dashboard');
      }
    } catch (e) {
      console.error('Failed to save procedure interest:', e);
      toast.error('Failed to save your preferences');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (isFirstTimeSignup) {
      navigate('/dashboard');
    }
    onClose();
  };

  // Group procedures by category
  const grouped = procedures.reduce((acc, proc) => {
    if (!acc[proc.category]) acc[proc.category] = [];
    acc[proc.category].push(proc);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto">
              
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100 p-8 rounded-t-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center shadow-sm">
                    <Sparkles className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Welcome to SAFE-T 4LIFE™</p>
                    <h2 className="font-display text-2xl font-medium text-slate-800">Let's begin your journey</h2>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed max-w-xl">
                  Tell us what brings you here. Select from our specialized procedures below, or share what you're looking for — we'll match you with the right specialist.
                </p>
              </div>

              {/* Content */}
              <div className="p-8">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <p className="text-sm text-slate-500 ml-3">Loading procedures...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Procedure Categories */}
                    {Object.entries(grouped).map(([category, procs]) => (
                      <div key={category}>
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                          {procs[0]?.category_emoji || '🏥'} {category}
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {procs.map(proc => (
                            <button
                              key={proc.procedure_id}
                              onClick={() => toggleProcedure(proc)}
                              className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                                selected.includes(proc)
                                  ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                                  : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                              }`}
                            >
                              <Checkbox
                                checked={selected.includes(proc)}
                                className="border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                              />
                              <span className={`text-sm font-medium ${
                                selected.includes(proc) ? 'text-emerald-800' : 'text-slate-700'
                              }`}>
                                {proc.en_name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Custom Request */}
                    <div className="pt-4 border-t border-slate-200">
                      <button
                        onClick={() => setShowCustomInput(!showCustomInput)}
                        className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-2"
                      >
                        {showCustomInput ? '✕' : '+'} Can't find what you're looking for?
                      </button>
                      
                      {showCustomInput && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4"
                        >
                          <label className="text-sm font-semibold text-slate-700 mb-2 block">
                            Tell us what procedure you need:
                          </label>
                          <Input
                            value={customRequest}
                            onChange={(e) => setCustomRequest(e.target.value)}
                            placeholder="e.g., Hair Transplant, Knee Replacement..."
                            className="w-full"
                          />
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6 border-t border-slate-200 mt-6">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="sm:flex-1"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || (selected.length === 0 && !customRequest.trim())}
                    className="sm:flex-1 bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Let's Find Your Doctor
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}