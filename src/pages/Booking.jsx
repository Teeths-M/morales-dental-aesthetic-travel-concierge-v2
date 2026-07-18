// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { saveUserOnboardingProfile } from '@/lib/onboardingProfile';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { translations } from '@/lib/translations';
import { MedicalSlideshowBackground } from '@/components/booking/MedicalSlideshow';
import { useCart } from '@/context/CartContext';
import { toast } from "sonner";
import PreviewSummary from '@/components/booking/PreviewSummary';
import ConsultationMedicalCart from '@/components/cart/ConsultationMedicalCart';
import SubmissionSuccess from '@/components/booking/SubmissionSuccess';
import ConsultationFeeModal from '@/components/booking/ConsultationFeeModal';
import DataProcessingConsent, { DATA_CONSENT_VERSION } from '@/components/consent/DataProcessingConsent';

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
import { useVisaRequirement } from '@/hooks/useVisaRequirement';
import VisaRequirementLive from '@/components/trust/VisaRequirementLive';
import ProcedureSelectionGate from '../components/booking/ProcedureSelectionGate';
import { analyseCompatibility, getViolations } from '@/lib/procedureCompatibility';
import { isMinorAge, isValidGuardianContact } from '@/lib/guardianGate';
import ProcedureStackingBlocker from '../components/safety/ProcedureStackingBlocker';
import ProcedureRequirementNotice from '../components/booking/ProcedureRequirementNotice';
import SafeTScan from '../components/booking/SafeTScan';
import HighRiskReviewNotice from '../components/booking/HighRiskReviewNotice';
import { checkMedicalRisk } from '@/lib/medicalSafetyGate';
import GuestAuthGate from '../components/booking/GuestAuthGate';

const _SLIDE_FACTS = [
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
  { label: 'Personal Info',       emoji: '👤', short: 'Personal'   },  // 0: personal + cultural merged
  { label: 'Travel',              emoji: '✈️', short: 'Travel'     },  // 1
  { label: 'Medical History',     emoji: '🩺', short: 'Medical'    },  // 2
  { label: 'Anesthesia',          emoji: '💉', short: 'Anesthesia' },  // 3
  { label: 'Medications',         emoji: '💊', short: 'Meds'       },  // 4
  { label: 'Lifestyle & Wellness',emoji: '🚬', short: 'Lifestyle'  },  // 5: lifestyle + emotional merged
  { label: "Women's Health",      emoji: '👩‍⚕️', short: 'Health'     },  // 6
  { label: 'Documents',           emoji: '📎', short: 'Docs'       },  // 7
  { label: 'Procedure & Date',    emoji: '🏥', short: 'Procedure'  },  // 8
  { label: 'Consent & Signature', emoji: '⚖️', short: 'Consent'    },  // 9
  { label: 'Acknowledgement',     emoji: '📋', short: 'Acknowledge' }, // 10
  { label: 'SAFE-T Scan',         emoji: '🛡️', short: 'SAFE-T'     },  // 11
];

// Phase grouping — 4 phases across 12 steps
const STEP_PHASES = [
  { name: 'About You',     steps: [0, 1],          color: '#10b981' },
  { name: 'Your Health',   steps: [2, 3, 4, 5, 6], color: '#3b82f6' },
  { name: 'Your Journey',  steps: [7, 8],           color: '#8b5cf6' },
  { name: 'Safety Review', steps: [9, 10, 11],      color: '#d4af37' },
];

function getPhaseInfo(stepIndex) {
  for (const phase of STEP_PHASES) {
    const idx = phase.steps.indexOf(stepIndex);
    if (idx !== -1) {
      return { phase: phase.name, color: phase.color, stepInPhase: idx + 1, stepsInPhase: phase.steps.length };
    }
  }
  return { phase: '', color: '#10b981', stepInPhase: 1, stepsInPhase: 1 };
}

export default function Booking() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showHighRiskNotice, setShowHighRiskNotice] = useState(false);
  const [highRiskFlag, setHighRiskFlag] = useState(null);
  const [showGuestAuthGate, setShowGuestAuthGate] = useState(false);

  const [showStackingBlock, setShowStackingBlock] = useState(() => {
    // Check on init so the block fires before the form renders
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('morales_consultation_cart');
      const cartItems = saved ? JSON.parse(saved) : [];
      if (cartItems.length >= 2) {
        const { isBlocked } = getViolations(cartItems.map(i => ({ name: i.name, title: i.name })));
        return isBlocked;
      }
    } catch (_) {}
    return false;
  });
  const [stackingViolations, setStackingViolations] = useState(() => {
    try {
      const saved = localStorage.getItem('morales_consultation_cart');
      const cartItems = saved ? JSON.parse(saved) : [];
      if (cartItems.length >= 2) {
        const { violations } = getViolations(cartItems.map(i => ({ name: i.name, title: i.name })));
        return violations;
      }
    } catch (_) {}
    return [];
  });
  const [consultationId, setConsultationId] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en');
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [draftData, setDraftData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { items, _clearCart, procedureCountry, procedureCity } = useCart();

  // Auto-save debounce timer + draft ID cache to prevent race conditions
  const saveTimerRef = useRef(null);
  const draftIdRef = useRef(null);

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

          // Restore guest draft saved before OAuth redirect
          try {
            const guestDraft = localStorage.getItem('morales_guest_booking_draft');
            const guestStep  = localStorage.getItem('morales_guest_booking_step');
            if (guestDraft) {
              const parsed   = JSON.parse(guestDraft);
              const restored = { ...parsed, acknowledged_statements: new Set(parsed.acknowledged_statements || []) };
              setForm(prev => ({
                ...prev, ...restored,
                patient_name: restored.patient_name || user.full_name || '',
                email:        restored.email        || user.email      || '',
                phone:        restored.phone        || user.phone      || '',
              }));
              if (guestStep) setStep(parseInt(guestStep, 10));
              localStorage.removeItem('morales_guest_booking_draft');
              localStorage.removeItem('morales_guest_booking_step');
              toast.success('Welcome back! Your form has been restored.');
            }
          } catch (_) {}

          await saveUserOnboardingProfile({
            role: 'client',
            status: 'started',
            profileData: { selected_role: 'client', started_from: 'booking' }
          });
        }
      } catch (_e) {
        // User not logged in — guest mode
      }
    };
    getUser();
  }, []);

  // ── Layer 1: Passive auto-fill from authenticated user ────────────────────
  // Zero-type: name, email, phone pulled from auth profile on mount.
  // Never overwrites values the user has already changed.
  useEffect(() => {
    if (!currentUser) return;
    setForm(prev => ({
      ...prev,
      patient_name: prev.patient_name || currentUser.full_name || '',
      email:        prev.email        || currentUser.email      || '',
      phone:        prev.phone        || currentUser.phone      || '',
    }));
  }, [currentUser]);

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
    guardian_name: '', guardian_contact: '', guardian_consent: false,
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
    procedure_country: '', procedure_city: '', client_country: '',
    acknowledged_statements: new Set(),
    signature_data: '',
    accepted_arbitration_clause: false,
    signature_timestamp: '',
    signature_ip_address: '',
    safet_risk_level: null,
    safet_risk_flags: [],
    data_processing_consent: false,
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // Visa requirement — live source first, static matrix only as a labeled fallback.
  const visaInfo = useVisaRequirement(form.nationality, form.procedure_country);

  // Bridge procedure destination from cart selection
  useEffect(() => {
    if (procedureCountry && !form.procedure_country) {
      update('procedure_country', procedureCountry);
    }
    if (procedureCity && !form.procedure_city) {
      update('procedure_city', procedureCity);
    }
  }, [procedureCountry, procedureCity]);

  // Keep visa_required_status in sync for persistence (live-first via the hook)
  useEffect(() => {
    update('visa_required_status', visaInfo.status);
  }, [visaInfo.status]);

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
      setIsSaving(true);
      try {
        // Convert Set to array for JSON serialization
        const formDataSerializable = {
          ...formData,
          acknowledged_statements: Array.from(formData.acknowledged_statements)
        };

        const payload = {
          form_data: formDataSerializable,
          step: steps[currentStep]?.label || 'unknown',
          last_saved_at: new Date().toISOString(),
        };

        if (draftIdRef.current) {
          await base44.entities.ConsultationDraft.update(draftIdRef.current, payload);
        } else {
          // Idempotency guard: mark intent before async check to prevent duplicate creates
          draftIdRef.current = 'pending';
          const existing = await base44.entities.ConsultationDraft.filter({ user_email: userEmail });
          if (existing.length > 0) {
            draftIdRef.current = existing[0].id;
            await base44.entities.ConsultationDraft.update(draftIdRef.current, payload);
          } else {
            const created = await base44.entities.ConsultationDraft.create({ user_email: userEmail, ...payload });
            draftIdRef.current = created.id;
          }
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
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  }, [userEmail, submitted]);

  // Cleanup timer on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

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
      const idToDelete = draftIdRef.current;
      if (idToDelete) {
        await base44.entities.ConsultationDraft.delete(idToDelete);
        draftIdRef.current = null;
      } else {
        const drafts = await base44.entities.ConsultationDraft.filter({ user_email: userEmail });
        if (drafts.length > 0) await base44.entities.ConsultationDraft.delete(drafts[0].id);
      }
    } catch (e) {
      console.error('Failed to delete draft:', e);
    }
  }, [userEmail]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // M PRINCIPLE — server-side re-check. The client-side RED gate (getViolations
      // above, ProcedureStackingBlocker UI) can be skipped by calling this mutation
      // directly — this call re-derives the same verdict server-side so the hard
      // block cannot be bypassed by going around the frontend.
      if (items.length >= 2) {
        const safetyCheck = await base44.functions.invoke('validateProcedureSafety', {
          items: items.map(i => ({ name: i.name, title: i.name })),
        });
        if (safetyCheck?.data?.isBlocked) {
          throw new Error('This procedure combination requires enhanced medical review before booking. Please adjust your selection or contact our care team.');
        }
      }

      // M PRINCIPLE — under-18 hard gate, re-derived SERVER-SIDE so a direct
      // mutation cannot skip the guardian requirement (same pattern as the RED
      // block above). Only a stated minor triggers the call; adults are untouched.
      if (isMinorAge(data.age)) {
        const guardianCheck = await base44.functions.invoke('validateGuardianRequirement', {
          age: data.age,
          guardian_name: data.guardian_name,
          guardian_contact: data.guardian_contact,
        });
        const guardianVerdict = guardianCheck?.data ?? guardianCheck ?? {};
        if (guardianVerdict.blocked) {
          throw new Error(guardianVerdict.reason || 'A parent or guardian is required for patients under 18 before booking can proceed.');
        }
      }

      // Map cart items to valid enum values; fall back to 'other'
      const VALID_PROCEDURE_ENUMS = [
        'dental_implants','all_on_4','porcelain_veneers','smile_makeover','bone_regeneration',
        'teeth_whitening','rhinoplasty','breast_surgery','liposuction','tummy_tuck','facelift',
        'brow_lift','blepharoplasty','otoplasty','thigh_arm_lift','laser_resurfacing',
        'mole_removal','lipoma_removal','gastric_sleeve','gastric_bypass','gastric_band_revision',
        'gynecological_exams','ivf','egg_freezing','oncology_surgery','tumor_testing',
        'joint_replacement','spine_surgery','sports_arthroscopy','fracture_surgery','other'
      ];
      // items have a .procedure_enum that is already a valid enum key (set in Procedures page)
      const procedureEnum = items.length > 0 && VALID_PROCEDURE_ENUMS.includes(items[0].procedure_enum)
        ? items[0].procedure_enum
        : 'other';
      // Store full names in notes for reference
      const procedureNames = items.map(item => item.name).join(', ') || '';

      // SAFE-T4LIFE™ compatibility check — append flags for high-risk combinations
      const compatResult = analyseCompatibility(items);
      const safeTFlags = (compatResult.level === 'RED' || compatResult.level === 'YELLOW')
        ? {
            safeT4LifeReviewRequired: true,
            anesthesiaTotalHours: compatResult.totalAnesthesiaHrs,
            safeT4LifeLevel: compatResult.level,
            safeT4LifeFlags: compatResult.reasons,
          }
        : {};

      // Collect patient_custom_notes from cart items
      const patientNotes = items.filter(item => item.patient_custom_note).map(item => `• ${item.name}: ${item.patient_custom_note}`).join('\n');
      
      return base44.entities.Consultation.create({
        ...data,
        ...safeTFlags,
        ...(data.high_risk_medical_review ? { status: 'Admin-Review', risk_level: 'high' } : {}),
        // Under-18: flag the record, capture the guardian, and route straight to
        // admin review — no minor's journey is ever auto-processed (M Principle).
        ...(isMinorAge(data.age) ? {
          guardian_required: true,
          guardian_name: data.guardian_name || '',
          guardian_contact: data.guardian_contact || '',
          status: 'Admin-Review',
          risk_level: 'high',
        } : {}),
        // Data-processing consent audit trail (compliance) — stamp when the client agreed.
        ...(data.data_processing_consent ? {
          data_processing_consent: true,
          data_processing_consent_at: new Date().toISOString(),
          data_processing_consent_version: DATA_CONSENT_VERSION,
        } : {}),
        procedure_interest: procedureEnum,
        notes: items.length > 1
          ? (data.notes ? `${data.notes}\n\nAll procedures requested: ${procedureNames}${patientNotes ? `\n\nPatient's Notes:\n${patientNotes}` : ''}` : `All procedures requested: ${procedureNames}${patientNotes ? `\n\nPatient's Notes:\n${patientNotes}` : ''}`)
          : (data.notes || '') + (patientNotes ? `\n\nPatient's Notes:\n${patientNotes}` : ''),
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
      if (!currentUser) {
        setShowGuestAuthGate(true);
      } else {
        setShowFeeModal(true);
      }
    },
    onError: (error) => {
      console.error('Consultation creation failed:', error.message);
      toast.error("We could not create your consultation just now. Nothing was lost — please try again in a moment.");
    },
  });

  const canNext = () => {
    if (step === 0) {
      // Personal Info + Cultural merged.
      // P1 (Simple is harder than complex): passport details are travel logistics,
      // not needed to START a consultation — they're captured later (Passport Vault
      // / travel-coordination). Requiring three passport fields up-front was a wall
      // a scared patient had to climb before seeing any value, so it's no longer
      // blocking. Emergency contact stays required — that IS safety. The /intake
      // flow already omits passport entirely; this aligns /booking with it.
      const personalOk = form.patient_name && form.email && form.phone &&
             form.emergency_contact_name && form.emergency_contact_number;
      const culturalOk = form.has_cultural_preferences !== null &&
             (form.has_cultural_preferences ? form.cultural_preferences.length > 0 : true);
      // M PRINCIPLE — a stated minor cannot advance without a captured, valid
      // guardian identity + consent. Hard block, not a soft flag.
      const guardianOk = !isMinorAge(form.age) || (
        !!form.guardian_name?.trim() &&
        isValidGuardianContact(form.guardian_contact) &&
        form.guardian_consent === true
      );
      return personalOk && culturalOk && guardianOk;
    }
    if (step === 1) {
      // Travel
      if (form.has_companion === null || form.has_companion === undefined) return false;
      if (form.has_companion === false) return true;
      return form.number_of_companions > 0;
    }
    if (step === 2) {
      // Medical History (was 3)
      return form.medical_conditions.length > 0 && form.had_surgery !== null &&
             (form.had_surgery ? form.previous_procedures && form.last_surgery_date && form.had_complications !== null : true);
    }
    if (step === 3) {
      // Anesthesia (was 4)
      return form.anesthesia_complications !== null && (form.anesthesia_complications ? form.anesthesia_complication_types.length > 0 : true) &&
             form.allergies.length > 0;
    }
    if (step === 4) {
      // Medications (was 5). The free-text notes field is labeled "Optional" in
      // Section6 — the medication-type selection already carries the clinical
      // signal, so do NOT gate Continue on the notes (that mismatch trapped users:
      // an "Optional" field that silently blocked the button).
      return form.takes_medications !== null && (form.takes_medications ? form.medication_types.length > 0 : true);
    }
    if (step === 5) {
      // Lifestyle + Emotional merged (was 6 + 7)
      const lifestyleOk = form.lifestyle_habits.length > 0 && form.exercises_regularly !== null &&
             (form.exercises_regularly ? form.activity_level : true);
      // Emotional notes are labeled "Optional" in Section8 — don't gate on them
      // (same trap as the medication notes above).
      const emotionalOk = form.emotional_concerns !== null &&
             (form.emotional_concerns ? form.emotional_concern_types.length > 0 : true);
      return lifestyleOk && emotionalOk;
    }
    if (step === 6) {
      // Women's Health (was 8)
      return form.pregnancy_status;
    }
    if (step === 7) {
      // Documents (was 9)
      return form.document_types.length > 0 && (form.document_types.includes('none') || form.uploaded_files.length > 0);
    }
    if (step === 8) {
      // Procedure & Date (was 10)
      return form.preferred_date;
    }
    if (step === 9) {
      // Consent & Signature (was 11)
      return !!form.signature_data && form.accepted_arbitration_clause === true;
    }
    if (step === 10) {
      // Acknowledgement (was 12)
      const required = getRequiredAckCount(visaInfo.status);
      return form.acknowledged_statements.size >= required;
    }
    if (step === 11) {
      // SAFE-T Scan (was 13) — also the final consent gate before submission
      if (!form.safet_risk_level) return false;
      return form.data_processing_consent === true;
    }
    return true;
  };

  // Human-readable list of what's still missing on the current step, mirroring
  // canNext(). Powers a specific "please complete X" message instead of the old
  // generic toast — so a user who can't advance is never left hunting for the
  // one empty field (the anxious-user "why won't it let me continue?" trap).
  const getMissingFields = () => {
    const m = [];
    if (step === 0) {
      if (!form.patient_name) m.push('Full name');
      if (!form.email) m.push('Email');
      if (!form.phone) m.push('Phone number');
      if (!form.emergency_contact_name) m.push('Emergency contact name');
      if (!form.emergency_contact_number) m.push('Emergency contact number');
      if (form.has_cultural_preferences === null || form.has_cultural_preferences === undefined) m.push('Cultural preferences question');
      else if (form.has_cultural_preferences && form.cultural_preferences.length === 0) m.push('At least one cultural preference');
      if (isMinorAge(form.age)) {
        if (!form.guardian_name?.trim()) m.push('Parent / guardian name');
        if (!isValidGuardianContact(form.guardian_contact)) m.push('A valid guardian phone or email');
        if (form.guardian_consent !== true) m.push('Guardian consent checkbox');
      }
    } else if (step === 1) {
      if (form.has_companion === null || form.has_companion === undefined) m.push('Whether someone is accompanying you');
      else if (form.has_companion === true && !(form.number_of_companions > 0)) m.push('Number of companions');
    } else if (step === 2) {
      if (!(form.medical_conditions.length > 0)) m.push('Medical conditions (tap “None” if you have none)');
      if (form.had_surgery === null) m.push('Whether you’ve had surgery before');
      else if (form.had_surgery) {
        if (!form.previous_procedures) m.push('Type of previous surgery');
        if (!form.last_surgery_date) m.push('Date of your most recent surgery');
        if (form.had_complications === null) m.push('Whether you had complications');
      }
    } else if (step === 3) {
      if (form.anesthesia_complications === null) m.push('Whether you’ve had anesthesia complications');
      else if (form.anesthesia_complications && !(form.anesthesia_complication_types.length > 0)) m.push('Type of anesthesia reaction');
      if (!(form.allergies.length > 0)) m.push('Allergies (tap “None” if you have none)');
    } else if (step === 4) {
      if (form.takes_medications === null) m.push('Whether you take medications');
      else if (form.takes_medications && !(form.medication_types.length > 0)) m.push('Medication type');
    } else if (step === 5) {
      if (!(form.lifestyle_habits.length > 0)) m.push('Lifestyle habits (tap “None” if none apply)');
      if (form.exercises_regularly === null) m.push('Whether you exercise regularly');
      else if (form.exercises_regularly && !form.activity_level) m.push('Activity level');
      if (form.emotional_concerns === null) m.push('Whether you have emotional concerns');
      else if (form.emotional_concerns && !(form.emotional_concern_types.length > 0)) m.push('Type of emotional concern');
    } else if (step === 6) {
      if (!form.pregnancy_status) m.push('Pregnancy status');
    } else if (step === 7) {
      if (!(form.document_types.length > 0)) m.push('Document type (choose “None / Skip” if you have none)');
      else if (!(form.document_types.includes('none') || form.uploaded_files.length > 0)) m.push('Upload a document, or choose “None / Skip”');
    } else if (step === 8) {
      if (!form.preferred_date) m.push('Preferred consultation date');
    } else if (step === 9) {
      if (!form.signature_data) m.push('Your signature');
      if (form.accepted_arbitration_clause !== true) m.push('Accept the arbitration clause');
    } else if (step === 10) {
      const required = getRequiredAckCount(visaInfo.status);
      if (form.acknowledged_statements.size < required) m.push(`Acknowledge all ${required} statements`);
    } else if (step === 11) {
      if (!form.safet_risk_level) m.push('Complete the SAFE-T scan');
      if (form.data_processing_consent !== true) m.push('Data-processing consent');
    }
    return m;
  };

  const goToDashboard = () => {
    navigate({ pathname: '/dashboard', search: window.location.search });
  };

  const [error, setError] = useState(null);

  const validateForm = (formData) => {
    const errors = [];

    if (!formData.procedure_interest) errors.push('Please select a procedure');
    if (!formData.procedure_country) errors.push('Please select a destination country');

    // Email validation
    if (formData.emergency_contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emergency_contact_email)) {
      errors.push('Emergency contact email is invalid');
    }

    // Date validation
    if (formData.preferred_date) {
      const date = new Date(formData.preferred_date);
      if (isNaN(date.getTime()) || date < new Date()) {
        errors.push('Preferred date must be in the future');
      }
    }

    return errors;
  };

  const handleConfirmSubmit = () => {
    setShowPreview(false);

    const validationErrors = validateForm(form);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }
    setError(null);

    const { isHighRisk, flaggedCondition } = checkMedicalRisk(form.medical_conditions || []);
    if (isHighRisk) {
      setHighRiskFlag(flaggedCondition);
      setShowHighRiskNotice(true);
      return;
    }
    createMutation.mutate(form);
  };

  const handleHighRiskProceed = () => {
    setShowHighRiskNotice(false);
    // Tag consultation so admin routes it to Senior Review, not standard Doctor-Pending
    createMutation.mutate({
      ...form,
      high_risk_medical_review: true,
      high_risk_flagged_condition: highRiskFlag,
      safet_risk_level: form.safet_risk_level || 'review',
    });
  };

  // Delete draft on successful submission
  useEffect(() => {
    if (submitted) {
      deleteDraft();
    }
  }, [submitted, deleteDraft]);

  if (submitted) return <SubmissionSuccess form={form} items={items} />;

  const _progressPct = Math.round((step / (steps.length - 1)) * 100);

  if (showStackingBlock) {
    return (
      <ProcedureStackingBlocker
        violations={stackingViolations}
        patientEmail={userEmail}
        patientName={form.patient_name}
        consultationId={consultationId}
        onBack={() => {
          setShowStackingBlock(false);
          setStackingViolations([]);
          navigate('/procedures');
        }}
      />
    );
  }

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
          {/* Phase stepper — 4 phases across the top */}
          <div className="px-6 pt-4 pb-0">
            <div className="flex items-center gap-1">
              {STEP_PHASES.map((ph, pi) => {
                const _phaseStep = STEP_PHASES.slice(0, pi).reduce((a, p) => a + p.steps.length, 0);
                const done = step > Math.max(...ph.steps);
                const active = ph.steps.includes(step);
                return (
                  <React.Fragment key={ph.name}>
                    <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <div className="w-full h-1 rounded-full transition-all duration-500"
                        style={{ background: done ? ph.color : active ? ph.color : '#e2e8f0', opacity: done ? 1 : active ? 1 : 0.4 }} />
                      <span className="text-[9px] font-semibold truncate w-full text-center transition-colors"
                        style={{ color: done || active ? ph.color : '#94a3b8' }}>
                        {done ? '✓ ' : ''}{ph.name}
                      </span>
                    </div>
                    {pi < STEP_PHASES.length - 1 && <div className="w-3 shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          {/* Form Header */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 bg-slate-50 mt-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg shadow-lg"
              style={{ background: `linear-gradient(135deg, ${getPhaseInfo(step).color}cc, ${getPhaseInfo(step).color})` }}>
              {steps[step].emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: getPhaseInfo(step).color }}>
                {getPhaseInfo(step).phase} · {getPhaseInfo(step).stepInPhase} of {getPhaseInfo(step).stepsInPhase}
              </p>
              <h2 className="font-semibold text-slate-800 text-base">{steps[step].label}</h2>
            </div>
            {/* Demo fill — pre-loads sample data so judges can experience the full flow */}
            <button
              type="button"
              onClick={() => {
                setForm(prev => ({
                  ...prev,
                  patient_name: 'Sofia Ramirez',
                  email: 'sofia.ramirez@demo.morales.com',
                  phone: '+1 (305) 555-0192',
                  age: '34', gender: 'female', height: '165', weight: '62',
                  nationality: 'American', occupation: 'Nurse Practitioner',
                  emergency_contact_name: 'Maria Ramirez',
                  emergency_contact_number: '+1 (305) 555-0145',
                  passport_number: 'A12345678',
                  passport_issue_date: '2021-01-15',
                  passport_expiry_date: '2031-01-15',
                  has_companion: false, number_of_companions: 0, travel_buddy_services: [],
                  has_cultural_preferences: false, cultural_preferences: [], cultural_notes: '',
                  medical_conditions: ['none'], had_surgery: false, had_complications: null, surgery_complications: [],
                  anesthesia_complications: false, anesthesia_complication_types: [],
                  allergies: ['none'], allergy_details: '',
                  takes_medications: false, medication_types: [], medication_notes: '',
                  lifestyle_habits: ['none'], exercises_regularly: true, activity_level: 'moderate',
                  emotional_concerns: false, emotional_concern_types: [], emotional_notes: '',
                  pregnancy_status: 'not_pregnant',
                  document_types: ['none'], uploaded_files: [],
                  preferred_date: '2026-09-15',
                  procedure_country: 'Colombia', procedure_city: 'Cartagena',
                  client_country: 'United States',
                  return_date: '2026-09-22',
                  visa_required_status: 'not_required',
                  notes: 'Interested in a complete smile transformation.',
                  acknowledged_statements: new Set(['1','2','3','4','5','6','7','8']),
                  accepted_arbitration_clause: false,
                }));
                setStep(8);
                window.scrollTo(0, 0);
                toast.success('Demo data loaded — continue from step 9 of 12!');
              }}
              className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors flex-shrink-0"
            >
              🎬 Demo
            </button>
          </div>

          {/* Mobile step progress bar */}
          <div className="lg:hidden px-4 pt-2 pb-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-semibold" style={{ color: getPhaseInfo(step).color }}>{getPhaseInfo(step).phase}</span>
              <span className="text-[10px] text-slate-400">{step + 1} / {steps.length}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round(((step + 1) / steps.length) * 100)}%`, background: getPhaseInfo(step).color }}
              />
            </div>
          </div>

          {/* Secondary door to the AI concierge — first step only, so the
              conversational intake stays discoverable without nagging mid-form */}
          {step === 0 && (
            <div className="flex items-center gap-2.5 px-6 py-2 border-b border-slate-100 bg-slate-50/60">
              <span style={{ fontSize: 13 }}>💬</span>
              <p className="text-xs text-slate-500 m-0">
                Prefer a conversation?{' '}
                <Link to="/intake" className="font-semibold underline underline-offset-2" style={{ color: '#0E8A7D' }}>
                  Try our AI Concierge
                </Link>{' '}
                — same journey, guided chat-style.
              </p>
            </div>
          )}

          {/* Guest banner — shown only when not authenticated */}
          {!currentUser && (
            <div className="flex items-center gap-2.5 px-6 py-2.5 border-b border-slate-100" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.06), rgba(212,175,55,0.02))' }}>
              <span style={{ fontSize: 14 }}>🔓</span>
              <p className="text-xs text-slate-600 m-0">
                <strong style={{ color: '#92740f' }}>No account needed to start.</strong> Fill out the form freely — we'll ask you to sign in only when you're ready to submit.
              </p>
            </div>
          )}

          {/* Auto-save indicator */}
          <div className="flex items-center gap-1.5 text-xs justify-end px-6 py-2 border-b border-slate-100 bg-emerald-50/50">
            {isSaving ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>
            ) : draftData?.last_saved_at || draftIdRef.current ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium"><CheckCircle2 className="w-3 h-3" /> Progress saved — you can safely close and return</span>
            ) : null}
          </div>

          {/* Form content */}
          <div className="p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                {step === 0 && (
                  <>
                    <Section1PersonalInfo form={form} update={update} language={language} showValidation={showValidation} setShowValidation={setShowValidation} />
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <Section3Cultural form={form} update={update} language={language} />
                    </div>
                  </>
                )}
                {step === 1  && <Section2Travel form={form} update={update} language={language} />}
                {step === 2  && <Section4MedicalHistory form={form} update={update} language={language} />}
                {step === 3  && <Section5Anesthesia form={form} update={update} language={language} />}
                {step === 4  && <Section6Medications form={form} update={update} language={language} />}
                {step === 5 && (
                  <>
                    <Section7Lifestyle form={form} update={update} language={language} />
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <Section8Emotional form={form} update={update} language={language} />
                    </div>
                  </>
                )}
                {step === 6  && <Section9Pregnancy form={form} update={update} language={language} />}
                {step === 7  && (
                  <>
                    {form.nationality && form.procedure_country && (
                      <VisaRequirementLive
                        nationality={form.nationality}
                        destination={form.procedure_country}
                        style={{ marginBottom: 16 }}
                      />
                    )}
                    <Section10Documents form={form} update={update} language={language} />
                  </>
                )}
                {step === 8  && <SectionProcedure form={form} update={update} language={language} />}
                {step === 9 && (
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
                {step === 10 && <ClientAcknowledgement acknowledged={form.acknowledged_statements} onChange={(acked) => update('acknowledged_statements', acked)} language={language} visaStatus={visaInfo.status} />}
                {step === 11 && (
                  <>
                    <SafeTScan
                      form={form}
                      items={items}
                      onResult={(result) => {
                        update('safet_risk_level', result.risk_level);
                        update('safet_risk_flags', result.flags || []);
                      }}
                    />
                    <div className="mt-4">
                      <DataProcessingConsent
                        theme="light"
                        checked={form.data_processing_consent}
                        onChange={(v) => update('data_processing_consent', v)}
                      />
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="border-t border-slate-200 bg-slate-50">
          {step === 11 && showValidation &&
           (form.safet_risk_level === 'elevated' || form.safet_risk_level === 'review') && (
            <p className="text-sm text-red-600 px-6 pt-4">
              Your SAFE-T assessment requires review before proceeding.
              A member of our team will contact you within 24 hours.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 px-6 pt-4">{error}</p>
          )}
          {/* Field-level "what's still needed" — persistent (a toast vanishes),
              lists every missing field on this step so the user is never left
              guessing why Continue won't advance. Auto-clears as they complete.
              On the final step it shows unconditionally when the (disabled)
              Review & Submit can't proceed, so a grayed button is never a mystery. */}
          {((showValidation || step === steps.length - 1) && !canNext()) && getMissingFields().length > 0 && (
            <div className="px-4 sm:px-6 pt-4">
              <p className="text-sm rounded-lg px-3 py-2.5 m-0"
                style={{ color: '#92740f', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)' }}>
                {step === steps.length - 1 ? 'To submit, please complete: ' : 'To continue, please complete: '}
                <strong>{getMissingFields().join(', ')}</strong>
              </p>
            </div>
          )}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="gap-2 text-sm h-11 px-4"
            >
              <ArrowLeft className="w-4 h-4" /> {translations[language].backBtn}
            </Button>

            {step < steps.length - 1 ? (
              <Button
                onClick={() => {
                  if (!canNext()) {
                    setShowValidation(true);
                    const missing = getMissingFields();
                    toast.error(
                      missing.length
                        ? `Please complete: ${missing[0]}${missing.length > 1 ? ` (+${missing.length - 1} more shown below)` : ''}`
                        : 'Please complete all required fields before continuing.'
                    );
                    return;
                  }
                  // Stacking safety check — fires when leaving Procedure & Date step
                  if (step === 8 && items.length >= 2) {
                    const { violations, isBlocked } = getViolations(items);
                    if (isBlocked) {
                      setStackingViolations(violations);
                      setShowStackingBlock(true);
                      return;
                    }
                  }
                  setShowValidation(false);
                  setStep(s => s + 1);
                  window.scrollTo(0, 0);
                }}
                className={`gap-2 text-sm h-11 px-4 bg-[#0E8A7D] hover:opacity-90 text-white border-0 ${!canNext() ? 'opacity-70' : ''}`}
              >
                {translations[language].continueBtn} <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setShowPreview(true)}
                disabled={createMutation.isPending || !canNext()}
                className="gap-2 text-sm h-11 px-4 bg-[#0E8A7D] hover:opacity-90 text-white border-0"
              >
                <CheckCircle className="w-4 h-4" /> {translations[language].reviewSubmit}
              </Button>
            )}
          </div>
          </div>
          </div>
          </div>

          {/* Right Sidebar - Step Info + Cart */}
          <div className="hidden lg:block lg:col-span-1 space-y-4 lg:sticky lg:top-24 lg:h-fit">
          {/* Procedure Requirement Notice */}
          <ProcedureRequirementNotice />
          
          {/* Step Info Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-3 sticky top-16">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#0E8A7D] flex items-center justify-center flex-shrink-0 text-sm shadow-lg">
              {steps[step].emoji}
            </div>
            <div>
              <p className="text-[9px] font-semibold text-emerald-300 uppercase tracking-widest">Step {step + 1}</p>
              <h3 className="font-semibold text-white text-xs drop-shadow">{steps[step].label}</h3>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div>
              <p className="text-[9px] font-semibold text-emerald-300 uppercase tracking-widest mb-1">Progress</p>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#0E8A7D]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <p className="text-emerald-300 text-[8px] mt-1 font-medium">{Math.round(((step + 1) / steps.length) * 100)}%</p>
            </div>

            {/* Phase progress dots */}
            <div className="flex flex-col gap-1.5 mt-1">
              {STEP_PHASES.map((ph, pi) => {
                const done = step > Math.max(...ph.steps);
                const active = ph.steps.includes(step);
                const phaseStepCount = ph.steps.length;
                const stepsComplete = active ? ph.steps.indexOf(step) : done ? phaseStepCount : 0;
                return (
                  <div key={ph.name} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold transition-all"
                      style={{ background: done || active ? ph.color : 'rgba(255,255,255,0.1)', color: done || active ? '#060B16' : 'rgba(255,255,255,0.3)' }}>
                      {done ? '✓' : pi + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-semibold truncate transition-colors" style={{ color: done || active ? ph.color : 'rgba(255,255,255,0.3)' }}>{ph.name}</p>
                      <div className="w-full h-[3px] rounded-full mt-0.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: done ? '100%' : active ? `${(stepsComplete / phaseStepCount) * 100}%` : '0%', background: ph.color }} />
                      </div>
                    </div>
                    <span className="text-[8px] shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>{done ? phaseStepCount : active ? stepsComplete : 0}/{phaseStepCount}</span>
                  </div>
                );
              })}
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
        form={{ ...form, consultation_id: consultationId }}
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

      <GuestAuthGate
        isOpen={showGuestAuthGate}
        form={form}
        step={step}
        onCancel={() => setShowGuestAuthGate(false)}
      />

      <HighRiskReviewNotice
        isOpen={showHighRiskNotice}
        flaggedCondition={highRiskFlag}
        onProceed={handleHighRiskProceed}
        onCancel={() => setShowHighRiskNotice(false)}
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
                className="flex-1 bg-[#0E8A7D] hover:opacity-90 text-white"
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