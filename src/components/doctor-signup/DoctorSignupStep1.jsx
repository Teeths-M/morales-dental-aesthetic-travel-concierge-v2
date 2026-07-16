import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { translations, countries } from '@/lib/translations';
import { ArrowRight } from 'lucide-react';
import cityData from '@/lib/cityData.json';

export default function DoctorSignupStep1({ formData, setFormData, language = 'en', onNext }) {
  const t = translations[language] || translations['en'];
  const countryList = countries[language] || countries['en'];

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSelectCountry = (e) => {
    const country = e.target.value;
    setFormData(prev => ({ ...prev, clinic_country: country, clinic_city: '' }));
  };

  const availableCities = formData.clinic_country && cityData[formData.clinic_country]
    ? cityData[formData.clinic_country]
    : [];

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // Allow any phone format (digits, +, spaces, hyphens, parentheses)
    if (/^[\d+\s\-()]*$/.test(value)) {
      handleChange('phone', value);
    }
  };

  const canProceed = formData.full_name && formData.email && formData.phone && formData.clinic_country && formData.clinic_city && formData.professional_background && formData.years_experience;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-semibold text-foreground mb-2">{t.step1Title}</h2>
        <p className="text-muted-foreground text-sm">{t.step1Subtitle}</p>
      </div>

      <div className="space-y-6">
        {/* Full Name */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">👤 {t.fullName}</label>
          <Input
            data-testid="doctor-full-name"
            name="full_name"
            placeholder="Dr. Jane Smith"
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            className="h-12 text-base"
          />
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">📧 {t.email}</label>
          <Input
            data-testid="doctor-email"
            name="email"
            type="email"
            placeholder="drjane@clinic.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="h-12 text-base"
          />
          <p className="text-xs text-muted-foreground mt-1">{t.emailHint}</p>
        </div>

        {/* Phone */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">📞 {t.phone}</label>
          <Input
            data-testid="doctor-phone"
            name="phone"
            placeholder="+1 868 123 4567"
            value={formData.phone}
            onChange={handlePhoneChange}
            className="h-12 text-base"
          />
        </div>

        {/* Clinic Country */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">🌍 {t.clinicCountry}</label>
          <select
            data-testid="doctor-country"
            value={formData.clinic_country || ''}
            onChange={handleSelectCountry}
            className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          >
            <option value="">Select country...</option>
            {countryList.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

        {/* Clinic City */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">📍 Clinic City</label>
          <select
            data-testid="doctor-city"
            value={formData.clinic_city || ''}
            onChange={(e) => handleChange('clinic_city', e.target.value)}
            className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          >
            <option value="">Select a city</option>
            {availableCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Clinic Name (Optional) */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">🏥 {t.clinicName}</label>
          <Input
            data-testid="doctor-clinic-name"
            placeholder="Smile Care Clinic"
            value={formData.clinic_name}
            onChange={(e) => handleChange('clinic_name', e.target.value)}
            className="h-12 text-base"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">🎓 Professional Background</label>
          <Input
            data-testid="doctor-professional-background"
            name="professional_background"
            placeholder="Education, certifications, board memberships"
            value={formData.professional_background}
            onChange={(e) => handleChange('professional_background', e.target.value)}
            className="h-12 text-base"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">⭐ Years of Experience</label>
          <Input
            data-testid="doctor-years-experience"
            name="years_experience"
            type="number"
            min="0"
            placeholder="Enter years (e.g. 10)"
            value={formData.years_experience}
            onChange={(e) => handleChange('years_experience', e.target.value)}
            className="h-12 text-base"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">📝 Short Bio</label>
          <Input
            data-testid="doctor-bio"
            placeholder="A short patient-facing introduction"
            value={formData.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
            className="h-12 text-base"
          />
        </div>
      </div>

      <div className="bg-secondary/50 border border-secondary rounded-lg p-4">
        <p className="text-sm text-foreground">{t.agreeTerms}</p>
      </div>

      <Button
        data-testid="doctor-step1-next"
        onClick={onNext}
        disabled={!canProceed}
        className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white gap-2"
      >
        {t.next} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}