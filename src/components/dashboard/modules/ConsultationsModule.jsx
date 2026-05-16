import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ClipboardList, Video, DollarSign, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-violet-100 text-violet-700' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

const mockRec = [
  { proc: 'Porcelain Veneers (x8)', est: '$2,400 – $3,200', risk: 'Low', note: 'Excellent candidacy. Enamel condition is suitable.' },
  { proc: 'Professional Whitening (pre-veneer)', est: '$180 – $250', risk: 'Low', note: 'Recommended before veneer shade selection.' },
];

function ConsultationRow({ c, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const cfg = statusConfig[c.status] || statusConfig.pending;
  
  return (
    <>
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <button
          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">{c.procedure_interest?.replace(/_/g, ' ') || 'General Consultation'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{c.preferred_date || 'Date TBD'} · {c.patient_name}</p>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {expanded && (
          <motion.div
            className="px-5 pb-5 border-t border-slate-100"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Notes</p>
                <p className="text-xs text-slate-600">{c.notes || 'No notes recorded yet.'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Risk Level</p>
                <p className={`text-xs font-bold capitalize ${c.risk_level === 'high' ? 'text-red-600' : c.risk_level === 'medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {c.risk_level || 'Low'} Risk
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5">
                <Video className="w-3.5 h-3.5" /> Join Video
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8">View Documents</Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-xs h-8 gap-1.5 text-red-600 hover:bg-red-50 ml-auto"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Consultation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this consultation and any associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-slate-50 rounded-lg p-3 my-2">
            <p className="text-sm font-semibold text-slate-800">{c.procedure_interest?.replace(/_/g, ' ')}</p>
            <p className="text-xs text-slate-500">{c.preferred_date} · {c.patient_name}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => onDelete(c.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ConsultationsModule({ consultations = [] }) {
  const queryClient = useQueryClient();
  
  const deleteConsultation = useMutation({
    mutationFn: (id) => base44.entities.Consultation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
    },
  });

  const handleDelete = (id) => {
    deleteConsultation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">My Consultations</h2>
          <p className="text-xs text-slate-400 mt-0.5">Your consultation history and treatment recommendations</p>
        </div>
        <Link to="/booking">
          <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-9">
            + New Consultation
          </Button>
        </Link>
      </div>

      {/* Consultation list */}
      {consultations.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-10 text-center">
          <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-3">No consultations yet</p>
          <Link to="/booking"><Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs">Book Your First Consultation</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {consultations.map(c => <ConsultationRow key={c.id} c={c} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Doctor Recommendations */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Doctor Recommendations & Pricing</h3>
            <p className="text-xs text-slate-400">Based on your latest consultation review</p>
          </div>
        </div>
        <div className="space-y-3">
          {mockRec.map((r) => (
            <div key={r.proc} className="flex items-start gap-4 bg-slate-50 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-700">{r.proc}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{r.note}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-emerald-700">{r.est}</p>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{r.risk} Risk</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3 italic">* Pricing estimates are indicative and confirmed during consultation. All-inclusive concierge pricing available.</p>
      </div>
    </div>
  );
}