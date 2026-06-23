import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Clock, CheckCircle2, XCircle, AlertTriangle, Plus,
  ExternalLink, ChevronDown, ChevronUp, CalendarClock, Pencil, Trash2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'text-slate-500', bg: 'bg-slate-100', dot: 'bg-slate-400', order: 0 },
  preparing_documents: { label: 'Preparing Documents', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-400', order: 1 },
  applied: { label: 'Applied', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500', order: 2 },
  in_review: { label: 'In Review', color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-500', order: 3 },
  approved: { label: 'Approved ✓', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500', order: 4 },
  denied: { label: 'Denied', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500', order: 4 },
  expired: { label: 'Expired', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400', order: 4 },
};

const TIMELINE_STEPS = ['not_started', 'preparing_documents', 'applied', 'in_review', 'approved'];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff;
}

function urgencyBadge(days) {
  if (days === null) return null;
  if (days < 0) return { label: 'Overdue', cls: 'bg-red-100 text-red-700' };
  if (days <= 7) return { label: `${days}d left — URGENT`, cls: 'bg-red-100 text-red-700' };
  if (days <= 21) return { label: `${days} days left`, cls: 'bg-amber-100 text-amber-700' };
  return { label: `${days} days left`, cls: 'bg-blue-50 text-blue-600' };
}

function ApplicationCard({ app, onStatusChange, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [editingRef, setEditingRef] = useState(false);
  const [refValue, setRefValue] = useState(app.application_reference || '');
  const [saving, setSaving] = useState(false);
  const cfg = STATUS_CONFIG[app.application_status] || STATUS_CONFIG.not_started;
  const procedureDays = daysUntil(app.procedure_date);
  const urgency = urgencyBadge(procedureDays);
  const currentStep = TIMELINE_STEPS.indexOf(app.application_status);

  const saveRef = async () => {
    setSaving(true);
    await base44.entities.VisaApplication.update(app.id, { application_reference: refValue });
    setSaving(false);
    setEditingRef(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot} ${app.application_status === 'in_review' ? 'animate-pulse' : ''}`} />
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">
              {app.nationality} → {app.destination_country}
            </p>
            <p className="text-xs text-slate-500 truncate">{app.visa_type || 'Visa type not specified'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {urgency && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${urgency.cls}`}>{urgency.label}</span>
          )}
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">

              {/* Progress timeline */}
              <div className="flex items-center gap-1">
                {TIMELINE_STEPS.map((step, i) => {
                  const s = STATUS_CONFIG[step];
                  const done = currentStep > i || app.application_status === 'approved';
                  const active = currentStep === i && app.application_status !== 'denied' && app.application_status !== 'expired';
                  return (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-emerald-500 border-emerald-500' : active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                          {done ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <div className={`w-2 h-2 rounded-full ${active ? 'bg-blue-500' : 'bg-slate-200'}`} />}
                        </div>
                        <p className={`text-[8px] font-medium text-center max-w-[52px] leading-tight ${active ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>{s.label.replace(' ✓','')}</p>
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-4 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {app.application_status === 'denied' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-red-700">Application Denied</p>
                    {app.denial_reason && <p className="text-xs text-red-600 mt-0.5">{app.denial_reason}</p>}
                    <p className="text-xs text-red-600 mt-1">Contact your Morales coordinator to discuss next steps or reapplication options.</p>
                  </div>
                </div>
              )}

              {/* Application reference */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Application Reference</p>
                {editingRef ? (
                  <div className="flex gap-2">
                    <input value={refValue} onChange={e => setRefValue(e.target.value)}
                      placeholder="e.g. EVISA-2026-XXXXX"
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    <button onClick={saveRef} disabled={saving}
                      className="px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 disabled:opacity-50">
                      {saving ? '…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingRef(false)} className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex-1">
                      {app.application_reference || 'Not yet assigned'}
                    </span>
                    <button onClick={() => setEditingRef(true)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Dates */}
              {(app.applied_date || app.procedure_date) && (
                <div className="grid grid-cols-2 gap-3">
                  {app.applied_date && (
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-slate-400 font-medium mb-0.5">Applied</p>
                      <p className="text-xs font-semibold text-slate-700">{new Date(app.applied_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {app.procedure_date && (
                    <div className={`rounded-xl px-3 py-2.5 ${procedureDays !== null && procedureDays <= 21 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                      <p className="text-[10px] text-slate-400 font-medium mb-0.5">Procedure Date</p>
                      <p className="text-xs font-semibold text-slate-700">{new Date(app.procedure_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Apply Now button */}
              {app.portal_url && app.application_status !== 'approved' && (
                <a href={app.portal_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all">
                  <ExternalLink className="w-4 h-4" />
                  Open Official Application Portal
                </a>
              )}

              {/* Status update buttons */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Update Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(STATUS_CONFIG).filter(([k]) => k !== app.application_status).map(([key, s]) => (
                    <button key={key} onClick={() => onStatusChange(app.id, key)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${s.bg} ${s.color} border-current/20 hover:opacity-80`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => onDelete(app.id)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Remove application
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function VisaApplicationTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ nationality: '', destination_country: '', visa_type: '', portal_url: '', procedure_date: '' });

  useEffect(() => {
    if (!user) return;
    base44.entities.VisaApplication.filter({ user_id: user.id })
      .then(data => setApplications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleStatusChange = async (id, status) => {
    const update = { application_status: status };
    if (status === 'applied') update.applied_date = new Date().toISOString();
    if (status === 'approved') update.approved_date = new Date().toISOString();
    await base44.entities.VisaApplication.update(id, update);
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...update } : a));
    toast({ title: 'Status updated', description: `Application marked as ${STATUS_CONFIG[status]?.label}` });
  };

  const handleDelete = async (id) => {
    await base44.entities.VisaApplication.delete(id);
    setApplications(prev => prev.filter(a => a.id !== id));
  };

  const handleCreate = async () => {
    if (!newForm.nationality || !newForm.destination_country) return;
    const app = await base44.entities.VisaApplication.create({
      ...newForm,
      user_id: user.id,
      application_status: 'not_started',
      reminder_enabled: true,
    });
    setApplications(prev => [app, ...prev]);
    setShowNew(false);
    setNewForm({ nationality: '', destination_country: '', visa_type: '', portal_url: '', procedure_date: '' });
    toast({ title: 'Application tracked', description: 'We\'ll send you reminders based on your procedure date.' });
  };

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">My Visa Applications</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track your application status and get reminders before your procedure date.</p>
        </div>
        <button onClick={() => setShowNew(s => !s)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-all">
          <Plus className="w-4 h-4" /> Track New
        </button>
      </div>

      {/* New application form */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold text-blue-800">Track a New Visa Application</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Your Nationality', key: 'nationality', placeholder: 'e.g. Trinidadian' },
                { label: 'Destination Country', key: 'destination_country', placeholder: 'e.g. India' },
                { label: 'Visa Type (optional)', key: 'visa_type', placeholder: 'e.g. Medical e-Visa' },
                { label: 'Official Portal URL (optional)', key: 'portal_url', placeholder: 'https://indianvisaonline.gov.in' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[11px] font-semibold text-blue-700 mb-1 block">{f.label}</label>
                  <input value={newForm[f.key]} onChange={e => setNewForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full border border-blue-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              ))}
              <div>
                <label className="text-[11px] font-semibold text-blue-700 mb-1 block">Procedure Date (optional)</label>
                <input type="date" value={newForm.procedure_date} onChange={e => setNewForm(p => ({ ...p, procedure_date: e.target.value }))}
                  className="w-full border border-blue-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleCreate} disabled={!newForm.nationality || !newForm.destination_country}
                className="px-5 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-40 transition-all">
                Start Tracking
              </button>
              <button onClick={() => setShowNew(false)} className="px-4 py-2.5 border border-blue-200 rounded-xl text-sm text-blue-700 hover:bg-blue-100">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {applications.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
          <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600 mb-1">No applications tracked yet</p>
          <p className="text-xs text-slate-400 mb-4">After running a visa check, track your application here to receive timely reminders.</p>
          <button onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700">
            <Plus className="w-4 h-4" /> Track Your First Application
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <ApplicationCard key={app.id} app={app} onStatusChange={handleStatusChange} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <AlertTriangle className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Morales uses your procedure date to send reminders at 30, 14, and 7 days before travel. Always apply for your visa well in advance — most medical visas require 3–15 business days to process.
        </p>
      </div>
    </div>
  );
}
