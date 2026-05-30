import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, UserPlus, Mail, CheckCircle, AlertCircle, 
  TrendingUp, Calendar, Shield
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [showDoctorPanel, setShowDoctorPanel] = useState(null);

  const assignDoctor = async (caseId) => {
    setAssigningDoctor(caseId);
    try {
      await base44.functions.invoke('assignDoctorToCase', { caseId });
      toast.success('Doctor assigned! They will receive an email with secure link.');
      onRefresh();
    } catch (error) {
      toast.error('Failed to assign doctor: ' + error.message);
    } finally {
      setAssigningDoctor(null);
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
          <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
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
                showDoctorPanel={showDoctorPanel}
                setShowDoctorPanel={setShowDoctorPanel}
              />
            ))}
          </div>
        </section>
      )}

      {/* Needs Doctor Assignment */}
      {casesByStatus.needsDoctor.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-violet-700 mb-3 flex items-center gap-2">
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
                showDoctorPanel={showDoctorPanel}
                setShowDoctorPanel={setShowDoctorPanel}
              />
            ))}
          </div>
        </section>
      )}

      {/* In Progress */}
      {casesByStatus.inProgress.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
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
                showDoctorPanel={showDoctorPanel}
                setShowDoctorPanel={setShowDoctorPanel}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {casesByStatus.completed.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
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
                showDoctorPanel={showDoctorPanel}
                setShowDoctorPanel={setShowDoctorPanel}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CaseCard({ caseRecord, onAssignDoctor, assigningDoctor, showDoctorPanel, setShowDoctorPanel }) {
  const isBlocked = caseRecord.safe_t_result === 'BLOCKED';
  const needsDoctor = caseRecord.status === 'Safe-T-Reviewed' || caseRecord.status === 'Doctor-Pending';
  const doctorAssigned = caseRecord.doctor_email && caseRecord.doctor_confirmation_status !== 'PENDING';

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

            {/* Doctor Status */}
            {needsDoctor && !isBlocked && (
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => onAssignDoctor(caseRecord.id)}
                  disabled={assigningDoctor === caseRecord.id}
                  className="bg-violet-600 hover:bg-violet-700 text-white text-xs"
                >
                  {assigningDoctor === caseRecord.id ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3 mr-2" />
                      Assign Doctor
                    </>
                  )}
                </Button>
                <p className="text-xs text-slate-500">
                  System will auto-select based on procedure country
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