// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ShieldX, Clock, CheckCircle2, XCircle,
  AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Plus, Lock
} from 'lucide-react';

const STATUS_CONFIG = {
  pending:   { color: 'bg-amber-100 text-amber-800',  icon: Clock,        label: 'Pending' },
  approved:  { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2, label: 'Approved' },
  denied:    { color: 'bg-red-100 text-red-800',      icon: XCircle,      label: 'Denied' },
  expired:   { color: 'bg-slate-100 text-slate-600',  icon: AlertTriangle, label: 'Expired' },
};

const ALLOWED_CONFIGS = [
  { key: 'DefaultDoctorConfig', label: 'Default Doctor Config', description: 'Assign the default doctor for dental/Venezuela cases' },
  { key: 'risk_weights',        label: 'SAFE-T Risk Weights',   description: 'Adjust automated risk scoring weights' },
  { key: 'ADMIN_EMAIL',         label: 'Admin Alert Email',     description: 'Primary admin notification email address' },
];

function ApprovalSteps({ change, _currentUser }) {
  const step1Done = !!change.approved_by_1_id;
  const step2Done = !!change.approved_by_2_id;
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${step1Done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
        <CheckCircle2 className="w-3 h-3" />
        {step1Done ? (change.approved_by_1_name || 'Admin 1') : 'Approval 1'}
      </div>
      <div className="w-6 h-0.5 bg-slate-200 rounded" />
      <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${step2Done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
        <CheckCircle2 className="w-3 h-3" />
        {step2Done ? (change.approved_by_2_name || 'Admin 2') : 'Approval 2'}
      </div>
    </div>
  );
}

function ChangeCard({ change, currentUser, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(null); // 'approve' | 'deny'
  const [denyReason, setDenyReason] = useState('');
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');

  const cfg = STATUS_CONFIG[change.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const expiresAt = change.expires_at ? new Date(change.expires_at) : null;
  const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt - new Date()) / 3600000)) : null;

  const canAct = change.status === 'pending'
    && change.requested_by_id !== currentUser?.id
    && change.approved_by_1_id !== currentUser?.id;

  const handleAction = async (action) => {
    setActing(true);
    setActionError('');
    try {
      const res = await base44.functions.invoke('processConfigApproval', {
        change_id: change.id,
        action,
        deny_reason: denyReason || undefined,
      });
      if (res.data?.error) {
        setActionError(res.data.error);
        return;
      }
      setShowConfirm(null);
      onAction();
    } catch (err) {
      setActionError(err?.data?.error || err?.message || 'Could not process this action — please try again.');
    } finally {
      setActing(false);
    }
  };

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-slate-900 text-sm">{change.config_label || change.config_key}</span>
              <Badge className={`text-xs ${cfg.color}`}><Icon className="w-3 h-3 mr-1" />{cfg.label}</Badge>
              {change.status === 'pending' && hoursLeft !== null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hoursLeft < 12 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {hoursLeft}h left
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Requested by <span className="font-semibold text-slate-700">{change.requested_by_name || change.requested_by_email}</span>
              {' · '}{change.created_date ? new Date(change.created_date).toLocaleString() : ''}
            </p>
            {change.change_reason && (
              <p className="text-xs text-slate-500 mt-1 italic">"{change.change_reason}"</p>
            )}
            {change.status === 'pending' && <ApprovalSteps change={change} currentUser={currentUser} />}
          </div>
          <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-slate-600 mt-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Action buttons */}
        {canAct && !showConfirm && (
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setShowConfirm('approve')} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Approve
            </Button>
            <Button onClick={() => setShowConfirm('deny')} size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 rounded-xl gap-1.5">
              <ShieldX className="w-4 h-4" /> Deny
            </Button>
          </div>
        )}

        {change.status === 'pending' && change.requested_by_id === currentUser?.id && (
          <p className="text-xs text-slate-400 mt-3 flex items-center gap-1"><Lock className="w-3 h-3" /> You cannot approve your own request.</p>
        )}
        {change.status === 'pending' && change.approved_by_1_id === currentUser?.id && (
          <p className="text-xs text-amber-600 mt-3 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> You've already approved. Waiting for a second admin.</p>
        )}

        {/* Confirm modal inline */}
        <AnimatePresence>
          {showConfirm && (
            <motion.div className="mt-4 p-4 rounded-xl border bg-slate-50 space-y-3"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {showConfirm === 'approve' ? (
                <>
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Confirm Approval
                  </p>
                  <p className="text-xs text-slate-500">By approving, you are signing off on this system configuration change. Your identity is recorded in the audit log.</p>
                  {actionError && <p className="text-xs text-red-600 font-semibold">{actionError}</p>}
                  <div className="flex gap-2">
                    <Button onClick={() => handleAction('approve')} disabled={acting} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                      {acting ? 'Processing...' : 'Confirm Approval'}
                    </Button>
                    <Button onClick={() => { setShowConfirm(null); setActionError(''); }} variant="outline" size="sm" className="rounded-xl">Cancel</Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <ShieldX className="w-4 h-4 text-red-500" /> Confirm Denial
                  </p>
                  <textarea
                    value={denyReason}
                    onChange={e => setDenyReason(e.target.value)}
                    placeholder="Reason for denial (required)"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                    rows={2}
                  />
                  {actionError && <p className="text-xs text-red-600 font-semibold">{actionError}</p>}
                  <div className="flex gap-2">
                    <Button onClick={() => handleAction('deny')} disabled={acting || !denyReason.trim()} size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-xl">
                      {acting ? 'Processing...' : 'Confirm Denial'}
                    </Button>
                    <Button onClick={() => { setShowConfirm(null); setActionError(''); }} variant="outline" size="sm" className="rounded-xl">Cancel</Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-3"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              {change.previous_value && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Previous Value</p>
                  <pre className="text-xs bg-white border border-slate-200 rounded-xl p-3 overflow-auto max-h-32">
                    {JSON.stringify(change.previous_value, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Requested Value</p>
                <pre className="text-xs bg-white border border-emerald-200 rounded-xl p-3 overflow-auto max-h-32">
                  {JSON.stringify(change.requested_value, null, 2)}
                </pre>
              </div>
            </div>
            {change.denied_reason && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <p className="text-xs font-semibold text-red-700">Denial Reason: {change.denied_reason}</p>
                {change.denied_by_name && <p className="text-xs text-red-500">by {change.denied_by_name} · {change.denied_at ? new Date(change.denied_at).toLocaleString() : ''}</p>}
              </div>
            )}
            {change.applied_at && (
              <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Applied to system at {new Date(change.applied_at).toLocaleString()}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RequestChangeModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ config_key: '', requested_value_raw: '{}', change_reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedConfig = ALLOWED_CONFIGS.find(c => c.key === form.config_key);

  const handleSubmit = async () => {
    setError('');
    let parsedValue;
    try {
      parsedValue = JSON.parse(form.requested_value_raw);
    } catch {
      setError('Requested value must be valid JSON.');
      return;
    }
    if (!form.config_key) { setError('Please select a config key.'); return; }
    if (!form.change_reason.trim()) { setError('Please provide a reason for this change.'); return; }

    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('requestConfigChange', {
        config_key: form.config_key,
        config_label: selectedConfig?.label,
        requested_value: parsedValue,
        change_reason: form.change_reason,
      });
      if (res.data?.error) { setError(res.data.error); return; }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Could not submit this request — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full space-y-4"
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Request Config Change</h3>
            <p className="text-xs text-slate-400">Requires two separate admin approvals within 72 hours</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Configuration Key</label>
            <select value={form.config_key} onChange={e => setForm({ ...form, config_key: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300">
              <option value="">Select a config...</option>
              {ALLOWED_CONFIGS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            {selectedConfig && <p className="text-xs text-slate-400 mt-1">{selectedConfig.description}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Requested Value (JSON)</label>
            <textarea value={form.requested_value_raw} onChange={e => setForm({ ...form, requested_value_raw: e.target.value })}
              rows={5} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Reason for Change</label>
            <textarea value={form.change_reason} onChange={e => setForm({ ...form, change_reason: e.target.value })}
              rows={2} placeholder="Why is this change needed?"
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
          </div>
        </div>

        {error && <p className="text-xs text-red-600 font-semibold bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl">
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl">Cancel</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminConfigApprovals() {
  const [tab, setTab] = useState('pending');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const { data: allChanges = [], isLoading, refetch } = useQuery({
    queryKey: ['system_config_changes'],
    // User-scoped: asServiceRole throws in the browser (backend-only). Admin
    // RLS on SystemConfigChange permits this read directly.
    queryFn: () => base44.entities.SystemConfigChange.list('-created_date', 100),
    staleTime: 30000,
  });

  const pending   = allChanges.filter(c => c.status === 'pending');
  const historical = allChanges.filter(c => c.status !== 'pending');

  const displayed = tab === 'pending' ? pending : historical;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold font-display flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-amber-600" /> Config Approval Queue
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Critical system changes require two separate admin approvals within 72 hours.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-1.5">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button onClick={() => setShowRequestModal(true)} size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="w-4 h-4" /> Request Change
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pending', value: pending.length, color: 'text-amber-700 bg-amber-50' },
            { label: 'Approved', value: allChanges.filter(c => c.status === 'approved').length, color: 'text-emerald-700 bg-emerald-50' },
            { label: 'Denied', value: allChanges.filter(c => c.status === 'denied').length, color: 'text-red-700 bg-red-50' },
            { label: 'Expired', value: allChanges.filter(c => c.status === 'expired').length, color: 'text-slate-600 bg-slate-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 ${s.color} border border-current/10`}>
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {['pending', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'pending' ? `Pending (${pending.length})` : `History (${historical.length})`}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-2 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{tab === 'pending' ? 'No pending approvals' : 'No historical changes yet'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(change => (
              <ChangeCard key={change.id} change={change} currentUser={currentUser} onAction={refetch} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showRequestModal && (
          <RequestChangeModal
            onClose={() => setShowRequestModal(false)}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['system_config_changes'] })}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}