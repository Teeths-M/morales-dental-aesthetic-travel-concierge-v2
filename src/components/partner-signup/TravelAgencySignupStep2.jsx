import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { translations } from '@/lib/translations';

const SERVICES = {
  flights: {
    icon: '✈️',
    name_en: 'Flights',
    name_es: 'Vuelos',
    name_fr: 'Vols',
    options: ['Economy', 'Business', 'First', 'Group rates']
  },
  hotels: {
    icon: '🏨',
    name_en: 'Hotels',
    name_es: 'Hoteles',
    name_fr: 'Hôtels',
    options: ['3-star', '4-star', '5-star', 'Extended stay']
  },
  transfers: {
    icon: '🚗',
    name_en: 'Airport Transfers',
    name_es: 'Traslados',
    name_fr: 'Transferts',
    options: ['Sedan', 'SUV', 'Van', 'Wheelchair accessible']
  },
  clinic: {
    icon: '🏥',
    name_en: 'Clinic Coordination',
    name_es: 'Coordinación Clínica',
    name_fr: 'Coordination Clinique',
    options: ['Appointment scheduling', 'Translation services']
  }
};

export default function TravelAgencySignupStep2({ formData, setFormData, language, onNext, onBack }) {
  const _t = translations[language];
  const [selectedServices, setSelectedServices] = useState(new Set(formData.services_offered || []));
  const [selectedOptions, setSelectedOptions] = useState(formData.service_options || {});

  const getServiceName = (key) => {
    const service = SERVICES[key];
    if (language === 'es') return service.name_es;
    if (language === 'fr') return service.name_fr;
    return service.name_en;
  };

  const toggleService = (service) => {
    const newSelected = new Set(selectedServices);
    if (newSelected.has(service)) {
      newSelected.delete(service);
    } else {
      newSelected.add(service);
    }
    setSelectedServices(newSelected);
  };

  const toggleOption = (service, option) => {
    const serviceOptions = selectedOptions[service] || [];
    const newOptions = serviceOptions.includes(option)
      ? serviceOptions.filter(o => o !== option)
      : [...serviceOptions, option];
    setSelectedOptions(prev => ({ ...prev, [service]: newOptions }));
  };

  const handleNext = () => {
    setFormData(prev => ({
      ...prev,
      services_offered: Array.from(selectedServices),
      service_options: selectedOptions
    }));
    onNext();
  };

  const canContinue = selectedServices.size > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-semibold text-foreground mb-2">
          {language === 'es' ? '¿Qué puedes reservar?' : language === 'fr' ? 'Que pouvez-vous réserver?' : 'What can you book?'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {language === 'es' ? 'Selecciona todos los que apliquen.' : language === 'fr' ? 'Sélectionnez tous les éléments applicables.' : 'Select all that apply.'}
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(SERVICES).map(([key, service]) => (
            <button
              key={key}
              onClick={() => toggleService(key)}
              className={`p-4 rounded-xl border-2 transition-all text-center font-medium ${
                selectedServices.has(key)
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-border bg-card text-foreground hover:border-emerald-300'
              }`}
            >
              <div className="text-2xl mb-1">{service.icon}</div>
              <div className="text-sm">{getServiceName(key)}</div>
            </button>
          ))}
        </div>

        {/* Options for selected services */}
        {Array.from(selectedServices).map(serviceKey => (
          <div key={serviceKey} className="border-t border-border pt-6">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="text-xl">{SERVICES[serviceKey].icon}</span>
              {language === 'es' ? 'Opciones para ' : language === 'fr' ? 'Options pour ' : 'Options for '} {getServiceName(serviceKey)}:
            </p>
            <div className="flex flex-wrap gap-2">
              {SERVICES[serviceKey].options.map(option => (
                <button
                  key={option}
                  onClick={() => toggleOption(serviceKey, option)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    (selectedOptions[serviceKey] || []).includes(option)
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border bg-secondary text-foreground hover:border-primary/50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button onClick={onBack} variant="outline" className="flex-1 h-12">
          <ChevronLeft className="w-4 h-4" /> {language === 'es' ? 'Atrás' : language === 'fr' ? 'Retour' : 'Back'}
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canContinue}
          className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white gap-2"
        >
          {language === 'es' ? 'Siguiente' : language === 'fr' ? 'Suivant' : 'Next'} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}