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
import { Loader2, CheckSquare, Square } from 'lucide-react';
import SectionDietaryAllergy from '@/components/booking/SectionDietaryAllergy';
import SectionClinicalBoundary from '@/components/booking/SectionClinicalBoundary';
import SectionAgeCompanion from '@/components/booking/SectionAgeCompanion';
import SectionLinguisticCultural from '@/components/booking/SectionLinguisticCultural';
import { procedures } from '@/components/booking/SectionProcedure';

const NATIONALITIES = ['Afghan','Albanian','Algerian','American','Andorran','Angolan','Argentine','Armenian','Australian','Austrian','Azerbaijani','Bahamian','Bahraini','Bangladeshi','Barbadian','Belarusian','Belgian','Belizean','Bolivian','Bosnian','Botswanan','Brazilian','British','Bruneian','Bulgarian','Cambodian','Cameroonian','Canadian','Cape Verdean','Chilean','Chinese','Colombian','Congolese','Costa Rican','Croatian','Cuban','Cypriot','Czech','Danish','Dominican','Dutch','Ecuadorian','Egyptian','Emirati','Estonian','Ethiopian','Fijian','Filipino','Finnish','French','German','Ghanaian','Greek','Guatemalan','Haitian','Honduran','Hungarian','Indian','Indonesian','Iranian','Iraqi','Irish','Israeli','Italian','Jamaican','Japanese','Jordanian','Kazakhstani','Kenyan','Kuwaiti','Latvian','Lebanese','Libyan','Lithuanian','Malaysian','Maldivian','Maltese','Mexican','Moldovan','Moroccan','Namibian','Nepalese','New Zealander','Nicaraguan','Nigerian','Norwegian','Omani','Pakistani','Palestinian','Panamanian','Paraguayan','Peruvian','Polish','Portuguese','Qatari','Romanian','Russian','Rwandan','Saudi','Senegalese','Serbian','Singaporean','Slovak','Slovenian','Somali','South African','South Korean','Spanish','Sri Lankan','Swedish','Swiss','Syrian','Taiwanese','Tanzanian','Thai','Trinidadian','Turkish','Ukrainian','Uruguayan','Venezuelan','Vietnamese','Zambian','Zimbabwean','Other'];

const DESTINATION_COUNTRIES = [
  'Venezuela', 'Mexico', 'Colombia', 'Costa Rica', 'Dominican Republic',
  'Panama', 'Argentina', 'Brazil', 'Thailand', 'Turkey', 'India',
  'Spain', 'Portugal', 'Hungary', 'Poland', 'Other'
];

const MEDICAL_CONDITIONS = [
  'Diabetes', 'High Blood Pressure', 'Heart Disease', 'Asthma',
  'Thyroid Disorder', 'Kidney Disease', 'Liver Disease', 'Cancer (current/previous)',
  'HIV/AIDS', 'Autoimmune Disease', 'Epilepsy / Seizures', 'Blood Clotting Disorder',
  'Obesity / BMI over 35', 'Sleep Apnea', 'GERD / Acid Reflux'
];

const ALLERGIES = [
  'Penicillin / Antibiotics', 'Aspirin / NSAIDs', 'Sulfa Drugs',
  'Latex', 'Iodine / Contrast Dye', 'Local Anesthesia', 'General Anesthesia',
  'Food Allergies (nuts, shellfish, etc.)', 'Codeine / Opioids'
];

const MEDICATIONS = [
  'Blood Thinners (Warfarin, Eliquis, etc.)', 'Blood Pressure Medication',
  'Diabetes Medication / Insulin', 'Cholesterol Medication (Statins)',
  'Thyroid Medication', 'Antidepressants', 'Anxiety / Sleep Medication',
  'Birth Control / Hormones', 'Steroids / Immunosuppressants', 'Herbal Supplements'
];

// Simple checkbox group
function CheckboxGroup({ label, options, selected, onChange, noneOption = 'None of the above' }) {
  const toggle = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected.filter(s => s !== noneOption), opt]);
    }
  };
  const toggleNone = () => {
    if (selected.includes(noneOption)) {
      onChange([]);
    } else {
      onChange([noneOption]);
    }
  };
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="grid sm:grid-cols-2 gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${selected.includes(opt) ? 'border-primary bg-primary/8 text-primary font-medium' : 'border-border hover:border-primary/40 text-foreground'}`}
          >
            {selected.includes(opt) ? <CheckSquare className="w-4 h-4 shrink-0 text-primary" /> : <Square className="w-4 h-4 shrink-0 text-muted-foreground" />}
            {opt}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleNone}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-all sm:col-span-2 ${selected.includes(noneOption) ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium' : 'border-border hover:border-emerald-300 text-foreground'}`}
        >
          {selected.includes(noneOption) ? <CheckSquare className="w-4 h-4 shrink-0 text-emerald-600" /> : <Square className="w-4 h-4 shrink-0 text-muted-foreground" />}
          {noneOption}
        </button>
      </div>
    </div>
  );
}

export default function ConsultationForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nationalitySearch, setNationalitySearch] = useState('');

  const [showValidation, setShowValidation] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_country: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    procedure_country: '',
    procedure_interest: '',
    consultation_summary: '',
    preferred_date: '',
    return_date: '',
    number_of_companions: '0',
    medical_conditions: [],
    allergies: [],
    takes_medications: 'no',
    medication_types: [],
    smoking_status: 'Never',
    alcohol_use: 'None',
    anesthesia_history: 'No previous anesthesia',
    pregnancy_status: 'Not Applicable',
    exercise_level: 'Moderate',
    // New fields
    date_of_birth: '',
    requires_companion: false,
    companion_requirement_reason: null,
    companion_requirement_status: 'not_required',
    waiver_action: null,
    waiver_acknowledged: false,
    declined_by: '',
    declined_relationship: '',
    declined_reason: '',
    has_food_allergies: false,
    food_allergies_details: '',
    has_medication_allergies: false,
    medication_allergies_details: '',
    dietary_restrictions: 'none',
    dietary_restrictions_details: '',
    emergency_food_reaction_plan: '',
    dietary_accuracy_acknowledged: false,
    clinical_boundary_acknowledged: false,
    clinical_boundary_acknowledged_at: null,
    clinical_boundary_version: '1.0',
    preferred_language: 'en',
    secondary_language: '',
    needs_translator: false,
    translation_contexts_needed: [],
    religious_or_modesty_considerations: '',
    communication_style_preference: 'gentle',
    companion_can_translate: false,
    companion_translation_limitations: '',
  });

  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowValidation(true);
    if (!formData.client_name || !formData.client_email || !formData.procedure_interest) {
      setError('Please fill in all required fields (Name, Email, Procedure).');
      return;
    }
    if (!formData.date_of_birth) {
      setError('Please enter your date of birth.');
      return;
    }
    if (!formData.clinical_boundary_acknowledged) {
      setError('Please acknowledge the Care Coordination Agreement before submitting.');
      return;
    }
    if (!formData.dietary_accuracy_acknowledged) {
      setError('Please confirm the accuracy of your dietary and allergy information.');
      return;
    }
    if (formData.has_food_allergies && !formData.food_allergies_details) {
      setError('Please describe your food allergies.');
      return;
    }
    if (formData.has_medication_allergies && !formData.medication_allergies_details) {
      setError('Please describe your medication allergies.');
      return;
    }
    if (formData.waiver_action === 'decline' && (!formData.waiver_acknowledged || !formData.declined_by)) {
      setError('Please complete the companion preference acknowledgement.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const medConditions = formData.medical_conditions.filter(c => c !== 'None of the above');
      const allergies = formData.allergies.filter(a => a !== 'No known allergies');
      const meds = formData.medication_types.filter(m => m !== 'None / Not currently taking medication');

      const newConsultation = await base44.entities.Consultation.create({
        patient_name: formData.client_name,
        email: formData.client_email,
        phone: formData.client_phone,
        client_country: formData.client_country,
        nationality: formData.client_country,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_number: formData.emergency_contact_number,
        destination_country: formData.procedure_country,
        procedure_country: formData.procedure_country,
        procedure_interest: formData.procedure_interest,
        notes: formData.consultation_summary,
        preferred_date: formData.preferred_date,
        return_date: formData.return_date,
        number_of_companions: parseInt(formData.number_of_companions) || 0,
        has_companion: (parseInt(formData.number_of_companions) || 0) > 0,
        medical_conditions: medConditions,
        allergies: allergies,
        takes_medications: formData.takes_medications === 'yes',
        medication_types: meds,
        lifestyle_habits: [formData.smoking_status !== 'Never' ? `Smoker (${formData.smoking_status})` : null, formData.alcohol_use !== 'None' ? `Alcohol (${formData.alcohol_use})` : null].filter(Boolean),
        anesthesia_complications: formData.anesthesia_history === 'Yes – had complications',
        anesthesia_complication_types: formData.anesthesia_history === 'Yes – had complications' ? ['See notes'] : [],
        pregnancy_status: formData.pregnancy_status,
        activity_level: formData.exercise_level,
        // New privacy/safety fields
        date_of_birth: formData.date_of_birth,
        requires_companion: formData.requires_companion,
        companion_requirement_reason: formData.companion_requirement_reason,
        companion_requirement_status: formData.companion_requirement_status,
        has_food_allergies: formData.has_food_allergies,
        food_allergies_details: formData.food_allergies_details,
        has_medication_allergies: formData.has_medication_allergies,
        medication_allergies_details: formData.medication_allergies_details,
        dietary_restrictions: formData.dietary_restrictions,
        dietary_restrictions_details: formData.dietary_restrictions_details,
        emergency_food_reaction_plan: formData.emergency_food_reaction_plan,
        dietary_accuracy_acknowledged: formData.dietary_accuracy_acknowledged,
        clinical_boundary_acknowledged: formData.clinical_boundary_acknowledged,
        clinical_boundary_acknowledged_at: formData.clinical_boundary_acknowledged_at,
        clinical_boundary_version: formData.clinical_boundary_version,
        preferred_language: formData.preferred_language,
        secondary_language: formData.secondary_language,
        needs_translator: formData.needs_translator,
        translation_contexts_needed: formData.translation_contexts_needed,
        religious_or_modesty_considerations: formData.religious_or_modesty_considerations,
        communication_style_preference: formData.communication_style_preference,
        companion_can_translate: formData.companion_can_translate,
        companion_translation_limitations: formData.companion_translation_limitations,
      });

      try {
        await base44.functions.invoke('iq200Pipeline', { action: 'create', consultation_id: newConsultation.id });
      } catch (pipelineErr) {
        console.error('IQ200 Pipeline error:', pipelineErr);
      }

      navigate('/consultation-success');
    } catch (err) {
      setError('Failed to submit consultation. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredNationalities = NATIONALITIES.filter(n => n.toLowerCase().includes(nationalitySearch.toLowerCase()));

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-display">Medical Travel Consultation</CardTitle>
            <p className="text-muted-foreground text-sm">Complete your request — all information is confidential. Just tap to select.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

              {/* ── Section 1: Personal Info ── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <span className="text-lg">👤</span>
                  <h3 className="font-semibold text-base">Personal Information</h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Full Name <span className="text-destructive">*</span></Label>
                    <Input value={formData.client_name} onChange={e => update('client_name', e.target.value)} placeholder="As it appears on your passport" className="mt-1.5" required />
                  </div>
                  <div>
                    <Label>Email <span className="text-destructive">*</span></Label>
                    <Input type="email" value={formData.client_email} onChange={e => update('client_email', e.target.value)} placeholder="your@email.com" className="mt-1.5" required />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input value={formData.client_phone} onChange={e => update('client_phone', e.target.value)} placeholder="+1 (555) 000-0000" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Country of Origin <span className="text-destructive">*</span></Label>
                    <Select value={formData.client_country} onValueChange={v => { update('client_country', v); setNationalitySearch(''); }}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select your country" /></SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input placeholder="Search country..." value={nationalitySearch} onChange={e => setNationalitySearch(e.target.value)} className="h-8 mb-1" />
                        </div>
                        {filteredNationalities.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Procedure Destination <span className="text-destructive">*</span></Label>
                    <Select value={formData.procedure_country} onValueChange={v => update('procedure_country', v)}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Where do you want treatment?" /></SelectTrigger>
                      <SelectContent>
                        {DESTINATION_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Emergency Contact Name</Label>
                    <Input value={formData.emergency_contact_name} onChange={e => update('emergency_contact_name', e.target.value)} placeholder="Full name" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Emergency Contact Phone</Label>
                    <Input value={formData.emergency_contact_number} onChange={e => update('emergency_contact_number', e.target.value)} placeholder="+1 (555) 000-0000" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Number of Companions</Label>
                    <Select value={formData.number_of_companions} onValueChange={v => update('number_of_companions', v)}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Travelling alone</SelectItem>
                        <SelectItem value="1">1 companion</SelectItem>
                        <SelectItem value="2">2 companions</SelectItem>
                        <SelectItem value="3">3 companions</SelectItem>
                        <SelectItem value="4">4 companions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* ── Section 2: Procedure ── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <span className="text-lg">🩺</span>
                  <h3 className="font-semibold text-base">Procedure & Travel Dates</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Procedure of Interest <span className="text-destructive">*</span></Label>
                    <Select value={formData.procedure_interest} onValueChange={v => update('procedure_interest', v)}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a procedure..." /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {procedures.map((proc) => (
                          <SelectItem key={proc.value} value={proc.value}>{proc.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Preferred Arrival Date</Label>
                    <Input type="date" value={formData.preferred_date} onChange={e => update('preferred_date', e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Estimated Return Date</Label>
                    <Input type="date" value={formData.return_date} onChange={e => update('return_date', e.target.value)} className="mt-1.5" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Goals & Expectations <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Textarea value={formData.consultation_summary} onChange={e => update('consultation_summary', e.target.value)} placeholder="Briefly describe what you're hoping to achieve..." className="mt-1.5 h-20" />
                  </div>
                </div>
              </div>

              {/* ── Section 3: Medical History ── */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <span className="text-lg">🏥</span>
                  <h3 className="font-semibold text-base">Medical History</h3>
                </div>

                <CheckboxGroup
                  label="Do you have any of these medical conditions?"
                  options={MEDICAL_CONDITIONS}
                  selected={formData.medical_conditions}
                  onChange={v => update('medical_conditions', v)}
                  noneOption="None of the above"
                />

                <CheckboxGroup
                  label="Do you have any known allergies?"
                  options={ALLERGIES}
                  selected={formData.allergies}
                  onChange={v => update('allergies', v)}
                  noneOption="No known allergies"
                />

                <div>
                  <Label>Are you currently taking any medications?</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {['no', 'yes'].map(v => (
                      <button key={v} type="button" onClick={() => update('takes_medications', v)}
                        className={`py-3 rounded-xl border text-sm font-medium transition-all ${formData.takes_medications === v ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'}`}>
                        {v === 'yes' ? '✅ Yes' : '🚫 No'}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.takes_medications === 'yes' && (
                  <CheckboxGroup
                    label="Which type(s) of medication?"
                    options={MEDICATIONS}
                    selected={formData.medication_types}
                    onChange={v => update('medication_types', v)}
                    noneOption="None / Not currently taking medication"
                  />
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Smoking Status</Label>
                    <Select value={formData.smoking_status} onValueChange={v => update('smoking_status', v)}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Never">🚭 Never smoked</SelectItem>
                        <SelectItem value="Former">🕐 Former smoker</SelectItem>
                        <SelectItem value="Light">🚬 Light smoker</SelectItem>
                        <SelectItem value="Heavy">🚬🚬 Heavy smoker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Alcohol Use</Label>
                    <Select value={formData.alcohol_use} onValueChange={v => update('alcohol_use', v)}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">🚫 None</SelectItem>
                        <SelectItem value="Occasional">🍷 Occasional (weekends)</SelectItem>
                        <SelectItem value="Moderate">🥂 Moderate (weekly)</SelectItem>
                        <SelectItem value="Heavy">🍺 Heavy (daily)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Anesthesia History</Label>
                    <Select value={formData.anesthesia_history} onValueChange={v => update('anesthesia_history', v)}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No previous anesthesia">No previous anesthesia</SelectItem>
                        <SelectItem value="Yes – no issues">Yes – no problems</SelectItem>
                        <SelectItem value="Yes – had complications">Yes – had complications</SelectItem>
                        <SelectItem value="Unsure">Unsure / Can't remember</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Exercise Level</Label>
                    <Select value={formData.exercise_level} onValueChange={v => update('exercise_level', v)}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sedentary">🛋️ Sedentary (little/no exercise)</SelectItem>
                        <SelectItem value="Light">🚶 Light (1–2x/week)</SelectItem>
                        <SelectItem value="Moderate">🏃 Moderate (3–4x/week)</SelectItem>
                        <SelectItem value="Active">💪 Very Active (daily)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Pregnancy Status</Label>
                    <Select value={formData.pregnancy_status} onValueChange={v => update('pregnancy_status', v)}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Applicable">Not applicable</SelectItem>
                        <SelectItem value="Pregnant">Currently pregnant</SelectItem>
                        <SelectItem value="Trying">Trying to conceive</SelectItem>
                        <SelectItem value="Breastfeeding">Currently breastfeeding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* ── Section 4: Dietary & Allergy ── */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <span className="text-lg">🍽️</span>
                  <h3 className="font-semibold text-base">Dietary & Allergy Information</h3>
                </div>
                <SectionDietaryAllergy form={formData} update={update} showValidation={showValidation} />
              </div>

              {/* ── Section 5: Age & Companion ── */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <span className="text-lg">👥</span>
                  <h3 className="font-semibold text-base">Date of Birth & Travel Companion</h3>
                </div>
                <SectionAgeCompanion form={formData} update={update} showValidation={showValidation} />
              </div>

              {/* ── Section 6: Linguistic & Cultural ── */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <span className="text-lg">🌐</span>
                  <h3 className="font-semibold text-base">Language & Cultural Preferences</h3>
                </div>
                <SectionLinguisticCultural form={formData} update={update} />
              </div>

              {/* ── Section 7: Clinical Boundary ── */}
              <SectionClinicalBoundary form={formData} update={update} showValidation={showValidation} />

              <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Submitting...' : '✨ Submit My Consultation Request'}
              </Button>

              <p className="text-center text-xs text-muted-foreground">🔒 Your information is 100% confidential and HIPAA compliant.</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}