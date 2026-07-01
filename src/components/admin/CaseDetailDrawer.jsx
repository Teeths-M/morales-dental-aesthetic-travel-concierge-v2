import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Mail, MapPin, Activity, CreditCard, Calendar, ExternalLink, ShieldCheck, User, Sparkles, Loader2 } from 'lucide-react';
import WaiverAdminPanel from '@/components/admin/WaiverAdminPanel';
import HandshakeTimelinePanel from '@/components/admin/HandshakeTimelinePanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const CASE_STATUSES = [
  'Submitted', 'Safe-T-Reviewed', 'Doctor-Pending', 'Vendor-Pending',
  'Admin-Review', 'Proposal-Sent', 'PMP-25', 'PMP-50', 'Deposit-Paid',
  'Travel-Coordination', 'Ready-For-Travel', 'Procedure-In-Progress',
  'SURGICAL_EXECUTION_WINDOW', 'RECOVERY_PHASE_7_DAY', 'Recovery', 'Completed',
  'waiver_refused', 'companion_required_pending', 'companion_required_waived',
];

const RISK_COLORS = {
  Low: 'bg-green-100 text-green-700',
  low: 'bg-green-100 text-green-700',
  Moderate: 'bg-amber-100 text-amber-700',
  medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
  high: 'bg-red-100 text-red-700',
};

const PAYMENT_COLORS = {
  'Pending': 'bg-slate-100 text-slate-600',
  '25% Paid': 'bg-blue-100 text-blue-700',
  '50% Paid': 'bg-indigo-100 text-indigo-700',
  'Paid In Full': 'bg-green-100 text-green-700',
  'Failed': 'bg-red-100 text-red-700',
  'Refunded': 'bg-orange-100 text-orange-700',
};

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  );
}

export default function CaseDetailDrawer({ caseRecord, onClose, onStatusUpdated }) {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState(caseRecord?.status || '');
  const [doctors, setDoctors] = useState([]);
  const [assigningDoctor, setAssigningDoctor] = useState(false);

  useEffect(() => {
    setSelectedStatus(caseRecord?.status || '');
  }, [caseRecord?.id]);

  useEffect(() => {
    if (caseRecord) {
      base44.asServiceRole.entities.Doctor.filter({ status: 'active' }).then(setDoctors).catch(() => {});
    }
  }, [caseRecord?.id]);

  // Fetch linked WorkflowEvent for risk info
  const { data: workflowEvents = [] } = useQuery({
    queryKey: ['workflow_event', caseRecord?.consultation_id],
    queryFn: () => base44.asServiceRole.entities.WorkflowEvent.filter({ consultation_id: caseRecord.consultation_id }),
    enabled: !!caseRecord?.consultation_id,
  });
  const workflow = workflowEvents[0] || null;

  const sendBriefsMutation = useMutation({
    mutationFn: () => base44.functions.invoke('sendAIPartnerBriefs', {
      case_id: caseRecord.id,
      workflow_id: workflow?.id,
    }),
    onSuccess: (data) => toast.success(`AI briefs sent to: ${data?.data?.roles_briefed?.join(', ') || 'partners'}`),
    onError: () => toast.error('Failed to send AI briefs'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, { status: newStatus });
    },
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['admin_all_cases'] });
      if (onStatusUpdated) onStatusUpdated();
    },
    onError: () => toast.error('Failed to update status'),
  });

  const appUrl = window.location.origin;
  const doctorPortalUrl = caseRecord?.doctor_portal_token
    ? `${appUrl}/portal/doctor/${caseRecord.doctor_portal_token}`
    : null;

  const isStatusDirty = selectedStatus !== caseRecord?.status;

  const handleAssignDoctor = async (doctorId) => {
    setAssigningDoctor(true);
    try {
      if (workflow) {
        await base44.asServiceRole.entities.WorkflowEvent.update(workflow.id, {
          assigned_doctor_id: doctorId,
          stage: 'doctor',
          last_update_summary: `Doctor manually reassigned by admin on ${new Date().toISOString()}`,
        });
      }
      await base44.functions.invoke('generateDoctorPortalLink', {
        workflow_id: workflow?.id,
        doctor_id: doctorId,
        consultation_id: caseRecord.consultation_id,
      });
      toast.success('Doctor assigned and portal link sent');
    } catch (e) {
      toast.error('Failed to assign doctor');
    } finally {
      setAssigningDoctor(false);
    }
  };

  return (
    <AnimatePresence>
      {caseRecord && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold truncate">{caseRecord.client_name}</h2>
                <p className="text-blue-100 text-xs mt-0.5 truncate">{caseRecord.client_email}</p>
              </div>
              <button onClick={onClose} className="ml-3 p-1.5 rounded-lg hover:bg-white/20 transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* Status override */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Case Status</p>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isStatusDirty && (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={updateStatusMutation.isPending}
                    onClick={() => updateStatusMutation.mutate(selectedStatus)}
                  >
                    {updateStatusMutation.isPending ? 'Saving…' : 'Save Status Change'}
                  </Button>
                )}
              </div>

              {/* Doctor Assignment */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assign Doctor</p>
                <select
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white disabled:opacity-50"
                  value={workflow?.assigned_doctor_id || ''}
                  onChange={e => handleAssignDoctor(e.target.value)}
                  disabled={assigningDoctor}
                >
                  <option value="">— Unassigned —</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name} · {d.clinic_city || d.clinic_country}</option>
                  ))}
                </select>
                {assigningDoctor && <p className="text-xs text-slate-400">Assigning…</p>}
              </div>

              {/* Patient info */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 pb-2">Patient</p>
                <Row label="Full Name">
                  <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" />{caseRecord.client_name}</span>
                </Row>
                <Row label="Email">
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{caseRecord.client_email}</span>
                </Row>
                {caseRecord.client_phone && (
                  <Row label="Phone">{caseRecord.client_phone}</Row>
                )}
                {caseRecord.client_country && (
                  <Row label="Country">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{caseRecord.client_country}</span>
                  </Row>
                )}
              </div>

              {/* Procedure */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 pb-2">Procedure</p>
                <Row label="Procedures">
                  <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-slate-400" />{caseRecord.procedures?.join(', ') || 'TBD'}</span>
                </Row>
                {caseRecord.procedure_country && (
                  <Row label="Destination Country">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{caseRecord.procedure_country}</span>
                  </Row>
                )}
                {caseRecord.doctor_selected && (
                  <Row label="Assigned Doctor">{caseRecord.doctor_selected}</Row>
                )}
                {caseRecord.clinic_selected && (
                  <Row label="Clinic">{caseRecord.clinic_selected}</Row>
                )}
              </div>

              {/* Risk */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 pb-2">Risk Assessment</p>
                <Row label="Risk Level">
                  {caseRecord.risk_score ? (
                    <Badge className={RISK_COLORS[caseRecord.risk_score] || 'bg-slate-100 text-slate-600'}>
                      <ShieldCheck className="w-3 h-3 mr-1" />{caseRecord.risk_score}
                    </Badge>
                  ) : <span className="text-slate-400">Not assessed</span>}
                </Row>
                <Row label="SAFE-T Result">
                  <Badge className={caseRecord.safe_t_result === 'PASSED' ? 'bg-green-100 text-green-700' : caseRecord.safe_t_result === 'BLOCKED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}>
                    {caseRecord.safe_t_result || 'PENDING'}
                  </Badge>
                </Row>
                {workflow?.risk_summary && (
                  <Row label="Risk Summary">
                    <p className="text-slate-600 text-xs leading-relaxed">{workflow.risk_summary}</p>
                  </Row>
                )}
              </div>

              {/* Payment */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 pb-2">Payment</p>
                <Row label="Payment Status">
                  <Badge className={PAYMENT_COLORS[caseRecord.payment_status] || 'bg-slate-100 text-slate-600'}>
                    <CreditCard className="w-3 h-3 mr-1" />{caseRecord.payment_status || 'Pending'}
                  </Badge>
                </Row>
                {caseRecord.final_package_price > 0 && (
                  <Row label="Package Price">${caseRecord.final_package_price?.toLocaleString()}</Row>
                )}
                {caseRecord.amount_paid > 0 && (
                  <Row label="Amount Paid">${caseRecord.amount_paid?.toLocaleString()}</Row>
                )}
                {caseRecord.amount_remaining > 0 && (
                  <Row label="Amount Remaining">${caseRecord.amount_remaining?.toLocaleString()}</Row>
                )}
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 pb-2">Timeline</p>
                <Row label="Created">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {caseRecord.created_date ? new Date(caseRecord.created_date).toLocaleString() : 'Unknown'}
                  </span>
                </Row>
                <Row label="Last Updated">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {caseRecord.updated_date ? new Date(caseRecord.updated_date).toLocaleString() : 'Unknown'}
                  </span>
                </Row>
              </div>

              {/* Waiver & companion */}
              <div className="bg-slate-50 rounded-xl p-4">
                <WaiverAdminPanel caseRecord={caseRecord} />
              </div>

              {/* Handshakes timeline */}
              <div className="bg-slate-50 rounded-xl p-4">
                <HandshakeTimelinePanel caseId={caseRecord.id} />
              </div>

              {/* AI Partner Briefs */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: '#6366f1' }}>
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Partner Briefs
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#818cf8' }}>
                    Generates a personalized AI brief for every assigned partner — doctor, travel agency, driver, companion, security — each in their own language.
                  </p>
                  {caseRecord.ai_briefs_sent_at && (
                    <p className="text-[11px] mt-1" style={{ color: '#a5b4fc' }}>
                      Last sent: {new Date(caseRecord.ai_briefs_sent_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full text-white font-semibold"
                  style={{ background: '#6366f1' }}
                  disabled={sendBriefsMutation.isPending}
                  onClick={() => sendBriefsMutation.mutate()}
                >
                  {sendBriefsMutation.isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Generating AI Briefs…</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5 mr-2" />Send AI Briefs to All Partners</>
                  )}
                </Button>
                {sendBriefsMutation.isSuccess && sendBriefsMutation.data?.data?.roles_briefed?.length > 0 && (
                  <p className="text-[11px] font-medium" style={{ color: '#10b981' }}>
                    ✓ Briefs dispatched: {sendBriefsMutation.data.data.roles_briefed.join(', ')}
                  </p>
                )}
              </div>

              {/* Doctor portal link */}
              {doctorPortalUrl && (
                <a
                  href={doctorPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Doctor Portal
                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}