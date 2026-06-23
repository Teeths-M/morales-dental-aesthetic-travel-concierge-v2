import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  UserCheck, 
  Plane, 
  Car, 
  DollarSign, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  Play
} from 'lucide-react';

const statusColors = {
  'Submitted': 'bg-blue-100 text-blue-800',
  'Safe-T-Reviewed': 'bg-purple-100 text-purple-800',
  'Doctor-Pending': 'bg-yellow-100 text-yellow-800',
  'Vendor-Pending': 'bg-orange-100 text-orange-800',
  'Admin-Review': 'bg-red-100 text-red-800',
  'Proposal-Sent': 'bg-indigo-100 text-indigo-800',
  'PMP-25': 'bg-green-100 text-green-800',
  'PMP-50': 'bg-green-100 text-green-800',
  'Deposit-Paid': 'bg-green-100 text-green-800',
  'Travel-Coordination': 'bg-blue-100 text-blue-800',
  'Ready-For-Travel': 'bg-emerald-100 text-emerald-800',
  'Procedure-In-Progress': 'bg-purple-100 text-purple-800',
  'Recovery': 'bg-teal-100 text-teal-800',
  'Completed': 'bg-green-100 text-green-800'
};

const safeTColors = {
  'PENDING': 'bg-yellow-100 text-yellow-800',
  'PASSED': 'bg-green-100 text-green-800',
  'BLOCKED': 'bg-red-100 text-red-800'
};

export default function WorkflowEngine({ cases, onExecuteWorkflow, onViewCase }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Submitted': return <Activity className="w-4 h-4" />;
      case 'Safe-T-Reviewed': return <CheckCircle2 className="w-4 h-4" />;
      case 'Doctor-Pending': return <UserCheck className="w-4 h-4" />;
      case 'Vendor-Pending': return <Plane className="w-4 h-4" />;
      case 'Admin-Review': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getNextAction = (caseRecord) => {
    switch (caseRecord.status) {
      case 'Submitted': return 'Run SAFE-T Review';
      case 'Safe-T-Reviewed': return caseRecord.safe_t_result === 'PASSED' ? 'Assign Doctor' : 'Review Block';
      case 'Doctor-Pending': return 'Wait for Doctor';
      case 'Vendor-Pending': return 'Assign Travel & Transfer';
      case 'Admin-Review': return 'Manual Review Required';
      default: return 'Continue Workflow';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-semibold">Workflow Engine</h2>
          <p className="text-muted-foreground">Manage and execute case workflows</p>
        </div>
      </div>

      <div className="grid gap-4">
        {cases.map((caseRecord) => (
          <Card key={caseRecord.id} className="border-border">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{caseRecord.client_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{caseRecord.client_email}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={statusColors[caseRecord.status] || 'bg-gray-100 text-gray-800'}>
                    {getStatusIcon(caseRecord.status)}
                    <span className="ml-1">{caseRecord.status}</span>
                  </Badge>
                  <Badge className={safeTColors[caseRecord.safe_t_result] || 'bg-gray-100 text-gray-800'}>
                    SAFE-T: {caseRecord.safe_t_result}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Procedure</p>
                  <p className="font-medium">{caseRecord.procedures?.join(', ') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="font-medium">{caseRecord.procedure_country || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                  <p className="font-medium">{caseRecord.risk_score || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Next Action</p>
                  <p className="text-sm font-semibold">{getNextAction(caseRecord)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onViewCase(caseRecord.id)}
                  variant="outline"
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  onClick={() => onExecuteWorkflow(caseRecord.id)}
                  disabled={caseRecord.status === 'Completed'}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Execute Workflow
                </Button>
                {caseRecord.doctor_confirmation_status === 'Confirmed' && caseRecord.status !== 'Proposal-Sent' && (
                  <Button size="sm" variant="secondary">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Generate Proposal
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}