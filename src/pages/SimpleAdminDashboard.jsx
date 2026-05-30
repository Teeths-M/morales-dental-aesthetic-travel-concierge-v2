import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Users, FileText, CheckCircle, Clock, AlertCircle, 
  RefreshCw, ArrowRight, Shield, Mail, Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import ConsultationIntake from '@/components/iq200/ConsultationIntake';
import SimpleCaseList from '@/components/iq200/SimpleCaseList';
import WorkflowExplainer from '@/components/iq200/WorkflowExplainer';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

export default function SimpleAdminDashboard() {
  const qc = useQueryClient();
  const [showWorkflow, setShowWorkflow] = useState(false);

  // Fetch consultations (new patient requests)
  const { data: consultations = [], isLoading: loadingConsultations } = useQuery({
    queryKey: ['consultations_simple'],
    queryFn: () => base44.asServiceRole.entities.Consultation.list('-created_date', 50),
  });

  // Fetch case records (active cases in workflow)
  const { data: cases = [], isLoading: loadingCases, refetch } = useQuery({
    queryKey: ['cases_simple'],
    queryFn: () => base44.asServiceRole.entities.CaseRecord.list('-created_date', 100),
  });

  // Calculate simple stats
  const stats = {
    newConsultations: consultations.length,
    activeCases: cases.length,
    awaitingDoctor: cases.filter(c => c.status === 'Doctor-Pending').length,
    blocked: cases.filter(c => c.safe_t_result === 'BLOCKED').length,
  };

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['consultations_simple'] });
    qc.invalidateQueries({ queryKey: ['cases_simple'] });
    refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Medical Travel Admin</h1>
                <p className="text-xs text-slate-500">Simple Workflow Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWorkflow(!showWorkflow)}
                className="text-xs"
              >
                {showWorkflow ? 'Hide' : 'Show'} Workflow Guide
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-3 h-3 mr-2" /> Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Workflow Explainer */}
        {showWorkflow && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <WorkflowExplainer />
          </motion.div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.newConsultations}</p>
                  <p className="text-xs text-slate-500">New Consultations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.activeCases}</p>
                  <p className="text-xs text-slate-500">Active Cases</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.awaitingDoctor}</p>
                  <p className="text-xs text-slate-500">Awaiting Doctor</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.blocked}</p>
                  <p className="text-xs text-slate-500">Blocked (Risk)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 1: Consultation Intake */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">1</div>
            <h2 className="text-lg font-bold text-slate-900">New Patient Consultations</h2>
            <Badge variant="outline" className="ml-auto">{consultations.length} pending</Badge>
          </div>
          <ConsultationIntake consultations={consultations} isLoading={loadingConsultations} />
        </section>

        {/* Step 2: Active Cases */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">2</div>
            <h2 className="text-lg font-bold text-slate-900">Active Cases in Workflow</h2>
            <Badge variant="outline" className="ml-auto">{cases.length} total</Badge>
          </div>
          <SimpleCaseList cases={cases} isLoading={loadingCases} onRefresh={refetch} />
        </section>
      </div>
    </div>
  );
}