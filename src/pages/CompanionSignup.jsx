// pages/CompanionSignup.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '@/components/nav/BackButton';
import { useCompanionSignup } from '@/hooks/useCompanionSignup';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, User, Save } from 'lucide-react';
import { ACCOUNT_TYPES, STEPS } from '@/lib/companion/constants';
import { getDraftAge } from '@/lib/signupDraft';
import { AccountTypeSelector } from '@/components/companion/AccountTypeSelector';
import { AboutYouForm } from '@/components/companion/AboutYouForm';
import { ExperienceForm } from '@/components/companion/ExperienceForm';
import { AvailabilityForm } from '@/components/companion/AvailabilityForm';
import { ProgressSteps } from '@/components/companion/ProgressSteps';

/**
 * Companion Signup Page - Production Refactored Version
 * 
 * Architecture:
 * - Custom hook (useCompanionSignup) for all form logic
 * - Service layer (companionService) for API calls
 * - Constants file for magic strings/values
 * - Separated components for each step
 * - Proper error handling and validation
 */
export default function CompanionSignup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    step,
    accountType,
    formData,
    isSubmitting,
    isStepValid,
    setAccountType,
    handleInputChange,
    handleLanguageToggle,
    goToNextStep,
    goToPreviousStep,
    submitForm,
  } = useCompanionSignup();

  const handleSubmit = async () => {
    const result = await submitForm();
    
    if (result.success) {
      toast({
        title: 'Welcome!',
        description: accountType === ACCOUNT_TYPES.INDIVIDUAL 
          ? 'Your caregiver profile is created.' 
          : 'Your agency profile is created.',
      });
      navigate('/companion-dashboard');
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to create profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const renderStep = () => {
    switch (step) {
      case STEPS.ABOUT_YOU:
        return (
          <>
            <AccountTypeSelector
              accountType={accountType}
              onAccountTypeChange={setAccountType}
            />
            <AboutYouForm
              accountType={accountType}
              formData={formData}
              onInputChange={handleInputChange}
            />
          </>
        );
      case STEPS.EXPERIENCE:
        return (
          <ExperienceForm
            formData={formData}
            onInputChange={handleInputChange}
            onLanguageToggle={handleLanguageToggle}
          />
        );
      case STEPS.AVAILABILITY:
        return (
          <AvailabilityForm
            formData={formData}
            onInputChange={handleInputChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <BackButton fallback="/register-role" className="mb-4" />
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border-4 border-emerald-300 mb-4">
            <User className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-display font-semibold text-foreground mb-2">
            {accountType === ACCOUNT_TYPES.INDIVIDUAL 
              ? 'Join Our Caregiver Family 💚' 
              : 'Partner With Us 🤝'}
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto">
            {accountType === ACCOUNT_TYPES.INDIVIDUAL 
              ? 'Mothers and caregivers 40+ — turn your caring heart into meaningful work' 
              : 'Agencies & tour guides — provide exceptional companion services'}
          </p>
        </div>

        {/* Draft Saved Indicator */}
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center gap-2">
          <Save className="w-3 h-3 text-blue-600" />
          <span className="text-xs text-blue-700 font-medium">
            Progress saved {getDraftAge('companion') || 'just now'} — you can continue later
          </span>
        </div>

        {/* Progress Steps */}
        <ProgressSteps currentStep={step} />

        {/* Form Card */}
        <Card className="border-2 border-emerald-200 shadow-xl">
          <CardContent className="pt-6">
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 gap-4">
              {step > STEPS.ABOUT_YOU && (
                <Button variant="outline" data-testid="companion-back" onClick={goToPreviousStep}>
                  ← Back
                </Button>
              )}
              
              {step < STEPS.AVAILABILITY ? (
                <Button 
                  data-testid="companion-next"
                  onClick={goToNextStep} 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={!isStepValid}
                >
                  Next Step →
                </Button>
              ) : (
                <Button 
                  data-testid="companion-submit"
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !isStepValid}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  {isSubmitting ? 'Creating Your Profile...' : 'Complete Registration ✨'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trust Badge */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Safe, verified, and trusted by families worldwide
          </p>
        </div>
      </div>
    </div>
  );
}