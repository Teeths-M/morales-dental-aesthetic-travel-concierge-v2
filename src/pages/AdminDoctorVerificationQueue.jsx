import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, ExternalLink, Clock, Search, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';

const STATUS_STYLES = {
  pending:        'bg-slate-100 text-slate-700',
  manual_review:  'bg-amber-100 text-amber-800',
  auto_verified:  'bg-blue-100 text-blue-800',
  verified:       'bg-emerald-100 text-emerald-800',
  denied:         'bg-red-100 text-red-800',
  expired:        'bg-orange-100 text-orange-800',
};

export default function AdminDoctorVerificationQueue() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('manual_review');
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ['doctor-verifications', filter],
    queryFn: async () => {
      if (filter === 'all') {
        return base44.entities.DoctorVerification.list('-submitted_at', 100);
      }
      return base44.entities.DoctorVerification.filter({ verification_status: filter }, '-submitted_at', 100);
    }
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['country-configs'],
    queryFn: () => base44.entities.CountryVerificationConfig.list()
  });

  const configByCountry = configs.reduce((acc, c) => { acc[c.country] = c; return acc; }, {});

  const filtered = records.filter(r =>
    !search || r.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.country?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = async (actionType) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await base44.functions.invoke('runDoctorVerification', {
        action: actionType,
        verification_record_id: selected.id,
        notes,
        denial_reason: denialReason
      });
      setSelected(null);
      setNotes('');
      setDenialReason('');
      qc.invalidateQueries(['doctor-verifications']);
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setActionLoading(false);
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Doctor Verification Queue</h1>
            <p className="text-sm text-slate-500 mt-1">Review and approve medical license verifications</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'manual_review', label: 'Pending Review' },
            { id: 'pending', label: 'Submitted' },
            { id: 'verified', label: 'Verified' },
            { id: 'denied', label: 'Denied' },
            { id: 'expired', label: 'Expired' },
            { id: 'all', label: 'All' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${filter === tab.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by doctor name, registration number, or country…"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">No records found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Doctor', 'Country', 'Registration #', 'Registry', 'Submitted', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(rec => {
                  const config = configByCountry[rec.country];
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{rec.doctor_name}</div>
                        <div className="text-xs text-slate-500">{rec.doctor_email}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{rec.country}</td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{rec.registration_number}</code>
                      </td>
                      <td className="px-4 py-3">
                        {(config?.registry_url || rec.registry_url) ? (
                          <a href={config?.registry_url || rec.registry_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                            {config?.registry_name || rec.registry_name || 'Registry'}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">{rec.registry_name || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {rec.submitted_at ? new Date(rec.submitted_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[rec.verification_status] || 'bg-slate-100 text-slate-700'}`}>
                          {rec.verification_status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(rec.verification_status === 'manual_review' || rec.verification_status === 'pending') && (
                          <button onClick={() => { setSelected(rec); setNotes(''); setDenialReason(''); }}
                            className="text-xs text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 font-medium">
                            Review
                          </button>
                        )}
                        {rec.verification_status === 'verified' && (
                          <span className="text-xs text-emerald-600 font-medium">
                            Expires {rec.expires_at ? new Date(rec.expires_at).toLocaleDateString() : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Review Modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Review Verification</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{selected.doctor_name} — {selected.country}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none">×</button>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Registration #</span><code className="font-mono font-bold">{selected.registration_number}</code></div>
                <div className="flex justify-between"><span className="text-slate-500">Country</span><span className="font-medium">{selected.country}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Specialty</span><span>{selected.specialty || 'Not specified'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Submitted</span><span>{selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : '—'}</span></div>
                {selected.notes && <div className="pt-2 border-t border-slate-200"><p className="text-slate-500 text-xs mb-1">Auto-verification notes:</p><p className="text-xs text-slate-700">{selected.notes}</p></div>}
              </div>

              {/* Registry Link */}
              {(configByCountry[selected.country]?.registry_url || selected.registry_url) && (
                <a href={configByCountry[selected.country]?.registry_url || selected.registry_url}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-blue-200 text-blue-700 font-semibold text-sm hover:bg-blue-50">
                  <ExternalLink className="w-4 h-4" />
                  Open Official Registry: {configByCountry[selected.country]?.registry_name || selected.registry_name}
                </a>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Review Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g. Confirmed via GMC register — license in good standing" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Denial Reason (if denying)</label>
                <input value={denialReason} onChange={e => setDenialReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g. Registration number not found in registry" />
              </div>

              <div className="flex gap-3">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleAction('admin_verify')} disabled={actionLoading}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Verify
                </Button>
                <Button variant="destructive" className="flex-1"
                  onClick={() => handleAction('admin_deny')} disabled={actionLoading || !denialReason}>
                  <XCircle className="w-4 h-4 mr-2" /> Deny
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}