import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const RISK_STYLES = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const DOCTOR_STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-600',
  notified: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  unavailable: 'bg-red-100 text-red-700',
};

function CaseCard({ consultation, workflow, onConfirm, onDecline, loading }) {
  const [expanded, setExpanded] = useState(false);
  const doctorStatus = workflow?.doctor_status || 'pending';

  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader
        className="cursor-pointer select-none pb-3"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold truncate">
                {consultation?.patient_name || 'Unknown Patient'}
              </CardTitle>
              <Badge className={DOCTOR_STATUS_STYLES[doctorStatus] || DOCTOR_STATUS_STYLES.pending}>
                {doctorStatus === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                {doctorStatus === 'confirmed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {doctorStatus === 'unavailable' && <XCircle className="w-3 h-3 mr-1" />}
                {doctorStatus.charAt(0).toUpperCase() + doctorStatus.slice(1)}
              </Badge>
              {consultation?.risk_level && (
                <Badge className={RISK_STYLES[consultation.risk_level] || RISK_STYLES.low}>
                  {consultation.risk_level.charAt(0).toUpperCase() + consultation.risk_level.slice(1)} Risk
                </Badge>
              )}
            </div>
            <div className="mt-1 text-sm text-muted-foreground flex flex-wrap gap-3">
              <span className="capitalize">{consultation?.procedure_interest?.replace(/_/g, ' ') || 'N/A'}</span>
              {consultation?.preferred_date && (
                <span>· {new Date(consultation.preferred_date).toLocaleDateString()}</span>
              )}
              {consultation?.destination_country && (
                <span>· {consultation.destination_country}</span>
              )}
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm bg-muted/40 rounded-lg p-4">
            {[
              ['Age', consultation?.age],
              ['Gender', consultation?.gender],
              ['Nationality', consultation?.nationality],
              ['Phone', consultation?.phone],
              ['Email', consultation?.email],
              ['Duration of Stay', consultation?.duration_of_stay],
              ['Return Date', consultation?.return_date ? new Date(consultation.return_date).toLocaleDateString() : null],
              ['Emergency Contact', consultation?.emergency_contact_name ? `${consultation.emergency_contact_name} (${consultation.emergency_contact_number})` : null],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium">{value}</p>
              </div>
            ))}
          </div>

          {(consultation?.medical_conditions?.length > 0 || consultation?.allergies?.length > 0 || consultation?.medication_types?.length > 0) && (
            <div className="space-y-2 text-sm">
              {consultation.medical_conditions?.length > 0 && (
                <div><span className="font-medium">Conditions: </span>{consultation.medical_conditions.join(', ')}</div>
              )}
              {consultation.allergies?.length > 0 && (
                <div><span className="font-medium">Allergies: </span>{consultation.allergies.join(', ')}</div>
              )}
              {consultation.medication_types?.length > 0 && (
                <div><span className="font-medium">Medications: </span>{consultation.medication_types.join(', ')}</div>
              )}
            </div>
          )}

          {consultation?.notes && (
            <div className="text-sm">
              <span className="font-medium">Notes: </span>
              <span className="text-muted-foreground">{consultation.notes}</span>
            </div>
          )}

          {workflow?.doctor_notes && (
            <div className="text-sm bg-blue-50 border border-blue-100 rounded-lg p-3">
              <span className="font-medium text-blue-800">Your notes: </span>
              <span className="text-blue-700">{workflow.doctor_notes}</span>
            </div>
          )}

          {doctorStatus === 'pending' || doctorStatus === 'notified' ? (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => onConfirm(workflow)}
                disabled={loading}
                className="flex-1"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Confirm Availability
              </Button>
              <Button
                onClick={() => onDecline(workflow)}
                variant="outline"
                disabled={loading}
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                Not Available
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic pt-1">
              Response already submitted — contact admin to make changes.
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function DoctorCasesDashboard() {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getDoctorCases', {});
      setDoctor(res.data.doctor);
      setConsultations(res.data.consultations || []);
      setWorkflows(res.data.workflows || []);
    } catch (e) {
      setError(e.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (workflow) => {
    setActionLoading(true);
    try {
      await base44.asServiceRole.entities.WorkflowEvent.update(workflow.id, {
        doctor_status: 'confirmed',
        doctor_confirmed_date: new Date().toISOString(),
        last_update_summary: 'Doctor confirmed availability.',
      });
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, doctor_status: 'confirmed' } : w));
    } catch (e) {
      alert('Failed to confirm. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (workflow) => {
    setActionLoading(true);
    try {
      await base44.asServiceRole.entities.WorkflowEvent.update(workflow.id, {
        doctor_status: 'unavailable',
        last_update_summary: 'Doctor marked as unavailable.',
      });
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, doctor_status: 'unavailable' } : w));
    } catch (e) {
      alert('Failed to decline. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getWorkflowForConsultation = (consultationId) =>
    workflows.find(w => w.consultation_id === consultationId);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Card className="max-w-md w-full text-center p-8">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={load} className="mt-4">Retry</Button>
      </Card>
    </div>
  );

  const pending = consultations.filter(c => {
    const wf = getWorkflowForConsultation(c.id);
    return !wf || wf.doctor_status === 'pending' || wf.doctor_status === 'notified';
  });
  const responded = consultations.filter(c => {
    const wf = getWorkflowForConsultation(c.id);
    return wf && (wf.doctor_status === 'confirmed' || wf.doctor_status === 'unavailable');
  });

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Assigned Cases</h1>
          <p className="text-muted-foreground mt-1">
            Welcome, Dr. {doctor?.full_name || user?.email} · {consultations.length} case{consultations.length !== 1 ? 's' : ''} assigned
          </p>
        </div>

        {/* Pending */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Awaiting Response ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="text-center py-10 bg-muted/30 rounded-xl text-muted-foreground text-sm">
              No pending cases — you're all caught up!
            </div>
          ) : (
            pending.map(c => (
              <CaseCard
                key={c.id}
                consultation={c}
                workflow={getWorkflowForConsultation(c.id)}
                onConfirm={handleConfirm}
                onDecline={handleDecline}
                loading={actionLoading}
              />
            ))
          )}
        </section>

        {/* Responded */}
        {responded.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Responded ({responded.length})
            </h2>
            {responded.map(c => (
              <CaseCard
                key={c.id}
                consultation={c}
                workflow={getWorkflowForConsultation(c.id)}
                onConfirm={handleConfirm}
                onDecline={handleDecline}
                loading={actionLoading}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}