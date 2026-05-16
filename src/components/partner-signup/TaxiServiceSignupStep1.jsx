import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import { translations } from '@/lib/translations';

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Van', 'Wheelchair van'];

export default function TaxiServiceSignupStep1({ formData, setFormData, language, onNext }) {
  const t = translations[language];
  const [vehicles, setVehicles] = useState(formData.vehicle_types || []);

  const toggleVehicle = (vehicle) => {
    setVehicles(prev =>
      prev.includes(vehicle) ? prev.filter(v => v !== vehicle) : [...prev, vehicle]
    );
  };

  const handleNext = () => {
    setFormData(prev => ({
      ...prev,
      company_name: formData.company_name,
      driver_name: formData.driver_name,
      email: formData.email,
      phone: formData.phone,
      operating_city: formData.operating_city,
      vehicle_types: vehicles
    }));
    onNext();
  };

  const canContinue = formData.email && formData.phone && formData.operating_city && vehicles.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">
          {language === 'es' ? 'Información Básica' : language === 'fr' ? 'Informations de Base' : 'Basic Information'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {language === 'es' ? 'Cuéntanos sobre ti y tu servicio.' : language === 'fr' ? 'Parlez-nous de vous et de votre service.' : 'Tell us about you and your service.'}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">🚕 {language === 'es' ? 'Nombre de Empresa/Conductor' : language === 'fr' ? 'Nom de l\'Entreprise/Conducteur' : 'Company/Driver Name'}</label>
          <Input
            placeholder={language === 'es' ? 'Ej: Carlos Taxis' : 'e.g., Carlos Taxis'}
            value={formData.company_name || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
            className="h-12"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">👤 {language === 'es' ? 'Nombre del Conductor' : language === 'fr' ? 'Nom du Conducteur' : 'Driver Name'}</label>
          <Input
            placeholder={language === 'es' ? 'Tu nombre completo' : 'Your full name'}
            value={formData.driver_name || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
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
          <label className="text-sm font-medium text-foreground block mb-2">🗺️ {language === 'es' ? 'Ciudad de Operación' : language === 'fr' ? 'Ville d\'Opération' : 'Operating City'}</label>
          <Input
            placeholder={language === 'es' ? 'Ej: Santo Domingo' : 'e.g., Santo Domingo'}
            value={formData.operating_city || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, operating_city: e.target.value }))}
            className="h-12"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-3">🚗 {language === 'es' ? 'Tipos de Vehículos' : language === 'fr' ? 'Types de Véhicules' : 'Vehicle Types'}</label>
          <div className="grid grid-cols-2 gap-2">
            {VEHICLE_TYPES.map(vehicle => (
              <button
                key={vehicle}
                onClick={() => toggleVehicle(vehicle)}
                className={`p-3 rounded-lg border-2 transition-all text-sm font-medium text-center ${
                  vehicles.includes(vehicle)
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-border bg-card text-foreground hover:border-blue-300'
                }`}
              >
                {vehicle}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button
        onClick={handleNext}
        disabled={!canContinue}
        className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white gap-2"
      >
        {language === 'es' ? 'Siguiente' : language === 'fr' ? 'Suivant' : 'Next'} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}