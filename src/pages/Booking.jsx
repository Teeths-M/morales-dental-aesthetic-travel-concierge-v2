import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { saveUserOnboardingProfile } from '@/lib/onboardingProfile';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, Lock, FileText, X, AlertCircle } from 'lucide-react';
import { translations } from '@/lib/translations';
import { MedicalSlideshowBackground } from '@/components/booking/MedicalSlideshow';
import { useCart } from '@/context/CartContext';
import { toast } from "sonner";
import PreviewSummary from '@/components/booking/PreviewSummary';
import ConsultationMedicalCart from '@/components/cart/ConsultationMedicalCart';
import SubmissionSuccess from '@/components/booking/SubmissionSuccess';
import ConsultationFeeModal from '@/components/booking/ConsultationFeeModal';

import Section1PersonalInfo from '../components/booking/Section1PersonalInfo';
import Section2Travel from '../components/booking/Section2Travel';
import Section3Cultural from '../components/booking/Section3Cultural';
import Section4MedicalHistory from '../components/booking/Section4MedicalHistory';
import Section5Anesthesia from '../components/booking/Section5Anesthesia';
import Section6Medications from '../components/booking/Section6Medications';
import Section7Lifestyle from '../components/booking/Section7Lifestyle';
import Section8Emotional from '../components/booking/Section8Emotional';
import Section9Pregnancy from '../components/booking/Section9Pregnancy';
import Section10Documents from '../components/booking/Section10Documents';
import SectionProcedure from '../components/booking/SectionProcedure';
import ClientAcknowledgement, { getRequiredAckCount } from '../components/booking/ClientAcknowledgement';
import MedicalRiskDisclosure from '../components/booking/MedicalRiskDisclosure';
import { checkVisaRequirement } from '@/lib/visaMatrix';
import ProcedureSelectionGate from '../components/booking/ProcedureSelectionGate';
import ProcedureRequirementNotice from '../components/booking/ProcedureRequirementNotice';

const SLIDE_FACTS = [
  'Every great transformation starts with a single step.',
  'We coordinate every detail of your medical journey.',
  'Personalized care that honours your values and traditions.',
  'Every detail you share helps our doctors prepare the safest plan.',
  'Our anesthesiologists review every patient profile personally.',
  'We cross-check all medications for potential interactions.',
  'Honest answers lead to better outcomes and faster healing.',
  'Emotional wellbeing is a core part of surgical success.',
  "We take a holistic approach to women's care and safety.",
  'Your documents are encrypted and HIPAA-compliant at all times.',
  'Our surgeons are internationally trained with thousands of successful procedures.',
  'Your commitment to your health is an act of courage.',
];

const steps = [
   { label: 'Personal Info',    emoji: '👤', short: 'Personal'  },
   { label: 'Travel',           emoji: '✈️', short: 'Travel'    },
   { label: 'Cultural',         emoji: '🕌', short: 'Cultural'  },
   { label: 'Medical History',  emoji: '🩺', short: 'Medical'   },
   { label: 'Anesthesia',       emoji: '💉', short: 'Anesthesia'},
   { label: 'Medications',      emoji: '💊', short: 'Meds'      },
   { label: 'Lifestyle',        emoji: '🚬', short: 'Lifestyle' },
   { label: 'Emotional',        emoji: '🧠', short: 'Emotional' },
   { label: 'Pregnancy',        emoji: '🤰', short: 'Health'    },
   { label: 'Documents',        emoji: '📎', short: 'Docs'      },
   { label: 'Procedure & Date', emoji: '🏥', short: 'Procedure' },
   { label: 'Consent & Signature', emoji: '⚖️', short: 'Consent'    },
   { label: 'Acknowledgement',    emoji: '📋', short: 'Acknowledge' },
];

export default function Booking() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [consultationId, setConsultationId] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en');
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [draftData, setDraftData] = useState(null);
  const navigate = useNavigate();
  const { items, clearCart, procedureCountry } = useCart();

  // Auto-save debounce timer
  const saveTimerRef = useRef(null);

  // Get current user email
  const [userEmail, setUserEmail] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.email) {
          setUserEmail(user.email);
          setCurrentUser(user);
          await saveUserOnboardingProfile({
            role: 'client',
            status: 'started',
            profileData: { selected_role: 'client', started_from: 'booking' }
          });
        }
      } catch (e) {
        // User not logged in
      }
    };
    getUser();
  }, []);

  // Check for existing draft on mount
  const { data: existingDraft } = useQuery({
    queryKey: ['consultation_draft', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      const drafts = await base44.entities.ConsultationDraft.filter({ user_email: userEmail });
      return drafts.length > 0 ? drafts[0] : null;
    },
    enabled: !!userEmail,
    staleTime: 1000 * 60,
  });

  // Show resume modal when draft is found
  useEffect(() => {
    if (existingDraft && !submitted) {
      setDraftData(existingDraft);
      setShowResumeModal(true);
    }
  }, [existingDraft, submitted]);

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const [form, setForm] = useState({
    patient_name: '', email: '', phone: '', age: '', gender: '', height: '', weight: '',
    nationality: '', occupation: '', emergency_contact_name: '', emergency_contact_number: '',
    has_companion: null, companion_relationship: '', travel_buddy_services: [],
    has_cultural_preferences: null, cultural_preferences: [], cultural_notes: '',
    medical_conditions: [], medical_conditions_other: '',
    had_surgery: null, previous_procedures: '', last_surgery_date: '', had_complications: null,
    surgery_complications: [], anesthesia_complications: null, anesthesia_complication_types: [],
    allergies: [], allergy_details: '', takes_medications: null, medication_types: [],
    medication_notes: '', lifestyle_habits: [], exercises_regularly: null, activity_level: '',
    emotional_concerns: null, emotional_concern_types: [], emotional_notes: '',
    pregnancy_status: '', document_types: [], uploaded_files: [],
    procedure_interest: '', preferred_date: '', notes: '',
    passport_number: '', passport_issue_date: '', passport_expiry_date: '',
    return_date: '', number_of_companions: 0,
    ip_country_origin: '', visa_required_status: 'unknown',
    procedure_country: '', client_country: '',
    acknowledged_statements: new Set(),
    signature_data: '',
    accepted_arbitration_clause: false,
    signature_timestamp: '',
    signature_ip_address: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // Bridge procedure_country from cart selection
  useEffect(() => {
    if (procedureCountry && !form.procedure_country) {
      update('procedure_country', procedureCountry);
    }
  }, [procedureCountry]);

  // Keep visa_required_status in sync for persistence
  useEffect(() => {
    const status = checkVisaRequirement(form.nationality, form.procedure_country);
    update('visa_required_status', status);
  }, [form.nationality, form.procedure_country]);

  // Auto-derive client_country from nationality
  useEffect(() => {
    if (!form.nationality) return;
    const nationalityToCountry = {
      'American': 'United States', 'Canadian': 'Canada', 'British': 'United Kingdom',
      'Australian': 'Australia', 'German': 'Germany', 'French': 'France',
      'Italian': 'Italy', 'Spanish': 'Spain', 'Portuguese': 'Portugal',
      'Dutch': 'Netherlands', 'Belgian': 'Belgium', 'Swiss': 'Switzerland',
      'Swedish': 'Sweden', 'Norwegian': 'Norway', 'Danish': 'Denmark',
      'Finnish': 'Finland', 'Austrian': 'Austria', 'Irish': 'Ireland',
      'Brazilian': 'Brazil', 'Argentine': 'Argentina', 'Colombian': 'Colombia',
      'Mexican': 'Mexico', 'Venezuelan': 'Venezuela', 'Peruvian': 'Peru',
      'Chilean': 'Chile', 'Ecuadorian': 'Ecuador', 'Uruguayan': 'Uruguay',
      'Indian': 'India', 'Chinese': 'China', 'Japanese': 'Japan',
      'South Korean': 'South Korea', 'Singaporean': 'Singapore',
      'Russian': 'Russia', 'Ukrainian': 'Ukraine', 'Turkish': 'Turkey',
      'Israeli': 'Israel', 'Emirati': 'United Arab Emirates',
      'Saudi': 'Saudi Arabia', 'Jamaican': 'Jamaica', 'Trinidadian': 'Trinidad and Tobago',
      'Barbadian': 'Barbados', 'Nigerian': 'Nigeria', 'Ghanaian': 'Ghana',
      'Kenyan': 'Kenya', 'South African': 'South Africa',
      'New Zealander': 'New Zealand', 'Pakistani': 'Pakistan',
      'Bangladeshi': 'Bangladesh', 'Filipino': 'Philippines',
      'Indonesian': 'Indonesia', 'Malaysian': 'Malaysia', 'Thai': 'Thailand',
      'Vietnamese': 'Vietnam', 'Egyptian': 'Egypt', 'Moroccan': 'Morocco',
      'Lebanese': 'Lebanon', 'Jordanian': 'Jordan', 'Georgian': 'Georgia',
    };
    const country = nationalityToCountry[form.nationality] || form.nationality;
    update('client_country', country);
  }, [form.nationality]);

  // Auto-save draft (debounced 1 second)
  const saveDraft = useCallback((formData, currentStep) => {
    if (!userEmail || submitted) return;
    
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    saveTimerRef.current = setTimeout(async () => {
      try {
        // Convert Set to array for JSON serialization
        const formDataSerializable = {
          ...formData,
          acknowledged_statements: Array.from(formData.acknowledged_statements)
        };
        
        const existing = await base44.entities.ConsultationDraft.filter({ user_email: userEmail });
        
        if (existing.length > 0) {
          // Update existing draft
          await base44.entities.ConsultationDraft.update(existing[0].id, {
            form_data: formDataSerializable,
            step: steps[currentStep]?.label || 'unknown',
            last_saved_at: new Date().toISOString(),
          });
        } else {
          // Create new draft
          await base44.entities.ConsultationDraft.create({
            user_email: userEmail,
            form_data: formDataSerializable,
            step: steps[currentStep]?.label || 'unknown',
            last_saved_at: new Date().toISOString(),
          });
        }

        await saveUserOnboardingProfile({
          role: 'client',
          status: 'started',
          profileData: {
            ...formDataSerializable,
            current_step: steps[currentStep]?.label || 'unknown'
          }
        });
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
    }, 1000);
  }, [userEmail, submitted]);

  // Save draft on form changes
  useEffect(() => {
    saveDraft(form, step);
  }, [form, step, saveDraft]);

  // Resume draft
  const handleResumeDraft = async () => {
    if (!draftData?.form_data) return;
    
    // Convert acknowledged_statements array back to Set
    const restoredForm = {
      ...draftData.form_data,
      acknowledged_statements: new Set(draftData.form_data.acknowledged_statements || [])
    };
    
    setForm(restoredForm);
    
    // Find step index from saved step label
    const savedStepIndex = steps.findIndex(s => s.label === draftData.step);
    if (savedStepIndex >= 0) {
      setStep(savedStepIndex);
    }
    
    setShowResumeModal(false);
    setDraftData(null);
  };

  // Delete draft after successful submission
  const deleteDraft = useCallback(async () => {
    if (!userEmail) return;
    try {
      const drafts = await base44.entities.ConsultationDraft.filter({ user_email: userEmail });
      if (drafts.length > 0) {
        await base44.entities.ConsultationDraft.delete(drafts[0].id);
      }
    } catch (e) {
      console.error('Failed to delete draft:', e);
    }
  }, [userEmail]);

  const createMutation = useMutation({
    mutationFn: (data) => {
      // Map cart items to valid enum values; fall back to 'other'
      const VALID_PROCEDURE_ENUMS = [
        'dental_implants','all_on_4','porcelain_veneers','smile_makeover','bone_regeneration',
        'teeth_whitening','rhinoplasty','breast_surgery','liposuction','tummy_tuck','facelift',
        'brow_lift','blepharoplasty','otoplasty','thigh_arm_lift','laser_resurfacing',
        'mole_removal','lipoma_removal','gastric_sleeve','gastric_bypass','gastric_band_revision',
        'gynecological_exams','ivf','egg_freezing','oncology_surgery','tumor_testing',
        'joint_replacement','spine_surgery','sports_arthroscopy','fracture_surgery','other'
      ];
      // items have a .value that is already a valid enum key
      const procedureEnum = items.length > 0 && VALID_PROCEDURE_ENUMS.includes(items[0].value)
        ? items[0].value
        : 'other';
      // Store full names in notes for reference
      const procedureNames = items.map(item => item.name).join(', ') || '';
      return base44.entities.Consultation.create({
        ...data,
        procedure_interest: procedureEnum,
        notes: items.length > 1
          ? (data.notes ? `${data.notes}\n\nAll procedures requested: ${procedureNames}` : `All procedures requested: ${procedureNames}`)
          : data.notes || '',
      });
    },
    onSuccess: async (consultation) => {
      setConsultationId(consultation.id);
      await saveUserOnboardingProfile({
        role: 'client',
        status: 'started',
        linkedEntityName: 'Consultation',
        linkedEntityId: consultation.id,
        profileData: {
          ...form,
          acknowledged_statements: Array.from(form.acknowledged_statements || []),
          procedure_interest: consultation.procedure_interest,
          consultation_submitted: true
        }
      });
      setShowFeeModal(true);
    },
    onError: (error) => {
      console.error('Consultation creation failed:', error.message);
      toast.error(`Failed to create consultation: ${error.message}`);
    },
  });

  const canNext = () => {
    if (step === 0) {
      return form.patient_name && form.email && form.phone &&
             form.emergency_contact_name && form.emergency_contact_number &&
             form.passport_number && form.passport_issue_date && form.passport_expiry_date;
    }
    if (step === 1) {
      if (form.has_companion === null || form.has_companion === undefined) return false;
      if (form.has_companion === false) return true;
      // Has companion: require at least count selected
      return form.number_of_companions > 0;
    }
    if (step === 2) {
      return form.has_cultural_preferences !== null && (form.has_cultural_preferences ? form.cultural_preferences.length > 0 : true);
    }
    if (step === 3) {
      return form.medical_conditions.length > 0 && form.had_surgery !== null && 
             (form.had_surgery ? form.previous_procedures && form.last_surgery_date && form.had_complications !== null : true);
    }
    if (step === 4) {
      return form.anesthesia_complications !== null && (form.anesthesia_complications ? form.anesthesia_complication_types.length > 0 : true) &&
             form.allergies.length > 0;
    }
    if (step === 5) {
      return form.takes_medications !== null && (form.takes_medications ? form.medication_types.length > 0 && form.medication_notes : true);
    }
    if (step === 6) {
      return form.lifestyle_habits.length > 0 && form.exercises_regularly !== null && 
             (form.exercises_regularly ? form.activity_level : true);
    }
    if (step === 7) {
      return form.emotional_concerns !== null && (form.emotional_concerns ? form.emotional_concern_types.length > 0 && form.emotional_notes : true);
    }
    if (step === 8) {
      return form.pregnancy_status;
    }
    if (step === 9) {
      return form.document_types.length > 0 && (form.document_types.includes('none') || form.uploaded_files.length > 0);
    }
    if (step === 10) {
      return form.preferred_date;
    }
    if (step === 11) {
      return !!form.signature_data && form.accepted_arbitration_clause === true;
    }
    if (step === 12) {
      const visaStatus = checkVisaRequirement(form.nationality, form.procedure_country);
      const required = getRequiredAckCount(visaStatus);
      return form.acknowledged_statements.size >= required;
    }
    return true;
  };

  const goToDashboard = () => {
    navigate({ pathname: '/dashboard', search: window.location.search });
  };

  const handleConfirmSubmit = () => {
    console.log("Form data submitted:", form);
    createMutation.mutate(form);
    setShowPreview(false);
  };

  // Delete draft on successful submission
  useEffect(() => {
    if (submitted) {
      deleteDraft();
    }
  }, [submitted, deleteDraft]);

  if (submitted) return <SubmissionSuccess form={form} items={items} />;

  const progressPct = Math.round((step / (steps.length - 1)) * 100);

  return (
    <ProcedureSelectionGate>
    <div className="min-h-screen bg-transparent">
      <MedicalSlideshowBackground step={step} />

      {/* Content Layout - Form Left, Sidebar Right */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Form Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Form Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center flex-shrink-0 text-lg shadow-lg">
              {steps[step].emoji}
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Step {step + 1} {translations[language].stepOf} {steps.length}</p>
              <h2 className="font-bold text-slate-800 text-base">{steps[step].label}</h2>
            </div>
          </div>

          {/* Form content */}
          <div className="p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                {step === 0  && <Section1PersonalInfo form={form} update={update} language={language} />}
                 {step === 1  && <Section2Travel form={form} update={update} language={language} />}
                 {step === 2  && <Section3Cultural form={form} update={update} language={language} />}
                 {step === 3  && <Section4MedicalHistory form={form} update={update} language={language} />}
                 {step === 4  && <Section5Anesthesia form={form} update={update} language={language} />}
                 {step === 5  && <Section6Medications form={form} update={update} language={language} />}
                 {step === 6  && <Section7Lifestyle form={form} update={update} language={language} />}
                 {step === 7  && <Section8Emotional form={form} update={update} language={language} />}
                 {step === 8  && <Section9Pregnancy form={form} update={update} language={language} />}
                 {step === 9  && <Section10Documents form={form} update={update} language={language} />}
                 {step === 10 && <SectionProcedure form={form} update={update} language={language} />}
                 {step === 11 && (
                   <MedicalRiskDisclosure
                     signatureData={form.signature_data}
                     onSignatureChange={(data) => {
                       update('signature_data', data);
                       if (data) update('signature_timestamp', new Date().toISOString());
                     }}
                     arbitrationAccepted={form.accepted_arbitration_clause}
                     onArbitrationChange={(val) => update('accepted_arbitration_clause', val)}
                   />
                 )}
                 {step === 12 && <ClientAcknowledgement acknowledged={form.acknowledged_statements} onChange={(acked) => update('acknowledged_statements', acked)} language={language} visaStatus={checkVisaRequirement(form.nationality, form.procedure_country)} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> {translations[language].backBtn}
            </Button>

            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="gap-2 text-sm bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white border-0"
              >
                {translations[language].continueBtn} <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setShowPreview(true)}
                disabled={createMutation.isPending || !canNext()}
                className="gap-2 text-sm bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white border-0"
              >
                <CheckCircle className="w-4 h-4" /> {translations[language].reviewSubmit}
              </Button>
            )}
          </div>
          </div>
          </div>

          {/* Right Sidebar - Step Info + Cart */}
          <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-24 lg:h-fit">
          {/* Procedure Requirement Notice */}
          <ProcedureRequirementNotice />
          
          {/* Step Info Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-3 sticky top-16">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center flex-shrink-0 text-sm shadow-lg">
              {steps[step].emoji}
            </div>
            <div>
              <p className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest">Step {step + 1}</p>
              <h3 className="font-bold text-white text-xs drop-shadow">{steps[step].label}</h3>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div>
              <p className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest mb-1">Progress</p>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-400 to-blue-400"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <p className="text-emerald-300 text-[8px] mt-1 font-medium">{Math.round(((step + 1) / steps.length) * 100)}%</p>
            </div>

            {/* Step pills */}
            <div className="flex flex-wrap gap-0.5">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap transition-all ${
                    i < step
                      ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                      : i === step
                      ? 'bg-white/25 text-white border border-white/30'
                      : 'bg-white/5 text-white/30 border border-white/10'
                  }`}
                >
                  {i < step ? '✓' : i === step ? '●' : i + 1}
                </div>
              ))}
            </div>
          </div>
          </div>

          {/* Selected Procedures Card */}
          <div>
          <ConsultationMedicalCart />
          </div>
          </div>
          </div>
          </div>

      <PreviewSummary
        isOpen={showPreview}
        form={form}
        onEdit={() => setShowPreview(false)}
        onSubmit={handleConfirmSubmit}
        isSubmitting={createMutation.isPending}
      />

      <ConsultationFeeModal
        form={form}
        isOpen={showFeeModal}
        onSuccess={async (feeData) => {
          await saveUserOnboardingProfile({
            role: 'client',
            status: 'completed',
            linkedEntityName: 'Consultation',
            linkedEntityId: consultationId,
            profileData: {
              ...form,
              acknowledged_statements: Array.from(form.acknowledged_statements || []),
              procedure_interest: items.map(item => item.name).join(', ') || form.procedure_interest || 'other',
              consultation_fee_paid: true,
              fee_data: feeData || null
            }
          });
          setShowFeeModal(false);
          setSubmitted(true);
          goToDashboard();
        }}
        onCancel={() => setShowFeeModal(false)}
      />

      {/* Resume Draft Modal */}
      {showResumeModal && draftData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">Saved Consultation Found</h3>
                  <p className="text-xs text-slate-500">
                    Last saved {new Date(draftData.last_saved_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResumeModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-700 mb-3">
                We found a saved consultation from <strong>{new Date(draftData.last_saved_at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</strong>.
              </p>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Step: <strong>{draftData.step}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>All entered information preserved</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleResumeDraft}
                className="flex-1 bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white"
              >
                Resume Consultation
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowResumeModal(false);
                  deleteDraft();
                }}
                className="flex-1"
              >
                Start Over
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
    </ProcedureSelectionGate>
  );
}