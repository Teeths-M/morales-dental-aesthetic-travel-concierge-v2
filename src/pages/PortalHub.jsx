import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  ShieldCheck, ShieldX, Stethoscope, Plane, Hotel, Car,
  Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, User, ChevronDown, ChevronUp, Users, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PartnersManager from '@/components/portal/PartnersManager';
import CapacityDashboard from '@/components/portal/CapacityDashboard';
import { Link } from 'react-router-dom';

const stagePipeline = [
  { key: 'risk_check', label: 'SAFE-T Risk Check', icon: ShieldCheck },
  { key: 'doctor', label: 'Doctor / Clinic', icon: Stethoscope },
  { key: 'travel', label: 'Travel Agency', icon: Plane },
  { key: 'hotel', label: 'Recovery Hotel', icon: Hotel },
  { key: 'cab', label: 'Cab / Transfer', icon: Car },
];

const statusBadge = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground' },
  notified: { label: 'Notified', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700' },
  unavailable: { label: 'Unavailable', color: 'bg-red-100 text-red-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700' },
};

function PartnerRow({ icon: Icon, label, status, notes }) {
  const badge = statusBadge[status] || statusBadge.pending;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
        </div>
        {notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{notes}</p>}
      </div>
    </div>
  );
}

function WorkflowCard({ workflow, onRerun, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isBlocked = workflow.risk_result === 'blocked';
  const isApproved = workflow.risk_result === 'approved';

  return (
    <motion.div
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-start gap-4 p-5">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${isBlocked ? 'bg-red-100' : isApproved ? 'bg-green-100' : 'bg-muted'}`}>
          {isBlocked ? <ShieldX className="w-5 h-5 text-red-600" /> : isApproved ? <ShieldCheck className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-foreground">{workflow.patient_name}</p>
              <p className="text-xs text-muted-foreground">{workflow.patient_email}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${isBlocked ? 'bg-red-100 text-red-700' : isApproved ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                {isBlocked ? '🔴 BLOCKED' : isApproved ? '✅ APPROVED' : '⏳ PENDING'}
              </span>
              <span className="text-[11px] text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded-full">
                Stage: {workflow.stage}
              </span>
            </div>
          </div>
          {workflow.risk_summary && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">{workflow.risk_summary}</p>
          )}
          {workflow.risk_flags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {workflow.risk_flags.map((f, i) => (
                <span key={i} className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full">{f}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expand partner statuses */}
      {isApproved && (
        <>
          <button
            className="w-full flex items-center justify-between px-5 py-3 border-t border-border bg-secondary/40 hover:bg-secondary transition-colors text-sm font-medium text-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            <span>Partner Workflow Status</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded && (
            <div className="px-5 pb-4">
              <PartnerRow icon={Stethoscope} label="Doctor / Clinic" status={workflow.doctor_status} notes={workflow.doctor_notes} />
              <PartnerRow icon={Plane} label="Travel Agency" status={workflow.travel_status} notes={workflow.travel_notes} />
              <PartnerRow icon={Hotel} label="Recovery Hotel" status={workflow.hotel_status} notes={workflow.hotel_notes} />
              <PartnerRow icon={Car} label="Cab / Transfer" status={workflow.cab_status} notes={workflow.cab_notes} />
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-3 flex-wrap bg-background/50">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {workflow.customer_notified ? (
            <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Customer notified</>
          ) : (
            <><XCircle className="w-3.5 h-3.5 text-muted-foreground" /> Customer not notified yet</>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            onClick={() => onRerun(workflow.consultation_id)}
          >
            <RefreshCw className="w-3 h-3" /> Re-run Workflow
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(workflow.id)}
            title="Delete workflow"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function PortalHub() {
  const [running, setRunning] = useState(null);
  const [message, setMessage] = useState(null);

  const { data: workflows = [], isLoading, refetch } = useQuery({
    queryKey: ['workflow_events'],
    queryFn: () => base44.entities.WorkflowEvent.list('-created_date', 50),
    refetchInterval: 300_000,
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations_hub'],
    queryFn: () => base44.entities.Consultation.list('-created_date', 50),
    refetchInterval: 300_000,
  });

  const rerun = async (consultation_id) => {
    setRunning(consultation_id);
    setMessage(null);
    const res = await base44.functions.invoke('portalHubWorkflow', { consultation_id });
    setRunning(null);
    setMessage(`Workflow complete: ${res.data?.status?.toUpperCase()} — ${res.data?.message}`);
    refetch();
  };

  const deleteWorkflow = async (workflow_id) => {
    if (!confirm('Delete this workflow event?')) return;
    await base44.entities.WorkflowEvent.delete(workflow_id);
    refetch();
  };

  const pendingConsultations = consultations.filter(c => {
    const hasWorkflow = workflows.some(w => w.consultation_id === c.id);
    return !hasWorkflow;
  });

  const stats = {
    total: workflows.length,
    approved: workflows.filter(w => w.risk_result === 'approved').length,
    blocked: workflows.filter(w => w.risk_result === 'blocked').length,
    pending: workflows.filter(w => w.risk_result === 'pending').length,
    allConfirmed: workflows.filter(w =>
      w.doctor_status === 'confirmed' &&
      w.travel_status === 'confirmed' &&
      w.hotel_status === 'confirmed' &&
      w.cab_status === 'confirmed'
    ).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl text-foreground">Portal Hub</h1>
              <p className="text-xs text-muted-foreground">SAFE-T 4LIFE™ Workflow Engine — Morales Dental & Aesthetics</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="workflows" className="w-full">
        <div className="mb-5">
          <Link to="/iq200">
            <div className="w-full rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #0F3A20, #1a4f2e)', border: '1px solid rgba(197,160,89,0.3)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(197,160,89,0.15)' }}>
                  <ShieldCheck className="w-4 h-4" style={{ color: '#C5A059' }} />
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: '#C5A059' }}>NEW</p>
                  <p className="text-white font-semibold text-sm">IQ200 Executive Operations Center</p>
                  <p className="text-white/50 text-[10px]">Full pipeline state machine · Pricing workbench · Audit logs</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-white/40 -rotate-90" />
            </div>
          </Link>
        </div>

        <TabsList className="mb-6">
          <TabsTrigger value="workflows" className="gap-1.5"><ShieldCheck className="w-4 h-4" /> Workflows</TabsTrigger>
          <TabsTrigger value="partners" className="gap-1.5"><Users className="w-4 h-4" /> Partners</TabsTrigger>
          <TabsTrigger value="capacity" className="gap-1.5"><Clock className="w-4 h-4" /> Capacity</TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <PartnersManager />
        </TabsContent>

        <TabsContent value="capacity">
          <CapacityDashboard />
        </TabsContent>

        <TabsContent value="workflows">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Processed', value: stats.total, color: 'text-foreground' },
            { label: 'Approved', value: stats.approved, color: 'text-green-600' },
            { label: 'Blocked', value: stats.blocked, color: 'text-red-600' },
            { label: 'Fully Confirmed', value: stats.allConfirmed, color: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className={`font-display text-3xl ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Notification message */}
        {message && (
          <div className="mb-6 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm text-primary font-medium">
            {message}
          </div>
        )}

        {/* Pending consultations without a workflow */}
        {pendingConsultations.length > 0 && (
          <div className="mb-8">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-accent" /> Awaiting Workflow Trigger ({pendingConsultations.length})
            </p>
            <div className="space-y-2">
              {pendingConsultations.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.patient_name}</p>
                      <p className="text-xs text-muted-foreground">{c.email} — {c.procedure_interest?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs h-8"
                    disabled={running === c.id}
                    onClick={() => rerun(c.id)}
                  >
                    {running === c.id ? 'Running...' : 'Run Workflow'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workflow events */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Workflow Events</p>
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" onClick={() => refetch()}>
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading workflows…</div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No workflows yet. Submit a consultation to trigger the Portal Hub.</p>
            </div>
          ) : (
            <div className="space-y-4">
               {workflows.map(w => (
                 <WorkflowCard key={w.id} workflow={w} onRerun={rerun} onDelete={deleteWorkflow} />
               ))}
             </div>
          )}
        </div>

        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}