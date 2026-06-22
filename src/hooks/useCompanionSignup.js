// hooks/useCompanionSignup.js
import { useState, useCallback, useMemo } from 'react';
import { ACCOUNT_TYPES, STEPS, VALIDATION_RULES, INITIAL_FORM_DATA } from '@/lib/companion/constants';
import { createCompanionProfile } from '@/lib/companion/companionService';

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
      return { success: true };
    } catch (err) {
      console.error('Companion signup error:', err);
      setError(err.message || 'Failed to create profile');
      return { success: false, error: err.message };
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