import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, AlertCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

const stageColors = {
  'risk_check': 'bg-blue-50 border-blue-200',
  'doctor': 'bg-purple-50 border-purple-200',
  'travel': 'bg-green-50 border-green-200',
  'blocked': 'bg-red-50 border-red-200',
};

const statusIcons = {
  'approved': <CheckCircle2 className="w-4 h-4 text-green-600" />,
  'pending': <Clock className="w-4 h-4 text-yellow-600" />,
  'blocked': <AlertCircle className="w-4 h-4 text-red-600" />,
  'notified': <Zap className="w-4 h-4 text-blue-600" />,
};

export default function WorkflowStatusDashboard() {
  const [workflows, setWorkflows] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [wfs, cons] = await Promise.all([
        base44.asServiceRole.entities.WorkflowEvent.list(),
        base44.asServiceRole.entities.Consultation.list()
      ]);
      setWorkflows(wfs);
      setConsultations(cons);
    } catch (error) {
      console.error('Failed to load workflow data:', error);
      toast.error('Failed to load workflow data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const triggerWorkflow = async (consultationId) => {
    try {
      await base44.functions.invoke('portalHubWorkflow', { consultation_id: consultationId });
      toast.success('Workflow triggered successfully');
      setTimeout(loadData, 1000);
    } catch (error) {
      console.error('Workflow trigger failed:', error);
      toast.error('Workflow trigger failed: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading workflow data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Workflow Status Dashboard</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Monitor consultation workflow stages from risk assessment to completion.
        </p>
      </div>

      {/* Consultations Without Workflows */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Pending Consultations (Ready to Test)</h3>
        <div className="grid gap-3">
          {consultations
            .filter(c => !workflows.find(w => w.consultation_id === c.id))
            .slice(0, 5)
            .map(c => (
              <Card key={c.id} className="p-4 flex items-center justify-between border-yellow-200 bg-yellow-50">
                <div className="flex-1">
                  <p className="font-semibold">{c.patient_name}</p>
                  <p className="text-xs text-muted-foreground">{c.procedure_interest} • {c.email}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => triggerWorkflow(c.id)}
                  className="gap-2"
                >
                  <Zap className="w-3 h-3" /> Trigger Risk Check
                </Button>
              </Card>
            ))}
        </div>
      </div>

      {/* Active Workflows */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Active Workflows ({workflows.length})</h3>
        <div className="space-y-3">
          {workflows.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No active workflows yet.</p>
          ) : (
            workflows.map(wf => {
              const consultation = consultations.find(c => c.id === wf.consultation_id);
              return (
                <Card key={wf.id} className={`p-4 border-2 ${stageColors[wf.stage] || 'bg-gray-50'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span>{statusIcons[wf.risk_result] || statusIcons['pending']}</span>
                        <p className="font-semibold">{wf.patient_name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {consultation?.procedure_interest || 'N/A'} • {consultation?.email}
                      </p>
                    </div>
                    <Badge variant="outline">{wf.stage}</Badge>
                  </div>

                  {/* Risk Assessment */}
                  <div className="bg-white/50 rounded p-3 mb-3 text-sm">
                    <p className="font-semibold text-xs mb-1">Risk Check:</p>
                    <p className="text-xs">
                      <strong>{wf.risk_result || 'pending'}</strong>
                      {wf.risk_level && ` • ${wf.risk_level} risk`}
                    </p>
                    {wf.risk_summary && (
                      <p className="text-xs text-muted-foreground mt-1">{wf.risk_summary}</p>
                    )}
                    {wf.risk_flags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {wf.risk_flags.map((flag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Partner Status */}
                  {wf.stage !== 'risk_check' && (
                    <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                      {['doctor_status', 'travel_status', 'hotel_status', 'cab_status'].map((status, i) => (
                        <div key={i} className="bg-white/50 rounded p-2 text-center">
                          <p className="font-semibold text-[10px] uppercase">
                            {status.split('_')[0]}
                          </p>
                          <p className="text-xs mt-1">{wf[status] || 'pending'}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Last Update */}
                  {wf.last_update_summary && (
                    <p className="text-xs text-muted-foreground italic">
                      {wf.last_update_summary}
                    </p>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}