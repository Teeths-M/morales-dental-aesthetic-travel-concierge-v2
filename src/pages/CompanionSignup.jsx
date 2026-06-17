import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const countries = [
  // Caribbean
  'Trinidad and Tobago', 'Jamaica', 'Barbados', 'Bahamas', 'Guyana', 'Dominican Republic', 'Puerto Rico', 'Cuba', 'Haiti', 'Saint Lucia', 'Grenada', 'Antigua and Barbuda', 'Dominica', 'Saint Vincent and the Grenadines', 'Saint Kitts and Nevis', 'Aruba', 'Curacao', 'Cayman Islands', 'Turks and Caicos', 'British Virgin Islands', 'US Virgin Islands',
  // North America
  'United States', 'Canada', 'Mexico',
  // Central America
  'Costa Rica', 'Panama', 'Guatemala', 'Belize', 'Honduras', 'El Salvador', 'Nicaragua',
  // South America
  'Colombia', 'Brazil', 'Argentina', 'Chile', 'Peru', 'Ecuador', 'Uruguay', 'Paraguay', 'Bolivia', 'Venezuela',
  // Europe
  'United Kingdom', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Portugal', 'Greece', 'Turkey', 'Poland', 'Czech Republic', 'Hungary', 'Thailand', 'India', 'Singapore', 'Malaysia', 'Philippines', 'Indonesia', 'Vietnam', 'South Korea', 'Japan', 'China', 'Taiwan', 'Hong Kong',
  // Middle East
  'United Arab Emirates', 'Israel', 'Jordan', 'Lebanon', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain',
  // Africa
  'South Africa', 'Egypt', 'Morocco', 'Tunisia', 'Kenya', 'Nigeria', 'Ghana',
  // Oceania
  'Australia', 'New Zealand', 'Fiji'
];
const languagesList = ['English', 'Spanish', 'French', 'Hindi', 'Urdu', 'Mandarin', 'Arabic'];
const experienceOptions = ['Just starting out', '1-2 years', '3-5 years', '5-10 years', '10+ years'];

export default function CompanionSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountType, setAccountType] = useState('individual'); // 'individual' or 'agency'
  const [formData, setFormData] = useState({
    full_name: '',
    agency_name: '',
    contact_person: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    languages: [],
    years_experience: 'Just starting out',
    availability: 'flexible',
    has_medical_training: 'no',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLanguageToggle = (lang) => {
    setFormData(prev => {
      const exists = prev.languages.includes(lang);
      return {
        ...prev,
        languages: exists ? prev.languages.filter(l => l !== lang) : [...prev.languages, lang]
      };
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const user = await base44.auth.me();
      
      const companionData = {
        full_name: accountType === 'individual' ? formData.full_name : formData.agency_name,
        contact_person: accountType === 'individual' ? formData.full_name : formData.contact_person,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        city: formData.city,
        languages: formData.languages,
        primary_language: formData.languages[0] || 'en',
        years_experience: parseInt(formData.years_experience) || 0,
        bio: accountType === 'individual' 
          ? `Caregiver with ${formData.years_experience} experience. Available ${formData.availability}.`
          : `Professional companion agency serving ${formData.country}. Specializing in tour guide and companion services.`,
        hourly_rate_usd: 0,
        daily_rate_usd: 0,
        service_regions: [formData.country],
        available_for_medical_procedures: formData.has_medical_training === 'yes',
        medical_training: formData.has_medical_training === 'yes' ? 'Basic caregiving training' : '',
        payout_method: 'stripe',
        payout_account: '',
        sign_up_completed_at: new Date().toISOString(),
        is_agency: accountType === 'agency',
      };

      await base44.entities.Companion.create(companionData);

      toast.success(accountType === 'individual' ? 'Welcome! Your caregiver profile is created.' : 'Welcome! Your agency profile is created.');
      navigate('/companion-dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Failed to create profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Let's Get Started! 👋</h3>
              <p className="text-sm text-muted-foreground">Choose your account type</p>
            </div>

            {/* Account Type Selection */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => setAccountType('individual')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  accountType === 'individual'
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-border hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    accountType === 'individual' ? 'bg-emerald-600 text-white' : 'bg-muted'
                  }`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg">Individual Caregiver</h3>
                </div>
                <p className="text-sm text-muted-foreground">Mothers & caregivers offering personal care services</p>
              </button>
              
              <button
                type="button"
                onClick={() => setAccountType('agency')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  accountType === 'agency'
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-border hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    accountType === 'agency' ? 'bg-emerald-600 text-white' : 'bg-muted'
                  }`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg">Agency / Tour Guide</h3>
                </div>
                <p className="text-sm text-muted-foreground">Agencies providing tour guide & companion services</p>
              </button>
            </div>

            <div className="space-y-4">
              {accountType === 'individual' ? (
                <div className="space-y-2">
                  <Label htmlFor="full_name">Your Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Maria Rodriguez"
                    className="text-lg py-6"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="agency_name">Agency Name *</Label>
                    <Input
                      id="agency_name"
                      value={formData.agency_name}
                      onChange={(e) => handleInputChange('agency_name', e.target.value)}
                      placeholder="Caribbean Tours & Companions"
                      className="text-lg py-6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Contact Person *</Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) => handleInputChange('contact_person', e.target.value)}
                      placeholder="Agency representative"
                      className="py-6"
                    />
                  </div>
                </>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="maria@email.com"
                    className="py-6"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (868) 123-4567"
                    className="py-6"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Where do you live? *</Label>
                  <Select value={formData.country} onValueChange={(val) => handleInputChange('country', val)}>
                    <SelectTrigger className="py-6">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Port of Spain"
                    className="py-6"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Your Experience 💼</h3>
              <p className="text-sm text-muted-foreground">Help us understand your background</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Languages You Speak *</Label>
                <div className="flex flex-wrap gap-2">
                  {languagesList.map(lang => (
                    <Badge
                      key={lang}
                      className={`cursor-pointer transition-all text-sm py-2 px-4 ${
                        formData.languages.includes(lang)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                      onClick={() => handleLanguageToggle(lang)}
                    >
                      {formData.languages.includes(lang) && '✓ '}
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="years_experience">How many years of caregiving experience?</Label>
                <Select value={formData.years_experience} onValueChange={(val) => handleInputChange('years_experience', val)}>
                  <SelectTrigger className="py-6">
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Do you have medical training?</Label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleInputChange('has_medical_training', 'yes')}
                    className={`flex-1 py-4 rounded-lg border-2 transition-all ${
                      formData.has_medical_training === 'yes'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    Yes, I have training
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('has_medical_training', 'no')}
                    className={`flex-1 py-4 rounded-lg border-2 transition-all ${
                      formData.has_medical_training === 'no'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    No, but I'm willing to learn
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Availability 📅</h3>
              <p className="text-sm text-muted-foreground">When can you help families?</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>What's your availability?</Label>
                <div className="grid gap-3">
                  {[
                    { value: 'full-time', label: 'Full-time', desc: 'Available any day, any time' },
                    { value: 'part-time', label: 'Part-time', desc: 'Weekends or evenings' },
                    { value: 'flexible', label: 'Flexible', desc: 'Can adjust my schedule' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleInputChange('availability', opt.value)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.availability === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-semibold">{opt.label}</p>
                      <p className="text-sm text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">✨ What happens next?</h4>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>✓ We'll review your profile within 24 hours</li>
                  <li>✓ You'll receive a welcome call from our team</li>
                  <li>✓ Free training orientation scheduled</li>
                  <li>✓ Start earning by helping families in need</li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border-4 border-emerald-300 mb-4">
            <Users className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            {accountType === 'individual' ? 'Join Our Caregiver Family 💚' : 'Partner With Us 🤝'}
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto">
            {accountType === 'individual' 
              ? 'Mothers and caregivers 40+ — turn your caring heart into meaningful work' 
              : 'Agencies & tour guides — provide exceptional companion services'}
          </p>
        </div>

        {/* Simple Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-semibold transition-all ${
                  s <= step ? 'bg-emerald-600 text-white shadow-lg' : 'bg-muted text-muted-foreground'
                }`}>
                  {s < step ? <CheckCircle className="w-6 h-6" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 mx-2 transition-all ${
                    s < step ? 'bg-emerald-600' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-8 mt-3 text-sm font-medium">
            <span className={step >= 1 ? 'text-emerald-600' : 'text-muted-foreground'}>About You</span>
            <span className={step >= 2 ? 'text-emerald-600' : 'text-muted-foreground'}>Experience</span>
            <span className={step >= 3 ? 'text-emerald-600' : 'text-muted-foreground'}>Availability</span>
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-2 border-emerald-200 shadow-xl">
          <CardContent className="pt-6">
            {renderStep()}

            <div className="flex justify-between mt-8 gap-4">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  ← Back
                </Button>
              )}
              
              {step < 3 ? (
                <Button 
                  onClick={() => setStep(step + 1)} 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={
                    (accountType === 'individual' && !formData.full_name) ||
                    (accountType === 'agency' && (!formData.agency_name || !formData.contact_person)) ||
                    !formData.email || 
                    !formData.phone || 
                    !formData.country
                  }
                >
                  Next Step →
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={
                    isSubmitting || 
                    (accountType === 'individual' && !formData.full_name) ||
                    (accountType === 'agency' && (!formData.agency_name || !formData.contact_person)) ||
                    !formData.email || 
                    !formData.phone || 
                    !formData.country || 
                    formData.languages.length === 0
                  }
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  {isSubmitting ? 'Creating Your Profile...' : 'Complete Registration ✨'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trust Badge */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Safe, verified, and trusted by families worldwide
          </p>
        </div>
      </div>
    </div>
  );
}