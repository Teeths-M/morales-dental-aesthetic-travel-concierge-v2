import React, { useEffect, useState, useCallback } from 'react';
import { Clock, ShieldAlert, ShieldCheck, FileText, XCircle, RefreshCw, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import MedicationsPanel from './MedicationsPanel';

// Replaces the old DocumentsModule mockup (a hardcoded requiredDocs array
// wired to nothing real). Reads live VaultDocument rows created by the
// M-Care Scanner — RLS already scopes read to owner-or-admin, so a direct
// client filter (matching VaultDashboard.jsx's own established pattern) is
// safe and needs no dedicated listing function.

const VERIFICATION_CONFIG = {
  verified: { label: 'Verified', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  requires_human_review: { label: 'Pending Review', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  verification_failed: { label: 'Verification Failed', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  not_applicable_no_authority: { label: 'Scanned', icon: FileText, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
  verification_pending: { label: 'Verifying...', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
};
const DEFAULT_VERIFICATION = VERIFICATION_CONFIG.not_applicable_no_authority;

const DOC_TYPE_LABELS = {
  passport: 'Passport', national_id: 'National ID', drivers_license: "Driver's License",
  medical_record: 'Medical Record', medical_report: 'Medical Report', lab_result: 'Lab Result',
  prescription: 'Prescription', doctor_license: 'Doctor License', professional_certificate: 'Professional Certificate',
  insurance_document: 'Insurance', visa: 'Visa', flight_document: 'Flight Document',
  hotel_confirmation: 'Hotel Confirmation', invoice: 'Invoice', consent_document: 'Consent Document',
  travel_document: 'Travel Document', partner_credential: 'Partner Credential',
  security_credential: 'Security Credential', other: 'Document',
};

export default function VaultDocumentsPanel() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    if (!user?.email) { setLoading(false); return; }
    setLoading(true);
    try {
      const rows = await base44.entities.VaultDocument.filter({ owner_email: user.email }, '-created_date', 100);
      setDocs((rows || []).filter((d) => !d.deleted_at));
    } catch (_) {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const expiringSoon = docs.filter((d) => {
    if (!d.expiration_date) return false;
    const days = (new Date(d.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 180;
  });

  return (
    <div className="space-y-6">
      <MedicationsPanel />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Documents</h2>
          <p className="text-xs text-slate-400 mt-0.5">Scanned and vaulted through M-Care</p>
        </div>
        <button
          onClick={fetchDocs}
          className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {expiringSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Expiring soon</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {expiringSoon.map((d) => DOC_TYPE_LABELS[d.document_type] || 'Document').join(', ')} — worth renewing before your trip.
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
        <Camera className="w-6 h-6 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600">Need to add a document?</p>
        <p className="text-xs text-slate-400 mt-1">Just tell M-Care — "I need to upload my passport" — and it'll open the scanner for you.</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Loading your documents...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nothing scanned yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => {
            const cfg = VERIFICATION_CONFIG[doc.verification_status] || DEFAULT_VERIFICATION;
            const Icon = cfg.icon;
            return (
              <div key={doc.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{DOC_TYPE_LABELS[doc.document_type] || 'Document'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      <Icon className="w-3 h-3" /> {cfg.label}
                    </span>
                    {doc.quality_status && doc.quality_status !== 'passed' && (
                      <span className="text-[11px] text-amber-600 font-medium">Quality flagged</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] text-slate-400">
                    {doc.created_date ? formatDistanceToNow(new Date(doc.created_date)) + ' ago' : ''}
                  </p>
                  {doc.expiration_date && (
                    <p className="text-[11px] text-slate-400 mt-0.5">Expires {doc.expiration_date}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
