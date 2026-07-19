// hooks/useCompanionSignup.js
import { useState, useCallback, useMemo, useEffect } from 'react';
import { ACCOUNT_TYPES, STEPS, VALIDATION_RULES, INITIAL_FORM_DATA } from '@/lib/companion/constants';
import { createCompanionProfile } from '@/lib/companion/companionService';
import { saveSignupDraft, loadSignupDraft, clearSignupDraft } from '@/lib/signupDraft';
import { friendlyError } from '@/lib/friendlyError';

/**
 * Custom hook for companion signup form logic
 * @returns {Object} Form state and handlers
 */
export function useCompanionSignup() {
  const [step, setStep] = useState(STEPS.ABOUT_YOU);
  const [accountType, setAccountType] = useState(ACCOUNT_TYPES.INDIVIDUAL);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Load saved draft on mount — synchronous so it runs before user interaction
  useEffect(() => {
    const saved = loadSignupDraft('companion');
    if (saved) {
      if (saved.data) setFormData(saved.data);
      if (saved.meta?.step != null) setStep(saved.meta.step);
      if (saved.meta?.accountType) setAccountType(saved.meta.accountType);
    }
    setDraftLoaded(true);
  }, []);

  // Auto-save draft on every change (form data, step, account type)
  useEffect(() => {
    if (draftLoaded) {
      saveSignupDraft('companion', formData, { step, accountType });
    }
  }, [formData, step, accountType, draftLoaded]);

  /**
   * Handle input field changes
   */
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Toggle language selection
   */
  const handleLanguageToggle = useCallback((lang) => {
    setFormData(prev => {
      const exists = prev.languages.includes(lang);
      return {
        ...prev,
        languages: exists 
          ? prev.languages.filter(l => l !== lang) 
          : [...prev.languages, lang]
      };
    });
  }, []);

  /**
   * Validate current step
   */
  const isStepValid = useMemo(() => {
    switch (step) {
      case STEPS.ABOUT_YOU:
        const requiredFields = [
          ...VALIDATION_RULES.required,
          ...(accountType === ACCOUNT_TYPES.INDIVIDUAL 
            ? VALIDATION_RULES.individual 
            : VALIDATION_RULES.agency)
        ];
        return requiredFields.every(field => {
          const value = formData[field];
          return Array.isArray(value) ? value.length > 0 : !!value;
        });

      case STEPS.EXPERIENCE:
        return formData.languages.length > 0;

      case STEPS.AVAILABILITY:
        return true;

      default:
        return false;
    }
  }, [step, accountType, formData]);

  /**
   * Navigate to next step
   */
  const goToNextStep = useCallback(() => {
    if (isStepValid && step < STEPS.AVAILABILITY) {
      setStep(prev => prev + 1);
    }
  }, [isStepValid, step]);

  /**
   * Navigate to previous step
   */
  const goToPreviousStep = useCallback(() => {
    if (step > STEPS.ABOUT_YOU) {
      setStep(prev => prev - 1);
    }
  }, [step]);

  /**
   * Submit form
   */
  const submitForm = useCallback(async () => {
    if (!isStepValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createCompanionProfile(formData, accountType);
      clearSignupDraft('companion');
      return { success: true };
    } catch (err) {
      const message = friendlyError(err, 'We could not create your profile. Your details are still on screen — please try again.', 'useCompanionSignup');
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, accountType, isStepValid]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setStep(STEPS.ABOUT_YOU);
    setAccountType(ACCOUNT_TYPES.INDIVIDUAL);
    setFormData(INITIAL_FORM_DATA);
    setIsSubmitting(false);
    setError(null);
    clearSignupDraft('companion');
  }, []);

  return {
    // State
    step,
    accountType,
    formData,
    isSubmitting,
    error,
    isStepValid,

    // Actions
    setAccountType,
    handleInputChange,
    handleLanguageToggle,
    goToNextStep,
    goToPreviousStep,
    submitForm,
    resetForm,
  };
}