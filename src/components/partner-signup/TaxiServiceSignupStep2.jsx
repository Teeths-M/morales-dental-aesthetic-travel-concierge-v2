import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ChevronLeft, Plus, Minus } from 'lucide-react';
import { translations } from '@/lib/translations';

export default function TaxiServiceSignupStep2({ formData, setFormData, language, onNext, onBack }) {
  const t = translations[language];
  const [operatingDays, setOperatingDays] = useState(formData.operating_hours?.days || {});
  const [hours, setHours] = useState(formData.operating_hours?.hours || '24h');
  const [pricingModel, setPricingModel] = useState(formData.pricing_model || {});

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day) => {
    setOperatingDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const updatePrice = (key, value) => {
    setPricingModel(prev => ({
      ...prev,
      [key]: parseFloat(value) || 0
    }));
  };

  const handleNext = () => {
    setFormData(prev => ({
      ...prev,
      operating_hours: {
        days: operatingDays,
        hours
      },
      pricing_model: pricingModel
    }));
    onNext();
  };

  const allDaysSelected = days.every(d => operatingDays[d]);
  const hasAnyPricing = Object.values(pricingModel).some(p => p > 0);
  const canContinue = allDaysSelected && hasAnyPricing;

  const incrementPrice = (key, step = 1) => {
    updatePrice(key, (pricingModel[key] || 0) + step);
  };

  const decrementPrice = (key, step = 1) => {
    updatePrice(key, Math.max(0, (pricingModel[key] || 0) - step));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">
          {language === 'es' ? 'Disponibilidad y Precios' : language === 'fr' ? 'Disponibilité et Tarifs' : 'Availability & Pricing'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {language === 'es' ? 'Cuéntanos cuándo y cómo transportas pacientes.' : language === 'fr' ? 'Dites-nous quand et comment vous transportez les patients.' : 'Tell us when and how you transport patients.'}
        </p>
      </div>

      <div className="space-y-6">
        {/* Operating Days */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">📅 {language === 'es' ? 'Días de Operación' : language === 'fr' ? 'Jours d\'Opération' : 'Operating Days'}</label>
          <div className="grid grid-cols-4 gap-2">
            {days.map(day => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`p-2 rounded-lg border-2 transition-all text-sm font-medium ${
                  operatingDays[day]
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-border bg-card text-foreground hover:border-blue-300'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Operating Hours */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">⏰ {language === 'es' ? 'Horario' : language === 'fr' ? 'Heures' : 'Hours'}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setHours('24h')}
              className={`flex-1 p-3 rounded-lg border-2 transition-all font-medium text-sm ${
                hours === '24h'
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-border bg-card text-foreground hover:border-blue-300'
              }`}
            >
              24{language === 'es' ? ' horas' : language === 'fr' ? ' heures' : 'h'}
            </button>
            <button
              onClick={() => setHours('custom')}
              className={`flex-1 p-3 rounded-lg border-2 transition-all font-medium text-sm ${
                hours === 'custom'
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-border bg-card text-foreground hover:border-blue-300'
              }`}
            >
              {language === 'es' ? 'Personalizado' : language === 'fr' ? 'Personnalisé' : 'Custom'}
            </button>
          </div>
        </div>

        {/* Pricing */}
        <div className="border-t border-border pt-6">
          <label className="text-sm font-medium text-foreground mb-4 block">💰 {language === 'es' ? 'Modelo de Precios' : language === 'fr' ? 'Modèle de Tarification' : 'Pricing Model'}</label>
          
          <div className="space-y-4">
            {/* Per KM */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">{language === 'es' ? 'Por Kilómetro' : language === 'fr' ? 'Par Kilomètre' : 'Per Kilometer'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">${pricingModel.per_km || 0}/km</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => decrementPrice('per_km', 0.5)} className="p-2 hover:bg-secondary rounded">
                  <Minus className="w-4 h-4" />
                </button>
                <Input
                  type="number"
                  value={pricingModel.per_km || 0}
                  onChange={(e) => updatePrice('per_km', e.target.value)}
                  className="w-16 text-center text-sm"
                  step="0.5"
                />
                <button onClick={() => incrementPrice('per_km', 0.5)} className="p-2 hover:bg-secondary rounded">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Per Hour */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">{language === 'es' ? 'Por Hora' : language === 'fr' ? 'Par Heure' : 'Per Hour'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">${pricingModel.per_hour || 0}/hr</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => decrementPrice('per_hour', 1)} className="p-2 hover:bg-secondary rounded">
                  <Minus className="w-4 h-4" />
                </button>
                <Input
                  type="number"
                  value={pricingModel.per_hour || 0}
                  onChange={(e) => updatePrice('per_hour', e.target.value)}
                  className="w-16 text-center text-sm"
                  step="1"
                />
                <button onClick={() => incrementPrice('per_hour', 1)} className="p-2 hover:bg-secondary rounded">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Fixed Rate */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">{language === 'es' ? 'Tarifa Fija Aeropuerto-Clínica' : language === 'fr' ? 'Tarif Fixe Aéroport-Clinique' : 'Fixed Airport-Clinic Rate'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">${pricingModel.fixed_airport_clinic || 0}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => decrementPrice('fixed_airport_clinic', 5)} className="p-2 hover:bg-secondary rounded">
                  <Minus className="w-4 h-4" />
                </button>
                <Input
                  type="number"
                  value={pricingModel.fixed_airport_clinic || 0}
                  onChange={(e) => updatePrice('fixed_airport_clinic', e.target.value)}
                  className="w-16 text-center text-sm"
                  step="5"
                />
                <button onClick={() => incrementPrice('fixed_airport_clinic', 5)} className="p-2 hover:bg-secondary rounded">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={onBack} variant="outline" className="flex-1 h-12">
          <ChevronLeft className="w-4 h-4" /> {language === 'es' ? 'Atrás' : language === 'fr' ? 'Retour' : 'Back'}
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canContinue}
          className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white gap-2"
        >
          {language === 'es' ? 'Siguiente' : language === 'fr' ? 'Suivant' : 'Next'} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}