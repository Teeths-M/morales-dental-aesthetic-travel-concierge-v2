import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, User, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminCompanions() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: companions = [], isLoading, refetch } = useQuery({
    queryKey: ['companions'],
    queryFn: () => base44.entities.Companion.list()
  });

  const filteredCompanions = companions.filter(c => 
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const config = {
      pending_verification: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      verifying: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      verified: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      manually_approved: { color: 'bg-amber-100 text-amber-800', icon: CheckCircle }
    };

    const { color, icon: Icon } = config[status] || config.pending_verification;

    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const stats = {
    total: companions.length,
    verified: companions.filter(c => c.verification_status === 'verified').length,
    active: companions.filter(c => c.status === 'active').length,
    pending: companions.filter(c => c.verification_status === 'pending_verification' || c.verification_status === 'verifying').length
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display">Companion Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage travel companions and their verification status
          </p>
        </div>
        <Button onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium text-blue-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Companions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Companions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Languages</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Verification Status</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanions.map((companion) => (
                  <TableRow key={companion.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {companion.full_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {companion.email}
                    </TableCell>
                    <TableCell>
                      {companion.city}, {companion.country}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {companion.languages?.slice(0, 3).map(lang => (
                          <Badge key={lang} variant="outline" className="text-xs">
                            {lang}
                          </Badge>
                        ))}
                        {companion.languages?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{companion.languages.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {companion.years_experience || 0} years
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(companion.verification_status)}
                    </TableCell>
                    <TableCell>
                      {companion.total_bookings || 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{companion.rating?.toFixed(1) || '5.0'}</span>
                        <span className="text-xs text-muted-foreground">
                          ({companion.review_count || 0})
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}