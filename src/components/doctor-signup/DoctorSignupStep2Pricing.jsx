import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { translations } from '@/lib/translations';

const CATEGORY_MAP = {
  dental: { label: 'Dental', emoji: '🦷' },
  cosmetic: { label: 'Cosmetic Surgery', emoji: '💄' },
  weight_loss: { label: 'Weight Loss', emoji: '⚖️' },
  orthopedics: { label: 'Orthopedics', emoji: '🦴' },
  cardiology: { label: 'Cardiology', emoji: '❤️' },
  ophthalmology: { label: 'Ophthalmology', emoji: '👁️' },
  gynecology: { label: 'Gynecology', emoji: '🤰' },
  oncology: { label: 'Oncology', emoji: '🔬' },
};

const PROCEDURES_BY_CATEGORY = {
  dental: ['Dental Implants', 'All-on-4', 'Porcelain Veneers', 'Smile Makeover', 'Bone Regeneration', 'Teeth Whitening'],
  cosmetic: ['Rhinoplasty', 'Breast Surgery', 'Liposuction', 'Tummy Tuck', 'Facelift', 'Brow Lift', 'Blepharoplasty'],
  weight_loss: ['Gastric Sleeve', 'Gastric Bypass', 'Gastric Band Revision'],
  orthopedics: ['Joint Replacement', 'Spine Surgery', 'Sports Arthroscopy', 'Fracture Surgery'],
  cardiology: ['Cardiac Surgery', 'Angioplasty', 'Valve Replacement'],
  ophthalmology: ['LASIK', 'Cataract Surgery', 'Corneal Transplant'],
  gynecology: ['Hysterectomy', 'Fibroid Removal', 'Laparoscopy'],
  oncology: ['Tumor Removal', 'Cancer Screening', 'Biopsy'],
};

export default function DoctorSignupStep2Pricing({ formData, setFormData, language, onNext, onBack }) {
  const t = translations[language];
  const [prices, setPrices] = useState(formData.procedurePrices || {});
  const [hoveredProcedure, setHoveredProcedure] = useState(null);

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

  const selectedCategories = new Set(formData.selectedCategories || []);
  const selectedProcedures = new Set(formData.specialties || []);
  const allSelectedProcedures = Array.from(selectedCategories)
    .flatMap(catId => PROCEDURES_BY_CATEGORY[catId] || [])
    .filter(proc => selectedProcedures.has(proc));

  const allPricesSet = allSelectedProcedures.every(proc => prices[proc] && prices[proc] > 0);

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
        {Array.from(selectedCategories).map(catId => {
          const categoryProcedures = (PROCEDURES_BY_CATEGORY[catId] || []).filter(proc => 
            selectedProcedures.has(proc)
          );

          if (categoryProcedures.length === 0) return null;

          return (
            <div key={catId} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <span className="text-2xl">{CATEGORY_MAP[catId]?.emoji}</span>
                <h3 className="font-semibold text-foreground">{CATEGORY_MAP[catId]?.label}</h3>
              </div>

              <div className="space-y-2">
                {categoryProcedures.map(procedure => (
                  <div 
                    key={procedure}
                    className="relative"
                    onMouseEnter={() => setHoveredProcedure(procedure)}
                    onMouseLeave={() => setHoveredProcedure(null)}
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all cursor-pointer">
                      <span className="text-sm font-medium text-foreground">{procedure}</span>
                      {prices[procedure] && (
                        <span className="text-sm font-semibold text-primary">${prices[procedure]}</span>
                      )}
                    </div>
                    
                    {/* Hover Popover Box */}
                    {hoveredProcedure === procedure && (
                      <div className="absolute right-0 top-full mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-white border-2 border-primary rounded-lg shadow-lg p-4 min-w-72">
                          <p className="text-sm font-medium text-foreground mb-3">{procedure}</p>
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Enter price (USD)</label>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold text-muted-foreground">$</span>
                              <Input
                                type="number"
                                autoFocus
                                placeholder="0"
                                min="0"
                                step="100"
                                value={prices[procedure] || ''}
                                onChange={(e) => handlePriceChange(procedure, e.target.value)}
                                className="text-lg font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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