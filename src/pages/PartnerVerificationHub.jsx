// @ts-nocheck — pre-existing className prop type gaps in shadcn wrappers
import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Eye,
  FileText,
  TrendingUp,
  Search
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';

export default function PartnerVerificationHub() {
  const navigate = useNavigate();
  const { id: preselectedId } = useParams();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState('approve');
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: verifications, isLoading } = useQuery({
    queryKey: ['partner-verifications'],
    queryFn: async () => {
      const verifs = await base44.entities.PartnerVerification.list('-created_at', 100);
      return verifs;
    }
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors-intel'],
    queryFn: () => base44.entities.Doctor.list('-created_date', 200),
    staleTime: 60_000,
  });

  const doctorByEmail = useMemo(() => {
    const m = {};
    (doctors || []).forEach(d => { m[d.email] = d; });
    return m;
  }, [doctors]);

  const filteredVerifications = verifications?.filter(v => {
    const matchesSearch = 
      v.partner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.partner_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || v.verification_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const manualReviewMutation = useMutation({
    mutationFn: async (data) => {
      return base44.functions.invoke('manualReviewVerification', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['partner-verifications']);
      setReviewDialogOpen(false);
      setReviewNotes('');
    }
  });

  const handleReview = () => {
    if (!selectedVerification) return;
    
    manualReviewMutation.mutate({
      verification_id: selectedVerification.id,
      decision: reviewDecision,
      notes: reviewNotes
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-gray-100 text-gray-700', label: 'Pending', icon: Clock },
      documents_received: { color: 'bg-blue-100 text-blue-700', label: 'Documents Received', icon: FileText },
      ai_analysis_complete: { color: 'bg-purple-100 text-purple-700', label: 'AI Analysis Complete', icon: TrendingUp },
      manual_review: { color: 'bg-amber-100 text-amber-700', label: 'Manual Review', icon: Eye },
      verified: { color: 'bg-green-100 text-green-700', label: 'Verified', icon: CheckCircle },
      denied: { color: 'bg-red-100 text-red-700', label: 'Denied', icon: AlertTriangle },
      suspended: { color: 'bg-slate-100 text-slate-700', label: 'Suspended', icon: Shield }
    };

    const { color, label, icon: Icon } = config[status] || config.pending;
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getFraudScoreBadge = (score) => {
    let color = 'bg-green-100 text-green-700';
    if (score >= 70) color = 'bg-red-100 text-red-700';
    else if (score >= 30) color = 'bg-amber-100 text-amber-700';

    return (
      <Badge className={color}>
        {score}/100
      </Badge>
    );
  };

  const getInternetRiskBadge = (level) => {
    if (!level) return <span className="text-xs text-muted-foreground">Not scanned</span>;
    const cfg = {
      low:    { cls: 'bg-emerald-100 text-emerald-700', label: 'LOW' },
      medium: { cls: 'bg-amber-100 text-amber-700',    label: 'MEDIUM' },
      high:   { cls: 'bg-red-100 text-red-700',        label: 'HIGH' },
    };
    const { cls, label } = cfg[level] || cfg.medium;
    return <Badge className={cls}>{label} RISK</Badge>;
  };

  const getAIVerdict = (level) => {
    if (!level) return null;
    if (level === 'low')    return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">✓ Recommended</Badge>;
    if (level === 'medium') return <Badge className="bg-amber-100 text-amber-700 text-[10px]">⚠ Review Required</Badge>;
    return <Badge className="bg-red-100 text-red-700 text-[10px]">✗ Not Recommended</Badge>;
  };

  const stats = {
    total: verifications?.length || 0,
    pending: verifications?.filter(v => v.verification_status === 'pending' || v.verification_status === 'documents_received').length || 0,
    manual_review: verifications?.filter(v => v.verification_status === 'manual_review').length || 0,
    verified: verifications?.filter(v => v.verification_status === 'verified').length || 0,
    denied: verifications?.filter(v => v.verification_status === 'denied').length || 0,
    high_risk: verifications?.filter(v => (v.ai_fraud_score || 0) >= 70).length || 0
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold font-display">Partner Verification Hub</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered fraud detection + manual review workflow
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">Manual Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.manual_review}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.verified}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.denied}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">High Risk (≥70)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.high_risk}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex h-10 w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="documents_received">Documents Received</option>
                <option value="ai_analysis_complete">AI Analysis Complete</option>
                <option value="manual_review">Manual Review</option>
                <option value="verified">Verified</option>
                <option value="denied">Denied</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Verifications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>AI Fraud Score</TableHead>
                    <TableHead>Internet Intel</TableHead>
                    <TableHead>Auto Verified</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVerifications?.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{v.partner_name}</div>
                          <div className="text-xs text-muted-foreground">{v.partner_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {v.partner_type?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(v.verification_status)}
                      </TableCell>
                      <TableCell>
                        {v.ai_fraud_score !== null && v.ai_fraud_score !== undefined ? (
                          getFraudScoreBadge(v.ai_fraud_score)
                        ) : (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const doc = v.partner_type === 'doctor' ? doctorByEmail[v.partner_email] : null;
                          if (!doc) return <span className="text-xs text-muted-foreground">—</span>;
                          return (
                            <div className="space-y-1">
                              {getInternetRiskBadge(doc.internet_risk_level)}
                              {getAIVerdict(doc.internet_risk_level)}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {v.auto_verified ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedVerification(v);
                            setReviewDialogOpen(true);
                            navigate(`/admin/partner-verification/${v.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Verification: {selectedVerification?.partner_name}</DialogTitle>
            </DialogHeader>
            
            {selectedVerification && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Partner Type</Label>
                    <p className="text-sm font-medium capitalize">{selectedVerification.partner_type?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm">{selectedVerification.partner_email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Current Status</Label>
                    <div>{getStatusBadge(selectedVerification.verification_status)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">AI Fraud Score</Label>
                    <div>
                      {selectedVerification.ai_fraud_score !== null && selectedVerification.ai_fraud_score !== undefined ? (
                        getFraudScoreBadge(selectedVerification.ai_fraud_score)
                      ) : (
                        <span className="text-sm text-muted-foreground">Not analyzed</span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedVerification.ai_fraud_indicators && selectedVerification.ai_fraud_indicators.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">AI Fraud Indicators</Label>
                    <ul className="text-sm text-red-600 list-disc list-inside mt-1">
                      {selectedVerification.ai_fraud_indicators.map((indicator, i) => (
                        <li key={i}>{indicator}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedVerification.documents_uploaded && selectedVerification.documents_uploaded.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Uploaded Documents</Label>
                    <div className="mt-2 space-y-2">
                      {selectedVerification.documents_uploaded.map((doc, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div>
                            <p className="text-sm font-medium">{doc.document_type?.replace('_', ' ')}</p>
                            <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                          </div>
                          {doc.ai_analysis_result && (
                            <Badge className={doc.ai_analysis_result.tampering_detected ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                              {doc.ai_analysis_result.tampering_detected ? 'Tampering Detected' : 'Clean'}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Internet Intelligence */}
                {(() => {
                  const doc = selectedVerification?.partner_type === 'doctor'
                    ? doctorByEmail[selectedVerification?.partner_email]
                    : null;
                  if (!doc?.internet_risk_level) return null;
                  const riskColor = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };
                  const color = riskColor[doc.internet_risk_level] || '#6b7280';
                  return (
                    <div className="rounded-lg p-3 space-y-2 border" style={{ borderColor: `${color}40` }}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Internet Intelligence</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getInternetRiskBadge(doc.internet_risk_level)}
                        {getAIVerdict(doc.internet_risk_level)}
                        <span className="text-xs text-muted-foreground ml-auto">Score: {doc.internet_risk_score ?? '—'}/100</span>
                      </div>
                      {doc.internet_summary && (
                        <p className="text-xs text-foreground/80 leading-relaxed">{doc.internet_summary}</p>
                      )}
                      {doc.internet_last_checked && (
                        <p className="text-[10px] text-muted-foreground">
                          Last scanned: {new Date(doc.internet_last_checked).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <Label>Review Decision</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={reviewDecision === 'approve'}
                        onChange={() => setReviewDecision('approve')}
                      />
                      <span className="text-sm">Approve</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={reviewDecision === 'deny'}
                        onChange={() => setReviewDecision('deny')}
                      />
                      <span className="text-sm">Deny</span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Review Notes</Label>
                  <Textarea
                    id="notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about your decision..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReview}
                disabled={manualReviewMutation.isPending}
                className={reviewDecision === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {manualReviewMutation.isPending ? 'Processing...' : (reviewDecision === 'approve' ? 'Approve' : 'Deny')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}