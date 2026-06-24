import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-600', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  suspended: { label: 'Suspended', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
};

const FORENSICS_CONFIG = {
  authentic: { label: 'Authentic', color: 'text-emerald-700' },
  tampered: { label: '⚠️ Tampered', color: 'text-red-700' },
  inconclusive: { label: 'Inconclusive', color: 'text-amber-700' },
  pending: { label: 'Pending', color: 'text-slate-500' },
};

const SANCTIONS_CONFIG = {
  clear: { label: '✓ Clear', color: 'text-emerald-700' },
  flagged: { label: '⚠️ Flagged', color: 'text-red-700' },
  pending: { label: 'Pending', color: 'text-slate-500' },
  manual_review: { label: 'Manual Review', color: 'text-amber-700' },
};

export default function KYPVerificationPanel() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [running, setRunning] = useState(null);
  const [form, setForm] = useState({ partner_name: '', partner_email: '', partner_type: 'travel_agency', business_registration_number: '', business_registration_country: '' });
  const [expandedId, setExpandedId] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.KYPVerification.list('-submitted_at', 50);
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runVerification = async (record) => {
    setRunning(record.id);
    const res = await base44.functions.invoke('runKYPVerification', {
      partner_id: record.partner_id,
      partner_type: record.partner_type,
      partner_name: record.partner_name,
      partner_email: record.partner_email,
      business_registration_number: record.business_registration_number,
      business_registration_country: record.business_registration_country,
      document_urls: record.document_urls || []
    });
    if (res.data?.record) {
      toast({ title: `KYP scan complete: ${record.partner_name}`, description: `Risk score: ${res.data.ai_result?.risk_score}/100` });
      load();
    }
    setRunning(null);
  };

  const submitNew = async () => {
    if (!form.partner_name || !form.partner_email) return;
    setRunning('new');
    const res = await base44.functions.invoke('runKYPVerification', { ...form });
    if (res.data?.record) {
      toast({ title: 'KYP scan initiated', description: form.partner_name });
      setShowForm(false);
      setForm({ partner_name: '', partner_email: '', partner_type: 'travel_agency', business_registration_number: '', business_registration_country: '' });
      load();
    }
    setRunning(null);
  };

  const approveManually = async (id) => {
    await base44.entities.KYPVerification.update(id, {
      overall_status: 'approved',
      human_review_outcome: 'approved',
      human_reviewed_at: new Date().toISOString()
    });
    toast({ title: 'Partner manually approved' });
    load();
  };

  const rejectManually = async (id) => {
    await base44.entities.KYPVerification.update(id, {
      overall_status: 'rejected',
      human_review_outcome: 'rejected',
      human_reviewed_at: new Date().toISOString()
    });
    toast({ title: 'Partner rejected', variant: 'destructive' });
    load();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-violet-600" /> Know Your Partner (KYP) Framework
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Sanctions screening · Document forensics · AI risk scoring</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm"
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs">
          + Run KYP Scan
        </Button>
      </div>

      {/* New partner form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-700 mb-3">New KYP Verification</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Partner Name *</label>
                <input value={form.partner_name} onChange={e => setForm(f => ({ ...f, partner_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Partner Email *</label>
                <input type="email" value={form.partner_email} onChange={e => setForm(f => ({ ...f, partner_email: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Partner Type</label>
                <select value={form.partner_type} onChange={e => setForm(f => ({ ...f, partner_type: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white">
                  <option value="travel_agency">Travel Agency</option>
                  <option value="taxi_service">Taxi / Transfer</option>
                  <option value="companion">Companion Agency</option>
                  <option value="hotel">Hotel</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Business Reg. Number</label>
                <input value={form.business_registration_number} onChange={e => setForm(f => ({ ...f, business_registration_number: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Country</label>
                <input value={form.business_registration_country} onChange={e => setForm(f => ({ ...f, business_registration_country: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
            </div>
            <Button onClick={submitNew} disabled={!form.partner_name || !form.partner_email || running === 'new'}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
              {running === 'new' ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Running KYP scan...</span> : 'Run KYP Verification'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Records */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : records.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">No KYP verifications yet</p>
          <p className="text-xs text-slate-400 mt-1">Run a scan on any travel, transport, or hospitality partner</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(rec => {
            const statusCfg = STATUS_CONFIG[rec.overall_status] || STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            const isExpanded = expandedId === rec.id;

            return (
              <div key={rec.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{rec.partner_name}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" />{statusCfg.label}
                      </span>
                      {rec.human_review_required && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Manual Review</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{rec.partner_type} · {rec.partner_email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {rec.ai_risk_score !== undefined && (
                      <p className={`text-sm font-black ${rec.ai_risk_score >= 70 ? 'text-red-600' : rec.ai_risk_score >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {rec.ai_risk_score}<span className="text-xs font-normal text-slate-400">/100</span>
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400">Risk Score</p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                        <p className="text-slate-500 font-semibold mb-1">Sanctions Check</p>
                        <p className={`font-semibold ${SANCTIONS_CONFIG[rec.sanctions_check_status]?.color}`}>
                          {SANCTIONS_CONFIG[rec.sanctions_check_status]?.label || '—'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                        <p className="text-slate-500 font-semibold mb-1">Document Forensics</p>
                        <p className={`font-semibold ${FORENSICS_CONFIG[rec.document_forensics_status]?.color}`}>
                          {FORENSICS_CONFIG[rec.document_forensics_status]?.label || '—'}
                        </p>
                      </div>
                    </div>

                    {rec.ai_risk_flags?.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                        <p className="text-xs font-semibold text-amber-800 mb-1">Risk Flags</p>
                        <div className="flex flex-wrap gap-1">
                          {rec.ai_risk_flags.map(f => (
                            <span key={f} className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {rec.document_forensics_notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5">{rec.document_forensics_notes}</p>
                    )}

                    {/* Audit trail */}
                    {rec.audit_trail?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Audit Trail</p>
                        {rec.audit_trail.map((entry, i) => (
                          <div key={i} className="flex items-start gap-2 text-[10px] text-slate-500">
                            <span className="text-slate-400 flex-shrink-0">{entry.timestamp ? new Date(entry.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
                            <span>{entry.notes}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => runVerification(rec)} disabled={running === rec.id}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-violet-200 text-violet-700 rounded-xl hover:bg-violet-50">
                        {running === rec.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Re-scan
                      </button>
                      {rec.human_review_required && rec.overall_status === 'in_progress' && (
                        <>
                          <button onClick={() => approveManually(rec.id)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => rejectManually(rec.id)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700">
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}