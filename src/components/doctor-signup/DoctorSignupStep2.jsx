import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { translations, procedureCategories } from '@/lib/translations';
import { ArrowRight, ChevronLeft } from 'lucide-react';

export default function DoctorSignupStep2({ formData, setFormData, language, onNext, onBack }) {
  const t = translations[language];
  const categories = procedureCategories[language];
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProcedures, setSelectedProcedures] = useState(new Set());

  // Mock procedure list - in real app, fetch from MasterProcedure entity
  const proceduresByCategory = {
    dental: ['Implants', 'Root canal', 'Crowns', 'Whitening', 'Extractions'],
    cardiology: ['Bypass', 'Angioplasty', 'Valve replacement', 'Stent placement'],
    orthopedics: ['Knee replacement', 'Hip replacement', 'Arthroscopy', 'Fracture repair'],
    ophthalmology: ['LASIK', 'Cataract', 'Corneal transplant', 'Glaucoma surgery'],
    neurology: ['Spine surgery', 'Brain tumor', 'Epilepsy surgery', 'Aneurysm repair'],
    fertility: ['IVF', 'Egg freezing', 'Embryo transfer', 'Sperm extraction'],
    general: ['Hernia repair', 'Gallbladder removal', 'Appendectomy', 'Tumor removal'],
    cosmetic: ['BBL', 'Rhinoplasty', 'Facelift', 'Breast augmentation'],
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
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleSelectCategory(cat.id)}
              className={`p-4 rounded-lg border-2 transition-all text-center space-y-2 ${
                selectedCategory === cat.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              <div className="text-3xl">{cat.emoji}</div>
              <div className="text-sm font-medium text-foreground">{cat.name}</div>
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
                  {categories.find(c => c.id === selectedCategory)?.emoji} {proc}
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