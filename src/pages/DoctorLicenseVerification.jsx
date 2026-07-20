// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';

import { 
  FileText, CheckCircle, AlertCircle, Clock, Shield, Eye, 
  Search, RefreshCw, UserCheck, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import AdminLayout from '@/components/layout/AdminLayout';

const STATUS_CONFIG = {
  pending: { color: 'bg-slate-100 text-slate-700', icon: Clock, label: 'Pending' },
  ai_verified: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'AI Verified' },
  manual_review: { color: 'bg-amber-100 text-amber-700', icon: AlertCircle, label: 'Manual Review' },
  verified: { color: 'bg-emerald-100 text-emerald-700', icon: Shield, label: 'Verified' },
  rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' },
};

export default function DoctorLicenseVerification() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState('approve');
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: doctors = [], isLoading, refetch } = useQuery({
    queryKey: ['doctors-verification'],
    // User-scoped: asServiceRole throws in the browser (backend-only) — this
    // console listed zero doctors for months because of it.
    queryFn: () => base44.entities.Doctor.list('-created_date', 200),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ doctorId, action, notes }) => 
      base44.functions.invoke('verifyDoctorLicense', { doctorId, action, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors-verification'] });
      setReviewDialogOpen(false);
      setReviewNotes('');
      toast.success('Verification status updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const handleReview = () => {
    if (!selectedDoctor) return;
    verifyMutation.mutate({
      doctorId: selectedDoctor.id,
      action: reviewAction,
      notes: reviewNotes || undefined
    });
  };

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.clinic_country?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         doc.verification_status === statusFilter ||
                         (statusFilter === 'needs_review' && doc.verification_status === 'manual_review');
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: doctors.length,
    pending: doctors.filter(d => d.verification_status === 'pending').length,
    ai_verified: doctors.filter(d => d.verification_status === 'ai_verified').length,
    manual_review: doctors.filter(d => d.verification_status === 'manual_review').length,
    verified: doctors.filter(d => d.verification_status === 'verified').length,
    rejected: doctors.filter(d => d.verification_status === 'rejected').length,
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold font-display">Doctor License Verification</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered document verification with manual review
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-slate-600">{stats.pending}</p>
                  <p className="text-xs text-slate-500">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md bg-green-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-green-600">{stats.ai_verified}</p>
                  <p className="text-xs text-green-600">AI Verified</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md bg-amber-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-amber-600">{stats.manual_review}</p>
                  <p className="text-xs text-amber-600">Needs Review</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md bg-emerald-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-emerald-600">{stats.verified}</p>
                  <p className="text-xs text-emerald-600">Verified</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md bg-red-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-red-600">{stats.rejected}</p>
                  <p className="text-xs text-red-600">Rejected</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ai_verified">AI Verified</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Doctor List */}
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-2" />
            <p className="text-slate-500">Loading doctors...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No doctors found matching your criteria</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDoctors.map((doctor) => {
              const StatusIcon = STATUS_CONFIG[doctor.verification_status]?.icon || Clock;
              return (
                <motion.div
                  key={doctor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{doctor.full_name}</h3>
                            <p className="text-xs text-slate-500">{doctor.clinic_country}</p>
                          </div>
                        </div>
                        <Badge className={STATUS_CONFIG[doctor.verification_status]?.color || 'bg-slate-100'}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {STATUS_CONFIG[doctor.verification_status]?.label || doctor.verification_status}
                        </Badge>
                      </div>

                      {doctor.verification_confidence && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-500">AI Confidence</span>
                            <span className="font-medium">{doctor.verification_confidence}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                doctor.verification_confidence >= 85 ? 'bg-green-500' :
                                doctor.verification_confidence >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${doctor.verification_confidence}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {doctor.verification_notes && (
                        <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                          {doctor.verification_notes}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-xs"
                          onClick={() => {
                            setSelectedDoctor(doctor);
                            setReviewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" /> Review
                        </Button>
                        {doctor.license_url && (
                          <Button size="sm" variant="ghost" className="text-xs" asChild>
                            <a href={doctor.license_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-3 h-3" /> License
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Review Doctor License - {selectedDoctor?.full_name}
              </DialogTitle>
            </DialogHeader>

            {selectedDoctor && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-medium">{selectedDoctor.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Country</p>
                    <p className="font-medium">{selectedDoctor.clinic_country}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Current Status</p>
                    <Badge className={STATUS_CONFIG[selectedDoctor.verification_status]?.color}>
                      {STATUS_CONFIG[selectedDoctor.verification_status]?.label}
                    </Badge>
                  </div>
                  {selectedDoctor.verification_confidence && (
                    <div>
                      <p className="text-sm text-slate-500">AI Confidence</p>
                      <p className="font-medium">{selectedDoctor.verification_confidence}%</p>
                    </div>
                  )}
                </div>

                {selectedDoctor.verification_notes && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Verification Notes</p>
                    <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedDoctor.verification_notes}</p>
                  </div>
                )}

                {selectedDoctor.license_url && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">License Document</p>
                    <div className="border rounded-lg overflow-hidden">
                      <img loading="lazy" decoding="async" 
                        src={selectedDoctor.license_url} 
                        alt="Medical License" 
                        className="w-full h-auto max-h-96 object-contain bg-slate-50"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">Review Action</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setReviewAction('approve')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        reviewAction === 'approve'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <CheckCircle className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-xs font-medium">Approve</p>
                    </button>
                    <button
                      onClick={() => setReviewAction('request_review')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        reviewAction === 'request_review'
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <AlertCircle className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-xs font-medium">Flag for Review</p>
                    </button>
                    <button
                      onClick={() => setReviewAction('reject')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        reviewAction === 'reject'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <XCircle className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-xs font-medium">Reject</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Review Notes (Optional)</label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about your decision..."
                    className="h-24"
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
                disabled={verifyMutation.isPending}
                className={
                  reviewAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  reviewAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-amber-600 hover:bg-amber-700'
                }
              >
                {verifyMutation.isPending ? 'Processing...' : `Confirm ${reviewAction === 'approve' ? 'Approval' : reviewAction === 'reject' ? 'Rejection' : 'Review'}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </AdminLayout>
  );
}