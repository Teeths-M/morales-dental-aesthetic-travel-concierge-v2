import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MapPin, ChefHat, DollarSign, Camera, CheckCircle,
  Clock, AlertTriangle, Loader2, Upload, Receipt, TrendingUp, LogOut
} from 'lucide-react';
import { toast } from 'sonner';

export default function CompanionDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: companion, isLoading: loadingProfile } = useQuery({
    queryKey: ['mt_companion', user?.email],
    queryFn: () => base44.entities.Companion.filter({ whatsapp_number: user?.phone || '__' })
      .then(r => r[0] || null),
    enabled: !!user,
  });

  // For demo purposes: load all active assignments for this companion
  const { data: assignments = [], isLoading: loadingAssign } = useQuery({
    queryKey: ['mt_assignments', companion?.id],
    queryFn: () => base44.entities.MothersTouchAssignment.filter({ companion_id: companion?.id }),
    enabled: !!companion?.id,
  });

  if (loadingProfile) return <LoadingScreen />;

  const todayAssignments = assignments.filter(a => a.status === 'active' || a.status === 'scheduled');
  const completedAssignments = assignments.filter(a => a.status === 'completed');
  const totalEarned = completedAssignments.reduce((s, a) => s + (a.companion_net_care_fee_usd || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-rose-100 px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Mother's Touch</p>
              <p className="text-xs text-slate-400">{companion?.full_legal_name || user?.full_name}</p>
            </div>
          </div>
          <VerificationBadge status={companion?.verification_status} />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

        {/* Earnings strip */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="This Month" value={`$${companion?.earnings_this_month?.toFixed(0) || 0}`} color="emerald" icon={DollarSign} />
          <StatCard label="Total Earned" value={`$${totalEarned.toFixed(0)}`} color="amber" icon={TrendingUp} />
          <StatCard label="Assignments" value={assignments.length} color="rose" icon={Heart} />
        </div>

        {/* Today's logistics */}
        <Section title="Today's Assignments" subtitle="Patient name, address & dietary details">
          {todayAssignments.length === 0 ? (
            <EmptyCard icon={Clock} text="No active assignments today. Check back soon!" />
          ) : (
            todayAssignments.map(a => (
              <TodayLogisticsCard key={a.id} assignment={a} onUpdate={() => qc.invalidateQueries(['mt_assignments'])} />
            ))
          )}
        </Section>

        {/* Earnings ledger */}
        <Section title="Earnings Ledger" subtitle="Completed assignments & payment status">
          {completedAssignments.length === 0 ? (
            <EmptyCard icon={Receipt} text="Completed assignments will appear here." />
          ) : (
            completedAssignments.map(a => (
              <EarningsRow key={a.id} assignment={a} />
            ))
          )}
        </Section>

      </div>
    </div>
  );
}

function TodayLogisticsCard({ assignment, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [showReceipts, setShowReceipts] = useState(false);
  const fileRef = useRef(null);

  const totalReceipts = (assignment.grocery_receipts || []).reduce((s, r) => s + (r.amount_usd || 0), 0);

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updatedReceipts = [
        ...(assignment.grocery_receipts || []),
        { receipt_url: file_url, amount_usd: 0, description: 'Grocery receipt', uploaded_at: new Date().toISOString() }
      ];
      await base44.entities.MothersTouchAssignment.update(assignment.id, { grocery_receipts: updatedReceipts });
      toast.success('Receipt uploaded! Admin has been notified for reimbursement.');
      onUpdate();
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const statusColor = assignment.status === 'active' ? 'bg-emerald-500' : 'bg-amber-400';

  return (
    <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
      {/* Status bar */}
      <div className={`${statusColor} h-1.5 w-full`} />
      <div className="p-4 space-y-3">
        {/* Patient & address */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-slate-800">{assignment.patient_name}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>{assignment.lodging_address || 'Address pending confirmation'}</span>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
            assignment.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>{assignment.status}</span>
        </div>

        {/* Dietary parameters */}
        {assignment.dietary_parameters && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <ChefHat className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Dietary Parameters</p>
              <p className="text-xs text-amber-800">{assignment.dietary_parameters}</p>
            </div>
          </div>
        )}

        {/* Fee breakdown */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Your Invoice Breakdown</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Grocery reimbursement</span>
              <span className="font-semibold text-slate-700">${totalReceipts.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Travel flat fee</span>
              <span className="font-semibold text-slate-700">${(assignment.travel_flat_fee_usd || 10).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
              <span className="font-semibold text-slate-700">Your care fee (net)</span>
              <span className="font-bold text-emerald-700">${(assignment.companion_net_care_fee_usd || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Receipts */}
        <div>
          <button onClick={() => setShowReceipts(s => !s)}
            className="text-xs text-rose-600 font-semibold flex items-center gap-1 mb-2">
            <Receipt className="w-3.5 h-3.5" />
            {(assignment.grocery_receipts || []).length} receipt(s) uploaded
          </button>
          <AnimatePresence>
            {showReceipts && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="space-y-1 mb-2">
                  {(assignment.grocery_receipts || []).map((r, i) => (
                    <a key={i} href={r.receipt_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                      <Camera className="w-3 h-3" /> Receipt {i + 1} — ${r.amount_usd?.toFixed(2) || '0.00'}
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <input type="file" accept="image/*" ref={fileRef} onChange={handleReceiptUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-300 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all w-full justify-center">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Uploading…' : 'Upload Grocery Receipt'}
          </button>
        </div>

        {/* Same-day checkout notice */}
        {!assignment.client_checkout_confirmed && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs text-blue-700">
            <strong>Reminder:</strong> Client must confirm checkout before you leave. All groceries and travel costs will be paid same-day.
          </div>
        )}
        {assignment.client_checkout_confirmed && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
            <CheckCircle className="w-4 h-4" /> Client checkout confirmed — payment processing
          </div>
        )}
      </div>
    </div>
  );
}

function EarningsRow({ assignment }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-700">{assignment.patient_name}</p>
        <p className="text-xs text-slate-400">{assignment.created_at ? new Date(assignment.created_at).toLocaleDateString() : '—'}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-emerald-700">${(assignment.companion_net_care_fee_usd || 0).toFixed(2)}</p>
        <p className={`text-[10px] font-bold ${assignment.companion_paid_out ? 'text-emerald-600' : 'text-amber-600'}`}>
          {assignment.companion_paid_out ? '✓ Paid' : 'Pending'}
        </p>
      </div>
    </div>
  );
}

function VerificationBadge({ status }) {
  const configs = {
    verified: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' },
    pending_interview: { label: 'Interview Pending', color: 'bg-amber-100 text-amber-700' },
    interview_scheduled: { label: 'Interview Scheduled', color: 'bg-blue-100 text-blue-700' },
    rejected: { label: 'Not Approved', color: 'bg-red-100 text-red-700' },
  };
  const cfg = configs[status] || configs.pending_interview;
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${cfg.color}`}>{cfg.label}</span>;
}

function StatCard({ label, value, color, icon: Icon }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className={`${colors[color]} rounded-2xl px-4 py-3`}>
      <Icon className="w-4 h-4 mb-1 opacity-70" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] opacity-70">{label}</p>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div>
      <div className="mb-3">
        <p className="font-bold text-slate-800 text-sm">{title}</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function EmptyCard({ icon: Icon, text }) {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-8 text-center text-slate-400">
      <Icon className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-xs">{text}</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50">
      <div className="text-center">
        <Heart className="w-10 h-10 text-rose-300 mx-auto mb-3 animate-pulse" />
        <p className="text-slate-500 text-sm">Loading your dashboard…</p>
      </div>
    </div>
  );
}