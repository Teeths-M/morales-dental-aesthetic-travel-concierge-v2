import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, FileText, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminProcedureRequests() {
  const [requests, setRequests] = useState([]);
  const [outreachRecords, setOutreachRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'outreach'

  const loadRequests = async () => {
    try {
      const [data, outreach] = await Promise.all([
        base44.entities.ProcedureRequest.filter({}, '-submitted_date'),
        base44.entities.DoctorProcedureOutreach.filter({}, '-email_sent_at', 50),
      ]);
      setRequests(data);
      setOutreachRecords(outreach);
    } catch (e) {
      console.error('Failed to load requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleReview = async (id, status, notes = '') => {
    setReviewingId(id);
    try {
      const request = requests.find(r => r.id === id);
      
      if (status === 'approved') {
        // Generate procedure ID
        const categoryPrefix = {
          'Facial': 'FACE', 'Breast': 'BREAST', 'Body': 'BODY',
          'Dental': 'DENTAL', 'Wellness': 'WELL', 'Other': 'OTHER'
        }[request.category] || 'PROC';
        
        const procedureId = `${categoryPrefix}-${request.procedure_name.toUpperCase().replace(/\s+/g, '-').slice(0, 10)}-${Date.now().toString().slice(-4)}`;

        // Create MasterProcedure
        await base44.entities.MasterProcedure.create({
          procedure_id: procedureId,
          en_name: request.procedure_name,
          es_name: request.procedure_name_es || request.procedure_name,
          fr_name: request.procedure_name_fr || request.procedure_name,
          pt_name: request.procedure_name_pt || request.procedure_name,
          de_name: request.procedure_name_de || request.procedure_name,
          category: request.category,
          category_emoji: request.category_emoji || '🏥',
          description: request.description,
          is_active: true,
        });
      }

      // Update request status
      await base44.entities.ProcedureRequest.update(id, {
        status,
        reviewed_by: (await base44.auth.me()).email,
        reviewed_date: new Date().toISOString(),
        review_notes: notes,
      });

      toast.success(`Procedure ${status}`);
      loadRequests();
    } catch (e) {
      console.error('Failed to review:', e);
      toast.error('Failed to review procedure');
    } finally {
      setReviewingId(null);
    }
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };

  const statusIcons = {
    pending: Clock,
    approved: CheckCircle2,
    rejected: XCircle,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">Loading procedure requests...</p>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const reviewedRequests = requests.filter(r => r.status !== 'pending');

  const outreachResponseColors = { yes: 'bg-emerald-100 text-emerald-700', no: 'bg-red-100 text-red-700', maybe: 'bg-amber-100 text-amber-700', pending: 'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Procedure Requests</h2>
          <p className="text-xs text-slate-500">Review new submissions and track M doctor outreach</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button onClick={() => setActiveTab('requests')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'requests' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            Requests {requests.filter(r => r.status === 'pending').length > 0 && <span className="ml-1.5 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{requests.filter(r => r.status === 'pending').length}</span>}
          </button>
          <button onClick={() => setActiveTab('outreach')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'outreach' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            M Outreach {outreachRecords.filter(o => o.doctor_response === 'pending').length > 0 && <span className="ml-1.5 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{outreachRecords.filter(o => o.doctor_response === 'pending').length}</span>}
          </button>
        </div>
      </div>

      {/* Doctor Outreach Tab */}
      {activeTab === 'outreach' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">When patients request unlisted procedures, M contacts nearby doctors automatically. Track responses here.</p>
          {outreachRecords.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No outreach records yet — M will contact doctors as patients request unlisted procedures.</p>
            </div>
          ) : (
            outreachRecords.map(rec => (
              <Card key={rec.id} className="border-slate-200">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{rec.procedure_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Patient: {rec.client_email}</p>
                      <p className="text-xs text-slate-500">Doctor: {rec.doctor_email}</p>
                      {rec.email_sent_at && (
                        <p className="text-[10px] text-slate-400 mt-1">Sent {new Date(rec.email_sent_at).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge className={outreachResponseColors[rec.doctor_response] || outreachResponseColors.pending}>
                        {rec.doctor_response === 'pending' ? 'Awaiting reply' : rec.doctor_response?.toUpperCase()}
                      </Badge>
                      <Badge className={rec.status === 'converted' ? 'bg-emerald-100 text-emerald-700' : rec.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}>
                        {rec.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'requests' && <>

      {/* Pending */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Pending Review</h3>
          {pendingRequests.map(req => (
            <Card key={req.id} className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {req.procedure_name}
                      <Badge className={statusColors.pending}>
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-1">
                      Submitted by {req.doctor_name} • {new Date(req.submitted_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-600">{req.category}</p>
                    <p className="text-[10px] text-slate-400">{req.specialty}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 mb-4">{req.description}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleReview(req.id, 'approved')}
                    disabled={reviewingId === req.id}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReview(req.id, 'rejected')}
                    disabled={reviewingId === req.id}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reviewed */}
      {reviewedRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Recently Reviewed</h3>
          {reviewedRequests.slice(0, 5).map(req => {
            const StatusIcon = statusIcons[req.status];
            return (
              <Card key={req.id} className={`${req.status === 'approved' ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-4 h-4 ${req.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`} />
                      <CardTitle className="text-sm">{req.procedure_name}</CardTitle>
                    </div>
                    <Badge className={statusColors[req.status]}>
                      {req.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-500">
                    Reviewed by {req.reviewed_by} on {new Date(req.reviewed_date).toLocaleDateString()}
                    {req.review_notes && ` • ${req.review_notes}`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {requests.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No procedure requests yet</p>
        </div>
      )}

      </>}
    </div>
  );
}