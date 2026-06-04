import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, BookOpen, Award, MapPin, DollarSign, CheckCircle, ArrowRight, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function CompanionSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    languages: [],
    primary_language: 'en',
    certifications: [],
    specializations: [],
    years_experience: 0,
    bio: '',
    hourly_rate_usd: 0,
    daily_rate_usd: 0,
    service_regions: [],
    available_for_medical_procedures: false,
    medical_training: '',
    payout_method: 'stripe',
    payout_account: '',
  });

  const commonLanguages = ['English', 'Spanish', 'French', 'Portuguese', 'German', 'Italian', 'Mandarin', 'Arabic'];
  const commonSpecializations = ['Medical Tourism', 'Cultural Tours', 'Adventure Travel', 'Business Travel', 'Luxury Travel', 'Family Travel', 'Senior Care', 'Disability Assistance'];
  const commonCertifications = ['First Aid Certified', 'CPR Certified', 'Tour Guide License', 'Medical Assistant', 'Nursing Background', 'Healthcare Professional', 'Customer Service Training'];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayFieldToggle = (field, value) => {
    setFormData(prev => {
      const exists = prev[field].includes(value);
      return {
        ...prev,
        [field]: exists ? prev[field].filter(item => item !== value) : [...prev[field], value]
      };
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const user = await base44.auth.me();
      
      const companionData = {
        ...formData,
        sign_up_completed_at: new Date().toISOString()
      };

      const companion = await base44.entities.Companion.create(companionData);

      // Initiate identity verification
      try {
        await base44.functions.invoke('initiateStripeIdentity', {
          provider_id: companion.id,
          provider_type: 'companion',
          provider_email: formData.email,
          provider_name: formData.full_name
        });
      } catch (error) {
        console.error('Failed to initiate verification:', error);
      }

      toast.success('Companion profile created! Verification process initiated.');
      navigate('/companion-dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Failed to create companion profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="United States"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="New York"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Languages Spoken *</Label>
              <div className="flex flex-wrap gap-2">
                {commonLanguages.map(lang => (
                  <Badge
                    key={lang}
                    className={`cursor-pointer transition-all ${
                      formData.languages.includes(lang)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                    onClick={() => handleArrayFieldToggle('languages', lang)}
                  >
                    {formData.languages.includes(lang) && <CheckCircle className="w-3 h-3 mr-1" />}
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary_language">Primary Language</Label>
              <Select value={formData.primary_language} onValueChange={(val) => handleInputChange('primary_language', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="years_experience">Years of Experience</Label>
              <Input
                id="years_experience"
                type="number"
                value={formData.years_experience}
                onChange={(e) => handleInputChange('years_experience', parseInt(e.target.value) || 0)}
                min="0"
                max="50"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Certifications</Label>
              <div className="flex flex-wrap gap-2">
                {commonCertifications.map(cert => (
                  <Badge
                    key={cert}
                    className={`cursor-pointer transition-all ${
                      formData.certifications.includes(cert)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                    onClick={() => handleArrayFieldToggle('certifications', cert)}
                  >
                    {formData.certifications.includes(cert) && <CheckCircle className="w-3 h-3 mr-1" />}
                    {cert}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Specializations</Label>
              <div className="flex flex-wrap gap-2">
                {commonSpecializations.map(spec => (
                  <Badge
                    key={spec}
                    className={`cursor-pointer transition-all ${
                      formData.specializations.includes(spec)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                    onClick={() => handleArrayFieldToggle('specializations', spec)}
                  >
                    {formData.specializations.includes(spec) && <CheckCircle className="w-3 h-3 mr-1" />}
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about your experience and what makes you a great companion..."
                className="min-h-[120px]"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate (USD)</Label>
              <Input
                id="hourly_rate"
                type="number"
                value={formData.hourly_rate_usd}
                onChange={(e) => handleInputChange('hourly_rate_usd', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="daily_rate">Daily Rate (USD)</Label>
              <Input
                id="daily_rate"
                type="number"
                value={formData.daily_rate_usd}
                onChange={(e) => handleInputChange('daily_rate_usd', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_regions">Service Regions</Label>
              <Input
                id="service_regions"
                value={formData.service_regions.join(', ')}
                onChange={(e) => handleInputChange('service_regions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="Caribbean, North America, Europe"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="medical_procedures"
                checked={formData.available_for_medical_procedures}
                onCheckedChange={(checked) => handleInputChange('available_for_medical_procedures', checked)}
              />
              <Label htmlFor="medical_procedures">Available for medical procedure assistance</Label>
            </div>
            {formData.available_for_medical_procedures && (
              <div className="space-y-2">
                <Label htmlFor="medical_training">Medical Training/Background</Label>
                <Textarea
                  id="medical_training"
                  value={formData.medical_training}
                  onChange={(e) => handleInputChange('medical_training', e.target.value)}
                  placeholder="Describe any medical training or healthcare experience..."
                  className="min-h-[80px]"
                />
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="payout_method">Payout Method</Label>
              <Select value={formData.payout_method} onValueChange={(val) => handleInputChange('payout_method', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe (Bank Transfer)</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="wipay">Wipay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout_account">Payout Account</Label>
              <Input
                id="payout_account"
                value={formData.payout_account}
                onChange={(e) => handleInputChange('payout_account', e.target.value)}
                placeholder={formData.payout_method === 'paypal' ? 'PayPal email' : 'Bank account details'}
              />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Verification Process</h4>
              <p className="text-sm text-muted-foreground">
                After signup, you'll go through our 3-step verification:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Identity Verification (Stripe Identity)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Background Check (Checkr)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  License/Certification Verification
                </li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/40 mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">
            Become a Companion
          </h1>
          <p className="text-lg text-muted-foreground">
            Guide patients through their medical travel journey
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {s < step ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                {s < 5 && (
                  <div className={`w-12 md:w-24 h-1 mx-2 transition-all ${
                    s < step ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Personal Info</span>
            <span>Languages</span>
            <span>Qualifications</span>
            <span>Services</span>
            <span>Payout</span>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Personal Information'}
              {step === 2 && 'Languages & Experience'}
              {step === 3 && 'Certifications & Bio'}
              {step === 4 && 'Services & Availability'}
              {step === 5 && 'Payout & Verification'}
            </CardTitle>
            <CardDescription>
              Step {step} of 5
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStep()}

            <div className="flex justify-between mt-8">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              ) : (
                <Button variant="outline" onClick={() => navigate('/partner-signup')}>
                  Cancel
                </Button>
              )}
              
              {step < 5 ? (
                <Button onClick={() => setStep(step + 1)}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !formData.full_name || !formData.email || !formData.phone || !formData.country || formData.languages.length === 0}
                >
                  {isSubmitting ? 'Creating Profile...' : 'Complete Signup'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}