import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, FileText, Check, X, RotateCcw, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import AdminLayout from '@/components/layout/AdminLayout';
import { friendlyError } from '@/lib/friendlyError';

// The human review queue for VaultDocument rows M-Care Scanner couldn't
// verify itself (document_type has real fraud/identity consequence, no
// authoritative registry exists for it, or the registry check came back
// inconclusive). Modeled directly on DoctorVerificationAdmin.jsx's own
// Approve/Reject/Request-New-Scan pattern.

const DOC_TYPE_LABELS = {
  passport: 'Passport', national_id: 'National ID', drivers_license: "Driver's License",
  doctor_license: 'Doctor License', professional_certificate: 'Professional Certificate',
  insurance_document: 'Insurance', visa: 'Visa', partner_credential: 'Partner Credential',
  security_credential: 'Security Credential',
};

export default function AdminVaultDocumentReview() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [busyId, setBusyId] = useState(null);
  const { toast } = useToast();

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const items = await base44.entities.VaultDocument.filter({ review_status: 'pending_review' }, '-created_date');
      setQueue(items || []);
    } catch (_e) {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  const runAction = async (item, action, notes) => {
    setBusyId(item.id);
    try {
      const res = await base44.functions.invoke('reviewVaultDocument', { vault_document_id: item.id, action, notes });
      const body = res?.data ?? res;
      if (body?.error) throw new Error(body.error);
      toast({ title: action === 'approve' ? '✅ Document verified' : action === 'reject' ? 'Document rejected' : 'New scan requested', variant: action === 'reject' ? 'destructive' : 'default' });
      setRejectingId(null);
      setRejectionReason('');
      fetchQueue();
    } catch (e) {
      toast({ title: friendlyError(e, 'Could not complete that review action. Please try again.', 'AdminVaultDocumentReview'), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Document Review Queue</h1>
                <p className="text-sm text-gray-500">
                  {loading ? 'Loading...' : `${queue.length} pending review${queue.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchQueue} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading queue...
            </div>
          ) : queue.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-700">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No documents waiting for review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((item) => {
                const isRejecting = rejectingId === item.id;
                const isBusy = busyId === item.id;
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">{DOC_TYPE_LABELS[item.document_type] || item.document_type}</h3>
                          <Badge variant="outline" className="border-blue-300 text-blue-600 bg-blue-50">
                            {item.owner_type} — {item.owner_email}
                          </Badge>
                          {item.quality_status !== 'passed' && (
                            <Badge className="bg-amber-100 text-amber-700 border border-amber-200">Quality flagged</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Name on file</p>
                            <p className="font-medium text-gray-800">{item.extracted_fields?.detected_name || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Document #</p>
                            <p className="font-mono font-medium text-gray-800">{item.extracted_fields?.detected_document_number || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Jurisdiction</p>
                            <p className="font-medium text-gray-800">{item.extracted_fields?.detected_jurisdiction || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Scanned</p>
                            <p className="font-medium text-gray-800">
                              {item.created_date ? formatDistanceToNow(new Date(item.created_date)) + ' ago' : '—'}
                            </p>
                          </div>
                        </div>

                        {item.original_file_urls?.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {item.original_file_urls.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
                                <FileText className="w-3 h-3" /> Page {idx + 1} <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        ) : null}

                        {isRejecting && (
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter rejection reason (required)..."
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                            rows={3}
                            autoFocus
                          />
                        )}
                      </div>

                      <div className="flex gap-2 flex-shrink-0 lg:flex-col">
                        {!isRejecting ? (
                          <>
                            <Button disabled={isBusy} onClick={() => runAction(item, 'approve')} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex-1 lg:flex-none">
                              <Check className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button disabled={isBusy} onClick={() => { setRejectingId(item.id); setRejectionReason(''); }} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 rounded-xl flex-1 lg:flex-none">
                              <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button disabled={isBusy} onClick={() => runAction(item, 'request_new_scan')} variant="outline" className="rounded-xl flex-1 lg:flex-none">
                              <RotateCcw className="w-4 h-4 mr-1" /> Request New Scan
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button disabled={!rejectionReason.trim() || isBusy} onClick={() => runAction(item, 'reject', rejectionReason)} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">
                              Confirm Reject
                            </Button>
                            <Button onClick={() => { setRejectingId(null); setRejectionReason(''); }} variant="outline" className="rounded-xl">
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
