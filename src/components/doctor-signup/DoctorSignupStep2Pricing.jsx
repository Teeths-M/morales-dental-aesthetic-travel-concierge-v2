import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { translations, procedureCategories } from '@/lib/translations';

const categoryMap = {
  'dental-general': { emoji: '🦷', label: 'General Dentistry' },
  'dental-cosmetic': { emoji: '✨', label: 'Cosmetic Dentistry' },
  'dental-implants': { emoji: '🔩', label: 'Implant Dentistry' },
  'dental-orthodontics': { emoji: '😁', label: 'Orthodontics' },
  'aesthetic-face': { emoji: '💆', label: 'Facial Aesthetics' },
  'aesthetic-body': { emoji: '💪', label: 'Body Contouring' },
  'aesthetic-breast': { emoji: '🌸', label: 'Breast Surgery' },
  'wellness': { emoji: '🌿', label: 'Wellness & Regenerative' },
};

const PROCEDURES_BY_CATEGORY = {
  'dental-general': [
    'Dental Cleaning', 'Deep Cleaning', 'Dental Exam', 'Dental X-Rays', 'Fillings',
    'Tooth Extraction', 'Wisdom Tooth Removal', 'Root Canal Treatment', 'Dental Crowns',
    'Dental Bridges', 'Dentures', 'Partial Dentures', 'Inlays & Onlays'
  ],
  'dental-cosmetic': [
    'Teeth Whitening', 'Porcelain Veneers', 'Composite Bonding', 'Smile Makeover',
    'Gum Contouring', 'Hollywood Smile'
  ],
  'dental-implants': [
    'Single Dental Implant', 'Multiple Dental Implants', 'Full Mouth Implants',
    'All-on-4 Implants', 'All-on-6 Implants', 'Implant-Supported Dentures', 'Bone Grafting', 'Sinus Lift'
  ],
  'dental-orthodontics': [
    'Braces', 'Invisalign', 'Clear Aligners', 'Retainers'
  ],
  'aesthetic-face': [
    'Rhinoplasty', 'Facelift', 'Neck Lift', 'Eyelid Surgery', 'Chin Augmentation',
    'Buccal Fat Removal', 'Lip Lift', 'Botox', 'Dermal Fillers'
  ],
  'aesthetic-body': [
    'Liposuction', 'Tummy Tuck', 'Mommy Makeover', 'Brazilian Butt Lift', 'Body Contouring',
    'Arm Lift', 'Thigh Lift'
  ],
  'aesthetic-breast': [
    'Breast Augmentation', 'Breast Lift', 'Breast Reduction', 'Breast Revision'
  ],
  'wellness': [
    'IV Therapy', 'Stem Cell Therapy', 'PRP Therapy', 'Hormone Therapy',
    'Medical Weight Loss', 'Nutritional Programs', 'Recovery Therapy'
  ],
};

export default function DoctorSignupStep2Pricing({ formData, setFormData, language, onNext, onBack }) {
  const t = translations[language];
  const [prices, setPrices] = useState(formData.procedurePrices || {});

  const handlePriceChange = (procedure, value) => {
    const numValue = value ? parseFloat(value) : '';
    setPrices(prev => ({
      ...prev,
      [procedure]: numValue
    }));
  };

  const handleNext = () => {
    setFormData(prev => ({
      ...prev,
      procedurePrices: prices
    }));
    onNext();
  };

  const selectedCategories = formData.selectedCategories || [];
  const selectedProcedures = new Set(formData.specialties || []);
  
  // Get all selected procedures from selected categories
  const allSelectedProcedures = selectedCategories
    .flatMap(catId => PROCEDURES_BY_CATEGORY[catId] || [])
    .filter(proc => selectedProcedures.has(proc));

  const allPricesSet = allSelectedProcedures.length === 0 || allSelectedProcedures.every(proc => prices[proc] && prices[proc] > 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">Set Procedure Prices</h2>
        <p className="text-muted-foreground text-sm">
          Enter base prices for each of your selected procedures. These will be used to estimate costs for patients.
        </p>
      </div>

      {/* Procedures Grid */}
      <div className="space-y-6">
        {selectedCategories.map(catId => {
          const categoryProcedures = (PROCEDURES_BY_CATEGORY[catId] || []).filter(proc => 
            selectedProcedures.has(proc)
          );

          if (categoryProcedures.length === 0) return null;

          return (
            <div key={catId} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <span className="text-2xl">{categoryMap[catId]?.emoji}</span>
                <h3 className="font-semibold text-foreground">{categoryMap[catId]?.label}</h3>
              </div>

              <div className="space-y-2">
                {categoryProcedures.map(procedure => (
                  <div 
                    key={procedure}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-all"
                  >
                    <span className="text-sm font-medium text-foreground">{procedure}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="100"
                        value={prices[procedure] || ''}
                        onChange={(e) => handlePriceChange(procedure, e.target.value)}
                        className="w-28 text-right text-sm font-semibold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {allPricesSet && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-sm font-medium text-emerald-900">
            ✓ All {allSelectedProcedures.length} procedures priced and ready to go!
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1 h-12"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!allPricesSet}
          className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white gap-2"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}