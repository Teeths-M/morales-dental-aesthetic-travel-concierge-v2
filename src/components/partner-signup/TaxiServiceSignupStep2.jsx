import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ChevronLeft, Plus, Minus } from 'lucide-react';

// Platform operating node configuration
const ORIGIN_COUNTRIES = ['Trinidad and Tobago', 'Jamaica', 'Barbados', 'Guyana', 'Suriname'];
const DESTINATION_COUNTRIES = ['Venezuela', 'Colombia', 'Mexico', 'Dominican Republic', 'Panama', 'Costa Rica'];

const ORIGIN_LEGS = [
  { key: 'leg_1_rate', label: 'Leg 1: Outbound Departure (Home to Airport)', labelEs: 'Leg 1: Salida de Ida (Casa al Aeropuerto)', sublabel: 'Client departs home country' },
  { key: 'leg_2_rate', label: 'Leg 2: Inbound Return (Airport to Home)', labelEs: 'Leg 2: Vuelta de Regreso (Aeropuerto a Casa)', sublabel: 'Client returns home' },
];

const DESTINATION_LEGS = [
  { key: 'leg_3_rate', label: 'Leg 1: Arrival Greeting (Airport to Hotel)', labelEs: 'Leg 1: Bienvenida a la Llegada (Aeropuerto al Hotel)', sublabel: 'Patient arrives at destination' },
  { key: 'leg_4_rate', label: 'Leg 2: Clinical Outbound (Hotel to Clinic)', labelEs: 'Leg 2: Salida Clínica (Hotel a la Clínica)', sublabel: 'Day of procedure transport' },
  { key: 'leg_5_rate', label: 'Leg 3: Post-Op Return (Clinic to Hotel)', labelEs: 'Leg 3: Vuelta Post-Operatoria (Clínica al Hotel)', sublabel: 'After procedure recovery transfer' },
  { key: 'leg_6_rate', label: 'Leg 4: Final Departure (Hotel to Airport)', labelEs: 'Leg 4: Salida Final (Hotel al Aeropuerto de Destino)', sublabel: 'Patient departs destination country' },
];

export default function TaxiServiceSignupStep2({ formData, setFormData, language, onNext, onBack }) {
  const [operatingDays, setOperatingDays] = useState(formData.operating_hours?.days || {});
  const [hours, setHours] = useState(formData.operating_hours?.hours || '24h');
  const [pricingModel, setPricingModel] = useState(formData.pricing_model || {});

  const operatingCountry = formData.operating_country || '';
  const driverRegionType = ORIGIN_COUNTRIES.includes(operatingCountry)
    ? 'origin'
    : DESTINATION_COUNTRIES.includes(operatingCountry)
    ? 'destination'
    : 'other';

  const activeLegKeys = driverRegionType === 'origin'
    ? ORIGIN_LEGS.map(l => l.key)
    : driverRegionType === 'destination'
    ? DESTINATION_LEGS.map(l => l.key)
    : [];

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day) => setOperatingDays(prev => ({ ...prev, [day]: !prev[day] }));

  const updatePrice = (key, value) => setPricingModel(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  const incrementPrice = (key, step = 5) => updatePrice(key, (pricingModel[key] || 0) + step);
  const decrementPrice = (key, step = 5) => updatePrice(key, Math.max(0, (pricingModel[key] || 0) - step));

  const handleNext = () => {
    setFormData(prev => ({
      ...prev,
      operating_hours: { days: operatingDays, hours },
      pricing_model: pricingModel,
    }));
    onNext();
  };

  const allDaysSelected = days.every(d => operatingDays[d]);
  const hasLegPricing = activeLegKeys.some(k => (pricingModel[k] || 0) > 0);
  const canContinue = allDaysSelected && (driverRegionType === 'other' || hasLegPricing);

  const LegRow = ({ legKey, label, labelEs, sublabel }) => (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
      <div className="flex-1 mr-4">
        <p className="text-sm font-semibold text-foreground">
          {language === 'es' ? labelEs : label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{sublabel} — <span className="font-medium text-foreground">${pricingModel[legKey] || 0} USD</span></p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => decrementPrice(legKey)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <Input
          type="number"
          value={pricingModel[legKey] || 0}
          onChange={e => updatePrice(legKey, e.target.value)}
          className="w-20 text-center text-sm font-semibold h-8"
          step="5"
          min="0"
        />
        <button
          onClick={() => incrementPrice(legKey)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-semibold text-foreground mb-2">
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
            {['24h', 'custom'].map(opt => (
              <button
                key={opt}
                onClick={() => setHours(opt)}
                className={`flex-1 p-3 rounded-lg border-2 transition-all font-medium text-sm ${
                  hours === opt
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-border bg-card text-foreground hover:border-blue-300'
                }`}
              >
                {opt === '24h' ? (language === 'es' ? '24 horas' : '24h') : (language === 'es' ? 'Personalizado' : language === 'fr' ? 'Personnalisé' : 'Custom')}
              </button>
            ))}
          </div>
        </div>

        {/* IQ200 Dynamic Leg Pricing */}
        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-foreground">💰 {language === 'es' ? 'Modelo de Precios' : language === 'fr' ? 'Modèle de Tarification' : 'Pricing Model'}</label>
            {driverRegionType !== 'other' && (
              <span className={`text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                driverRegionType === 'origin'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {driverRegionType === 'origin' ? '🏠 Origin Driver — 2 Legs' : '✈️ Destination Driver — 4 Legs'}
              </span>
            )}
          </div>

          {driverRegionType === 'origin' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground mb-3">
                Your operating country <strong>({operatingCountry})</strong> is a client origin market. Price the 2 home-country transit legs below.
              </p>
              {ORIGIN_LEGS.map(leg => <LegRow key={leg.key} {...leg} legKey={leg.key} />)}
            </div>
          )}

          {driverRegionType === 'destination' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground mb-3">
                Your operating country <strong>({operatingCountry})</strong> is a procedure destination market. Price all 4 in-country transit legs below.
              </p>
              {DESTINATION_LEGS.map(leg => <LegRow key={leg.key} {...leg} legKey={leg.key} />)}
            </div>
          )}

          {driverRegionType === 'other' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Region Not Yet Configured</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                {operatingCountry
                  ? `"${operatingCountry}" is not currently mapped to an origin or destination market. You can continue — pricing will be configured by admin after review.`
                  : 'Complete Step 1 with your operating country to unlock leg-based pricing.'}
              </p>
            </div>
          )}

          {/* Live Total */}
          {driverRegionType !== 'other' && hasLegPricing && (
            <div className="mt-4 flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
              <span className="text-sm font-semibold text-foreground">
                {driverRegionType === 'origin' ? 'Round-Trip Total' : 'Full Transit Package'}
              </span>
              <span className="text-lg font-semibold text-primary">
                ${activeLegKeys.reduce((sum, k) => sum + (pricingModel[k] || 0), 0).toFixed(2)} USD
              </span>
            </div>
          )}
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