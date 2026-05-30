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
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    doctor_notes: ''
  });

  useEffect(() => {
    const loadCase = async () => {
      try {
        // Find case by doctor_portal_token
        const cases = await base44.entities.Case.filter({});
        const matchingCase = cases.find(c => c.doctor_portal_token === token);
        
        if (!matchingCase) {
          setError('Invalid or expired portal link');
          setLoading(false);
          return;
        }

        setCaseData(matchingCase);
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
      await base44.entities.Case.update(caseData.id, {
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
      await base44.entities.Case.update(caseData.id, {
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
              Patient: {caseData.client_name} | Procedure: {caseData.procedures.join(', ')}
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
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="font-medium">{caseData.client_country || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requested Procedure Date</p>
                    <p className="font-medium">{caseData.preferred_date || 'Not specified'}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Duration of Stay</p>
                    <p className="font-medium">{caseData.duration_of_stay || 'Not specified'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Medical Summary</p>
                  <p className="text-sm">{caseData.consultation_summary}</p>
                </div>
                {caseData.medical_conditions && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Medical Conditions</p>
                    <p className="text-sm">{caseData.medical_conditions}</p>
                  </div>
                )}
                {caseData.allergies && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Allergies</p>
                    <p className="text-sm">{caseData.allergies}</p>
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