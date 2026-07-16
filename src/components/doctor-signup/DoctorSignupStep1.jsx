import React, { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { translations, countries } from '@/lib/translations';
import { ArrowRight, AlertCircle } from 'lucide-react';
import cityData from '@/lib/cityData.json';

export default function DoctorSignupStep1({ formData, setFormData, language = 'en', onNext }) {
  const t = translations[language] || translations['en'];
  // Lock the country list on first render. useGeoAutoAlign (in AppLayout) can
  // change the app language mid-session after geolocation resolves, which swaps
  // the country names (e.g. 'United States' → 'Estados Unidos'). If the list
  // swaps, the controlled <select> can't find a matching <option> and snaps back
  // to 'Select country...'. Locking prevents that.
  const countryListRef = useRef(null);
  if (!countryListRef.current) {
    countryListRef.current = countries[language] || countries['en'];
  }
  const countryList = countryListRef.current;

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSelectCountry = (e) => {
    const country = e.target.value;
    setFormData(prev => {
      // Only clear the city if it's no longer valid for the new country.
      // Clearing unconditionally causes the city field to switch between
      // <Input> and <select>, and the key change on the city select can
      // trigger React reconciliation that disrupts the country select.
      const newCities = country && cityData[country] ? cityData[country] : [];
      const cityStillValid = newCities.length === 0 || newCities.includes(prev.clinic_city);
      return {
        ...prev,
        clinic_country: country,
        clinic_city: cityStillValid ? prev.clinic_city : ''
      };
    });
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

  const [showErrors, setShowErrors] = useState(false);

  const requiredFields = [
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'clinic_country', label: 'Clinic Country' },
    { key: 'clinic_city', label: 'Clinic City' },
    { key: 'professional_background', label: 'Professional Background' },
    { key: 'years_experience', label: 'Years of Experience' },
  ];

  const missingFields = requiredFields.filter(f => !formData[f.key]);
  const canProceed = missingFields.length === 0;

  const handleNext = () => {
    if (canProceed) {
      onNext();
    } else {
      setShowErrors(true);
    }
  };

  const fieldError = (key) => showErrors && !formData[key] ? 'border-red-500 focus-visible:ring-red-500' : '';

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
            className={`h-12 text-base ${fieldError('full_name')}`}
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
            className={`h-12 text-base ${fieldError('email')}`}
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
            className={`h-12 text-base ${fieldError('phone')}`}
          />
        </div>

        {/* Clinic Country */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">🌍 {t.clinicCountry}</label>
          <select
            data-testid="doctor-country"
            value={formData.clinic_country || ''}
            onChange={handleSelectCountry}
            className={`flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${fieldError('clinic_country')}`}
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
          {availableCities.length > 0 ? (
            <select
              key={`doctor-city-${formData.clinic_country}`}
              data-testid="doctor-city"
              value={formData.clinic_city || ''}
              onChange={(e) => handleChange('clinic_city', e.target.value)}
              className={`flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${fieldError('clinic_city')}`}
            >
              <option value="">Select a city</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          ) : (
            <Input
              data-testid="doctor-city"
              placeholder="Enter your city"
              value={formData.clinic_city || ''}
              onChange={(e) => handleChange('clinic_city', e.target.value)}
              className={`h-12 text-base ${fieldError('clinic_city')}`}
            />
          )}
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

        {/* Website (Optional) */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">🌐 Website <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Input
            data-testid="doctor-website"
            name="website_url"
            placeholder="www.yourclinic.com"
            value={formData.website_url || ''}
            onChange={(e) => handleChange('website_url', e.target.value)}
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
            className={`h-12 text-base ${fieldError('professional_background')}`}
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
            className={`h-12 text-base ${fieldError('years_experience')}`}
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

      {showErrors && !canProceed && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">
            Please complete these required fields: {missingFields.map(f => f.label).join(', ')}
          </p>
        </div>
      )}

      <Button
        data-testid="doctor-step1-next"
        onClick={handleNext}
        className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white gap-2"
      >
        {t.next} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}