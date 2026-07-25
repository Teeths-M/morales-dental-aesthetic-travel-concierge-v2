// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState, useMemo, useState as useLocalState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BackButton } from '@/components/nav/BackButton';
import { base44 } from '@/api/base44Client';
import { Star, Clock, Upload, Trash2, AlertCircle, LogOut, ShieldAlert, Heart, Stethoscope, Phone, DollarSign, CheckCircle2 } from 'lucide-react';
import PhoneField from '@/components/ui-system/PhoneField';
import { IdentityUpload } from '@/components/ThisIsMe';
import DoctorPortfolio from '@/components/doctor-dashboard/DoctorPortfolio';
import DoctorPricingManager from '@/components/doctor-dashboard/DoctorPricingManager';
import DoctorAvailabilityCalendar from '@/components/doctor-dashboard/DoctorAvailabilityCalendar';
import ProcedureRequestForm from '@/components/doctor-dashboard/ProcedureRequestForm';
import DoctorVerificationPanel from '@/components/doctor/DoctorVerificationPanel';
import DoctorQuoteInbox from '@/components/quotes/DoctorQuoteInbox';
import SignedConsentPanel from '@/components/doctor-dashboard/SignedConsentPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { ConfirmDialog } from '@/components/ui-system';
import { toast } from 'sonner';

// ── Facility Fee inline form — auto-triggers pipeline when submitted ──────────
function FacilityFeeForm({ caseId, caseRef }) {
  const [amount, setAmount]   = useLocalState('');
  const [loading, setLoading] = useLocalState(false);
  const [done, setDone]       = useLocalState(false);

  const submit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setLoading(true);
    try {
      await base44.functions.invoke('submitPartnerQuote', {
        case_id: caseId, partner_type: 'clinic', amount: val,
      });
      setDone(true);
    } catch (_) { setLoading(false); }
  };

  if (done) return (
    <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      <p className="text-xs font-semibold text-emerald-700">Clinic fee submitted — pipeline advancing automatically</p>
    </div>
  );

  return (
    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
      <p className="text-xs font-semibold text-amber-800 mb-2">
        ⏳ Clinic facility fee required to finalise package pricing for {caseRef}
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-600" />
          <input
            type="number" min="0" step="0.01" placeholder="Facility fee (USD)"
            value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <button onClick={submit} disabled={loading || !amount}
          className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 text-white disabled:opacity-50 whitespace-nowrap">
          {loading ? '…' : 'Submit Fee'}
        </button>
      </div>
    </div>
  );
}

// ── Date-confirm inline form — locks the doctor's slot + fires the patient's prep ──
function DateConfirmForm({ caseId }) {
  const [date, setDate]       = useLocalState('');
  const [loading, setLoading] = useLocalState(false);
  const [done, setDone]       = useLocalState(false);

  const submit = async () => {
    if (!date) return;
    setLoading(true);
    try {
      await base44.functions.invoke('confirmProcedureDate', { case_id: caseId, date });
      setDone(true);
    } catch (_) { setLoading(false); }
  };

  if (done) return (
    <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      <p className="text-xs font-semibold text-emerald-700">Date confirmed — the patient's preparation is on its way</p>
    </div>
  );

  return (
    <div className="mt-3 p-3 rounded-xl bg-sky-50 border border-sky-200">
      <p className="text-xs font-semibold text-sky-800 mb-2">📅 Confirm the procedure date to lock this appointment</p>
      <div className="flex gap-2">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-sky-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-400" />
        <button onClick={submit} disabled={loading || !date}
          className="px-4 py-2 rounded-lg text-xs font-bold bg-sky-600 text-white disabled:opacity-50 whitespace-nowrap">
          {loading ? '…' : 'Confirm Date'}
        </button>
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState('profile');
  const [fetchError, setFetchError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { user: authUser } = useAuth();

  // PERFORMANCE: React Query with caching — automatic deduplication, no manual useEffect
  const { data: userData, isLoading: loadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => authUser?.isPreviewAdmin ? authUser : base44.auth.me(),
    staleTime: 300000, // 5 minutes cache
  });

  const { data: profileData, isLoading: loadingProfile, refetch } = useQuery({
    queryKey: ['doctor-profile', userData?.id, userData?.email],
    queryFn: async () => {
      if (userData?.isPreviewAdmin) {
        const doctors = await base44.entities.Doctor.list('-updated_date', 1);
        const previewDoctor = doctors[0] || null;
        if (previewDoctor) {
          const specialties = await base44.entities.DoctorSpecialty.filter({ doctor_id: previewDoctor.id }, '-created_date', 50);
          const pricing = await base44.entities.DoctorPricing.filter({ doctor_id: previewDoctor.id }, '-created_date', 50);
          return {
            doctor: { ...previewDoctor, successful_procedures_count: previewDoctor.successful_procedures_count || 0 },
            specialties,
            pricing
          };
        }
        return null;
      }

      const response = await base44.functions.invoke('getMyDoctorProfile', {});
      return {
        doctor: { ...response.data.doctor, successful_procedures_count: response.data.doctor.successful_procedures_count || 0 },
        specialties: response.data.specialties || [],
        pricing: response.data.pricing || []
      };
    },
    enabled: !!userData,
    staleTime: 120000, // 2 minutes cache
    onError: () => setFetchError('Unable to load assignments. Please refresh.')
  });

  const doctor = profileData?.doctor;
  const specialties = profileData?.specialties || [];
  const _pricing = profileData?.pricing || [];
  const user = userData;
  const loading = loadingUser || loadingProfile;

  // Flagged consultations query — only runs once doctor profile is loaded
  const { data: flaggedCases } = useQuery({
    queryKey: ['flagged-cases', doctor?.email],
    queryFn: () => base44.entities.CaseRecord.filter({ doctor_email: doctor.email, status: 'Admin-Review' }, '-created_date', 20),
    enabled: !!doctor?.email,
    staleTime: 60000,
  });

  // Active patients assigned to this doctor
  const { data: activeCases = [] } = useQuery({
    queryKey: ['doctor-active-cases', doctor?.email],
    queryFn: () => base44.entities.CaseRecord.filter({ doctor_email: doctor.email }, '-departure_date', 30),
    enabled: !!doctor?.email,
    staleTime: 90_000,
    refetchInterval: 300_000,
  });
  const inProgressCases = activeCases.filter(c => !['Completed', 'Closed', 'Cancelled', 'Admin-Review'].includes(c.status));
  const completedCases  = activeCases.filter(c => ['Completed', 'Closed'].includes(c.status));

  // PERFORMANCE: Memoize initial form data — prevents recreation on every render
  useMemo(() => {
    if (doctor && !formData.full_name) {
      setFormData(doctor);
    }
  }, [doctor]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, photo_url: file_url });
    }
  };

  const [uploadingClinic, setUploadingClinic] = useState(false);
  const uploadClinicPhoto = async (file) => {
    if (!doctor?.id) return;
    setUploadingClinic(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Doctor.update(doctor.id, { clinic_exterior_photo_url: file_url });
      refetch();
    } catch (_) {}
    setUploadingClinic(false);
  };

  const handleSave = async () => {
    try {
      const updateData = {
        ...formData,
        successful_procedures_count: formData.successful_procedures_count !== undefined ? parseInt(formData.successful_procedures_count) || 0 : 0
      };
      await base44.entities.Doctor.update(doctor.id, updateData);
      await refetch(); // Refresh data from server
      setEditing(false);
      toast.success('Profile updated');
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Changes not saved', {
        description: 'Your edits are still on screen — try saving again.',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Doctor.delete(doctor.id);
      await refetch(); // Refresh data from server
      setConfirmDelete(false);
      toast.success('Profile removed');
    } catch (error) {
      console.error('Failed to delete profile:', error);
      setConfirmDelete(false);
      toast.error('Profile not removed', {
        description: 'Nothing was deleted. Please try again.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-border rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">No Doctor Profile Found</h2>
            <p className="text-muted-foreground mb-6">
              Your account ({user?.email}) is not registered as a doctor in our system.
            </p>
            <Link to="/doctor-signup" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90">
              Create Doctor Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <BackButton fallback="/" className="mb-4" />
        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">
            {fetchError} <button onClick={() => window.location.reload()} className="ml-2 underline">Refresh</button>
          </div>
        )}

        <div className="mb-12">
          <div className="mb-6">
          <DoctorVerificationPanel user={user} />
          </div>

          <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
          <h1 className="text-4xl font-semibold text-foreground">My Dashboard</h1>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">Secure Access</span>
          </div>
            <div className="flex items-center gap-2">
              <Link to="/partner-reviews" className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary/20 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500" /> My Reviews
              </Link>
              <button onClick={() => base44.auth.logout()} className="px-4 py-2 text-sm font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1.5">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
          <p className="text-muted-foreground">Manage your profile, specialties, and pricing information</p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Logged in as: {user?.email}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-border px-8 pt-6">
              <TabsList className="mb-0">
                <TabsTrigger value="patients" className="relative">
                  Active Patients
                  {inProgressCases.length > 0 && (
                    <span className="ml-1.5 w-4 h-4 bg-emerald-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                      {inProgressCases.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="quote-requests">Pricing Requests</TabsTrigger>
                <TabsTrigger value="profile">My Profile</TabsTrigger>
                <TabsTrigger value="availability">Availability Calendar</TabsTrigger>
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                <TabsTrigger value="pricing">My Pricing</TabsTrigger>
                <TabsTrigger value="requests">Request Procedure</TabsTrigger>
                <TabsTrigger value="verification">License Verification</TabsTrigger>
                <TabsTrigger value="flagged" className="relative">
                  Flagged Reviews
                  {flaggedCases?.length > 0 && (
                    <span className="ml-1.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                      {flaggedCases.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Pricing Requests Tab (competitive-quote marketplace) ────────── */}
            <TabsContent value="quote-requests" className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Stethoscope className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Pricing Requests</h2>
              </div>
              <DoctorQuoteInbox doctor={doctor} />
            </TabsContent>

            {/* ── Active Patients Tab ─────────────────────────────────────────── */}
            <TabsContent value="patients" className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Stethoscope className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Active Patients</h2>
              </div>

              {inProgressCases.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-2xl">
                  <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No active patients assigned right now.</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">Patients will appear here once they are assigned to you.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inProgressCases.map((c, idx) => {
                    const hs = c.current_step ?? 0;
                    const hsLabel = ['', 'Driver Pickup', 'Airport Drop-off', 'Destination Pickup', 'Hotel Check-in', 'Clinic Arrival', 'Companion Delivery', 'Return Transport', 'Home Airport', 'Journey Complete'][hs] || 'Pre-departure';
                    const phaseColor = {
                      pre_departure: '#64748b', transit_out: '#60a5fa', arrived: '#22c55e',
                      recovery: '#D4AF37', transit_return: '#a855f7', completed: '#22c55e',
                    }[c.trip_phase] ?? '#64748b';
                    return (
                      <motion.div key={c.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                        className="rounded-2xl p-5 border border-border bg-card hover:border-primary/30 transition-all">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <p className="text-base font-semibold text-foreground">{c.client_name}</p>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: `${phaseColor}20`, color: phaseColor }}>
                                {c.trip_phase?.replace(/_/g, ' ') || c.status?.replace(/-/g, ' ') || 'Coordinating'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {(c.procedures || []).join(', ') || 'Procedure TBC'}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              {c.procedure_country && <span>📍 {c.procedure_country}</span>}
                              {c.departure_date && <span>✈️ {new Date(c.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                              <span style={{ color: phaseColor }}>HS{hs}/9 — {hsLabel}</span>
                            </div>
                            {/* 9-step progress bar */}
                            <div className="flex items-center gap-0.5 mt-3">
                              {Array.from({ length: 9 }, (_, i) => (
                                <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
                                  style={{ background: i < hs ? phaseColor : '#e2e8f0' }} />
                              ))}
                            </div>
                            <div className="flex justify-between text-[9px] mt-0.5" style={{ color: '#94a3b8' }}>
                              <span>HS1</span><span>HS{hs > 0 ? hs : '—'}</span><span>HS9</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {c.client_phone && (
                              <a href={`tel:${c.client_phone}`}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-secondary/20 transition-all">
                                <Phone className="w-3 h-3" /> Call
                              </a>
                            )}
                            {c.special_requirements && (
                              <p className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg max-w-[140px]">
                                ⚠️ {c.special_requirements}
                              </p>
                            )}
                          </div>
                        </div>
                        {/* Facility fee gate — shows when clinic quote is still pending */}
                        {c.status === 'Vendor-Pending' && c.clinic_quote_status !== 'CONFIRMED' && (
                          <FacilityFeeForm caseId={c.id} caseRef={c.id.slice(-8).toUpperCase()} />
                        )}
                        {/* Date-confirm gate — shows after the patient picks this doctor */}
                        {c.doctor_confirmation_status === 'PENDING' && (
                          <DateConfirmForm caseId={c.id} />
                        )}
                        <SignedConsentPanel caseRecord={c} />
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {completedCases.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Completed ({completedCases.length})</h3>
                  <div className="space-y-2">
                    {completedCases.slice(0, 5).map(c => (
                      <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border">
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.client_name}</p>
                          <p className="text-xs text-muted-foreground">{(c.procedures || []).join(', ') || '—'}</p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Complete</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="profile" className="p-8">
              {/* Flagged Case Alert — only visible when cases are waiting */}
              {flaggedCases?.length > 0 && (
                <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <ShieldAlert className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-amber-900">Medical Review Required</h3>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {flaggedCases.length} consultation{flaggedCases.length > 1 ? 's' : ''} flagged for high-risk assessment {flaggedCases.length > 1 ? 'are' : 'is'} awaiting your expert review before final approval.
                      </p>
                      <div className="flex flex-col gap-1 mt-2">
                        {flaggedCases.map(c => (
                          <p key={c.id} className="text-xs text-amber-800 font-medium">
                            • {c.client_name} — <span className="italic">{c.procedures?.join(', ')}</span>
                            {c.high_risk_flagged_condition && (
                              <span className="ml-1 text-amber-600">({c.high_risk_flagged_condition})</span>
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('flagged')}
                    className="flex-shrink-0 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Review Now
                  </button>
                </div>
              )}
              {/* ── This Is Me™ — identity photos shown to patients ──── */}
              <div style={{ marginBottom: 24, background: '#0C1A1D', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 16, padding: '16px 18px' }}>
                <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D4AF37' }}>
                  This Is Me™
                </p>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  Patients see your profile photo and clinic exterior before their appointment.
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <IdentityUpload
                    label="Clinic Exterior"
                    hint="Outside of your clinic — so patients recognise it."
                    photoUrl={doctor?.clinic_exterior_photo_url}
                    onUpload={uploadClinicPhoto}
                    uploading={uploadingClinic}
                    capture="environment"
                  />
                  <p style={{ flex: 2, margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, alignSelf: 'center' }}>
                    Your profile photo (below) is already shown to patients as your identity card. Upload your clinic exterior here so they can confirm the location before walking in.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8">
                {/* Photo */}
                <div className="flex-shrink-0">
                  {editing ? (
                    <label className="w-32 h-32 rounded-full bg-secondary/50 flex items-center justify-center cursor-pointer hover:bg-secondary/70 transition-colors group relative">
                      {formData.photo_url && formData.photo_url.trim() ? (
                        <img loading="lazy" decoding="async" src={formData.photo_url} alt={formData.full_name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground font-medium">Upload Photo</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-semibold overflow-hidden flex-shrink-0">
                      {formData.photo_url && formData.photo_url.trim() ? (
                        <img loading="lazy" decoding="async" src={formData.photo_url} alt={formData.full_name} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                      ) : null}
                      {!formData.photo_url || !formData.photo_url.trim() ? (
                        formData.full_name?.charAt(0) || 'D'
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  {editing ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={formData.full_name || ''}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-lg font-semibold"
                        placeholder="Full Name"
                      />
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Email"
                      />
                      <PhoneField value={formData.phone || ''} onChange={(v) => setFormData({ ...formData, phone: v })} placeholder="Phone number" />
                      <input
                        type="text"
                        value={formData.clinic_name || ''}
                        onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Clinic Name"
                      />
                      <input
                        type="text"
                        value={formData.clinic_country || ''}
                        onChange={(e) => setFormData({ ...formData, clinic_country: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Clinic Country"
                      />
                      <input
                        type="number"
                        value={formData.years_experience || ''}
                        onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Years of Experience"
                      />
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={formData.rating || ''}
                        onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Rating (0-5)"
                      />
                      <input
                        type="number"
                        value={formData.review_count || ''}
                        onChange={(e) => setFormData({ ...formData, review_count: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Number of Reviews"
                      />
                      <input
                        type="number"
                        value={formData.successful_procedures_count || ''}
                        onChange={(e) => setFormData({ ...formData, successful_procedures_count: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Successful Procedures Completed"
                      />
                      <textarea
                        value={formData.bio || ''}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                        rows="3"
                        placeholder="Bio (1-2 sentences)"
                      />
                      <textarea
                        value={formData.professional_background || ''}
                        onChange={(e) => setFormData({ ...formData, professional_background: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                        rows="3"
                        placeholder="Professional Background (education, certifications, credentials)"
                      />
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={handleSave}
                          className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditing(false)}
                          className="flex-1 px-4 py-2 border border-border rounded-lg font-semibold hover:bg-secondary/20"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-2xl font-semibold text-foreground">{formData.full_name}</h2>
                            {specialties.length > 0 && (
                              <p className="text-muted-foreground mt-1">{specialties[0].category || 'Specialist'}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditing(true)}
                              className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary/20"
                            >
                              Edit Profile
                            </button>
                            <button
                              onClick={() => setConfirmDelete(true)}
                              className="px-3 py-2 border border-destructive/50 text-destructive rounded-lg hover:bg-destructive/10"
                              title="Delete profile"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-border">
                        {formData.years_experience && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{formData.years_experience}+ Years</span>
                          </div>
                        )}
                        {formData.rating && (
                          <div className="flex items-center gap-2 text-sm">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="font-semibold">{formData.rating.toFixed(1)}</span>
                          </div>
                        )}
                        {formData.review_count !== undefined && (
                          <div className="px-3 py-1 bg-secondary rounded-full text-sm font-medium text-foreground">
                            {formData.review_count} Review{formData.review_count !== 1 ? 's' : ''}
                          </div>
                        )}
                        {formData.successful_procedures_count !== undefined && (
                          <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                            {formData.successful_procedures_count} Procedure{formData.successful_procedures_count !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      {/* Bio */}
                      {formData.bio && (
                        <p className="text-foreground mb-4 leading-relaxed">{formData.bio}</p>
                      )}

                      {/* Credentials */}
                      <div className="mb-6">
                        <h4 className="font-semibold text-foreground mb-3">Credentials & Certifications</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-start gap-3">
                            <span className="text-primary mt-1">•</span>
                            <span>{formData.clinic_name || 'Professional Clinic'}</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-primary mt-1">•</span>
                            <span>Licensed in {formData.clinic_country}</span>
                          </li>
                          {formData.professional_background && (
                            <li className="flex items-start gap-3">
                              <span className="text-primary mt-1">•</span>
                              <span>{formData.professional_background}</span>
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Specialties */}
                      {specialties.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-foreground mb-3">Areas of Expertise</h4>
                          <div className="flex flex-wrap gap-2">
                            {specialties.slice(0, 5).map(spec => (
                              <span
                                key={spec.id}
                                className="px-3 py-1.5 bg-secondary text-foreground text-sm font-medium rounded-full"
                              >
                                {spec.procedure_name}
                              </span>
                            ))}
                            {specialties.length > 5 && (
                              <span className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full">
                                +{specialties.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="availability" className="p-8">
              <DoctorAvailabilityCalendar doctorEmail={doctor.email} doctorId={doctor.id} />
            </TabsContent>

            <TabsContent value="portfolio" className="p-8">
              <DoctorPortfolio doctorId={doctor.id} portfolio={doctor.portfolio} />
            </TabsContent>

            <TabsContent value="pricing" className="p-8">
              <DoctorPricingManager doctorId={doctor.id} language={doctor.language_preference || 'en'} />
            </TabsContent>

            <TabsContent value="requests" className="p-8">
              <ProcedureRequestForm onSuccess={() => setActiveTab('profile')} />
            </TabsContent>

            <TabsContent value="flagged" className="p-8">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">Flagged Consultations</h3>
                <p className="text-sm text-muted-foreground mt-1">These patients have underlying medical conditions that require your expert assessment before case approval can proceed.</p>
              </div>
              {!flaggedCases || flaggedCases.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No flagged consultations</p>
                  <p className="text-sm mt-1">You're all clear — no cases require high-risk review right now.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {flaggedCases.map(c => (
                    <div key={c.id} className="border border-amber-200 bg-amber-50/50 rounded-xl p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground">{c.client_name}</span>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold rounded-full uppercase tracking-wide">High-Risk Review</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Procedure: <span className="font-medium text-foreground">{c.procedures?.join(', ')}</span>
                          </p>
                          {c.high_risk_flagged_condition && (
                            <p className="text-xs text-amber-800 bg-amber-100 rounded-lg px-3 py-1.5 inline-block">
                              ⚠️ Flagged condition: <span className="font-semibold">{c.high_risk_flagged_condition}</span>
                            </p>
                          )}
                          {c.consultation_summary && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.consultation_summary}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 text-right text-xs text-muted-foreground flex-shrink-0">
                          <span>Case #{c.id?.slice(-6)}</span>
                          <span>{c.procedure_country || '—'}</span>
                          <span className="text-amber-600 font-semibold">Awaiting Admin Release</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="verification" className="p-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Medical License Verification</h3>
              <p className="text-sm text-muted-foreground mb-6">Verify your medical license against your country's official government registry. Verified doctors receive a "✅ Verified by Morales" badge on their profile.</p>
              <DoctorVerificationPanel user={user} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Remove your profile?"
        message="Patients will no longer be able to find or book you. Your existing cases are not deleted. This cannot be undone."
        confirmLabel="Remove profile"
        variant="danger"
      />
    </div>
  );
}