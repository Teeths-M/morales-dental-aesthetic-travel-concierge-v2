import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function ConsultationForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_country: '',
    emergency_contact: '',
    procedure_country: '',
    procedures: '',
    consultation_summary: '',
    medications: '',
    allergies: '',
    smoking_status: 'Never',
    alcohol_use: 'None',
    medical_conditions: '',
    anesthesia_history: '',
    mental_health_notes: '',
    pregnancy_status: 'Not Applicable',
    exercise_level: 'Moderate'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await base44.entities.Case.create({
        ...formData,
        procedures: [formData.procedures],
        status: 'Submitted',
        safe_t_result: 'PENDING'
      });

      navigate('/consultation-success');
    } catch (err) {
      setError('Failed to submit consultation. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-display">Medical Travel Consultation</CardTitle>
            <p className="text-muted-foreground">Complete your consultation request. All information is confidential.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Client Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Client Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      value={formData.client_name}
                      onChange={(e) => handleChange('client_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => handleChange('client_email', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.client_phone}
                      onChange={(e) => handleChange('client_phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input
                      value={formData.client_country}
                      onChange={(e) => handleChange('client_country', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Emergency Contact</Label>
                    <Input
                      value={formData.emergency_contact}
                      onChange={(e) => handleChange('emergency_contact', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Procedure Country</Label>
                    <Input
                      value={formData.procedure_country}
                      onChange={(e) => handleChange('procedure_country', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Procedure Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Procedure Information</h3>
                <div>
                  <Label>Procedure Requested *</Label>
                  <Input
                    value={formData.procedures}
                    onChange={(e) => handleChange('procedures', e.target.value)}
                    placeholder="e.g., Dental Implants, Rhinoplasty"
                    required
                  />
                </div>
                <div>
                  <Label>Consultation Summary *</Label>
                  <Textarea
                    value={formData.consultation_summary}
                    onChange={(e) => handleChange('consultation_summary', e.target.value)}
                    placeholder="Describe your goals and expectations..."
                    className="h-32"
                    required
                  />
                </div>
              </div>

              {/* Medical History */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Medical History</h3>
                <div>
                  <Label>Current Medications</Label>
                  <Textarea
                    value={formData.medications}
                    onChange={(e) => handleChange('medications', e.target.value)}
                    className="h-20"
                  />
                </div>
                <div>
                  <Label>Allergies</Label>
                  <Textarea
                    value={formData.allergies}
                    onChange={(e) => handleChange('allergies', e.target.value)}
                    className="h-20"
                  />
                </div>
                <div>
                  <Label>Medical Conditions</Label>
                  <Textarea
                    value={formData.medical_conditions}
                    onChange={(e) => handleChange('medical_conditions', e.target.value)}
                    className="h-20"
                  />
                </div>
                <div>
                  <Label>Anesthesia History</Label>
                  <Textarea
                    value={formData.anesthesia_history}
                    onChange={(e) => handleChange('anesthesia_history', e.target.value)}
                    className="h-20"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Smoking Status</Label>
                    <Select value={formData.smoking_status} onValueChange={(v) => handleChange('smoking_status', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Never">Never</SelectItem>
                        <SelectItem value="Former">Former</SelectItem>
                        <SelectItem value="Light">Light</SelectItem>
                        <SelectItem value="Heavy">Heavy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Alcohol Use</Label>
                    <Select value={formData.alcohol_use} onValueChange={(v) => handleChange('alcohol_use', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Occasional">Occasional</SelectItem>
                        <SelectItem value="Moderate">Moderate</SelectItem>
                        <SelectItem value="Heavy">Heavy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Pregnancy Status</Label>
                    <Select value={formData.pregnancy_status} onValueChange={(v) => handleChange('pregnancy_status', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                        <SelectItem value="Pregnant">Pregnant</SelectItem>
                        <SelectItem value="Trying">Trying</SelectItem>
                        <SelectItem value="Breastfeeding">Breastfeeding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Exercise Level</Label>
                    <Select value={formData.exercise_level} onValueChange={(v) => handleChange('exercise_level', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sedentary">Sedentary</SelectItem>
                        <SelectItem value="Light">Light</SelectItem>
                        <SelectItem value="Moderate">Moderate</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Mental Health Notes</Label>
                  <Textarea
                    value={formData.mental_health_notes}
                    onChange={(e) => handleChange('mental_health_notes', e.target.value)}
                    className="h-20"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Submitting...' : 'Submit Consultation Request'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}