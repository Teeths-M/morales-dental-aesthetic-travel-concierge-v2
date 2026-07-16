import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackButton } from '@/components/nav/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import CredentialBadge from '@/components/doctors/CredentialBadge';
import { base44 } from '@/api/base44Client';
import SurgicalExecutionControls from '@/components/portal/SurgicalExecutionControls';
import ClinicalExtractionModal from '@/components/doctor/ClinicalExtractionModal';
import PlatformGuideOrb from '@/components/guide/PlatformGuideOrb';

export default function PortalDoctor() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [caseData, setCaseData] = useState(null);
  const [consultationData, setConsultationData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    doctor_notes: ''
  });
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicLat, setClinicLat]         = useState('');
  const [clinicLng, setClinicLng]         = useState('');
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [showInfoRequest, setShowInfoRequest] = useState(false);
  const [infoRequest, setInfoRequest] = useState('');
  const [infoRequestSent, setInfoRequestSent] = useState(false);

  useEffect(() => {
    const loadCase = async () => {
      const isDev = import.meta.env.DEV;

      if (isDev) {
        setCaseData({
          id: 'mock_case_dr_rossanna',
          doctor_portal_token: token,
          consultation_id: 'mock_consultation_dr_rossanna',
          client_name: 'Test Patient (Dr. Rossanna)',
          client_email: 'test.patient@example.com',
          client_phone: '+1-555-DR-ROSS',
          client_country: 'USA',
          procedures: ['Dental Implants', 'Smile Makeover'],
          consultation_summary: 'Patient interested in full dental reconstruction.',
          doctor_confirmation_status: 'PENDING',
        });

        setConsultationData({
          id: 'mock_consultation_dr_rossanna',
          patient_name: 'Test Patient (Dr. Rossanna)',
          email: 'test.patient@example.com',
          phone: '+1-555-DR-ROSS',
          procedure_interest: 'dental_implants',
          age: '45',
          gender: 'Female',
          nationality: 'USA',
          occupation: 'Engineer',
          destination_country: 'Venezuela',
          preferred_date: '2027-01-15',
          duration_of_stay: '2 weeks',
          notes: 'Patient requests Friday appointments only.',
          medical_conditions: ['Hypertension'],
          allergies: ['Penicillin'],
          takes_medications: true,
          medication_types: ['Lisinopril'],
          had_surgery: true,
          previous_procedures: 'Appendix removal (2010)',
        });
        setLoading(false);
        return;
      }
      
      try {
        // Filter by token directly — avoids loading entire table
        const cases = await base44.entities.CaseRecord.filter({ doctor_portal_token: token });
        const matchingCase = (cases ?? []).find(c => c.doctor_portal_token === token);
        
        if (!matchingCase) {
          setError('Invalid or expired portal link');
          setLoading(false);
          return;
        }

        setCaseData(matchingCase);

        if (matchingCase.consultation_id) {
          try {
            const consultation = await base44.entities.Consultation.get(matchingCase.consultation_id);
            setConsultationData(consultation);
          } catch (consultationError) {
            console.error("Failed to load consultation data:", consultationError);
          }
        }
      } catch (err) {
        setError('Failed to load case data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCase();
  }, [token]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const coordsUpdate = (clinicLat && clinicLng)
        ? { clinic_coords: { lat: parseFloat(clinicLat), lng: parseFloat(clinicLng) } }
        : {};
      await base44.entities.CaseRecord.update(caseData?.id, {
        doctor_confirmation_status: 'Confirmed',
        doctor_confirmed_at: new Date().toISOString(),
        doctor_notes: formData.doctor_notes,
        status: 'Vendor-Pending',
        ...(clinicAddress ? { clinic_address: clinicAddress } : {}),
        ...coordsUpdate,
      });
      setSuccess(true);
    } catch (err) {
      setError('Failed to confirm case');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInfoRequest = async () => {
    if (!infoRequest.trim()) return;
    setSubmitting(true);
    try {
      // Find the linked WorkflowEvent
      const workflows = await base44.entities.WorkflowEvent.filter({ consultation_id: caseData?.consultation_id });
      const workflow = workflows?.[0];
      if (workflow) {
        await base44.entities.WorkflowEvent.update(workflow.id, {
          stage: 'info_requested',
          doctor_notes: infoRequest,
          last_update_summary: 'Doctor has requested additional information before confirming.',
        });
      }
      await base44.functions.invoke('notifyPatientInfoRequest', {
        consultation_id: caseData?.consultation_id,
        doctor_question: infoRequest,
      });
      setInfoRequestSent(true);
      setShowInfoRequest(false);
    } catch (err) {
      setError('Failed to send information request');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotAvailable = async () => {
    setSubmitting(true);
    try {
      await base44.entities.CaseRecord.update(caseData?.id, {
        doctor_confirmation_status: 'Declined',
        doctor_notes: formData.doctor_notes,
        status: 'Admin-Review'
      });
      setSuccess(true);
    } catch (err) {
      setError('Failed to decline case');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div className="min-h-screen bg-background py-12 px-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-background py-12 px-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>Case data not found. Please check your link.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background py-12 px-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl font-display">Notes Submitted Successfully</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-muted-foreground">
              Thank you, Doctor. Your notes have been logged. When the procedure is fully complete, please confirm below.
            </p>

            {/* Finish Procedure button */}
            <div style={{ padding: '20px 24px', borderRadius: 16, background: '#D4AF3710', border: '2px solid #D4AF3750' }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#D4AF37', letterSpacing: '0.08em' }}>PROCEDURE COMPLETE?</p>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                Pressing this button will notify the patient's guardian, activate recovery mode, and schedule post-operative check-ins automatically.
              </p>
              <button
                onClick={async () => {
                  try {
                    const token = new URLSearchParams(window.location.search).get('token') || window.location.pathname.split('/').pop();
                    await base44.functions.invoke('logProcedureComplete', { token, outcome_notes: formData.doctor_notes });
                    alert('Procedure confirmed. Guardian notified. Recovery mode activated.');
                  } catch (_e) {
                    alert('Could not confirm procedure. Please contact admin directly.');
                  }
                }}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 12, cursor: 'pointer',
                  background: 'linear-gradient(135deg, #D4AF37, #E8C85C)',
                  border: 'none', color: '#060B16', fontSize: 14, fontWeight: 800,
                  boxShadow: '0 8px 24px rgba(212,175,55,0.35)',
                }}
              >
                ✅ Confirm Procedure Complete — Notify Guardian
              </button>
            </div>

            <Button onClick={() => navigate('/')} variant="outline" className="mt-2">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-background py-6 px-4 sm:py-12 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <BackButton fallback="/" className="mb-4" />
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-display">Doctor Portal - Case Review</CardTitle>
            <p className="text-muted-foreground">
              Patient: {caseData?.client_name || 'N/A'} | Procedure: {caseData?.procedures?.join(', ') || 'N/A'}
            </p>
            {caseData?.doctor_verification_status && (
              <div className="mt-2">
                <CredentialBadge doctor={{ verification_status: caseData.doctor_verification_status, verification_method: caseData.doctor_verification_method, credential_verified_date: caseData.doctor_credential_verified_date }} />
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Patient's Original Request (AI-Fallback Note) */}
              {consultationData?.notes && (
                <div className="space-y-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg mb-4">
                  <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    Patient's Original Request (AI-Fallback Note)
                  </h3>
                  <blockquote className="text-sm text-emerald-900 italic bg-white/50 rounded-md p-3 border-l-4 border-emerald-400">
                    {consultationData.notes}
                  </blockquote>
                </div>
              )}

              {/* Patient Information */}
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold">Patient Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Age</p>
                    <p className="font-medium">{consultationData?.age || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium">{consultationData?.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nationality</p>
                    <p className="font-medium">{consultationData?.nationality || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Occupation</p>
                    <p className="font-medium">{consultationData?.occupation || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Client Country</p>
                    <p className="font-medium">{caseData?.client_country || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Destination Country</p>
                    <p className="font-medium">{consultationData?.destination_country || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{caseData?.client_phone || consultationData?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{caseData?.client_email || consultationData?.email || 'N/A'}</p>
                  </div>
                  {consultationData?.emergency_contact_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Emergency Contact</p>
                      <p className="font-medium">{consultationData.emergency_contact_name} ({consultationData.emergency_contact_number})</p>
                    </div>
                  )}
                  {consultationData?.has_companion && (
                    <div>
                      <p className="text-sm text-muted-foreground">Companion</p>
                      <p className="font-medium">Yes ({consultationData.companion_relationship})</p>
                    </div>
                  )}
                  {consultationData?.has_cultural_preferences && consultationData.cultural_preferences?.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cultural Preferences</p>
                      <p className="font-medium">{consultationData.cultural_preferences.join(', ')}</p>
                    </div>
                  )}
                  {consultationData?.cultural_notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cultural Notes</p>
                      <p className="font-medium">{consultationData.cultural_notes}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Preferred Procedure Date</p>
                    <p className="font-medium">{consultationData?.preferred_date ? new Date(consultationData.preferred_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration of Stay</p>
                    <p className="font-medium">{consultationData?.duration_of_stay || 'N/A'}</p>
                  </div>
                  {consultationData?.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Client Notes</p>
                      <p className="font-medium">{consultationData.notes}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Medical Summary</p>
                  <p className="text-sm">{caseData?.consultation_summary || consultationData?.procedure_interest || 'N/A'}</p>
                </div>
                {consultationData?.medical_conditions?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Medical Conditions</p>
                    <p className="text-sm">{consultationData.medical_conditions.join(', ')}</p>
                  </div>
                )}
                {consultationData?.medical_conditions_other && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Other Medical Conditions</p>
                    <p className="text-sm">{consultationData.medical_conditions_other}</p>
                  </div>
                )}
                {consultationData?.allergies?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Allergies</p>
                    <p className="text-sm">{consultationData.allergies.join(', ')}</p>
                  </div>
                )}
                {consultationData?.allergy_details && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Allergy Details</p>
                    <p className="text-sm">{consultationData.allergy_details}</p>
                  </div>
                )}
                {consultationData?.takes_medications && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Medications</p>
                    <p className="text-sm">{consultationData.medication_types.join(', ')}</p>
                  </div>
                )}
                {consultationData?.medication_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Medication Notes</p>
                    <p className="text-sm">{consultationData.medication_notes}</p>
                  </div>
                )}
                {consultationData?.lifestyle_habits?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Lifestyle Habits</p>
                    <p className="text-sm">{consultationData.lifestyle_habits.join(', ')}</p>
                  </div>
                )}
                {consultationData && consultationData.exercises_regularly !== null && consultationData.exercises_regularly !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Exercises Regularly</p>
                    <p className="text-sm">{consultationData.exercises_regularly ? 'Yes' : 'No'}</p>
                  </div>
                )}
                {consultationData?.activity_level && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Activity Level</p>
                    <p className="text-sm">{consultationData.activity_level}</p>
                  </div>
                )}
                {consultationData?.emotional_concerns && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Emotional Concerns</p>
                    <p className="text-sm">{consultationData.emotional_concern_types.join(', ')}</p>
                  </div>
                )}
                {consultationData?.emotional_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Emotional Notes</p>
                    <p className="text-sm">{consultationData.emotional_notes}</p>
                  </div>
                )}
                {consultationData?.pregnancy_status && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Pregnancy Status</p>
                    <p className="text-sm">{consultationData.pregnancy_status}</p>
                  </div>
                )}
                {consultationData && consultationData.had_surgery !== null && consultationData.had_surgery !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Previous Surgery</p>
                    <p className="text-sm">{consultationData.had_surgery ? 'Yes' : 'No'}</p>
                  </div>
                )}
                {consultationData?.previous_procedures && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Previous Procedures</p>
                    <p className="text-sm">{consultationData.previous_procedures}</p>
                  </div>
                )}
                {consultationData?.last_surgery_date && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Last Surgery Date</p>
                    <p className="text-sm">{new Date(consultationData.last_surgery_date).toLocaleDateString()}</p>
                  </div>
                )}
                {consultationData?.had_complications && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Surgery Complications</p>
                    <p className="text-sm">{consultationData.surgery_complications.join(', ')}</p>
                  </div>
                )}
                {consultationData?.anesthesia_complications && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Anesthesia Complications</p>
                    <p className="text-sm">{consultationData.anesthesia_complication_types.join(', ')}</p>
                  </div>
                )}
              </div>

              {/* Doctor Notes */}
              <div className="space-y-4">
                <h3 className="font-semibold">Your Response</h3>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label>Doctor Notes (Optional)</Label>
                    <button
                      type="button"
                      onClick={() => setShowExtractModal(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors px-2.5 py-1 rounded-lg hover:bg-violet-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Extract Clinical Data
                    </button>
                  </div>
                  <Textarea
                    value={formData.doctor_notes}
                    onChange={(e) => setFormData({...formData, doctor_notes: e.target.value})}
                    placeholder="Add any notes or requirements for this case..."
                    className="h-32"
                  />
                </div>
              </div>

              {/* ── Clinic Location ── */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📍</span>
                  <h3 className="font-semibold text-sm">Clinic Location</h3>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Adding your clinic's exact location lets the patient see it on their Journey Map and get directions automatically.
                </p>
                <div>
                  <Label>Clinic Address</Label>
                  <input
                    type="text"
                    value={clinicAddress}
                    onChange={e => setClinicAddress(e.target.value)}
                    placeholder="e.g. Clínica Dento Care, Av. Principal 45, Caracas, Venezuela"
                    className="w-full mt-1.5 border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Latitude</Label>
                    <input
                      type="number"
                      step="any"
                      value={clinicLat}
                      onChange={e => setClinicLat(e.target.value)}
                      placeholder="e.g. 10.4806"
                      className="w-full mt-1.5 border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <Label>Longitude</Label>
                    <input
                      type="number"
                      step="any"
                      value={clinicLng}
                      onChange={e => setClinicLng(e.target.value)}
                      placeholder="e.g. -66.9036"
                      className="w-full mt-1.5 border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  💡 Don't know the coordinates? Search your address on{' '}
                  <a
                    href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(clinicAddress || 'your clinic')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    OpenStreetMap
                  </a>{' '}
                  and right-click the pin to copy coordinates.
                </p>
              </div>

              {/* Stage 10 & 11: Surgical Execution Controls */}
              <SurgicalExecutionControls
                caseData={caseData}
                token={token}
                onStatusChange={(newStatus) => setCaseData(prev => ({ ...prev, status: newStatus, notification_blackout_active: newStatus === 'SURGICAL_EXECUTION_WINDOW' }))}
              />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleConfirm} 
                  className="flex-1 bg-primary hover:bg-primary/90" 
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? 'Processing...' : 'Confirm Availability'}
                </Button>
                <Button 
                  onClick={handleNotAvailable} 
                  variant="outline" 
                  className="flex-1" 
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? 'Processing...' : 'Not Available'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowInfoRequest(true)}
                  className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                  disabled={submitting || infoRequestSent}
                >
                  {infoRequestSent ? '✓ Request Sent' : 'Request More Info'}
                </Button>
              </div>

              {showInfoRequest && (
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-sm font-medium text-amber-800 mb-2">What information do you need?</p>
                  <Textarea
                    value={infoRequest}
                    onChange={e => setInfoRequest(e.target.value)}
                    className="w-full text-sm border rounded-lg p-2 h-24"
                    placeholder="Describe what additional information you need from the patient..."
                  />
                  <div className="flex gap-2 mt-2">
                    <Button onClick={handleInfoRequest} className="text-sm" disabled={submitting || !infoRequest.trim()}>
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Send Request
                    </Button>
                    <Button variant="ghost" className="text-sm text-slate-500" onClick={() => setShowInfoRequest(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    {showExtractModal && (
      <ClinicalExtractionModal
        onApply={(text) => setFormData(fd => ({ ...fd, doctor_notes: text }))}
        onClose={() => setShowExtractModal(false)}
      />
    )}
    <PlatformGuideOrb />
    </>
  );
}