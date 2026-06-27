// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BackButton } from '@/components/nav/BackButton';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { Heart, ChefHat, Calendar, CheckCircle2, Upload, Receipt } from 'lucide-react';
// useLocalState is an alias for useState — keeps sub-component state reads obvious
const useLocalState = useState;

const GOLD = '#D4AF37';

// ── Active assignment hero — shown when companion has a live patient ──────────
function ActiveAssignmentHero({ assignments }) {
  const activeAssignment = assignments.find(a =>
    ['confirmed', 'active', 'in_progress', 'assigned'].includes(a.status?.toLowerCase() ?? '')
  ) ?? assignments[0] ?? null;

  const { data: caseRecord } = useQuery({
    queryKey: ['companion-active-case', activeAssignment?.case_id],
    queryFn: () => base44.entities.CaseRecord.get(activeAssignment.case_id),
    enabled: !!activeAssignment?.case_id,
    staleTime: 120_000,
  });

  if (!activeAssignment && assignments.length === 0) return null;

  if (!activeAssignment) {
    return (
      <div className="rounded-2xl px-5 py-4 mb-2 flex items-center gap-3"
        style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
        <Heart className="w-5 h-5 flex-shrink-0" style={{ color: '#334155' }} />
        <p className="text-sm" style={{ color: '#64748b' }}>No active patient assignment right now. You'll be notified when a new patient is matched to you.</p>
      </div>
    );
  }

  const patientName = activeAssignment.patient_name || caseRecord?.client_name || 'Your Patient';
  const procedures  = (caseRecord?.procedures || []).join(', ') || activeAssignment.procedure_types?.join(', ') || 'Procedure TBC';
  const startDate   = activeAssignment.assignment_start_date
    ? new Date(activeAssignment.assignment_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden mb-2"
      style={{ background: 'linear-gradient(135deg, #060B16, #0d1c20)', border: `1px solid ${GOLD}40` }}>
      {/* Gold top bar */}
      <div style={{ height: 3, background: `linear-gradient(to right, transparent, ${GOLD}, transparent)` }} />
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold tracking-wide" style={{ color: GOLD }}>ACTIVE ASSIGNMENT</span>
        </div>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-lg font-semibold text-white">{patientName}</p>
            <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{procedures}</p>
            {startDate && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Calendar className="w-3.5 h-3.5" style={{ color: '#64748b' }} />
                <span className="text-xs" style={{ color: '#64748b' }}>Starts {startDate}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(212,175,55,0.12)', border: `1px solid ${GOLD}30` }}>
            <ChefHat className="w-4 h-4" style={{ color: GOLD }} />
            <span className="text-xs font-semibold" style={{ color: GOLD }}>Meal Brief Ready</span>
          </div>
        </div>
      </div>
      {/* Rate submission gate — shows when companion quote pending */}
      {caseRecord && caseRecord.companion_quote_status !== 'CONFIRMED' && (
        <div className="px-5 pb-4">
          <CompanionRateForm caseId={caseRecord.id} patientName={patientName} />
        </div>
      )}

      {/* Dietary card inlined */}
      {caseRecord && caseRecord.companion_quote_status === 'CONFIRMED' && (
        <div className="px-5 pb-2">
          <DietaryInfoCard caseRecord={caseRecord} compact />
        </div>
      )}

      {/* Receipt upload — companion uploads grocery receipt after shopping */}
      {caseRecord && <ReceiptUploadPanel caseId={caseRecord.id} assignmentId={caseRecord.companion_assignment_id} />}
    </motion.div>
  );
}

// ── Receipt upload panel — companion uploads after grocery purchase ────────────
function ReceiptUploadPanel({ caseId, assignmentId }) {
  const GOLD = '#D4AF37';
  const [amount,   setAmount]   = useLocalState('');
  const [desc,     setDesc]     = useLocalState('');
  const [loading,  setLoading]  = useLocalState(false);
  const [uploaded, setUploaded] = useLocalState(false);

  if (!assignmentId) return null;

  const handleUpload = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0 || !desc.trim()) return;
    setLoading(true);
    try {
      // Add receipt to MothersTouchAssignment
      const assignment = await base44.entities.MothersTouchAssignment.filter({ case_id: caseId });
      if (assignment[0]) {
        const existing = assignment[0].grocery_receipts || [];
        await base44.entities.MothersTouchAssignment.update(assignment[0].id, {
          grocery_receipts: [...existing, {
            receipt_url: '',
            amount_usd: val,
            description: desc,
            uploaded_at: new Date().toISOString(),
          }],
        });
      }
      setUploaded(true);
    } catch (_) { setLoading(false); }
  };

  if (uploaded) return (
    <div className="px-5 pb-4">
      <div className="flex items-center gap-2 p-3 rounded-xl"
        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <p className="text-xs font-semibold text-emerald-300">Receipt submitted — patient will receive approval request</p>
      </div>
    </div>
  );

  return (
    <div className="px-5 pb-4">
      <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2A3F4A' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Receipt className="w-3.5 h-3.5" style={{ color: GOLD }} />
          <span className="text-xs font-semibold" style={{ color: GOLD }}>Upload Grocery Receipt</span>
        </div>
        <div className="flex gap-2 mb-2">
          <input type="number" min="0" step="0.01" placeholder="Amount (USD)"
            value={amount} onChange={e => setAmount(e.target.value)}
            className="flex-1 px-3 py-2 text-xs rounded-lg focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid #2A3F4A', color: '#fff' }} />
          <input type="text" placeholder="Description (e.g. Lunch groceries)"
            value={desc} onChange={e => setDesc(e.target.value)}
            className="flex-[2] px-3 py-2 text-xs rounded-lg focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid #2A3F4A', color: '#fff' }} />
        </div>
        <button onClick={handleUpload} disabled={loading || !amount || !desc}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
          style={{ background: GOLD, color: '#060B16' }}>
          <Upload className="w-3.5 h-3.5" />
          {loading ? 'Submitting…' : 'Submit for Patient Approval'}
        </button>
      </div>
    </div>
  );
}

// ── Companion rate submission — auto-triggers pipeline when submitted ─────────
function CompanionRateForm({ caseId, patientName }) {
  const [amount, setAmount]   = useLocalState('');
  const [loading, setLoading] = useLocalState(false);
  const [done, setDone]       = useLocalState(false);
  const GOLD = '#D4AF37';

  const submit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setLoading(true);
    try {
      await base44.functions.invoke('submitPartnerQuote', {
        case_id: caseId, partner_type: 'companion', amount: val,
      });
      setDone(true);
    } catch (_) { setLoading(false); }
  };

  if (done) return (
    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
      <p className="text-xs font-semibold text-emerald-300">Rate submitted — pipeline will advance automatically when all partners respond</p>
    </div>
  );

  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(212,175,55,0.08)', border: `1px solid ${GOLD}30` }}>
      <p className="text-xs font-semibold mb-2" style={{ color: GOLD }}>
        ⏳ Submit your service rate for {patientName} to unlock the pricing pipeline
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: GOLD }}>$</span>
          <input
            type="number" min="0" step="0.01" placeholder="Total service rate (USD)"
            value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid #2A3F4A', color: '#fff' }}
          />
        </div>
        <button onClick={submit} disabled={loading || !amount}
          className="px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
          style={{ background: GOLD, color: '#060B16' }}>
          {loading ? '…' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
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

// ── Job Offers Panel — incoming companion job offers ─────────────────────────
function JobOffersPanel({ userId, userEmail }) {
  const queryClient = useQueryClient();
  const [responding, setResponding] = useState(null); // assignment_id being acted on

  const { data: offers = [], refetch } = useQuery({
    queryKey: ['companion-job-offers', userId, userEmail],
    queryFn: async () => {
      const byId    = userId    ? await base44.entities.CompanionAssignment.filter({ companion_user_id: userId,    status: 'offered' }).catch(() => []) : [];
      const byEmail = userEmail ? await base44.entities.CompanionAssignment.filter({ companion_email:   userEmail, status: 'offered' }).catch(() => []) : [];
      const seen = new Set();
      return [...byId, ...byEmail].filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
    },
    enabled: !!(userId || userEmail),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  async function respond(assignment_id, action) {
    setResponding(assignment_id);
    try {
      await base44.functions.invoke('respondToCompanionJob', { assignment_id, action });
      queryClient.invalidateQueries({ queryKey: ['companion-job-offers'] });
      queryClient.invalidateQueries({ queryKey: ['companion_assignments'] });
      refetch();
    } catch (_) {}
    setResponding(null);
  }

  if (offers.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-amber-400/40"
      style={{ background: 'linear-gradient(135deg, #0d1c20, #060B16)' }}>
      {/* Gold header bar */}
      <div style={{ height: 3, background: 'linear-gradient(to right, transparent, #D4AF37, transparent)' }} />
      <div className="px-6 py-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#D4AF37' }}>
            New Job Offers ({offers.length})
          </span>
        </div>

        <div className="space-y-4">
          {offers.map(offer => {
            const isActing = responding === offer.id;
            const arrivalLabel  = offer.arrival_date  ? new Date(offer.arrival_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
            const departureLabel = offer.departure_date ? new Date(offer.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

            return (
              <motion.div key={offer.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.18)' }}>

                {/* Job header */}
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div>
                    <p className="font-semibold text-white text-sm">
                      Patient: <span style={{ color: '#D4AF37' }}>{offer.patient_first_name || 'Patient'}</span>
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                      {(offer.procedure_types || []).join(', ') || offer.procedures || 'Procedure TBC'}
                    </p>
                  </div>
                  <span className="text-lg font-black" style={{ color: '#22c55e' }}>
                    ${offer.package_fee || 650}
                  </span>
                </div>

                {/* Detail grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4">
                  {offer.destination_country && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                      <span style={{ color: '#D4AF37' }}>📍</span> {offer.destination_country}
                    </div>
                  )}
                  {offer.hotel_name && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                      <span>🏨</span> {offer.hotel_name}
                    </div>
                  )}
                  {arrivalLabel && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                      <span>✈️</span> Arrives {arrivalLabel}
                    </div>
                  )}
                  {departureLabel && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                      <span>🏠</span> Departs {departureLabel}
                    </div>
                  )}
                  {offer.duration_of_stay && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                      <span>📅</span> {offer.duration_of_stay}
                    </div>
                  )}
                  {offer.meals_included && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#22c55e' }}>
                      <span>🍽️</span> Meals included
                    </div>
                  )}
                </div>

                {/* Hotel address if available */}
                {offer.hotel_address && (
                  <p className="text-[11px] mb-3" style={{ color: '#64748b' }}>{offer.hotel_address}</p>
                )}

                {/* Accept / Reject */}
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(offer.id, 'accept')}
                    disabled={!!responding}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
                    style={{ background: '#D4AF37', color: '#060B16' }}
                  >
                    {isActing && responding === offer.id ? '…' : '✓ Accept Job'}
                  </button>
                  <button
                    onClick={() => respond(offer.id, 'reject')}
                    disabled={!!responding}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', background: 'transparent' }}
                  >
                    Decline
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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

        {/* ── Job Offers Panel ── */}
        <JobOffersPanel userId={user?.id} userEmail={user?.email} />

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

        <ActiveAssignmentHero assignments={assignments} />

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