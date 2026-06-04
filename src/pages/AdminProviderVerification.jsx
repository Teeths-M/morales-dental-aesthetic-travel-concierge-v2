import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Shield, 
  User, 
  CheckCircle, 
  CheckCircle2,
  AlertTriangle, 
  Clock, 
  RefreshCw,
  Eye
} from 'lucide-react';
import ProviderVerificationOverride from '@/components/admin/ProviderVerificationOverride';

export default function AdminProviderVerification() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: providers, isLoading } = useQuery({
    queryKey: ['provider-verifications'],
    queryFn: async () => {
      const [doctors, travelAgencies, taxiServices] = await Promise.all([
        base44.entities.Doctor.list(),
        base44.entities.TravelAgency.list(),
        base44.entities.TaxiService.list()
      ]);

      return [
        ...doctors.map(d => ({ ...d, provider_type: 'doctor' })),
        ...travelAgencies.map(t => ({ ...t, provider_type: 'travel_agency' })),
        ...taxiServices.map(t => ({ ...t, provider_type: 'taxi_service' }))
      ];
    }
  });

  const filteredProviders = providers?.filter(provider => {
    const matchesSearch = 
      provider.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.agency_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || provider.provider_type === filterType;
    
    const matchesStatus = filterStatus === 'all' || 
      provider.verification_status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const config = {
      pending_verification: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      verifying: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      verified: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      manually_approved: { color: 'bg-amber-100 text-amber-800', icon: Shield }
    };

    const { color, icon: Icon } = config[status] || config.pending_verification;

    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const getVerificationChecks = (provider) => {
    const checks = [
      { type: 'identity', status: provider.identity_verification_status },
      { type: 'background', status: provider.background_check_status },
      { type: 'license', status: provider.license_verification_status }
    ];

    return checks.map(check => {
      const statusConfig = {
        pending: 'text-gray-400',
        passed: 'text-green-600',
        failed: 'text-red-600',
        manual_override: 'text-amber-600'
      };

      return (
        <div key={check.type} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${statusConfig[check.status]}`} />
          <span className="text-xs capitalize">{check.type}</span>
        </div>
      );
    });
  };

  const handleViewDetails = (provider) => {
    setSelectedProvider(provider);
    setIsDialogOpen(true);
  };

  const stats = {
    total: providers?.length || 0,
    verified: providers?.filter(p => p.verification_status === 'verified').length || 0,
    verifying: providers?.filter(p => p.verification_status === 'verifying').length || 0,
    failed: providers?.filter(p => p.verification_status === 'failed').length || 0,
    manually_approved: providers?.filter(p => p.verification_status === 'manually_approved').length || 0
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display">Provider Verification Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage provider trust & safety verifications
          </p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries(['provider-verifications'])}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Verifying</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verifying}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Manual Override</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.manually_approved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Provider Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="doctor">Doctors</SelectItem>
                <SelectItem value="travel_agency">Travel Agencies</SelectItem>
                <SelectItem value="taxi_service">Taxi Services</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_verification">Pending</SelectItem>
                <SelectItem value="verifying">Verifying</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="manually_approved">Manual Override</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Providers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Verification Status</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Verification Checks</TableHead>
                  <TableHead>Overall Status</TableHead>
                  <TableHead>Can Activate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders?.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">
                      {provider.full_name || provider.agency_name || provider.driver_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {provider.provider_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {provider.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {getVerificationChecks(provider)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(provider.verification_status)}
                    </TableCell>
                    <TableCell>
                      {provider.verification_can_be_activated ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(provider)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Override Dialog */}
      {selectedProvider && (
        <ProviderVerificationOverride
          provider={selectedProvider}
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedProvider(null);
          }}
        />
      )}
    </div>
  );
}