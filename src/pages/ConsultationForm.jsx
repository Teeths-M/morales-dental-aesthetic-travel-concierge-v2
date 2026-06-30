import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckSquare, Square } from 'lucide-react';
import SectionDietaryAllergy from '@/components/booking/SectionDietaryAllergy';
import SectionClinicalBoundary from '@/components/booking/SectionClinicalBoundary';
import SectionAgeCompanion from '@/components/booking/SectionAgeCompanion';
import SectionLinguisticCultural from '@/components/booking/SectionLinguisticCultural';
import { procedures } from '@/components/booking/SectionProcedure';

const NATIONALITIES = ['Afghan','Albanian','Algerian','American','Andorran','Angolan','Argentine','Armenian','Australian','Austrian','Azerbaijani','Bahamian','Bahraini','Bangladeshi','Barbadian','Belarusian','Belgian','Belizean','Bolivian','Bosnian','Botswanan','Brazilian','British','Bruneian','Bulgarian','Cambodian','Cameroonian','Canadian','Cape Verdean','Chilean','Chinese','Colombian','Congolese','Costa Rican','Croatian','Cuban','Cypriot','Czech','Danish','Dominican','Dutch','Ecuadorian','Egyptian','Emirati','Estonian','Ethiopian','Fijian','Filipino','Finnish','French','German','Ghanaian','Greek','Guatemalan','Haitian','Honduran','Hungarian','Indian','Indonesian','Iranian','Iraqi','Irish','Israeli','Italian','Jamaican','Japanese','Jordanian','Kazakhstani','Kenyan','Kuwaiti','Latvian','Lebanese','Libyan','Lithuanian','Malaysian','Maldivian','Maltese','Mexican','Moldovan','Moroccan','Namibian','Nepalese','New Zealander','Nicaraguan','Nigerian','Norwegian','Omani','Pakistani','Palestinian','Panamanian','Paraguayan','Peruvian','Polish','Portuguese','Qatari','Romanian','Russian','Rwandan','Saudi','Senegalese','Serbian','Singaporean','Slovak','Slovenian','Somali','South African','South Korean','Spanish','Sri Lankan','Swedish','Swiss','Syrian','Taiwanese','Tanzanian','Thai','Trinidadian','Turkish','Ukrainian','Uruguayan','Venezuelan','Vietnamese','Zambian','Zimbabwean','Other'];
const DESTINATIONS = ['Venezuela','Mexico','Colombia','Costa Rica','Dominican Republic','Panama','Argentina','Brazil','Thailand','Turkey','India','Spain','Portugal','Hungary','Poland','Other'];
const MEDICAL_CONDITIONS = ['Diabetes','High Blood Pressure','Heart Disease','Asthma','Thyroid Disorder','Kidney Disease','Liver Disease','Cancer (current/previous)','HIV/AIDS','Autoimmune Disease','Epilepsy / Seizures','Blood Clotting Disorder','Obesity / BMI over 35','Sleep Apnea','GERD / Acid Reflux'];
const ALLERGIES = ['Penicillin / Antibiotics','Aspirin / NSAIDs','Sulfa Drugs','Latex','Iodine / Contrast Dye','Local Anesthesia','General Anesthesia','Food Allergies (nuts, shellfish, etc.)','Codeine / Opioids'];
const MEDICATIONS = ['Blood Thinners (Warfarin, Eliquis, etc.)','Blood Pressure Medication','Diabetes Medication / Insulin','Cholesterol Medication (Statins)','Thyroid Medication','Antidepressants','Anxiety / Sleep Medication','Birth Control / Hormones','Steroids / Immunosuppressants','Herbal Supplements'];

const GOLD = '#D4AF37';
const CARD_BG = '#0C1A1D';
const BORDER = '#2A3F4A';
const STEPS = ['Your Details', 'Your Procedure', 'Health Profile', 'Safety & Submit'];

const inp = { width: '100%', height: 44, padding: '0 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const sel = { ...inp, background: CARD_BG, cursor: 'pointer' };
const lbl = { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 6 };
const secH = { display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, marginBottom: 4, borderBottom: `1px solid ${BORDER}`, fontSize: 15, fontWeight: 700, color: '#fff' };
const g2 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 };

function CheckboxGroup({ label, options, selected, onChange, noneOption = 'None of the above' }) {
  const toggle = (opt) => selected.includes(opt) ? onChange(selected.filter(s => s !== opt)) : onChange([...selected.filter(s => s !== noneOption), opt]);
  const toggleNone = () => onChange(selected.includes(noneOption) ? [] : [noneOption]);
  return (
    <div>
      <p style={{ ...lbl, marginBottom: 10 }}>{label}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 6 }}>
        {options.map(opt => { const on = selected.includes(opt); return (
          <button key={opt} type="button" onClick={() => toggle(opt)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, fontSize: 12, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', background: on ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`, color: on ? GOLD : 'rgba(255,255,255,0.65)' }}>
            {on ? <CheckSquare size={13} color={GOLD} /> : <Square size={13} color="rgba(255,255,255,0.3)" />}{opt}
          </button>
        );})}
        {(() => { const on = selected.includes(noneOption); return (
          <button type="button" onClick={toggleNone} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, fontSize: 12, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', background: on ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`, color: on ? '#22c55e' : 'rgba(255,255,255,0.65)', gridColumn: '1 / -1' }}>
            {on ? <CheckSquare size={13} color="#22c55e" /> : <Square size={13} color="rgba(255,255,255,0.3)" />}{noneOption}
          </button>
        );})()}
      </div>
    </div>
  );
}

export default function ConsultationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stepError, setStepError] = useState(null);
  const [showValidation, setShowValidation] = useState(false);

  const [form, setForm] = useState({
    client_name: '', client_email: '', client_phone: '', client_country: '',
    emergency_contact_name: '', emergency_contact_number: '',
    procedure_country: searchParams.get('country') || '',
    procedure_interest: searchParams.get('procedure') || '',
    consultation_summary: '', preferred_date: '', return_date: '',
    number_of_companions: '0',
    medical_conditions: [], allergies: [], takes_medications: 'no', medication_types: [],
    smoking_status: 'Never', alcohol_use: 'None', anesthesia_history: 'No previous anesthesia',
    pregnancy_status: 'Not Applicable', exercise_level: 'Moderate',
    date_of_birth: '', requires_companion: false, companion_requirement_reason: null,
    companion_requirement_status: 'not_required', waiver_action: null, waiver_acknowledged: false,
    declined_by: '', declined_relationship: '', declined_reason: '',
    has_food_allergies: false, food_allergies_details: '', has_medication_allergies: false,
    medication_allergies_details: '', dietary_restrictions: 'none', dietary_restrictions_details: '',
    emergency_food_reaction_plan: '', dietary_accuracy_acknowledged: false,
    clinical_boundary_acknowledged: false, clinical_boundary_acknowledged_at: null,
    clinical_boundary_version: '1.0',
    preferred_language: 'en', secondary_language: '', needs_translator: false,
    translation_contexts_needed: [], religious_or_modesty_considerations: '',
    communication_style_preference: 'gentle', companion_can_translate: false,
    companion_translation_limitations: '',
    traveling_companion_type: 'solo', traveling_solo: true, guardian_mode_opted_in: false,
  });

  const up = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const validateStep = (n) => {
    if (n === 1 && !form.client_name) return 'Full name is required';
    if (n === 1 && !form.client_email) return 'Email address is required';
    if (n === 2 && !form.procedure_interest) return 'Please select a procedure of interest';
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) { setStepError(err); return; }
    setStepError(null);
    setStep(s => Math.min(4, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    setStepError(null);
    setStep(s => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowValidation(true);
    if (!form.client_name || !form.client_email || !form.procedure_interest) { setError('Please complete all required fields.'); return; }
    if (!form.date_of_birth) { setError('Please enter your date of birth.'); return; }
    if (!form.clinical_boundary_acknowledged) { setError('Please acknowledge the Care Coordination Agreement.'); return; }
    if (!form.dietary_accuracy_acknowledged) { setError('Please confirm your dietary information.'); return; }
    if (form.has_food_allergies && !form.food_allergies_details) { setError('Please describe your food allergies.'); return; }
    if (form.has_medication_allergies && !form.medication_allergies_details) { setError('Please describe your medication allergies.'); return; }
    if (form.waiver_action === 'decline' && (!form.waiver_acknowledged || !form.declined_by)) { setError('Please complete the companion acknowledgement.'); return; }
    setLoading(true); setError(null);
    try {
      const medConds = form.medical_conditions.filter(c => c !== 'None of the above');
      const allergs = form.allergies.filter(a => a !== 'No known allergies');
      const meds = form.medication_types.filter(m => m !== 'None / Not currently taking medication');
      const rec = await base44.entities.Consultation.create({
        patient_name: form.client_name, email: form.client_email, phone: form.client_phone,
        client_country: form.client_country, nationality: form.client_country,
        emergency_contact_name: form.emergency_contact_name, emergency_contact_number: form.emergency_contact_number,
        destination_country: form.procedure_country, procedure_country: form.procedure_country,
        procedure_interest: form.procedure_interest, notes: form.consultation_summary,
        preferred_date: form.preferred_date, return_date: form.return_date,
        number_of_companions: parseInt(form.number_of_companions) || 0,
        has_companion: (parseInt(form.number_of_companions) || 0) > 0,
        medical_conditions: medConds, allergies: allergs,
        takes_medications: form.takes_medications === 'yes', medication_types: meds,
        lifestyle_habits: [form.smoking_status !== 'Never' ? `Smoker (${form.smoking_status})` : null, form.alcohol_use !== 'None' ? `Alcohol (${form.alcohol_use})` : null].filter(Boolean),
        anesthesia_complications: form.anesthesia_history === 'Yes – had complications',
        anesthesia_complication_types: form.anesthesia_history === 'Yes – had complications' ? ['See notes'] : [],
        pregnancy_status: form.pregnancy_status, activity_level: form.exercise_level,
        date_of_birth: form.date_of_birth, requires_companion: form.requires_companion,
        companion_requirement_reason: form.companion_requirement_reason,
        companion_requirement_status: form.companion_requirement_status,
        has_food_allergies: form.has_food_allergies, food_allergies_details: form.food_allergies_details,
        has_medication_allergies: form.has_medication_allergies, medication_allergies_details: form.medication_allergies_details,
        dietary_restrictions: form.dietary_restrictions, dietary_restrictions_details: form.dietary_restrictions_details,
        emergency_food_reaction_plan: form.emergency_food_reaction_plan,
        dietary_accuracy_acknowledged: form.dietary_accuracy_acknowledged,
        clinical_boundary_acknowledged: form.clinical_boundary_acknowledged,
        clinical_boundary_acknowledged_at: form.clinical_boundary_acknowledged_at,
        clinical_boundary_version: form.clinical_boundary_version,
        preferred_language: form.preferred_language, secondary_language: form.secondary_language,
        needs_translator: form.needs_translator, translation_contexts_needed: form.translation_contexts_needed,
        religious_or_modesty_considerations: form.religious_or_modesty_considerations,
        communication_style_preference: form.communication_style_preference,
        companion_can_translate: form.companion_can_translate, companion_translation_limitations: form.companion_translation_limitations,
        traveling_companion_type: form.traveling_companion_type, traveling_solo: form.traveling_solo,
        guardian_mode_opted_in: form.guardian_mode_opted_in,
      });
      try { await base44.functions.invoke('iq200Pipeline', { action: 'create', consultation_id: rec.id }); } catch {}
      navigate('/consultation-success', { state: { consultationId: rec.id, travelingSolo: form.traveling_solo, guardianModeOptedIn: form.guardian_mode_opted_in, companionType: form.traveling_companion_type, patientName: form.client_name } });
    } catch (err) {
      setError('Failed to submit. Please try again.');
      console.error(err);
    } finally { setLoading(false); }
  };

  const activeErr = error || stepError;

  return (
    <div className="dark" style={{ minHeight: '100vh', background: '#060B16', padding: '32px 16px 64px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '32px 28px' }}>

          {searchParams.get('doctor') && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: GOLD, margin: 0 }}>Booking with Dr. {searchParams.get('doctor')}</p>
              {searchParams.get('procedure') && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>{searchParams.get('procedure')}</p>}
            </div>
          )}

          {/* Fee notice */}
          <div style={{ marginBottom: 24, padding: '14px 18px', borderRadius: 14, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>💳</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: GOLD, margin: '0 0 4px' }}>$49 Consultation Fee — Fully Credited Back</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
                This fee ensures our doctors speak only with serious patients. Once you book any procedure package, your <strong style={{ color: 'rgba(255,255,255,0.75)' }}>$49 is returned in full</strong> as a credit toward your package.
              </p>
            </div>
          </div>

          {/* Step header + progress bar */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: GOLD, textTransform: 'uppercase', marginBottom: 4 }}>Step {step} of 4</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>{STEPS[step - 1]}</h1>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,4].map(n => (
                <div key={n} style={{ flex: 1, height: 3, borderRadius: 99, background: n <= step ? GOLD : 'rgba(255,255,255,0.12)', transition: 'background 0.35s' }} />
              ))}
            </div>
          </div>

          {activeErr && (
            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13 }}>
              {activeErr}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* ── STEP 1: Your Details ── */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={secH}><span>👤</span> Personal Information</div>
                <div>
                  <label style={lbl}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input style={inp} value={form.client_name} onChange={e => up('client_name', e.target.value)} placeholder="e.g. Sofia Morales" />
                </div>
                <div style={g2}>
                  <div>
                    <label style={lbl}>Email <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="email" style={inp} value={form.client_email} onChange={e => up('client_email', e.target.value)} placeholder="your@email.com" />
                  </div>
                  <div>
                    <label style={lbl}>Phone</label>
                    <input style={inp} value={form.client_phone} onChange={e => up('client_phone', e.target.value)} placeholder="+1 (555) 000-0000" />
                  </div>
                  <div>
                    <label style={lbl}>Country of Origin</label>
                    <select style={sel} value={form.client_country} onChange={e => up('client_country', e.target.value)}>
                      <option value="">Select country…</option>
                      {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Emergency Contact Name</label>
                    <input style={inp} value={form.emergency_contact_name} onChange={e => up('emergency_contact_name', e.target.value)} placeholder="Full name" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Emergency Contact Phone</label>
                    <input style={inp} value={form.emergency_contact_number} onChange={e => up('emergency_contact_number', e.target.value)} placeholder="+1 (555) 000-0000" />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Your Procedure ── */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={secH}><span>🩺</span> Procedure & Travel</div>
                <div>
                  <label style={lbl}>Procedure of Interest <span style={{ color: '#ef4444' }}>*</span></label>
                  <select style={sel} value={form.procedure_interest} onChange={e => up('procedure_interest', e.target.value)}>
                    <option value="">Select a procedure…</option>
                    {procedures.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Procedure Destination</label>
                  <select style={sel} value={form.procedure_country} onChange={e => up('procedure_country', e.target.value)}>
                    <option value="">Where do you want treatment?</option>
                    {DESTINATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={g2}>
                  <div>
                    <label style={lbl}>Preferred Arrival Date</label>
                    <input type="date" style={inp} value={form.preferred_date} onChange={e => up('preferred_date', e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Estimated Return Date</label>
                    <input type="date" style={inp} value={form.return_date} onChange={e => up('return_date', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Number of Companions</label>
                  <select style={sel} value={form.number_of_companions} onChange={e => up('number_of_companions', e.target.value)}>
                    {['0','1','2','3','4'].map(v => <option key={v} value={v}>{v === '0' ? 'Travelling alone' : `${v} companion${v === '1' ? '' : 's'}`}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Goals & Expectations <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>(optional)</span></label>
                  <textarea style={{ ...inp, height: 80, padding: '10px 14px', resize: 'vertical' }} value={form.consultation_summary} onChange={e => up('consultation_summary', e.target.value)} placeholder="Briefly describe what you're hoping to achieve…" />
                </div>
              </div>
            )}

            {/* ── STEP 3: Health Profile ── */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={secH}><span>🏥</span> Medical History</div>
                <CheckboxGroup label="Do you have any of these medical conditions?" options={MEDICAL_CONDITIONS} selected={form.medical_conditions} onChange={v => up('medical_conditions', v)} noneOption="None of the above" />
                <CheckboxGroup label="Do you have any known allergies?" options={ALLERGIES} selected={form.allergies} onChange={v => up('allergies', v)} noneOption="No known allergies" />
                <div>
                  <label style={lbl}>Currently taking any medications?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                    {['no','yes'].map(v => (
                      <button key={v} type="button" onClick={() => up('takes_medications', v)} style={{ padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: form.takes_medications === v ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${form.takes_medications === v ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.12)'}`, color: form.takes_medications === v ? GOLD : 'rgba(255,255,255,0.55)' }}>
                        {v === 'yes' ? '✅ Yes' : '🚫 No'}
                      </button>
                    ))}
                  </div>
                </div>
                {form.takes_medications === 'yes' && <CheckboxGroup label="Which type(s) of medication?" options={MEDICATIONS} selected={form.medication_types} onChange={v => up('medication_types', v)} noneOption="None / Not currently taking medication" />}
                <div style={g2}>
                  <div>
                    <label style={lbl}>Smoking Status</label>
                    <select style={sel} value={form.smoking_status} onChange={e => up('smoking_status', e.target.value)}>
                      <option value="Never">🚭 Never smoked</option>
                      <option value="Former">🕐 Former smoker</option>
                      <option value="Light">🚬 Light smoker</option>
                      <option value="Heavy">🚬🚬 Heavy smoker</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Alcohol Use</label>
                    <select style={sel} value={form.alcohol_use} onChange={e => up('alcohol_use', e.target.value)}>
                      <option value="None">🚫 None</option>
                      <option value="Occasional">🍷 Occasional</option>
                      <option value="Moderate">🥂 Moderate</option>
                      <option value="Heavy">🍺 Heavy</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Anesthesia History</label>
                    <select style={sel} value={form.anesthesia_history} onChange={e => up('anesthesia_history', e.target.value)}>
                      <option value="No previous anesthesia">No previous anesthesia</option>
                      <option value="Yes – no issues">Yes – no issues</option>
                      <option value="Yes – had complications">Yes – complications</option>
                      <option value="Unsure">Unsure</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Exercise Level</label>
                    <select style={sel} value={form.exercise_level} onChange={e => up('exercise_level', e.target.value)}>
                      <option value="Sedentary">🛋️ Sedentary</option>
                      <option value="Light">🚶 Light</option>
                      <option value="Moderate">🏃 Moderate</option>
                      <option value="Active">💪 Very Active</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Pregnancy Status</label>
                    <select style={sel} value={form.pregnancy_status} onChange={e => up('pregnancy_status', e.target.value)}>
                      <option value="Not Applicable">Not applicable</option>
                      <option value="Pregnant">Currently pregnant</option>
                      <option value="Trying">Trying to conceive</option>
                      <option value="Breastfeeding">Breastfeeding</option>
                    </select>
                  </div>
                </div>
                <div style={secH}><span>🍽️</span> Dietary & Allergy</div>
                <SectionDietaryAllergy form={form} update={up} showValidation={showValidation} />
              </div>
            )}

            {/* ── STEP 4: Safety & Submit ── */}
            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={secH}><span>👥</span> Date of Birth & Companion</div>
                <SectionAgeCompanion form={form} update={up} showValidation={showValidation} />

                {/* Guardian Mode */}
                <div style={{ borderRadius: 16, padding: 20, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <div style={{ ...secH, borderColor: 'rgba(212,175,55,0.2)', marginBottom: 12 }}><span>🛡️</span> Travel Companion & Guardian Mode</div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 12 }}>How will you be traveling?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                      { value: 'solo', emoji: '🌍', label: 'Solo', sub: 'Highest protection' },
                      { value: 'partner_family', emoji: '👨‍👩‍👧‍👦', label: 'Partner / Family', sub: 'Standard protection' },
                      { value: 'group', emoji: '👥', label: 'With a Group', sub: 'Group check-ins' },
                    ].map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => { up('traveling_companion_type', opt.value); up('traveling_solo', opt.value === 'solo'); }}
                        style={{ borderRadius: 12, padding: '12px 8px', textAlign: 'left', cursor: 'pointer', background: form.traveling_companion_type === opt.value ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${form.traveling_companion_type === opt.value ? 'rgba(212,175,55,0.55)' : 'rgba(255,255,255,0.1)'}` }}>
                        <span style={{ fontSize: 22, display: 'block', marginBottom: 4 }}>{opt.emoji}</span>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{opt.label}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                  {form.traveling_companion_type === 'solo' && (
                    <div style={{ borderRadius: 10, padding: 14, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.guardian_mode_opted_in} onChange={e => up('guardian_mode_opted_in', e.target.checked)} style={{ marginTop: 2, accentColor: GOLD }} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Enable Guardian Mode 🛡️</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>24/7 monitoring with daily SMS check-ins. 100% opt-in — disable anytime.</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                <div style={secH}><span>🌐</span> Language & Culture</div>
                <SectionLinguisticCultural form={form} update={up} />

                <SectionClinicalBoundary form={form} update={up} showValidation={showValidation} />

                {/* Trust badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                  {[['🔒','HIPAA Compliant'],['🛡️','SAFE-T4LIFE™ Encrypted'],['⭐','98% Satisfaction'],['💳','$49 Credited to Package']].map(([icon, text]) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
                      <span style={{ fontSize: 13 }}>{icon}</span>{text}
                    </div>
                  ))}
                </div>

                {/* Fee credit reminder */}
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: '-8px 0 0', lineHeight: 1.6 }}>
                  Your $49 consultation fee is <span style={{ color: 'rgba(212,175,55,0.7)' }}>fully credited</span> when you book your procedure package.
                </p>

                {error && (
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: loading ? 'default' : 'pointer', background: loading ? 'rgba(212,175,55,0.4)' : `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`, color: '#060B16', fontSize: 15, fontWeight: 700, boxShadow: '0 4px 28px rgba(212,175,55,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Submitting…' : '✨ Submit My Consultation Request'}
                </button>
              </div>
            )}

            {/* Navigation */}
            {step < 4 ? (
              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                {step > 1 && (
                  <button type="button" onClick={back} style={{ flex: 1, height: 48, borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    ← Back
                  </button>
                )}
                <button type="button" onClick={next} style={{ flex: step === 1 ? 1 : 2, height: 48, borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`, color: '#060B16', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 20px rgba(212,175,55,0.3)' }}>
                  Continue →
                </button>
              </div>
            ) : (
              <button type="button" onClick={back} style={{ marginTop: 12, width: '100%', height: 44, borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ← Back
              </button>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}
