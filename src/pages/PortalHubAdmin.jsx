import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PortalHubSidebar from '@/components/portal/PortalHubSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import WorkflowDashboard from '@/components/portal/WorkflowDashboard';
import ProviderManager from '@/components/portal/ProviderManager';
import PaymentDashboard from '@/components/portal/PaymentDashboard';
import PricingCatalogManager from '@/components/portal/PricingCatalogManager';
import DoctorProfilesManager from '@/components/portal/DoctorProfilesManager';

const statusConfig = {
  'FULLY_CONFIRMED': { color: 'bg-green-50 border-green-200', icon: CheckCircle2, label: 'Fully Confirmed', textColor: 'text-green-700' },
  'PMP-25': { color: 'bg-yellow-50 border-yellow-200', icon: Clock, label: '25% Deposit', textColor: 'text-yellow-700' },
  'PMP-50': { color: 'bg-blue-50 border-blue-200', icon: Clock, label: '50% Deposit', textColor: 'text-blue-700' },
  'AWAITING_QUOTES': { color: 'bg-slate-50 border-slate-200', icon: Clock, label: 'Awaiting Quotes', textColor: 'text-slate-700' },
  'PENDING_PAYMENT': { color: 'bg-orange-50 border-orange-200', icon: AlertCircle, label: 'Pending Payment', textColor: 'text-orange-700' },
  'ESCALATED': { color: 'bg-red-50 border-red-200', icon: AlertCircle, label: 'Escalated', textColor: 'text-red-700' }
};

const PAGE_SIZE = 20;

export default function PortalHubAdmin() {
  const [activeTab, setActiveTab] = useState('doctors');
  const [subTab, setSubTab] = useState('workflows');
  const [filters, setFilters] = useState({ status: null });
  const [page, setPage] = useState(1);
  const isMobile = useIsMobile();

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['portal_workflows'],
    queryFn: () => base44.entities.WorkflowEvent.filter({}, '-created_date', 50),
  });

  const { data: paymentPlans = [] } = useQuery({
    queryKey: ['portal_payments'],
    queryFn: () => base44.entities.PaymentPlan.filter({}, '-created_date', 50),
  });

  const paginatedWorkflows = workflows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(workflows.length / PAGE_SIZE));

  const stats = {
    fully_confirmed: workflows.filter(w => w.status === 'FULLY_CONFIRMED').length,
    pending_payment: workflows.filter(w => w.status === 'PENDING_PAYMENT').length,
    awaiting_quotes: workflows.filter(w => w.status === 'AWAITING_QUOTES').length,
    escalated: workflows.filter(w => w.risk_result === 'blocked').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="flex">
        <PortalHubSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="flex-1 overflow-auto min-w-0">
          {/* Header — desktop only (mobile uses sidebar topbar) */}
          <div className="hidden md:block sticky top-0 z-30 bg-card/50 backdrop-blur-sm border-b border-border/30 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display text-3xl text-foreground">PORTAL HUB™</h1>
                <p className="text-sm text-muted-foreground mt-1">Healthcare Travel Orchestration System</p>
              </div>
              <Button variant="outline" size="lg" className="gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          {activeTab === 'workflows' && (
            <div className="p-4 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 md:mb-8">
              {[
                { label: 'Fully Confirmed', value: stats.fully_confirmed, color: 'green' },
                { label: 'Pending Payment', value: stats.pending_payment, color: 'orange' },
                { label: 'Awaiting Quotes', value: stats.awaiting_quotes, color: 'slate' },
                { label: 'Escalated', value: stats.escalated, color: 'red' }
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="p-6 border-l-4" style={{
                    borderLeftColor: {
                      green: '#22c55e',
                      orange: '#f97316',
                      slate: '#64748b',
                      red: '#ef4444'
                    }[stat.color]
                  }}>
                    <div className="text-3xl font-semibold text-foreground">{stat.value}</div>
                    <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="p-4 md:p-8">
            {activeTab === 'workflows' && (
              <>
                <WorkflowDashboard workflows={paginatedWorkflows} isLoading={isLoading} />
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
            {activeTab === 'doctors' && <DoctorProfilesManager />}
            {activeTab === 'providers' && <ProviderManager />}
            {activeTab === 'payments' && <PaymentDashboard paymentPlans={paymentPlans} />}
            {activeTab === 'pricing' && <PricingCatalogManager />}
          </div>
        </div>
      </div>
      
    </div>
  );
}