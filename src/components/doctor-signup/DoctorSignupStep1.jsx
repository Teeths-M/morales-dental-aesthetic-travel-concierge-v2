import React, { useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { translations, countries } from '@/lib/translations';
import { ArrowRight, ChevronDown, Search } from 'lucide-react';
import cityData from '@/lib/cityData.json';

export default function DoctorSignupStep1({ formData, setFormData, language = 'en', onNext }) {
  const t = translations[language] || translations['en'];
  const countryList = countries[language] || countries['en'];
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const cityRef = useRef(null);
  const countryRef = useRef(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (cityRef.current && !cityRef.current.contains(e.target)) {
        setShowCityDropdown(false);
      }
      if (countryRef.current && !countryRef.current.contains(e.target)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCountries = useCallback(() => {
    return countryList.filter(country =>
      country.toLowerCase().includes(countrySearch.toLowerCase())
    );
  }, [countryList, countrySearch]);

  const handleSelectCountry = (country) => {
    setFormData(prev => ({ ...prev, clinic_country: country, clinic_city: '' }));
    setShowCountryDropdown(false);
    setCountrySearch('');
  };

  const filteredCities = useCallback(() => {
    if (!formData.clinic_country || !cityData[formData.clinic_country]) return [];
    return cityData[formData.clinic_country].filter(city =>
      city.toLowerCase().includes(citySearch.toLowerCase())
    );
  }, [formData.clinic_country, citySearch]);

  const handleSelectCity = (city) => {
    setFormData(prev => ({ ...prev, clinic_city: city }));
    setShowCityDropdown(false);
    setCitySearch('');
  };

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
            placeholder="+1 868 123 4567"
            value={formData.phone}
            onChange={handlePhoneChange}
            className="h-12 text-base"
          />
        </div>

        {/* Clinic Country */}
        <div ref={countryRef} className="relative">
          <label className="text-sm font-medium text-foreground mb-2 block">🌍 {t.clinicCountry}</label>
          <button
            type="button"
            onClick={() => setShowCountryDropdown(v => !v)}
            className="w-full h-12 flex items-center justify-between px-4 border border-input rounded-md bg-background text-sm text-left focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span className={formData.clinic_country ? 'text-foreground' : 'text-muted-foreground'}>
              {formData.clinic_country || 'Select country...'}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
          {showCountryDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-border flex items-center gap-2 bg-slate-50">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  autoFocus
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  placeholder="Search country..."
                  className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <ul className="max-h-56 overflow-y-auto">
                {filteredCountries().length === 0 ? (
                  <li className="px-4 py-3 text-sm text-muted-foreground text-center">
                    No countries found
                  </li>
                ) : (
                  filteredCountries().map(country => (
                    <li
                      key={country}
                      onClick={() => handleSelectCountry(country)}
                      className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors ${formData.clinic_country === country ? 'bg-blue-50 text-blue-700 font-medium' : 'text-foreground'}`}
                    >
                      {country}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Clinic City */}
        <div ref={cityRef} className="relative">
          <label className="text-sm font-medium text-foreground mb-2 block">📍 Clinic City</label>
          <button
            type="button"
            onClick={() => setShowCityDropdown(v => !v)}
            className="w-full h-12 flex items-center justify-between px-4 border border-input rounded-md bg-background text-sm text-left focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            disabled={!formData.clinic_country}
          >
            <span className={formData.clinic_city ? 'text-foreground' : 'text-muted-foreground'}>
              {formData.clinic_city || 'Select a city'}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
          {showCityDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-border flex items-center gap-2 bg-slate-50">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  autoFocus
                  value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                  placeholder="Search city..."
                  className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <ul className="max-h-56 overflow-y-auto">
                {filteredCities().length === 0 ? (
                  <li className="px-4 py-3 text-sm text-muted-foreground text-center">
                    {formData.clinic_country ? 'No cities found' : 'Select a country first'}
                  </li>
                ) : (
                  filteredCities().map(city => (
                    <li
                      key={city}
                      onClick={() => handleSelectCity(city)}
                      className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors ${formData.clinic_city === city ? 'bg-blue-50 text-blue-700 font-medium' : 'text-foreground'}`}
                    >
                      {city}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Clinic Name (Optional) */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">🏥 {t.clinicName}</label>
          <Input
            placeholder="Smile Care Clinic"
            value={formData.clinic_name}
            onChange={(e) => handleChange('clinic_name', e.target.value)}
            className="h-12 text-base"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">🎓 Professional Background</label>
          <Input
            placeholder="Education, certifications, board memberships"
            value={formData.professional_background}
            onChange={(e) => handleChange('professional_background', e.target.value)}
            className="h-12 text-base"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">⭐ Years of Experience</label>
          <Input
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
        onClick={onNext}
        disabled={!canProceed}
        className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white gap-2"
      >
        {t.next} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}