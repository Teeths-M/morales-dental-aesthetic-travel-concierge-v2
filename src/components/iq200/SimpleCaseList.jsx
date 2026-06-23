import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, UserPlus, Mail, CheckCircle, AlertCircle, 
  TrendingUp, Calendar, Shield, FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_COLORS = {
  'Submitted': 'bg-slate-100 text-slate-700',
  'Safe-T-Reviewed': 'bg-blue-100 text-blue-800',
  'Doctor-Pending': 'bg-violet-100 text-violet-800',
  'Vendor-Pending': 'bg-amber-100 text-amber-800',
  'Admin-Review': 'bg-orange-100 text-orange-800',
  'Proposal-Sent': 'bg-cyan-100 text-cyan-800',
  'Deposit-Paid': 'bg-emerald-100 text-emerald-800',
  'Completed': 'bg-green-200 text-green-900',
  'BLOCKED': 'bg-red-100 text-red-700',
};

export default function SimpleCaseList({ cases, isLoading, onRefresh }) {
  const [assigningDoctor, setAssigningDoctor] = useState(null);
  const [selectedDoctors, setSelectedDoctors] = useState({});
  const [generatingProposal, setGeneratingProposal] = useState(null);

  // Fetch available doctors
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['available_doctors'],
    queryFn: () => base44.asServiceRole.entities.Doctor.filter({ status: 'active' }),
  });

  const assignDoctor = async (caseId, doctorId) => {
    if (!doctorId) {
      toast.error('Please select a doctor first');
      return;
    }
    setAssigningDoctor(caseId);
    try {
      await base44.functions.invoke('assignDoctorToCase', { caseId, doctorId });
      toast.success('Doctor assigned! They will receive an email with secure link.');
      setSelectedDoctors(prev => ({ ...prev, [caseId]: undefined }));
      onRefresh();
    } catch (error) {
      toast.error('Failed to assign doctor: ' + error.message);
    } finally {
      setAssigningDoctor(null);
    }
  };

  const generateProposal = async (caseId) => {
    setGeneratingProposal(caseId);
    try {
      const result = await base44.functions.invoke('generateClientProposalPDF', { consultation_id: caseId });
      toast.success('PDF proposal generated and sent to client!');
      onRefresh();
    } catch (error) {
      toast.error('Failed to generate proposal: ' + error.message);
    } finally {
      setGeneratingProposal(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6 text-center py-8">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No active cases</p>
          <p className="text-sm text-slate-500">Cases will appear here once created.</p>
        </CardContent>
      </Card>
    );
  }

  // Group cases by status for clarity
  const casesByStatus = {
    needsDoctor: cases.filter(c => c.status === 'Safe-T-Reviewed' || c.status === 'Doctor-Pending'),
    inProgress: cases.filter(c => ['Vendor-Pending', 'Admin-Review', 'Proposal-Sent'].includes(c.status)),
    completed: cases.filter(c => ['Deposit-Paid', 'Completed'].includes(c.status)),
    blocked: cases.filter(c => c.safe_t_result === 'BLOCKED'),
  };

  return (
    <div className="space-y-6">
      {/* Blocked Cases - Priority */}
      {casesByStatus.blocked.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Blocked Cases (Requires Review)
          </h3>
          <div className="space-y-2">
            {casesByStatus.blocked.map(caseRecord => (
              <CaseCard 
                key={caseRecord.id} 
                caseRecord={caseRecord} 
                onAssignDoctor={assignDoctor}
                assigningDoctor={assigningDoctor}
                doctors={doctors}
                loadingDoctors={loadingDoctors}
                selectedDoctors={selectedDoctors}
                setSelectedDoctors={setSelectedDoctors}
                onGenerateProposal={generateProposal}
                generatingProposal={generatingProposal}
              />
            ))}
          </div>
        </section>
      )}

      {/* Needs Doctor Assignment */}
      {casesByStatus.needsDoctor.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-violet-700 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Ready for Doctor Assignment
          </h3>
          <div className="space-y-2">
            {casesByStatus.needsDoctor.map(caseRecord => (
              <CaseCard 
                key={caseRecord.id} 
                caseRecord={caseRecord} 
                onAssignDoctor={assignDoctor}
                assigningDoctor={assigningDoctor}
                doctors={doctors}
                loadingDoctors={loadingDoctors}
                selectedDoctors={selectedDoctors}
                setSelectedDoctors={setSelectedDoctors}
                onGenerateProposal={generateProposal}
                generatingProposal={generatingProposal}
              />
            ))}
          </div>
        </section>
      )}

      {/* In Progress */}
      {casesByStatus.inProgress.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            In Progress
          </h3>
          <div className="space-y-2">
            {casesByStatus.inProgress.map(caseRecord => (
              <CaseCard 
                key={caseRecord.id} 
                caseRecord={caseRecord} 
                onAssignDoctor={assignDoctor}
                assigningDoctor={assigningDoctor}
                doctors={doctors}
                loadingDoctors={loadingDoctors}
                selectedDoctors={selectedDoctors}
                setSelectedDoctors={setSelectedDoctors}
                onGenerateProposal={generateProposal}
                generatingProposal={generatingProposal}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {casesByStatus.completed.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Completed
          </h3>
          <div className="space-y-2">
            {casesByStatus.completed.map(caseRecord => (
              <CaseCard 
                key={caseRecord.id} 
                caseRecord={caseRecord} 
                onAssignDoctor={assignDoctor}
                assigningDoctor={assigningDoctor}
                doctors={doctors}
                loadingDoctors={loadingDoctors}
                selectedDoctors={selectedDoctors}
                setSelectedDoctors={setSelectedDoctors}
                onGenerateProposal={generateProposal}
                generatingProposal={generatingProposal}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CaseCard({ caseRecord, onAssignDoctor, assigningDoctor, doctors, loadingDoctors, selectedDoctors, setSelectedDoctors, onGenerateProposal, generatingProposal }) {
  const isBlocked = caseRecord.safe_t_result === 'BLOCKED';
  const needsDoctor = caseRecord.status === 'Safe-T-Reviewed' || caseRecord.status === 'Doctor-Pending';
  const doctorAssigned = caseRecord.doctor_email && caseRecord.doctor_confirmation_status !== 'PENDING';
  const selectedDoctorId = selectedDoctors[caseRecord.id];

  return (
    <Card className={`border-l-4 ${isBlocked ? 'border-l-red-500' : needsDoctor ? 'border-l-violet-500' : 'border-l-amber-500'}`}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-semibold text-slate-900">{caseRecord.client_name}</h3>
              <Badge className={STATUS_COLORS[caseRecord.status] || 'bg-slate-100 text-slate-700'}>
                {caseRecord.status}
              </Badge>
              {isBlocked && (
                <Badge className="bg-red-100 text-red-700">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  BLOCKED
                </Badge>
              )}
              {caseRecord.risk_score && (
                <Badge className={
                  caseRecord.risk_score === 'High' ? 'bg-red-100 text-red-700' :
                  caseRecord.risk_score === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                }>
                  {caseRecord.risk_score} Risk
                </Badge>
              )}
            </div>

            <p className="text-sm text-slate-500 mb-2">
              {caseRecord.procedures?.join(', ') || 'Procedure not specified'}
            </p>

            {/* Doctor Selection */}
            {needsDoctor && !isBlocked && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedDoctorId || ''}
                    onValueChange={(value) => setSelectedDoctors(prev => ({ ...prev, [caseRecord.id]: value }))}
                  >
                    <SelectTrigger className="w-full md:w-64 text-xs">
                      <SelectValue placeholder="Select a doctor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingDoctors ? (
                        <SelectItem value="loading" disabled>Loading doctors...</SelectItem>
                      ) : doctors.length === 0 ? (
                        <SelectItem value="none" disabled>No active doctors</SelectItem>
                      ) : (
                        doctors.map(doctor => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            Dr. {doctor.full_name} - {doctor.clinic_country} ({doctor.clinic_city})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => onAssignDoctor(caseRecord.id, selectedDoctorId)}
                    disabled={assigningDoctor === caseRecord.id || !selectedDoctorId}
                    className="bg-violet-600 hover:bg-violet-700 text-white text-xs flex-shrink-0"
                  >
                    {assigningDoctor === caseRecord.id ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-3 h-3 mr-2" />
                        Send Token
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Select a doctor above, then click "Send Token" to email them the secure portal link
                </p>
              </div>
            )}

            {/* Token Info - Show after doctor assigned */}
            {doctorAssigned && (
              <Alert className="mt-3 bg-blue-50 border-blue-200">
                <Mail className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-800">
                  <strong>Token sent!</strong> Doctor ({caseRecord.doctor_email}) received secure link to review case.
                  {caseRecord.doctor_confirmation_status === 'CONFIRMED' && (
                    <span className="ml-2 text-emerald-700 font-semibold">✓ Doctor confirmed</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Generate PDF Proposal Button */}
            {doctorAssigned && caseRecord.doctor_confirmed_at && (
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => onGenerateProposal(caseRecord.id)}
                  disabled={generatingProposal === caseRecord.id}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs w-full"
                >
                  {generatingProposal === caseRecord.id ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3 h-3 mr-2" />
                      Generate PDF Proposal
                    </>
                  )}
                </Button>
                <p className="text-xs text-slate-500 mt-1">
                  Calculates total costs and emails PDF proposal to client
                </p>
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="text-right text-xs text-slate-500 space-y-1">
            {caseRecord.created_date && (
              <div className="flex items-center gap-1 justify-end">
                <Calendar className="w-3 h-3" />
                {new Date(caseRecord.created_date).toLocaleDateString()}
              </div>
            )}
            {caseRecord.final_package_price && (
              <div className="font-semibold text-slate-900">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(caseRecord.final_package_price)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}