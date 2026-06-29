import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Eye, Copy, CheckCircle2, Trash2, Plus, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function GuardianLinkManager({ caseId, patientEmail }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({ guardian_name: '', guardian_email: '', expires_hours: 48 });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.GuardianSession.filter({ case_id: caseId });
      setSessions((data ?? []).filter(s => s.is_active));
    } catch (_) {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (caseId) load(); }, [caseId]);

  const createLink = async () => {
    if (!form.guardian_name) return;
    setCreating(true);
    try {
      const res = await base44.functions.invoke('generateGuardianLink', {
        case_id: caseId,
        guardian_name: form.guardian_name,
        guardian_email: form.guardian_email,
        expires_hours: parseInt(form.expires_hours),
        data_scope: ['case_status', 'journey_stage', 'location']
      });
      if (res?.guardian_url || res?.data?.guardian_url) {
        toast({ title: 'Guardian link created', description: `Expires in ${form.expires_hours} hours` });
        setShowForm(false);
        setForm({ guardian_name: '', guardian_email: '', expires_hours: 48 });
        load();
      } else {
        toast({ title: 'Link saved', description: 'Guardian link generated successfully.' });
        load();
      }
    } catch (_) {
      toast({ title: 'Could not create link', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const revokeLink = async (id) => {
    try {
      await base44.entities.GuardianSession.update(id, { is_active: false, revoked_at: new Date().toISOString() });
      toast({ title: 'Guardian link revoked' });
      load();
    } catch (_) {
      toast({ title: 'Failed to revoke', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const copyLink = (token, id) => {
    const url = `${window.location.origin}/guardian/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const isExpired = (expiresAt) => new Date(expiresAt) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" /> Guardian View Links
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">Secure look-only links — shows live GPS location &amp; journey status. No login required.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" variant="outline" className="text-xs rounded-xl gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Link
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-800">Create Guardian View Link</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Guardian Name *</label>
                <input value={form.guardian_name} onChange={e => setForm(f => ({ ...f, guardian_name: e.target.value }))}
                  placeholder="e.g. Mom" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Email (optional — sends link)</label>
                <input type="email" value={form.guardian_email} onChange={e => setForm(f => ({ ...f, guardian_email: e.target.value }))}
                  placeholder="guardian@email.com" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Link Duration</label>
                <select value={form.expires_hours} onChange={e => setForm(f => ({ ...f, expires_hours: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>72 hours</option>
                  <option value={168}>1 week</option>
                </select>
              </div>
            </div>
            <Button onClick={createLink} disabled={!form.guardian_name || creating} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm">
              {creating ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Creating...</span> : 'Generate Guardian Link'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : sessions.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
          <Eye className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No active guardian links</p>
          <p className="text-xs text-slate-400 mt-1">Share a look-only link with family so they can follow your journey</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => {
            const expired = isExpired(session.expires_at);
            return (
              <div key={session.id} className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${expired ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                    {session.guardian_name}
                    {expired && <span className="text-[10px] font-semibold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">Expired</span>}
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {expired ? 'Expired' : `Expires ${new Date(session.expires_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`}
                    {session.view_count > 0 && <span className="ml-2">· Viewed {session.view_count}×</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!expired && (
                    <button onClick={() => copyLink(session.view_token, session.id)}
                      className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 min-h-[36px]">
                      {copied === session.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === session.id ? 'Copied' : 'Copy'}
                    </button>
                  )}
                  <button onClick={() => revokeLink(session.id)}
                    className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 min-h-[36px] min-w-[36px] flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}