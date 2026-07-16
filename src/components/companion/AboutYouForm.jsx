import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ACCOUNT_TYPES } from './AccountTypeSelector';

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
          <Input
            id="country"
            data-testid="companion-country"
            list="companion-countries"
            value={formData.country || ''}
            onChange={(e) => onInputChange('country', e.target.value)}
            placeholder="Select your country"
            className="py-6"
          />
          <datalist id="companion-countries">
            {COUNTRIES.map(country => (
              <option key={country} value={country} />
            ))}
          </datalist>
        </div>
        <FormField
          id="city"
          label="City"
          value={formData.city}
          onChange={onInputChange}
          placeholder="Port of Spain"
        />
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