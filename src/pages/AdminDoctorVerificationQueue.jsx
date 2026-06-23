import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, XCircle, ExternalLink, Clock, Search, RefreshCw,
  ShieldCheck, AlertTriangle, FileText, Eye, AlertCircle, Info,
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';

// Terminal-passed states for the activation gate
const PASSED = new Set(['passed', 'manual_override']);

function checkLabel(status) {
  if (!status || status === 'pending' || status === 'not_set')
    return { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200', text: 'Pending' };
  if (status === 'passed')
    return { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', text: 'Passed' };
  if (status === 'manual_override')
    return { icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', text: 'Override' };
  if (status === 'failed')
    return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', text: 'Failed' };
  return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', text: status };
}

function CheckBadge({ label, status }) {
  const { icon: Icon, color, bg, text } = checkLabel(status);
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bg} min-w-[130px]`}>
      <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
      <div>
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide leading-none">{label}</p>
        <p className={`text-xs font-semibold ${color} mt-0.5`}>{text}</p>
      </div>
    </div>
  );
}

const STATUS_STYLES = {
  pending:        'bg-slate-100 text-slate-700',
  manual_review:  'bg-amber-100 text-amber-800',
  pending_manual: 'bg-amber-100 text-amber-800',
  auto_verified:  'bg-blue-100 text-blue-800',
  verified:       'bg-emerald-100 text-emerald-800',
  denied:         'bg-red-100 text-red-800',
  expired:        'bg-orange-100 text-orange-800',
};

function CredentialDocumentList({ doctorId, onView }) {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['credential-docs', doctorId],
    queryFn: () => base44.entities.DoctorCredentialDocument
      ? base44.entities.DoctorCredentialDocument.filter({ doctor_id: doctorId }, '-uploaded_at', 20)
      : Promise.resolve([]),
    enabled: !!doctorId,
  });

  if (isLoading) return <p className="text-xs text-slate-400">Loading documents…</p>;
  if (docs.length === 0) return (
    <p className="text-xs text-slate-400 italic">
      No credential documents uploaded yet. Request the doctor to upload via the "Request Documents" action.
    </p>
  );

  const statusColor = {
    pending_review: 'text-amber-600', accepted: 'text-emerald-600',
    flagged: 'text-red-600', rejected: 'text-slate-400',
  };

  return (
    <div className="space-y-2">
      {docs.map(doc => (
        <div key={doc.id} className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-50">
          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{doc.document_type_label || doc.file_name}</p>
            <p className="text-[10px] text-slate-400">
              {(doc.document_type || '').replace(/_/g, ' ')} · {doc.country || '—'} ·{' '}
              {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}
            </p>
          </div>
          <span className={`text-[10px] font-bold ${statusColor[doc.review_status] || 'text-slate-400'}`}>
            {(doc.review_status || 'pending').replace(/_/g, ' ')}
          </span>
          <button onClick={() => onView(doc)}
            className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 font-medium flex-shrink-0">
            <Eye className="w-3.5 h-3.5" /> View
          </button>
        </div>
      ))}
    </div>
  );
}

export default function AdminDoctorVerificationQueue() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('manual_review');
  const [selected, setSelected] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [notes, setNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [checkOverrides, setCheckOverrides] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ['doctor-verifications', filter],
    queryFn: () => filter === 'all'
      ? base44.entities.DoctorVerification.list('-submitted_at', 100)
      : base44.entities.DoctorVerification.filter({ verification_status: filter }, '-submitted_at', 100),
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['country-configs'],
    queryFn: () => base44.entities.CountryVerificationConfig.list(),
  });

  const configByCountry = configs.reduce((acc, c) => { acc[c.country] = c; return acc; }, {});
  const filtered = records.filter(r =>
    !search ||
    r.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.country?.toLowerCase().includes(search.toLowerCase())
  );

  const openReview = async (rec) => {
    setSelected(rec);
    setNotes(''); setOverrideReason(''); setDenialReason('');
    setCheckOverrides({}); setError(''); setSelectedDoc(null); setDoctor(null);
    if (rec.doctor_id) {
      try {
        const docs = await base44.entities.Doctor.filter({ id: rec.doctor_id });
        setDoctor(docs[0] || null);
      } catch { setDoctor(null); }
    }
  };

  const setSubCheck = async (field, status) => {
    setCheckOverrides(prev => ({ ...prev, [field]: status }));
    if (selected?.id) {
      try {
        await base44.functions.invoke('runDoctorVerification', {
          action: 'update_check', verification_record_id: selected.id,
          check_field: field, check_status: status, notes,
        });
        if (selected.doctor_id) {
          const docs = await base44.entities.Doctor.filter({ id: selected.doctor_id });
          setDoctor(docs[0] || null);
        }
      } catch { /* non-fatal — local state still updated */ }
    }
  };

  // Merge live doctor fields with any local overrides
  const merged = { ...doctor, ...checkOverrides };
  const allChecksPassed =
    PASSED.has(merged.license_verification_status) &&
    PASSED.has(merged.identity_verification_status) &&
    PASSED.has(merged.background_check_status);

  const hasAnyOverride = ['license_verification_status', 'identity_verification_status', 'background_check_status']
    .some(f => merged[f] === 'manual_override');

  const handleVerify = async () => {
    if (!notes.trim()) { setError('Review notes are required before any action.'); return; }
    setActionLoading(true); setError('');
    try {
      await base44.functions.invoke('runDoctorVerification', {
        action: 'admin_verify', verification_record_id: selected.id, notes,
      });
      setSelected(null); qc.invalidateQueries(['doctor-verifications']);
    } catch (e) { setError(e?.message || 'Action failed'); }
    setActionLoading(false);
  };

  const handleDeny = async () => {
    if (!notes.trim()) { setError('Review notes are required.'); return; }
    if (!denialReason.trim()) { setError('Denial reason is required.'); return; }
    setActionLoading(true); setError('');
    try {
      await base44.functions.invoke('runDoctorVerification', {
        action: 'admin_deny', verification_record_id: selected.id,
        notes, denial_reason: denialReason,
      });
      setSelected(null); qc.invalidateQueries(['doctor-verifications']);
    } catch (e) { setError(e?.message || 'Action failed'); }
    setActionLoading(false);
  };

  const handleActivate = async () => {
    if (!notes.trim()) { setError('Review notes are required before activation.'); return; }
    if (hasAnyOverride && !overrideReason.trim()) {
      setError('Override reason is required when any check is in manual_override state.'); return;
    }
    setActivating(true); setError('');
    try {
      const res = await base44.functions.invoke('activateVerifiedDoctor', {
        doctor_id: selected.doctor_id,
        override_reason: overrideReason.trim() || undefined,
      });
      if (res.data?.success) {
        setSelected(null); qc.invalidateQueries(['doctor-verifications']);
      } else {
        setError(res.data?.error || 'Activation failed — ensure all three checks are passed.');
      }
    } catch (e) { setError(e?.message || 'Activation failed'); }
    setActivating(false);
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Doctor Verification Queue</h1>
            <p className="text-sm text-slate-500 mt-1">
              All three checks (license · identity · background) required before activation.
              Default to caution — when in doubt, request more documents.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Document integrity notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Document Integrity Notice:</strong> Automated systems cannot detect forged credentials with certainty.
            Visual inspection against samples from the issuing country's medical board is required.
            All uploaded documents are stored with immutable timestamps for audit accountability.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'manual_review', label: 'Pending Review' },
            { id: 'pending_manual', label: 'Queued' },
            { id: 'pending', label: 'Submitted' },
            { id: 'verified', label: 'Verified' },
            { id: 'denied', label: 'Denied' },
            { id: 'expired', label: 'Expired' },
            { id: 'all', label: 'All' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                filter === tab.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}>
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
          {isLoading
            ? <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>
            : filtered.length === 0
            ? <div className="flex items-center justify-center py-16 text-slate-400 text-sm">No records found.</div>
            : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Doctor', 'Country', 'Registration #', 'Registry', 'Submitted', 'Status', ''].map(h => (
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
                          {config?.registry_url || rec.registry_url ? (
                            <a href={config?.registry_url || rec.registry_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                              {config?.registry_name || rec.registry_name || 'Registry'}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Manual only</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {rec.submitted_at ? new Date(rec.submitted_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[rec.verification_status] || 'bg-slate-100 text-slate-700'}`}>
                            {(rec.verification_status || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => openReview(rec)}
                            className="text-xs text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 font-medium">
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          }
        </div>

        {/* Document viewer overlay */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-6" onClick={() => setSelectedDoc(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-slate-800 text-sm">{selectedDoc.document_type_label || selectedDoc.file_name}</p>
                <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none">×</button>
              </div>
              {selectedDoc.file_mime_type?.startsWith('image/') ? (
                <img src={selectedDoc.file_url} alt="Credential" className="w-full rounded-xl max-h-[70vh] object-contain bg-slate-100" />
              ) : (
                <a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-8 text-blue-600 font-semibold border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-50">
                  <FileText className="w-5 h-5" /> Open Document →
                </a>
              )}
              <p className="text-[10px] text-slate-400 mt-3 text-center">
                Uploaded {selectedDoc.uploaded_at ? new Date(selectedDoc.uploaded_at).toLocaleString() : '—'}
              </p>
            </div>
          </div>
        )}

        {/* Review panel */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6">
              {/* Panel header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Review: {selected.doctor_name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {selected.country} · {selected.specialty || 'Specialty not specified'} · Reg# {selected.registration_number}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none mt-1">×</button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Auto-check result */}
                {selected.notes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Automated Pre-Screen Result
                    </p>
                    <p className="text-xs text-blue-800 leading-relaxed">{selected.notes}</p>
                  </div>
                )}

                {/* Registry link */}
                {(configByCountry[selected.country]?.registry_url || selected.registry_url) && (
                  <a href={configByCountry[selected.country]?.registry_url || selected.registry_url}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-blue-200 text-blue-700 font-semibold text-sm hover:bg-blue-50">
                    <ExternalLink className="w-4 h-4" />
                    Open Official Registry: {configByCountry[selected.country]?.registry_name || selected.registry_name}
                  </a>
                )}

                {/* THREE SUB-CHECKS — all required before activation */}
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                    Verification Checks — all three required before activation
                  </p>
                  <div className="space-y-3">
                    {[
                      { field: 'license_verification_status', label: 'License Check' },
                      { field: 'identity_verification_status', label: 'Identity Check' },
                      { field: 'background_check_status', label: 'Background Check' },
                    ].map(({ field, label }) => {
                      const current = checkOverrides[field] || merged[field] || 'pending';
                      return (
                        <div key={field} className="flex items-center gap-3 flex-wrap">
                          <CheckBadge label={label} status={current} />
                          <div className="flex gap-1.5 ml-auto flex-wrap">
                            {[
                              { s: 'passed', label: 'Pass' },
                              { s: 'failed', label: 'Fail' },
                              { s: 'manual_override', label: 'Override' },
                            ].map(({ s, label: btnLabel }) => (
                              <button key={s} onClick={() => setSubCheck(field, s)}
                                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                                  current === s
                                    ? s === 'passed' ? 'bg-emerald-600 text-white border-emerald-600'
                                      : s === 'failed' ? 'bg-red-600 text-white border-red-600'
                                      : 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                }`}>
                                {btnLabel}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Credential documents */}
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Submitted Documents
                  </p>
                  <CredentialDocumentList doctorId={selected.doctor_id} onView={setSelectedDoc} />
                </div>

                {/* Notes — mandatory for all actions */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Review Notes <span className="text-red-500">*</span>
                    <span className="text-slate-400 font-normal ml-1">(required before any action)</span>
                  </label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                    placeholder="e.g. Confirmed via GMC register — license active and in good standing. Photo ID matches headshot on profile." />
                </div>

                {/* Override reason — shown only when needed */}
                {hasAnyOverride && (
                  <div>
                    <label className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Override Reason <span className="text-red-500">*</span>
                      <span className="font-normal text-amber-600 ml-1">(stored permanently in audit log)</span>
                    </label>
                    <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} rows={2}
                      className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
                      placeholder="e.g. Registry API unavailable — confirmed via email with issuing medical board on [date]. Evidence screenshot on file." />
                  </div>
                )}

                {/* Denial reason */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Denial Reason <span className="text-slate-400 font-normal">(required if denying)</span>
                  </label>
                  <input value={denialReason} onChange={e => setDenialReason(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="e.g. Registration number not found in RETHUS after 3 attempts on different dates" />
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 font-medium">{error}</p>
                  </div>
                )}
              </div>

              {/* Action footer */}
              <div className="px-6 pb-5 space-y-3">
                {/* Activate — only shown when all checks pass */}
                {allChecksPassed ? (
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm"
                    onClick={handleActivate} disabled={activating || !notes.trim()}>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    {activating ? 'Activating…' : 'Activate Doctor — All Checks Complete'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-xs text-slate-500">
                      Activate button appears once all three checks are set to <strong>Passed</strong> or <strong>Override</strong>.
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 text-sm" onClick={handleVerify}
                    disabled={actionLoading || !notes.trim()}>
                    <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" /> Mark Verified
                  </Button>
                  <Button variant="destructive" className="flex-1 text-sm" onClick={handleDeny}
                    disabled={actionLoading || !denialReason.trim() || !notes.trim()}>
                    <XCircle className="w-4 h-4 mr-2" /> Deny
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
