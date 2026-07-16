import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AdminLayout from '@/components/layout/AdminLayout';
import LoadingState from '@/components/ui-system/LoadingState';
import EmptyState from '@/components/ui-system/EmptyState';
import PendingReviewCard from '@/components/admin/PendingReviewCard';

const ENTITY_MAP = { doctor: 'Doctor', travel_agency: 'TravelAgency', taxi: 'TaxiService', security: 'SecurityAgency' };

export default function PartnerCommandCenter() {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(null);

  const { data: doctors = [], isLoading: ld } = useQuery({
    queryKey: ['cmd-center', 'doctor'],
    queryFn: () => base44.entities.Doctor.filter({ verification_status: 'pending_manual' }, '-internet_risk_score', 100),
    staleTime: 30000,
  });
  const { data: travelAgencies = [], isLoading: lt } = useQuery({
    queryKey: ['cmd-center', 'travel_agency'],
    queryFn: () => base44.entities.TravelAgency.filter({ verification_status: 'pending_manual' }, '-created_date', 50),
    staleTime: 30000,
  });
  const { data: taxiServices = [], isLoading: lx } = useQuery({
    queryKey: ['cmd-center', 'taxi'],
    queryFn: () => base44.entities.TaxiService.filter({ verification_status: 'pending_manual' }, '-created_date', 50),
    staleTime: 30000,
  });
  const { data: securityAgencies = [], isLoading: ls } = useQuery({
    queryKey: ['cmd-center', 'security'],
    queryFn: () => base44.entities.SecurityAgency.filter({ verification_status: 'pending_manual' }, '-created_date', 50),
    staleTime: 30000,
  });

  const isLoading = ld || lt || lx || ls;
  const allPending = [
    ...doctors.map(d => ({ ...d, _partnerType: 'doctor' })),
    ...travelAgencies.map(t => ({ ...t, _partnerType: 'travel_agency' })),
    ...taxiServices.map(t => ({ ...t, _partnerType: 'taxi' })),
    ...securityAgencies.map(s => ({ ...s, _partnerType: 'security' })),
  ].sort((a, b) => (b.internet_risk_score ?? 0) - (a.internet_risk_score ?? 0));

  const highCount = allPending.filter(p => p.internet_risk_level === 'high').length;
  const medCount = allPending.filter(p => p.internet_risk_level === 'medium').length;

  const handleApprove = async (partnerId, partnerType) => {
    setActionLoading(`${partnerId}-approve`);
    try {
      const entityName = ENTITY_MAP[partnerType];
      const patch = { verification_status: 'manually_approved', status: 'active' };
      if (partnerType === 'doctor') patch.verification_can_be_activated = true;
      await base44.entities[entityName].update(partnerId, patch);
      queryClient.invalidateQueries({ queryKey: ['cmd-center'] });
    } catch (e) {
      console.error('Approve failed:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlacklist = async (partnerId, partnerType, reason) => {
    setActionLoading(`${partnerId}-blacklist`);
    try {
      await base44.functions.invoke('blacklistPartner', { partner_id: partnerId, partner_type: partnerType, reason });
      queryClient.invalidateQueries({ queryKey: ['cmd-center'] });
    } catch (e) {
      console.error('Blacklist failed:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['cmd-center'] });

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold font-display">Partner Command Center</h1>
              <p className="text-sm text-muted-foreground">Tiered Trust Protocol — review and act on flagged partners</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <p className="text-2xl font-semibold text-red-600">{highCount}</p>
              <p className="text-xs text-slate-500">High Risk</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <p className="text-2xl font-semibold text-amber-600">{medCount}</p>
              <p className="text-xs text-slate-500">Medium Risk</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <p className="text-2xl font-semibold text-slate-900">{allPending.length}</p>
              <p className="text-xs text-slate-500">Pending Review</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <LoadingState rows={3} dark={false} label="Loading review queue" />
        ) : allPending.length === 0 ? (
          <EmptyState dark={false} icon={CheckCircle} title="No pending reviews" message="All flagged partners have been reviewed. The moat is holding." />
        ) : (
          <div className="space-y-4">
            {allPending.map(partner => (
              <PendingReviewCard
                key={partner.id}
                partner={partner}
                onApprove={() => handleApprove(partner.id, partner._partnerType)}
                onBlacklist={(reason) => handleBlacklist(partner.id, partner._partnerType, reason)}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}