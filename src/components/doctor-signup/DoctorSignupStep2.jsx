import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { translations, procedureCategories } from '@/lib/translations';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { categoryMap, PROCEDURES_BY_CATEGORY } from '@/lib/doctorProcedures';

export default function DoctorSignupStep2({ formData, setFormData, language = 'en', onNext, onBack }) {
  const t = translations[language] || translations['en'];
  const categories = procedureCategories[language] || procedureCategories['en'];
  const [selectedCategories, setSelectedCategories] = useState(new Set(formData.selectedCategories || []));
  const [selectedProcedures, setSelectedProcedures] = useState(new Set(formData.specialties || []));

  const proceduresByCategory = PROCEDURES_BY_CATEGORY;

  const handleSelectCategory = (categoryId) => {
    const newCategories = new Set(selectedCategories);
    if (newCategories.has(categoryId)) {
      newCategories.delete(categoryId);
      // Remove procedures from this category
      const procs = proceduresByCategory[categoryId] || [];
      const newProcs = new Set(selectedProcedures);
      procs.forEach(p => newProcs.delete(p));
      setSelectedProcedures(newProcs);
    } else {
      newCategories.add(categoryId);
      // Auto-select all procedures in this category
      const procs = proceduresByCategory[categoryId] || [];
      const newProcs = new Set(selectedProcedures);
      procs.forEach(p => newProcs.add(p));
      setSelectedProcedures(newProcs);
    }
    setSelectedCategories(newCategories);
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
        selectedCategories: Array.from(selectedCategories)
      }));
      onNext();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-semibold text-foreground mb-2">{t.step2Title}</h2>
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
                selectedCategories.has(id)
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
      {selectedCategories.size > 0 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">{t.selectSpecificProcedures}</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedCategories).map(catId => (
                <div key={catId} className="w-full">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{categoryMap[catId]?.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {(proceduresByCategory[catId] || []).map((proc) => (
                      <Badge
                        key={proc}
                        onClick={() => handleToggleProcedure(proc)}
                        className={`cursor-pointer px-3 py-2 text-sm transition-all ${
                          selectedProcedures.has(proc)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        {categoryMap[catId]?.emoji} {proc}
                      </Badge>
                    ))}
                  </div>
                </div>
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
          {t.next} <ArrowRight className="w-4 h-4" /> ({selectedCategories.size} selected)
        </Button>
      </div>
    </div>
  );
}