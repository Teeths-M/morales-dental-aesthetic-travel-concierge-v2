import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ACCOUNT_TYPES } from './AccountTypeSelector';
import SearchSelect from '@/components/ui-system/SearchSelect';
import { getCitiesForCountry, hasCityList, cityAfterCountryChange, CITY_PLACEHOLDER } from '@/lib/countryCity';

const COUNTRIES = [
  'Trinidad and Tobago', 'Jamaica', 'Barbados', 'Bahamas', 'Guyana', 'Dominican Republic', 'Puerto Rico', 'Cuba', 'Haiti', 'Saint Lucia', 'Grenada', 'Antigua and Barbuda', 'Dominica', 'Saint Vincent and the Grenadines', 'Saint Kitts and Nevis', 'Aruba', 'Curacao', 'Cayman Islands', 'Turks and Caicos', 'British Virgin Islands', 'US Virgin Islands',
  'United States', 'Canada', 'Mexico',
  'Costa Rica', 'Panama', 'Guatemala', 'Belize', 'Honduras', 'El Salvador', 'Nicaragua',
  'Colombia', 'Brazil', 'Argentina', 'Chile', 'Peru', 'Ecuador', 'Uruguay', 'Paraguay', 'Bolivia', 'Venezuela',
  'United Kingdom', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Portugal', 'Greece', 'Turkey', 'Poland', 'Czech Republic', 'Hungary', 'Thailand', 'India', 'Singapore', 'Malaysia', 'Philippines', 'Indonesia', 'Vietnam', 'South Korea', 'Japan', 'China', 'Taiwan', 'Hong Kong',
  'United Arab Emirates', 'Israel', 'Jordan', 'Lebanon', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain',
  'South Africa', 'Egypt', 'Morocco', 'Tunisia', 'Kenya', 'Nigeria', 'Ghana',
  'Australia', 'New Zealand', 'Fiji'
];

export function AboutYouForm({ accountType, formData, onInputChange }) {
  return (
    <div className="space-y-4">
      {accountType === ACCOUNT_TYPES.INDIVIDUAL ? (
        <FormField
          id="full_name"
          label="Your Full Name *"
          value={formData.full_name}
          onChange={onInputChange}
          placeholder="Maria Rodriguez"
          large
        />
      ) : (
        <>
          <FormField
            id="agency_name"
            label="Agency Name *"
            value={formData.agency_name}
            onChange={onInputChange}
            placeholder="Caribbean Tours & Companions"
            large
          />
          <FormField
            id="contact_person"
            label="Contact Person *"
            value={formData.contact_person}
            onChange={onInputChange}
            placeholder="Agency representative"
          />
        </>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <FormField
          id="email"
          label="Email *"
          type="email"
          value={formData.email}
          onChange={onInputChange}
          placeholder="maria@email.com"
        />
        <FormField
          id="phone"
          label="Phone Number *"
          value={formData.phone}
          onChange={onInputChange}
          placeholder="+1 (868) 123-4567"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">Where do you live? *</Label>
          <select
            id="country"
            data-testid="companion-country"
            value={formData.country || ''}
            onChange={(e) => {
              const country = e.target.value;
              onInputChange('country', country);
              // Drop a city belonging to the previous country.
              onInputChange('city', cityAfterCountryChange(country, formData.city));
            }}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          >
            <option value="">Select your country</option>
            {COUNTRIES.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          {/* Filtered to the country chosen on the left. Not strict — a
              companion in a town we don't list must still be able to type it,
              so the list accelerates entry rather than gating it. */}
          <SearchSelect
            boxed
            value={formData.city || ''}
            onChange={(v) => onInputChange('city', v)}
            options={getCitiesForCountry(formData.country)}
            disabled={!formData.country}
            testId="companion-city"
            placeholder={
              !formData.country
                ? CITY_PLACEHOLDER.noCountry
                : hasCityList(formData.country)
                  ? CITY_PLACEHOLDER.picker
                  : CITY_PLACEHOLDER.freeText
            }
          />
        </div>
      </div>
    </div>
  );
}

function FormField({ id, label, value, onChange, placeholder, type = 'text', large = false }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        data-testid={`companion-${id}`}
        type={type}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder}
        className={large ? 'text-lg py-6' : 'py-6'}
      />
    </div>
  );
}