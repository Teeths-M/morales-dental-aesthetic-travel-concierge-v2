import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, Clock, FileText, Check, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow, differenceInHours } from 'date-fns';

export default function DoctorVerificationAdmin() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();

  const fetchQueue = async () => {
    setLoading(true);
    const items = await base44.entities.ManualVerificationQueue.filter({ status: 'pending' }, '-submitted_at');
    setQueue(items);
    setLoading(false);
  };

  useEffect(() => { fetchQueue(); }, []);

  const handleApprove = async (item) => {
    const user = await base44.auth.me();

    await base44.entities.Doctor.update(item.doctor_id, {
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
      verification_method: 'advisory_team',
      credential_verified_date: new Date().toISOString()
    });

    await base44.entities.ManualVerificationQueue.update(item.id, {
      status: 'approved',
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString()
    });

    toast({ title: '✅ Doctor verified and activated' });
    fetchQueue();
  };

  const handleReject = async (item) => {
    if (!rejectionReason.trim()) return;
    const user = await base44.auth.me();

    await base44.entities.Doctor.update(item.doctor_id, {
      verification_status: 'rejected'
    });

    await base44.entities.ManualVerificationQueue.update(item.id, {
      status: 'rejected',
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason
    });

    setRejectingId(null);
    setRejectionReason('');
    toast({ title: 'Doctor rejected', variant: 'destructive' });
    fetchQueue();
  };

  const getTimeRemaining = (escalateAt) => {
    if (!escalateAt) return { label: 'No deadline', urgent: false };
    const hours = differenceInHours(new Date(escalateAt), new Date());
    if (hours < 0) return { label: 'OVERDUE', urgent: true };
    if (hours < 6) return { label: `${hours}h remaining`, urgent: true };
    return { label: `${hours}h remaining`, urgent: false };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Doctor Verification Queue</h1>
              <p className="text-sm text-gray-500">
                {loading ? 'Loading...' : `${queue.length} pending review${queue.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchQueue} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading queue...
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-700">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No pending verifications in the queue.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((item) => {
              const timeRemaining = getTimeRemaining(item.escalate_at);
              const isRejecting = rejectingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border shadow-sm p-6 transition-all ${
                    timeRemaining.urgent ? 'border-red-200' : 'border-gray-100'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1 min-w-0">

                      {/* Doctor name + urgency badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-lg font-bold text-gray-900">{item.doctor_name}</h3>
                        <Badge
                          variant="outline"
                          className={timeRemaining.urgent
                            ? 'border-red-300 text-red-600 bg-red-50'
                            : 'border-amber-300 text-amber-700 bg-amber-50'
                          }
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {timeRemaining.label}
                        </Badge>
                        {timeRemaining.urgent && (
                          <Badge className="bg-red-100 text-red-700 border border-red-200">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Escalation Required
                          </Badge>
                        )}
                      </div>

                      {/* Metadata grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Country</p>
                          <p className="font-medium text-gray-800">{item.country}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Specialty</p>
                          <p className="font-medium text-gray-800">{item.specialty || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">License #</p>
                          <p className="font-mono font-medium text-gray-800">{item.license_number}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Submitted</p>
                          <p className="font-medium text-gray-800">
                            {item.submitted_at ? formatDistanceToNow(new Date(item.submitted_at)) + ' ago' : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Document links */}
                      {item.document_urls?.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {item.document_urls.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                              Document {idx + 1}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-red-500 mb-4 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> No documents uploaded
                        </p>
                      )}

                      {/* Rejection reason textarea */}
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

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-shrink-0 lg:flex-col">
                      {!isRejecting ? (
                        <>
                          <Button
                            onClick={() => handleApprove(item)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex-1 lg:flex-none"
                          >
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button
                            onClick={() => { setRejectingId(item.id); setRejectionReason(''); }}
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50 rounded-xl flex-1 lg:flex-none"
                          >
                            <X className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleReject(item)}
                            disabled={!rejectionReason.trim()}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                          >
                            Confirm Reject
                          </Button>
                          <Button
                            onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                            variant="outline"
                            className="rounded-xl"
                          >
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
  );
}