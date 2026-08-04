import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Shield, AlertTriangle, CheckCircle, RefreshCw, User, Building, Car } from 'lucide-react';
import { toast } from 'sonner';

const ProviderTypeIcon = ({ type }) => {
  switch (type) {
    case 'doctor': return <User className="w-4 h-4" />;
    case 'travel_agency': return <Building className="w-4 h-4" />;
    case 'taxi_service': return <Car className="w-4 h-4" />;
    default: return <User className="w-4 h-4" />;
  }
};

const StatusBadge = ({ status }) => {
  const variants = {
    pending: 'bg-gray-100 text-gray-700',
    initiated: 'bg-blue-100 text-blue-700',
    passed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    manual_override: 'bg-amber-100 text-amber-700'
  };

  return (
    <Badge className={variants[status] || variants.pending}>
      {status.replace('_', ' ')}
    </Badge>
  );
};

export default function ProviderVerificationOverride() {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideAction, setOverrideAction] = useState('approve');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fraudReason, setFraudReason] = useState('');

  const queryClient = useQueryClient();

  // Fetch all providers with verification status
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => base44.entities.Doctor.list()
  });

  const { data: travelAgencies = [] } = useQuery({
    queryKey: ['travelAgencies'],
    queryFn: () => base44.entities.TravelAgency.list()
  });

  const { data: taxiServices = [] } = useQuery({
    queryKey: ['taxiServices'],
    queryFn: () => base44.entities.TaxiService.list()
  });

  // Combine all providers
  const allProviders = /** @type {any[]} */ ([
    ...doctors.map(d => ({ ...d, provider_type: 'doctor' })),
    ...travelAgencies.map(t => ({ ...t, provider_type: 'travel_agency' })),
    ...taxiServices.map(t => ({ ...t, provider_type: 'taxi_service' }))
  ]);

  // Filter to only those needing verification review
  const providersNeedingReview = allProviders.filter(p => 
    p.verification_status !== 'verified' && p.status === 'pending_verification'
  );

  // Fetch verification records for selected provider
  const { data: verificationRecords = [] } = useQuery({
    queryKey: ['verifications', selectedProvider?.id],
    queryFn: () => {
      if (!selectedProvider) return [];
      return base44.entities.ProviderVerification.filter({
        provider_id: selectedProvider.id,
        provider_type: selectedProvider.provider_type
      });
    },
    enabled: !!selectedProvider
  });

  const overrideMutation = useMutation({
    mutationFn: async ({ verificationId, action, reason }) => {
      const _record = verificationRecords.find(v => v.id === verificationId);
      
      // Update the verification record
      await base44.entities.ProviderVerification.update(verificationId, {
        manual_override_status: action === 'approve' ? 'approved_by_admin' : 'rejected_by_admin',
        override_reason: reason,
        override_approved_by: (await base44.auth.me()).id,
        override_approved_at: new Date().toISOString(),
        status: action === 'approve' ? 'manual_override' : 'failed'
      });

      // Sync state to parent provider
      await base44.functions.invoke('syncProviderVerificationState', {
        provider_id: selectedProvider.id,
        provider_type: selectedProvider.provider_type
      });

      // If approved and all checks pass, optionally activate the provider
      if (action === 'approve') {
        const entityMap = {
          doctor: 'Doctor',
          travel_agency: 'TravelAgency',
          taxi_service: 'TaxiService'
        };
        
        await base44.entities[entityMap[selectedProvider.provider_type]].update(selectedProvider.id, {
          status: 'active'
        });
      }
    },
    onSuccess: () => {
      toast.success('Override applied successfully');
      queryClient.invalidateQueries({ queryKey: ['verifications'] });
      queryClient.invalidateQueries({ queryKey: ['doctors', 'travelAgencies', 'taxiServices'] });
      setIsDialogOpen(false);
      setOverrideReason('');
      setSelectedProvider(null);
    },
    onError: (error) => {
      toast.error(`Failed to apply override: ${error.message}`);
    }
  });

  // Fraud Intelligence override — a separate signal from identity/background/
  // license verification above. Only applies to doctors (runFraudOverride only
  // writes to the Doctor entity).
  const fraudOverrideMutation = useMutation({
    mutationFn: ({ action, reason }) => base44.functions.invoke('runFraudOverride', {
      doctor_id: selectedProvider.id,
      action,
      reason,
    }),
    onSuccess: () => {
      toast.success('Fraud override applied');
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setFraudReason('');
    },
    onError: (error) => {
      toast.error(`Failed to apply fraud override: ${error.message}`);
    }
  });

  const handleFraudOverride = (action) => {
    if (!fraudReason.trim() || fraudReason.trim().length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }
    fraudOverrideMutation.mutate({ action, reason: fraudReason });
  };

  const handleOverride = () => {
    if (!overrideReason.trim()) {
      toast.error('Please provide a reason for the override');
      return;
    }

    // Find the failed verification record to override
    const failedRecord = verificationRecords.find(v => 
      v.status === 'failed' && v.manual_override_status === 'not_overridden'
    );

    if (failedRecord) {
      overrideMutation.mutate({
        verificationId: failedRecord.id,
        action: overrideAction,
        reason: overrideReason
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Provider Verification Override
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manually override automated verification decisions
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {providersNeedingReview.length} Pending Review
        </Badge>
      </div>

      <div className="grid gap-4">
        {providersNeedingReview.map((provider) => (
          <Card key={provider.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ProviderTypeIcon type={provider.provider_type} />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {provider.full_name || provider.agency_name || provider.driver_name || provider.company_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{provider.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedProvider(provider);
                    setIsDialogOpen(true);
                  }}
                >
                  Review
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedProvider(provider);
                    queryClient.invalidateQueries({ queryKey: ['verifications'] });
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Status
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Identity</p>
                  <StatusBadge status={provider.identity_verification_status} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Background Check</p>
                  <StatusBadge status={provider.background_check_status} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">License</p>
                  <StatusBadge status={provider.license_verification_status} />
                </div>
              </div>
              {provider.verification_can_be_activated && (
                <div className="mt-3 flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Ready for activation
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {providersNeedingReview.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">All providers verified</p>
              <p className="text-sm mt-1">No providers pending review</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Override Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Provider Verification</DialogTitle>
          </DialogHeader>

          {selectedProvider && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <ProviderTypeIcon type={selectedProvider.provider_type} />
                <div>
                  <p className="font-medium">
                    {selectedProvider.full_name || selectedProvider.agency_name || selectedProvider.driver_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedProvider.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Verification Records</h3>
                {verificationRecords.map((record) => (
                  <div key={record.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {record.verification_type === 'identity' && <User className="w-4 h-4" />}
                        {record.verification_type === 'background_check' && <Shield className="w-4 h-4" />}
                        {record.verification_type === 'license' && <CheckCircle className="w-4 h-4" />}
                        <span className="font-medium capitalize">{record.verification_type.replace('_', ' ')}</span>
                      </div>
                      <StatusBadge status={record.status} />
                    </div>
                    {record.external_verification_id && (
                      <p className="text-xs text-muted-foreground">
                        External ID: {record.external_verification_id}
                      </p>
                    )}
                    {record.result_summary?.flags?.length > 0 && (
                      <div className="flex items-center gap-2 text-red-600 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Flags: {record.result_summary.flags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedProvider.provider_type === 'doctor' && selectedProvider.fraud_risk_level && (
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Fraud Intelligence</h3>
                    <Badge className={
                      selectedProvider.fraud_risk_level === 'high' ? 'bg-red-100 text-red-700' :
                      selectedProvider.fraud_risk_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }>
                      {selectedProvider.fraud_risk_level} risk — {selectedProvider.fraud_risk_score}/100
                    </Badge>
                  </div>
                  {selectedProvider.fraud_xai_summary && (
                    <p className="text-sm text-muted-foreground">{selectedProvider.fraud_xai_summary}</p>
                  )}
                  {selectedProvider.fraud_xai_flags?.length > 0 && (
                    <ul className="text-xs text-red-600 list-disc pl-4 space-y-0.5">
                      {selectedProvider.fraud_xai_flags.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  )}
                  {selectedProvider.fraud_override && (
                    <p className="text-xs text-muted-foreground">
                      Current override: <strong>{selectedProvider.fraud_override}</strong> by {selectedProvider.fraud_override_by}
                    </p>
                  )}
                  <Textarea
                    value={fraudReason}
                    onChange={(e) => setFraudReason(e.target.value)}
                    placeholder="Reason for fraud-risk decision (min 10 characters)..."
                    className="min-h-[70px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={fraudOverrideMutation.isPending}
                      onClick={() => handleFraudOverride('whitelist')}>Whitelist</Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={fraudOverrideMutation.isPending}
                      onClick={() => handleFraudOverride('fast_track_clear')}>Clear</Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700" disabled={fraudOverrideMutation.isPending}
                      onClick={() => handleFraudOverride('escalate')}>Escalate</Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold">Manual Override</h3>
                <div className="grid gap-2">
                  <Label>Action</Label>
                  <Select value={overrideAction} onValueChange={setOverrideAction}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approve">Approve & Activate Provider</SelectItem>
                      <SelectItem value="reject">Reject (Keep Blocked)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Reason for Override (Required)</Label>
                  <Textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Document why you're overriding the automated decision..."
                    className="min-h-[100px]"
                  />
                </div>
                {overrideAction === 'approve' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>Warning:</strong> Approving this override will activate the provider and allow them to accept bookings.
                      Ensure you have thoroughly reviewed their documentation.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleOverride}
                  disabled={overrideMutation.isPending || !overrideReason.trim()}
                  className={overrideAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {overrideMutation.isPending ? 'Processing...' : overrideAction === 'approve' ? 'Approve & Activate' : 'Reject'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}