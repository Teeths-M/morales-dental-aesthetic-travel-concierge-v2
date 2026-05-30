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
    treatment_cost: '',
    treatment_duration: '',
    recovery_days: '',
    available_dates: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await base44.entities.Case.update(caseData.id, {
        treatment_cost: parseFloat(formData.treatment_cost),
        treatment_duration: parseInt(formData.treatment_duration),
        recovery_days: parseInt(formData.recovery_days),
        doctor_confirmation_status: 'Confirmed',
        doctor_confirmed_at: new Date().toISOString(),
        status: 'Vendor-Pending'
      });

      setSuccess(true);
    } catch (err) {
      setError('Failed to submit quote');
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Information */}
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold">Patient Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Age</p>
                    <p className="font-medium">N/A</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="font-medium">{caseData.client_country || 'N/A'}</p>
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

              {/* Quote Form */}
              <div className="space-y-4">
                <h3 className="font-semibold">Treatment Quote</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Treatment Cost (USD) *</Label>
                    <Input
                      type="number"
                      value={formData.treatment_cost}
                      onChange={(e) => setFormData({...formData, treatment_cost: e.target.value})}
                      required
                      placeholder="e.g., 5000"
                    />
                  </div>
                  <div>
                    <Label>Treatment Duration (days) *</Label>
                    <Input
                      type="number"
                      value={formData.treatment_duration}
                      onChange={(e) => setFormData({...formData, treatment_duration: e.target.value})}
                      required
                      placeholder="e.g., 3"
                    />
                  </div>
                  <div>
                    <Label>Recovery Time (days) *</Label>
                    <Input
                      type="number"
                      value={formData.recovery_days}
                      onChange={(e) => setFormData({...formData, recovery_days: e.target.value})}
                      required
                      placeholder="e.g., 7"
                    />
                  </div>
                  <div>
                    <Label>Available Dates</Label>
                    <Input
                      value={formData.available_dates}
                      onChange={(e) => setFormData({...formData, available_dates: e.target.value})}
                      placeholder="e.g., June 2026"
                    />
                  </div>
                </div>
                <div>
                  <Label>Doctor Notes</Label>
                  <Textarea
                    value={formData.doctor_notes}
                    onChange={(e) => setFormData({...formData, doctor_notes: e.target.value})}
                    placeholder="Additional notes, recommendations, or requirements..."
                    className="h-32"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit Quote'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}