import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { translations } from '@/lib/translations';

const REGIONS = ['Caribbean', 'North America', 'Central America', 'South America', 'Europe', 'Middle East', 'Asia', 'Africa'];

export default function TravelAgencySignupStep1({ formData, setFormData, language, onNext }) {
  const t = translations[language];
  const [agencies, setAgencies] = useState(formData.service_regions || []);

  const toggleRegion = (region) => {
    setAgencies(prev =>
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const handleNext = () => {
    setFormData(prev => ({
      ...prev,
      agency_name: formData.agency_name,
      email: formData.email,
      phone: formData.phone,
      headquarters_country: formData.headquarters_country,
      service_regions: agencies
    }));
    onNext();
  };

  const canContinue = formData.agency_name && formData.email && formData.phone && formData.headquarters_country && agencies.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">
          {language === 'es' ? 'Información Básica' : language === 'fr' ? 'Informations de Base' : 'Basic Information'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {language === 'es' ? 'Cuéntanos sobre tu agencia de viajes.' : language === 'fr' ? 'Dites-nous à propos de votre agence de voyages.' : 'Tell us about your travel agency.'}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">🏢 {language === 'es' ? 'Nombre de la Agencia' : language === 'fr' ? 'Nom de l\'Agence' : 'Agency Name'}</label>
          <Input
            placeholder={language === 'es' ? 'Ej: Viajes Globales' : language === 'fr' ? 'Ex: Voyages Mondiaux' : 'e.g., Global Travels'}
            value={formData.agency_name || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, agency_name: e.target.value }))}
            className="h-12"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">📧 {language === 'es' ? 'Correo Electrónico' : language === 'fr' ? 'Email' : 'Email'}</label>
          <Input
            type="email"
            placeholder="your@email.com"
            value={formData.email || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="h-12"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">📞 {language === 'es' ? 'Teléfono' : language === 'fr' ? 'Téléphone' : 'Phone'}</label>
          <Input
            placeholder="+1 (555) 000-0000"
            value={formData.phone || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="h-12"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">🌍 {language === 'es' ? 'País Sede' : language === 'fr' ? 'Pays Siège' : 'Headquarters Country'}</label>
          <Input
            placeholder={language === 'es' ? 'Ej: España' : language === 'fr' ? 'Ex: France' : 'e.g., USA'}
            value={formData.headquarters_country || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, headquarters_country: e.target.value }))}
            className="h-12"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-3">🌎 {language === 'es' ? 'Regiones que Sirves' : language === 'fr' ? 'Régions Desservies' : 'Regions You Serve'}</label>
          <div className="grid grid-cols-2 gap-2">
            {REGIONS.map(region => (
              <button
                key={region}
                onClick={() => toggleRegion(region)}
                className={`p-3 rounded-lg border-2 transition-all text-sm font-medium text-center ${
                  agencies.includes(region)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-primary/50'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white gap-2"
        >
          {language === 'es' ? 'Siguiente' : language === 'fr' ? 'Suivant' : 'Next'} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}