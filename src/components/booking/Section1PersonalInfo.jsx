import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { translations } from '@/lib/translations';
import { useIpGeolocation } from '@/hooks/useIpGeolocation';
import PassportVaultSection from './PassportVaultSection';

const ages = Array.from({ length: 83 }, (_, i) => String(i + 18));
const heights = ['Under 140cm','140–150cm','151–160cm','161–170cm','171–180cm','181–190cm','191cm+'];
const weights = ['Under 50kg','50–60kg','61–70kg','71–80kg','81–90kg','91–100kg','101–120kg','121kg+'];
const nationalities = ['Afghan','Albanian','Algerian','American','Andorran','Angolan','Antiguans','Argentine','Armenian','Australian','Austrian','Azerbaijani','Bahamian','Bahraini','Bangladeshi','Barbadian','Belarusian','Belgian','Belizean','Beninese','Bhutanese','Bolivian','Bosnian','Botswanan','Brazilian','British','Bruneian','Bulgarian','Burkinabe','Burmese','Burundian','Cambodian','Cameroonian','Canadian','Cape Verdean','Central African','Chadian','Chilean','Chinese','Colombian','Comoran','Congolese','Costa Rican','Croatian','Cuban','Cypriot','Czech','Danish','Djiboutian','Dominican','Dutch','East Timorese','Ecuadorian','Egyptian','Emirati','Equatorial Guinean','Eritrean','Estonian','Ethiopian','Fijian','Filipino','Finnish','French','Gabonese','Gambian','Georgian','German','Ghanaian','Greek','Grenadian','Guatemalan','Guinean','Guinea-Bissauan','Guyanese','Haitian','Herzegovinian','Honduran','Hungarian','Icelander','Indian','Indonesian','Iranian','Iraqi','Irish','Israeli','Italian','Ivorian','Jamaican','Japanese','Jordanian','Kazakhstani','Kenyan','Kittitian','Kuwaiti','Kyrgyzstani','Laotian','Latvian','Lebanese','Lesothan','Liberian','Libyan','Liechtensteiner','Lithuanian','Luxembourger','Macedonian','Malagasy','Malawian','Malaysian','Maldivian','Malian','Maltese','Marshallese','Martiniquais','Mauritanian','Mauritian','Mexican','Micronesian','Moldovan','Monacan','Mongolian','Montenegrin','Moroccan','Mozambican','Namibian','Nauruan','Nepalese','New Zealander','Nicaraguan','Nigerian','Nigerien','North Korean','Northern Irish','Norwegian','Omani','Pakistani','Palauan','Palestinian','Panamanian','Papua New Guinean','Paraguayan','Peruvian','Polish','Portuguese','Qatari','Romanian','Russian','Rwandan','Saint Kitts','Saint Lucian','Saint Vincentian','Salvadoran','Samoan','San Marinese','Sao Tomean','Saudi','Scottish','Senegalese','Serbian','Seychellois','Sierra Leonean','Singaporean','Slovak','Slovenian','Solomon Islander','Somali','South African','South Korean','South Sudanese','Spanish','Sri Lankan','Sudanese','Surinamese','Swedish','Swiss','Syrian','Taiwanese','Tajikistani','Tanzanian','Thai','Togolese','Trinidadian','Turkish','Turkmen','Tuvaluan','Ugandan','Ukrainian','Uruguayan','Uzbek','Vanuatuan','Vatican','Venezuelan','Vietnamese','Welsh','Yemenite','Zambian','Zimbabwean','Other'];

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

export default function Section1PersonalInfo({ form, update, language = 'en' }) {
  const [weightUnit, setWeightUnit] = useState('kg');
  const [nationalitySearch, setNationalitySearch] = useState('');
  const { country: ipCountry } = useIpGeolocation();

  // Auto-populate ip_country_origin once on mount
  useEffect(() => {
    if (ipCountry && !form.ip_country_origin) {
      update('ip_country_origin', ipCountry);
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
          <Input value={form.patient_name} onChange={e => update('patient_name', e.target.value)} placeholder={translations[language].yourFullName} className="mt-1.5" />
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
          <Input
            value={form.client_city || ''}
            onChange={e => update('client_city', e.target.value)}
            placeholder="e.g. Denver, Miami, Toronto"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>{translations[language].emergencyContactName} <span className="text-destructive">*</span></Label>
          <Input value={form.emergency_contact_name} onChange={e => update('emergency_contact_name', e.target.value)} placeholder={translations[language].contactName} className="mt-1.5" />
        </div>

        <div>
          <Label>{translations[language].emergencyContactNumber} <span className="text-destructive">*</span></Label>
          <Input value={form.emergency_contact_number} onChange={e => update('emergency_contact_number', e.target.value)} placeholder={translations[language].phoneNumber} className="mt-1.5" />
        </div>

        <div className="sm:col-span-2">
          <Label>{translations[language].email} <span className="text-destructive">*</span></Label>
          <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder={translations[language].yourEmail} className="mt-1.5" />
        </div>

        <div className="sm:col-span-2">
          <Label>{translations[language].phone} <span className="text-destructive">*</span></Label>
          <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder={translations[language].phoneNumber} className="mt-1.5" />
        </div>
      </div>

      {/* Procedure Destination — auto-populated from Procedures page */}
      {form.procedure_country && (
        <div className="sm:col-span-2 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <span className="text-base">📍</span>
          <div>
            <p className="text-xs font-semibold text-emerald-800">Procedure Destination</p>
            <p className="text-xs text-emerald-700">{form.procedure_country} <span className="text-emerald-500">(auto-filled from your procedure selection)</span></p>
          </div>
        </div>
      )}

      {/* Passport Vault + Visa Matrix */}
      <PassportVaultSection form={form} update={update} ipCountry={ipCountry} />
    </div>
  );
}