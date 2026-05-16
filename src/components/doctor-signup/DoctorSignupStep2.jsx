import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { translations, procedureCategories } from '@/lib/translations';
import { ArrowRight, ChevronLeft } from 'lucide-react';

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

export default function DoctorSignupStep2({ formData, setFormData, language, onNext, onBack }) {
  const t = translations[language];
  const categories = procedureCategories[language];
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProcedures, setSelectedProcedures] = useState(new Set());

  const proceduresByCategory = {
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

  const handleSelectCategory = (categoryId) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      setSelectedProcedures(new Set());
    } else {
      setSelectedCategory(categoryId);
      // Auto-select all procedures in this category
      const procs = proceduresByCategory[categoryId] || [];
      setSelectedProcedures(new Set(procs));
    }
  };

  const handleToggleProcedure = (proc) => {
    const newSet = new Set(selectedProcedures);
    if (newSet.has(proc)) {
      newSet.delete(proc);
    } else {
      newSet.add(proc);
    }
    setSelectedProcedures(newSet);
  };

  const handleNext = () => {
    if (selectedProcedures.size > 0) {
      setFormData(prev => ({
        ...prev,
        specialties: Array.from(selectedProcedures),
        selectedCategory: selectedCategory
      }));
      onNext();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">{t.step2Title}</h2>
        <p className="text-muted-foreground text-sm">{t.step2Subtitle}</p>
      </div>

      {/* Category Grid */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(categoryMap).map(([id, cat]) => (
            <button
              key={id}
              onClick={() => handleSelectCategory(id)}
              className={`p-4 rounded-lg border-2 transition-all text-center space-y-2 ${
                selectedCategory === id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              <div className="text-3xl">{cat.emoji}</div>
              <div className="text-sm font-medium text-foreground">{cat.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Procedure Chips */}
      {selectedCategory && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">{t.selectSpecificProcedures}</p>
            <div className="flex flex-wrap gap-2">
              {(proceduresByCategory[selectedCategory] || []).map((proc) => (
                <Badge
                  key={proc}
                  onClick={() => handleToggleProcedure(proc)}
                  className={`cursor-pointer px-3 py-2 text-sm transition-all ${
                    selectedProcedures.has(proc)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {categoryMap[selectedCategory]?.emoji} {proc}
                </Badge>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t.dontWorry}</p>
        </div>
      )}

      {/* Selected Summary */}
      {selectedProcedures.size > 0 && (
        <div className="bg-secondary/50 border border-secondary rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-2">{t.youPicked}:</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedProcedures).map((proc) => (
              <Badge key={proc} variant="outline" className="bg-card">
                {proc}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1 h-12"
        >
          <ChevronLeft className="w-4 h-4" /> {t.back}
        </Button>
        <Button
          onClick={handleNext}
          disabled={selectedProcedures.size === 0}
          className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white gap-2"
        >
          {t.next} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}