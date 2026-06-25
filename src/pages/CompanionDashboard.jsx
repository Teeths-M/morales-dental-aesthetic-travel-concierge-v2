import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BackButton } from '@/components/nav/BackButton';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  User, 
  DollarSign, 
  Star, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Edit,
  Save,
  MapPin,
  Globe,
  Award,
  TrendingUp,
  ClipboardCheck,
  LogOut
} from 'lucide-react';
import CompanionHandshakePanel from '@/components/companion/CompanionHandshakePanel';
import DietaryInfoCard from '@/components/companion/DietaryInfoCard';
import { toast } from 'sonner';

export default function CompanionDashboard() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const queryClient = useQueryClient();

  const { data: companion, isLoading } = useQuery({
    queryKey: ['companion', user?.email],
    queryFn: async () => {
      const companions = await base44.entities.Companion.filter({ email: user?.email });
      return companions[0] || null;
    },
    enabled: !!user?.email,
    onError: () => setFetchError('Unable to load assignments. Please refresh.')
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['companion_assignments', user?.id],
    queryFn: () => base44.entities.CompanionAssignment.filter({ companion_user_id: user?.id }),
    enabled: !!user?.id,
    onError: () => setFetchError('Unable to load assignments. Please refresh.')
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Companion.update(companion.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companion']);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    }
  });

  const handleSave = () => {
    updateMutation.mutate(editedData);
  };

  const startEditing = () => {
    setEditedData(companion);
    setIsEditing(true);
  };

  const getStatusBadge = () => {
    if (!companion) return null;
    
    const config = {
      pending_verification: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Pending Verification' },
      verifying: { color: 'bg-blue-100 text-blue-800', icon: AlertTriangle, label: 'Under Review' },
      verified: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Verified' },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Verification Failed' },
      manually_approved: { color: 'bg-amber-100 text-amber-800', icon: CheckCircle, label: 'Manually Approved' }
    };

    const { color, icon: Icon, label } = config[companion.verification_status] || config.pending_verification;

    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Companion Profile Found</h2>
            <p className="text-muted-foreground mb-4">
              You haven't created a companion profile yet.
            </p>
            <Button onClick={() => window.location.href = '/companion-signup'}>
              Create Profile
            </Button>
            <Button variant="outline" className="mt-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => base44.auth.logout()}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayData = isEditing ? editedData : companion;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <BackButton fallback="/" className="mb-2" />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground mb-2">
              Companion Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your profile, bookings, and earnings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/partner-reviews">
              <Button variant="outline">
                <Star className="w-4 h-4 mr-2 text-amber-500" /> My Reviews
              </Button>
            </Link>
            <Button onClick={isEditing ? handleSave : startEditing} disabled={updateMutation.isPending}>
              {isEditing ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => base44.auth.logout()}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{companion.total_bookings || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">${companion.earnings_this_month?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{companion.rating?.toFixed(1) || '5.0'}</p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{companion.review_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">
            {fetchError} <button onClick={() => window.location.reload()} className="ml-2 underline">Refresh</button>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assignments">
              My Journeys
              {assignments.length > 0 && <span className="ml-1.5 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">{assignments.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    {getStatusBadge()}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Availability</span>
                    <Badge variant={companion.is_available ? 'default' : 'secondary'}>
                      {companion.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hourly Rate</span>
                    <span className="font-semibold">${companion.hourly_rate_usd}/hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily Rate</span>
                    <span className="font-semibold">${companion.daily_rate_usd}/day</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{companion.service_regions?.join(', ') || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{companion.languages?.join(', ') || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{companion.certifications?.length || 0} Certifications</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your professional profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    {isEditing ? (
                      <Input
                        value={displayData.full_name || ''}
                        onChange={(e) => setEditedData({ ...displayData, full_name: e.target.value })}
                      />
                    ) : (
                      <p className="text-foreground font-medium">{companion.full_name}</p>
                    )}
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-foreground">{companion.email}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    {isEditing ? (
                      <Input
                        value={displayData.phone || ''}
                        onChange={(e) => setEditedData({ ...displayData, phone: e.target.value })}
                      />
                    ) : (
                      <p className="text-foreground">{companion.phone}</p>
                    )}
                  </div>
                  <div>
                    <Label>Location</Label>
                    {isEditing ? (
                      <Input
                        value={displayData.city || ''}
                        onChange={(e) => setEditedData({ ...displayData, city: e.target.value })}
                        placeholder="City"
                      />
                    ) : (
                      <p className="text-foreground">{companion.city}, {companion.country}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Bio</Label>
                  {isEditing ? (
                    <Textarea
                      value={displayData.bio || ''}
                      onChange={(e) => setEditedData({ ...displayData, bio: e.target.value })}
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="text-foreground">{companion.bio || 'No bio provided'}</p>
                  )}
                </div>
                <div>
                  <Label>Languages</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {companion.languages?.map(lang => (
                      <Badge key={lang} variant="secondary">{lang}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification">
            <Card>
              <CardHeader>
                <CardTitle>Verification Status</CardTitle>
                <CardDescription>Track your verification progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Identity Verification</p>
                        <p className="text-xs text-muted-foreground">Stripe Identity check</p>
                      </div>
                    </div>
                    <Badge variant={companion.identity_verification_status === 'passed' ? 'default' : 'secondary'}>
                      {companion.identity_verification_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Background Check</p>
                        <p className="text-xs text-muted-foreground">Checkr screening</p>
                      </div>
                    </div>
                    <Badge variant={companion.background_check_status === 'passed' ? 'default' : 'secondary'}>
                      {companion.background_check_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">License Verification</p>
                        <p className="text-xs text-muted-foreground">Certification validation</p>
                      </div>
                    </div>
                    <Badge variant={companion.license_verification_status === 'passed' ? 'default' : 'secondary'}>
                      {companion.license_verification_status}
                    </Badge>
                  </div>
                </div>

                {companion.verification_can_be_activated && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ All verifications complete! Your profile is ready for activation.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            {assignments.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-10 text-muted-foreground">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No active journey assignments yet.</p>
                  <p className="text-sm mt-1">Your assigned patient journeys will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              assignments.map(assignment => (
                <Card key={assignment.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{assignment.patient_name || 'Patient Journey'}</CardTitle>
                      <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                        {assignment.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      Assigned: {assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString() : 'Pending'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {assignment.can_translate && assignment.translation_tasks?.length > 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-semibold text-blue-700 mb-1">Your Translation Assignments:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {assignment.translation_tasks.map(task => (
                            <Badge key={task} className="bg-blue-100 text-blue-700 text-xs">
                              {task.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dietary Info */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Patient Dietary & Allergy Info</p>
                      <DietaryInfoCard caseId={assignment.case_id} />
                    </div>

                    {/* Handshakes */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Journey Checkpoints</p>
                      <CompanionHandshakePanel caseId={assignment.case_id} />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your preferences and payout</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Payout Method</Label>
                    {isEditing ? (
                      <select
                        className="w-full p-2 border rounded-md"
                        value={displayData.payout_method || 'stripe'}
                        onChange={(e) => setEditedData({ ...displayData, payout_method: e.target.value })}
                      >
                        <option value="stripe">Stripe</option>
                        <option value="paypal">PayPal</option>
                        <option value="wipay">Wipay</option>
                      </select>
                    ) : (
                      <p className="text-foreground capitalize">{companion.payout_method}</p>
                    )}
                  </div>
                  <div>
                    <Label>Payout Account</Label>
                    {isEditing ? (
                      <Input
                        value={displayData.payout_account || ''}
                        onChange={(e) => setEditedData({ ...displayData, payout_account: e.target.value })}
                      />
                    ) : (
                      <p className="text-foreground">{companion.payout_account || 'Not set'}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="availability"
                    checked={isEditing ? displayData.is_available : companion.is_available}
                    onChange={(e) => isEditing && setEditedData({ ...displayData, is_available: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="availability">Available for bookings</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}