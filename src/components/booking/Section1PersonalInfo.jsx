import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { translations } from '@/lib/translations';
import { useIpGeolocation } from '@/hooks/useIpGeolocation';
import PassportVaultSection from './PassportVaultSection';
import CityOriginSelect from './CityOriginSelect';
import { NATIONALITIES as nationalities } from '@/lib/nationalities';
import { ShieldAlert } from 'lucide-react';
import { isMinorAge, isValidGuardianContact } from '@/lib/guardianGate';

// 1–100 so a patient under 18 can be stated truthfully — that is what triggers
// the hard guardian gate below (a minor must never be silently treated as an adult).
const ages = Array.from({ length: 100 }, (_, i) => String(i + 1));
const heights = ['Under 140cm','140–150cm','151–160cm','161–170cm','171–180cm','181–190cm','191cm+'];
const weights = ['Under 50kg','50–60kg','61–70kg','71–80kg','81–90kg','91–100kg','101–120kg','121kg+'];

function kgToLbs(kg) {
  const range = kg.split('–');
  if (range.length === 2) {
    const lbsMin = Math.round(parseInt(range[0]) * 2.20462);
    const lbsMax = Math.round(parseInt(range[1]) * 2.20462);
    return `${lbsMin}–${lbsMax}lbs`;
  }
  const lbs = Math.round(parseInt(kg) * 2.20462);
  return `${lbs}lbs`;
}

export default function Section1PersonalInfo({ form, update, language = 'en', showValidation = false, setShowValidation }) {
  const resetValidation = () => { if (setShowValidation) setShowValidation(false); };
  const [weightUnit, setWeightUnit] = useState('kg');
  const [nationalitySearch, setNationalitySearch] = useState('');
  const { country: ipCountry } = useIpGeolocation();

  // Country name → nationality adjective map for auto-fill
  const COUNTRY_TO_NATIONALITY = {
    'United States': 'American', 'United Kingdom': 'British', 'Canada': 'Canadian',
    'Australia': 'Australian', 'New Zealand': 'New Zealander', 'Germany': 'German',
    'France': 'French', 'Spain': 'Spanish', 'Italy': 'Italian', 'Portugal': 'Portuguese',
    'Brazil': 'Brazilian', 'Mexico': 'Mexican', 'Colombia': 'Colombian',
    'Venezuela': 'Venezuelan', 'Argentina': 'Argentine', 'Peru': 'Peruvian',
    'Chile': 'Chilean', 'Ecuador': 'Ecuadorian', 'Panama': 'Panamanian',
    'Costa Rica': 'Costa Rican', 'Dominican Republic': 'Dominican',
    'Trinidad and Tobago': 'Trinidad and Tobago', 'Jamaica': 'Jamaican',
    'Barbados': 'Barbadian', 'Guyana': 'Guyanese', 'Haiti': 'Haitian',
    'India': 'Indian', 'China': 'Chinese', 'Japan': 'Japanese',
    'South Korea': 'South Korean', 'Philippines': 'Filipino', 'Thailand': 'Thai',
    'Vietnam': 'Vietnamese', 'Indonesia': 'Indonesian', 'Malaysia': 'Malaysian',
    'Nigeria': 'Nigerian', 'Ghana': 'Ghanaian', 'Kenya': 'Kenyan',
    'South Africa': 'South African', 'Egypt': 'Egyptian', 'Morocco': 'Moroccan',
    'Turkey': 'Turkish', 'Saudi Arabia': 'Saudi', 'UAE': 'Emirati',
    'Netherlands': 'Dutch', 'Belgium': 'Belgian', 'Switzerland': 'Swiss',
    'Sweden': 'Swedish', 'Norway': 'Norwegian', 'Denmark': 'Danish',
    'Poland': 'Polish', 'Russia': 'Russian', 'Ukraine': 'Ukrainian',
    'Ireland': 'Irish', 'Israel': 'Israeli', 'Pakistan': 'Pakistani',
    'Bangladesh': 'Bangladeshi', 'Sri Lanka': 'Sri Lankan', 'Nepal': 'Nepalese',
  };

  // Auto-populate Country of Origin and ip_country_origin once on mount
  useEffect(() => {
    if (!ipCountry) return;
    if (!form.ip_country_origin) update('ip_country_origin', ipCountry);
    // Auto-fill nationality dropdown if not already set
    if (!form.nationality) {
      const matched = COUNTRY_TO_NATIONALITY[ipCountry]
        || nationalities.find(n => n.toLowerCase() === ipCountry.toLowerCase())
        || null;
      if (matched) update('nationality', matched);
    }
  }, [ipCountry]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">👤</span>
        <h3 className="font-display text-lg text-foreground">{translations[language].personalInformation}</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">{translations[language].basicInformation}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label>{translations[language].fullName} <span className="text-destructive">*</span></Label>
          <Input value={form.patient_name} onChange={e => { update('patient_name', e.target.value); resetValidation(); }} placeholder={translations[language].yourFullName} className={`mt-1.5 ${showValidation && !form.patient_name ? 'border-red-400' : ''}`} />
          {showValidation && !form.patient_name && <p className="text-xs text-red-500 mt-1">Full name is required</p>}
        </div>

        <div>
          <Label>{translations[language].age}</Label>
          <Select value={form.age} onValueChange={v => update('age', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder={translations[language].selectAge} /></SelectTrigger>
            <SelectContent>{ages.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div>
          <Label>{translations[language].gender}</Label>
          <Select value={form.gender} onValueChange={v => update('gender', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder={translations[language].selectGender} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">{translations[language].male}</SelectItem>
              <SelectItem value="female">{translations[language].female}</SelectItem>
              <SelectItem value="prefer_not">{translations[language].preferNotToSay}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>{translations[language].height}</Label>
          <Select value={form.height} onValueChange={v => update('height', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder={translations[language].selectHeight} /></SelectTrigger>
            <SelectContent>{heights.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label>{translations[language].weight}</Label>
            <div className="flex gap-1 bg-secondary rounded-md p-0.5">
              <Button
                size="sm"
                variant={weightUnit === 'kg' ? 'default' : 'ghost'}
                className="h-6 px-2 text-xs"
                onClick={() => setWeightUnit('kg')}
              >
                kg
              </Button>
              <Button
                size="sm"
                variant={weightUnit === 'lbs' ? 'default' : 'ghost'}
                className="h-6 px-2 text-xs"
                onClick={() => setWeightUnit('lbs')}
              >
                lbs
              </Button>
            </div>
          </div>
          <Select value={form.weight} onValueChange={v => update('weight', v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={translations[language].selectWeight} />
            </SelectTrigger>
            <SelectContent>
              {weights.map(w => (
                <SelectItem key={w} value={w}>
                  {weightUnit === 'kg' ? w : kgToLbs(w)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Country of Origin <span className="text-destructive">*</span></Label>
          <Select value={form.nationality} onValueChange={v => { update('nationality', v); setNationalitySearch(''); }}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select or type country" />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <Input 
                  placeholder="Type to search..." 
                  value={nationalitySearch}
                  onChange={e => setNationalitySearch(e.target.value.toLowerCase())}
                  className="h-8 mb-2"
                />
              </div>
              {nationalities.filter(n => n.toLowerCase().includes(nationalitySearch)).map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>City of Origin <span className="text-destructive">*</span></Label>
          <CityOriginSelect
            value={form.client_city || ''}
            onChange={v => update('client_city', v)}
            selectedCountry={form.nationality}
          />
        </div>

        <div>
          <Label>{translations[language].emergencyContactName} <span className="text-destructive">*</span></Label>
          <Input value={form.emergency_contact_name} onChange={e => { update('emergency_contact_name', e.target.value); resetValidation(); }} placeholder={translations[language].contactName} className={`mt-1.5 ${showValidation && !form.emergency_contact_name ? 'border-red-400' : ''}`} />
          {showValidation && !form.emergency_contact_name && <p className="text-xs text-red-500 mt-1">Emergency contact name is required</p>}
        </div>

        <div>
          <Label>{translations[language].emergencyContactNumber} <span className="text-destructive">*</span></Label>
          <Input value={form.emergency_contact_number} onChange={e => { update('emergency_contact_number', e.target.value); resetValidation(); }} placeholder={translations[language].phoneNumber} className={`mt-1.5 ${showValidation && !form.emergency_contact_number ? 'border-red-400' : ''}`} />
          {showValidation && !form.emergency_contact_number && <p className="text-xs text-red-500 mt-1">Emergency contact number is required</p>}
        </div>

        <div className="sm:col-span-2">
          <Label>{translations[language].email} <span className="text-destructive">*</span></Label>
          <Input type="email" value={form.email} onChange={e => { update('email', e.target.value); resetValidation(); }} placeholder={translations[language].yourEmail} className={`mt-1.5 ${showValidation && !form.email ? 'border-red-400' : ''}`} />
          {showValidation && !form.email && <p className="text-xs text-red-500 mt-1">Email is required</p>}
        </div>

        <div className="sm:col-span-2">
          <Label>{translations[language].phone} <span className="text-destructive">*</span></Label>
          <Input value={form.phone} onChange={e => { update('phone', e.target.value); resetValidation(); }} placeholder={translations[language].phoneNumber} className={`mt-1.5 ${showValidation && !form.phone ? 'border-red-400' : ''}`} />
          {showValidation && !form.phone && <p className="text-xs text-red-500 mt-1">Phone number is required</p>}
        </div>
      </div>

      {/* Procedure Destination — auto-populated from Procedures page */}
      {(form.procedure_country || form.procedure_city) && (
        <div className="sm:col-span-2 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <span className="text-base">📍</span>
          <div>
            <p className="text-xs font-semibold text-emerald-800">Procedure Destination</p>
            <p className="text-xs text-emerald-700">
              {form.procedure_city && <span>{form.procedure_city}, </span>}
              {form.procedure_country} <span className="text-emerald-500">(auto-filled from your doctor selection)</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Under-18 HARD guardian gate (M Principle) ──────────────────────────
          Shown the moment a minor age is stated. Booking cannot advance past this
          step (see canNext in Booking.jsx) and cannot submit (re-derived
          server-side by validateGuardianRequirement) until a guardian name + a
          valid contact are captured. This is a block, not a soft flag. */}
      {isMinorAge(form.age) && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">A parent or guardian must be part of this journey</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Because the patient is under 18, we cannot plan or book any care without a parent or guardian.
                They will be included in every confirmation and consent step. This is a safety requirement and cannot be skipped.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Parent / guardian full name <span className="text-destructive">*</span></Label>
              <Input
                value={form.guardian_name || ''}
                onChange={e => { update('guardian_name', e.target.value); resetValidation(); }}
                placeholder="Full name"
                className={`mt-1.5 ${showValidation && !form.guardian_name ? 'border-red-400' : ''}`}
              />
            </div>
            <div>
              <Label>Guardian phone or email <span className="text-destructive">*</span></Label>
              <Input
                value={form.guardian_contact || ''}
                onChange={e => { update('guardian_contact', e.target.value); resetValidation(); }}
                placeholder="Phone or email"
                className={`mt-1.5 ${showValidation && !isValidGuardianContact(form.guardian_contact) ? 'border-red-400' : ''}`}
              />
              {form.guardian_contact && !isValidGuardianContact(form.guardian_contact) && (
                <p className="text-xs text-red-500 mt-1">Enter a valid phone number or email.</p>
              )}
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.guardian_consent}
              onChange={e => update('guardian_consent', e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs text-amber-800 leading-relaxed">
              I confirm I am, or am acting with, the patient’s parent / legal guardian, and this guardian consents to and
              will be involved in every step of this care journey. <span className="text-destructive">*</span>
            </span>
          </label>
        </div>
      )}

      {/* Passport Vault + Visa Matrix */}
      <PassportVaultSection form={form} update={update} ipCountry={ipCountry} />
    </div>
  );
}