import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Users, 
  CheckCircle2, 
  Clock,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import WorkflowEngine from './WorkflowEngine';
import { toast } from 'sonner';

export default function AdminWorkflowDashboard() {
  const [activeTab, setActiveTab] = useState('workflow');
  const queryClient = useQueryClient();

  const { data: cases, isLoading, refetch } = useQuery({
    queryKey: ['admin-cases'],
    queryFn: () => base44.entities.Case.list('-created_date', 100)
  });

  const executeWorkflowMutation = useMutation({
    mutationFn: (caseId) => base44.functions.invoke('executeCaseWorkflow', { caseId }),
    onSuccess: () => {
      toast.success('Workflow executed successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to execute workflow');
    }
  });

  const handleExecuteWorkflow = (caseId) => {
    executeWorkflowMutation.mutate(caseId);
  };

  const handleViewCase = (caseId) => {
    // Navigate to case detail view or open modal
    console.log('View case:', caseId);
  };

  // Calculate stats
  const stats = {
    total: cases?.length || 0,
    submitted: cases?.filter(c => c.status === 'Submitted').length || 0,
    inProgress: cases?.filter(c => ['Doctor-Pending', 'Vendor-Pending'].includes(c.status)).length || 0,
    completed: cases?.filter(c => c.status === 'Completed').length || 0,
    blocked: cases?.filter(c => c.safe_t_result === 'BLOCKED').length || 0
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">IQ200 Admin Center</h1>
            <p className="text-muted-foreground">Medical Travel Coordination Platform</p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">TOTAL CASES</p>
                  <p className="text-2xl font-semibold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">SUBMITTED</p>
                  <p className="text-2xl font-semibold">{stats.submitted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">IN PROGRESS</p>
                  <p className="text-2xl font-semibold">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">COMPLETED</p>
                  <p className="text-2xl font-semibold">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">BLOCKED</p>
                  <p className="text-2xl font-semibold">{stats.blocked}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="workflow">Workflow Engine</TabsTrigger>
            <TabsTrigger value="cases">All Cases</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <WorkflowEngine 
                cases={cases || []} 
                onExecuteWorkflow={handleExecuteWorkflow}
                onViewCase={handleViewCase}
              />
            )}
          </TabsContent>

          <TabsContent value="cases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Case management view coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}