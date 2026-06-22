import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign,
  Activity,
  FileText,
  MessageSquare,
  Bell,
  RefreshCw,
  Plane,
  Car,
  HeartHandshake,
  Stethoscope
} from 'lucide-react';
import { toast } from 'sonner';

export default function PartnerPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCase, setSelectedCase] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const user = await base44.auth.me();
        setUserRole(user.role);
      } catch (error) {
        console.error('Failed to get user:', error);
      }
    };
    getUser();
  }, []);

  // Fetch partner profile based on role
  const { data: partnerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['partnerProfile', userRole],
    queryFn: async () => {
      if (!userRole) return null;
      
      let entityName;
      if (userRole === 'travel_agency') entityName = 'TravelAgency';
      else if (userRole === 'taxi_service') entityName = 'TaxiService';
      else if (userRole === 'companion') entityName = 'Companion';
      else if (userRole === 'doctor') entityName = 'Doctor';
      else return null;

      const user = await base44.auth.me();
      const results = await base44.entities[entityName].filter({ email: user.email });
      return results[0] || null;
    },
    enabled: !!userRole,
  });

  // Fetch assigned cases
  const { data: assignedCases, isLoading: casesLoading, refetch } = useQuery({
    queryKey: ['assignedCases', userRole, partnerProfile?.id],
    queryFn: async () => {
      if (!userRole || !partnerProfile?.id) return [];
      
      const cases = await base44.entities.CaseRecord.filter({});
      const user = await base44.auth.me();
      
      // Filter cases based on partner role
      return cases.filter(caseRecord => {
        if (userRole === 'travel_agency') return caseRecord.travel_vendor_id === partnerProfile.id;
        if (userRole === 'taxi_service') {
          return caseRecord.origin_driver_id === partnerProfile.id || 
                 caseRecord.destination_driver_id === partnerProfile.id;
        }
        if (userRole === 'companion') return caseRecord.companion_assignment_id === partnerProfile.id;
        if (userRole === 'doctor') return caseRecord.doctor_email === user.email;
        return false;
      });
    },
    enabled: !!userRole && !!partnerProfile?.id,
  });

  // Get role-specific icon and color
  const getRoleConfig = () => {
    switch (userRole) {
      case 'travel_agency':
        return { icon: Plane, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Travel Agency' };
      case 'taxi_service':
        return { icon: Car, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Taxi Service' };
      case 'companion':
        return { icon: HeartHandshake, color: 'text-pink-600', bg: 'bg-pink-100', label: 'Companion' };
      case 'doctor':
        return { icon: Stethoscope, color: 'text-cyan-600', bg: 'bg-cyan-100', label: 'Doctor' };
      default:
        return { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Partner' };
    }
  };

  const roleConfig = getRoleConfig();
  const RoleIcon = roleConfig.icon;

  // Calculate stats
  const stats = {
    upcomingBookings: assignedCases?.filter(c => ['Travel-Coordination', 'Ready-For-Travel', 'Procedure-In-Progress'].includes(c.status)).length || 0,
    completedThisMonth: assignedCases?.filter(c => c.status === 'Completed').length || 0,
    pendingActions: assignedCases?.filter(c => ['Doctor-Pending', 'Vendor-Pending', 'Admin-Review'].includes(c.status)).length || 0,
    totalEarnings: partnerProfile?.earnings_this_month || 0,
  };

  if (profileLoading || casesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-serif text-lg font-bold">M</span>
          </div>
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!partnerProfile) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Partner Profile Not Found</CardTitle>
            <CardDescription>Please complete your partner registration first.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/partner-signup')}>Complete Registration</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${roleConfig.bg} flex items-center justify-center`}>
                <RoleIcon className={`w-6 h-6 ${roleConfig.color}`} />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  {partnerProfile.agency_name || partnerProfile.company_name || partnerProfile.full_name}
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline" className={partnerProfile.verification_status === 'verified' ? 'border-green-500 text-green-600' : 'border-amber-500 text-amber-600'}>
                    {partnerProfile.verification_status === 'verified' ? '✓ Verified' : '⏳ Pending Verification'}
                  </Badge>
                  <span>{roleConfig.label}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={refetch}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Bell className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Upcoming Bookings</p>
                  <p className="text-2xl font-bold">{stats.upcomingBookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Completed This Month</p>
                  <p className="text-2xl font-bold">{stats.completedThisMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Pending Actions</p>
                  <p className="text-2xl font-bold">{stats.pendingActions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">This Month's Earnings</p>
                  <p className="text-2xl font-bold">${stats.totalEarnings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="cases">Active Cases</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assignedCases?.slice(0, 5).map((caseItem, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          caseItem.status === 'Completed' ? 'bg-green-500' :
                          caseItem.status.includes('Pending') ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{caseItem.client_name}</p>
                          <p className="text-xs text-muted-foreground">{caseItem.procedures?.[0] || 'Procedure'}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">{caseItem.status}</Badge>
                    </div>
                  ))}
                  {!assignedCases?.length && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Update Availability
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <User className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Link to="/partner-reviews" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      My Reviews
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            {assignedCases?.filter(c => ['Travel-Coordination', 'Ready-For-Travel', 'Procedure-In-Progress'].includes(c.status)).map((caseItem) => (
              <Card key={caseItem.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCase(caseItem)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl ${roleConfig.bg} flex items-center justify-center`}>
                        <RoleIcon className={`w-6 h-6 ${roleConfig.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{caseItem.client_name}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(caseItem.created_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {caseItem.procedure_country}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={
                      caseItem.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      caseItem.status.includes('Pending') ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }>
                      {caseItem.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Patient</p>
                        <p className="text-sm font-medium">{caseItem.client_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Contact</p>
                        <p className="text-sm font-medium">{caseItem.client_phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Procedure</p>
                        <p className="text-sm font-medium">{caseItem.procedures?.[0] || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline">
                      <Phone className="w-3 h-3 mr-2" />
                      Call Patient
                    </Button>
                    <Button size="sm">
                      <MessageSquare className="w-3 h-3 mr-2" />
                      Send Message
                    </Button>
                    <Button size="sm" variant="secondary">
                      <FileText className="w-3 h-3 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!assignedCases?.length && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No bookings found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Cases Tab */}
          <TabsContent value="cases" className="space-y-4">
            {assignedCases?.map((caseItem) => (
              <Card key={caseItem.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{caseItem.client_name}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="text-xs">Case ID: {caseItem.id.slice(0, 8)}...</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {caseItem.status}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant={caseItem.safe_t_result === 'PASSED' ? 'default' : 'destructive'}>
                      {caseItem.safe_t_result || 'PENDING'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Procedures</p>
                        <div className="flex flex-wrap gap-2">
                          {caseItem.procedures?.map((proc, idx) => (
                            <Badge key={idx} variant="outline">{proc}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                        <Badge className={
                          caseItem.risk_score === 'Low' ? 'bg-green-100 text-green-700' :
                          caseItem.risk_score === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {caseItem.risk_score || 'Not Assessed'}
                        </Badge>
                      </div>
                    </div>
                    
                    {caseItem.timeline_log?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Timeline</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {caseItem.timeline_log.slice(-5).map((log, idx) => (
                            <div key={idx} className="text-xs flex items-center gap-2 p-2 rounded bg-muted/50">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              <span>{log.action}</span>
                              <span className="text-muted-foreground ml-auto">
                                {new Date(log.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      <Button size="sm" variant="outline">
                        <FileText className="w-3 h-3 mr-2" />
                        View Full Case
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-3 h-3 mr-2" />
                        Contact Coordinator
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!assignedCases?.length && (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active cases</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Case Detail Dialog */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCase(null)}>
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{selectedCase.client_name}</CardTitle>
                  <CardDescription>Case Details</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedCase(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Patient Information</p>
                  <div className="space-y-1 text-sm">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{selectedCase.client_email}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{selectedCase.client_phone || 'N/A'}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Country:</span>
                      <span>{selectedCase.client_country}</span>
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Case Status</p>
                  <div className="space-y-1 text-sm">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline">{selectedCase.status}</Badge>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Priority:</span>
                      <span>{selectedCase.case_priority}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">SAFE-T:</span>
                      <Badge>{selectedCase.safe_t_result}</Badge>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Procedures</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCase.procedures?.map((proc, idx) => (
                    <Badge key={idx} variant="secondary">{proc}</Badge>
                  ))}
                </div>
              </div>

              {selectedCase.consultation_summary && (
                <div>
                  <p className="text-sm font-medium mb-2">Consultation Summary</p>
                  <p className="text-sm text-muted-foreground">{selectedCase.consultation_summary}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1">
                  <Phone className="w-4 h-4 mr-2" />
                  Contact Patient
                </Button>
                <Button variant="outline" className="flex-1">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message Coordinator
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}