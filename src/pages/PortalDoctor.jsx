import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

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

  useEffect(() => {
    const loadCase = async () => {
      // Fallback Injector: If in development or using test token, inject Dr. Rossanna's data
      const isDev = import.meta.env.DEV;
      const isTestToken = token === 'dr_rossanna_test_token' || token?.includes('test');

      if (isDev || isTestToken) {
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
        const cases = await base44.entities.CaseRecord.filter({});
        const matchingCase = cases.find(c => c.doctor_portal_token === token);
        
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
      await base44.entities.CaseRecord.update(caseData?.id, {
        doctor_confirmation_status: 'Confirmed',
        doctor_confirmed_at: new Date().toISOString(),
        doctor_notes: formData.doctor_notes,
        status: 'Vendor-Pending'
      });
      setSuccess(true);
    } catch (err) {
      setError('Failed to confirm case');
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
            <CardTitle className="text-2xl font-display">Quote Submitted Successfully</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Thank you for providing your quote. The case will now proceed to vendor coordination.
            </p>
            <Button onClick={() => navigate('/')} className="mt-6">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-display">Doctor Portal - Case Review</CardTitle>
            <p className="text-muted-foreground">
              Patient: {caseData?.client_name || 'N/A'} | Procedure: {caseData?.procedures?.join(', ') || 'N/A'}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Patient Information */}
              {/* Patient Information */}
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold">Patient Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
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
                  <Label>Doctor Notes (Optional)</Label>
                  <Textarea
                    value={formData.doctor_notes}
                    onChange={(e) => setFormData({...formData, doctor_notes: e.target.value})}
                    placeholder="Add any notes or requirements for this case..."
                    className="h-32"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}