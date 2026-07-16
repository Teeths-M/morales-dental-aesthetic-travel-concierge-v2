import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Clock, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COUNTRY_OPTIONS = [
  'United Kingdom', 'Australia', 'Canada (Ontario)', 'Italy', 'Spain', 'France',
  'Germany', 'USA', 'Mexico', 'Brazil', 'Colombia', 'Thailand', 'India',
  'Turkey', 'Dominican Republic', 'Costa Rica', 'Panama', 'Venezuela', 'Other'
];

const STATUS_CONFIG = {
  verified:       { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'Verified' },
  auto_verified:  { icon: CheckCircle, color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',       label: 'Auto-Verified' },
  manual_review:  { icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',     label: 'Under Review' },
  pending:        { icon: Clock,       color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200',     label: 'Pending' },
  denied:         { icon: XCircle,     color: 'text-red-600',     bg: 'bg-red-50 border-red-200',         label: 'Denied' },
  expired:        { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200',  label: 'Expired' },
};

export default function DoctorVerificationPanel({ _user }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [form, setForm] = useState({ country: '', registration_number: '', specialty: '' });

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('runDoctorVerification', { action: 'get_status' });
      const records = res.data?.records || [];
      const active = records.find(r => ['pending', 'auto_verified', 'manual_review', 'verified'].includes(r.verification_status));
      setRecord(active || records[0] || null);
    } catch (_) {}
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.country || !form.registration_number) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await base44.functions.invoke('runDoctorVerification', {
        action: 'submit',
        country: form.country,
        registration_number: form.registration_number,
        specialty: form.specialty
      });
      setSubmitResult(res.data);
      await loadStatus();
      setShowForm(false);
    } catch (err) {
      setSubmitResult({ error: err.message });
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="h-20 flex items-center justify-center text-slate-400 text-sm">Checking verification status…</div>;
  }

  const cfg = record ? STATUS_CONFIG[record.verification_status] : null;
  const Icon = cfg?.icon;
  const needsVerification = !record || record.verification_status === 'denied' || record.verification_status === 'expired';

  return (
    <div className="space-y-4">
      {/* Banner when not verified */}
      {needsVerification && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Verification Required</p>
            <p className="text-xs text-amber-700 mt-0.5">You must be verified before you can receive patient referrals on the Morales Platform.</p>
          </div>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0"
            onClick={() => setShowForm(true)}>
            Verify Now
          </Button>
        </div>
      )}

      {/* Current status card */}
      {record && !needsVerification && (
        <div className={`border rounded-xl px-4 py-4 flex items-center gap-4 ${cfg?.bg}`}>
          {Icon && <Icon className={`w-6 h-6 flex-shrink-0 ${cfg?.color}`} />}
          <div className="flex-1">
            <p className={`font-semibold text-sm ${cfg?.color}`}>{cfg?.label}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {record.registry_name} · {record.country} · Reg# {record.registration_number}
            </p>
            {record.verified_at && (
              <p className="text-xs text-slate-500 mt-0.5">
                Verified {new Date(record.verified_at).toLocaleDateString()}
                {record.expires_at && ` · Expires ${new Date(record.expires_at).toLocaleDateString()}`}
              </p>
            )}
            {record.verification_status === 'manual_review' && (
              <p className="text-xs text-amber-700 mt-1">Your submission is under review. We'll notify you by email.</p>
            )}
          </div>
          {record.registry_url && (
            <a href={record.registry_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
              Registry <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Expiry warning at 30 days */}
      {record?.expires_at && record.verification_status === 'verified' && (
        (() => {
          const daysLeft = Math.ceil((new Date(record.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return daysLeft <= 30 ? (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <p className="text-xs text-orange-800 font-medium">Your verification expires in {daysLeft} days. Please re-verify soon.</p>
              <Button size="sm" variant="outline" className="ml-auto border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={() => setShowForm(true)}>
                Renew
              </Button>
            </div>
          ) : null;
        })()
      )}

      {/* Submission form */}
      {(showForm || (!record && !loading)) && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm">Submit License for Verification</h3>
            {record && <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Country of Registration *</label>
              <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                <option value="">Select country…</option>
                {COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Registration / License Number *</label>
              <input value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))}
                required placeholder="e.g. 7654321 or MC123456"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Medical Specialty</label>
              <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                placeholder="e.g. Plastic Surgery, General Surgery"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            {submitResult?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{submitResult.error}</div>
            )}
            <Button type="submit" disabled={submitting || !form.country || !form.registration_number} className="w-full">
              {submitting ? 'Submitting…' : 'Submit for Verification'}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}