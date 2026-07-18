import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import { translations } from '@/lib/translations';
import { getCitiesForCountry, cityAfterCountryChange } from '@/lib/countryCity';

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Van', 'Wheelchair van'];
const ASSISTANCE_OPTIONS = ['Luggage help', 'Mobility assistance', 'Wheelchair support', 'Clinic escort', 'Post-procedure careful driving'];

const ALL_COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia",
  "Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin",
  "Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia",
  "Comoros","Congo (Congo-Brazzaville)","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti",
  "Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia",
  "Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece",
  "Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India",
  "Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya",
  "Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein",
  "Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands",
  "Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco",
  "Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria",
  "North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea",
  "Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis",
  "Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia",
  "Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia",
  "South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland",
  "Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago",
  "Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom",
  "United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];

export default function TaxiServiceSignupStep1({ formData, setFormData, language, onNext }) {
  const _t = translations[language];
  const [vehicles, setVehicles] = useState(formData.vehicle_types || []);
  const [assistance, setAssistance] = useState(formData.patient_assistance || []);

  // Shared resolver, not a direct cityData index — the country shown here can
  // be localised or spelled differently ("Trinidad & Tobago" vs "and"), and a
  // raw lookup silently returned no cities for those.
  const availableCities = getCitiesForCountry(formData.operating_country);

  const handleSelectCountry = (e) => {
    const country = e.target.value;
    setFormData(prev => ({
      ...prev,
      operating_country: country,
      operating_city: cityAfterCountryChange(country, prev.operating_city),
    }));
  };

  const toggleVehicle = (vehicle) => {
    setVehicles(prev =>
      prev.includes(vehicle) ? prev.filter(v => v !== vehicle) : [...prev, vehicle]
    );
  };

  const toggleAssistance = (option) => {
    setAssistance(prev =>
      prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]
    );
  };

  const handleNext = () => {
    setFormData(prev => ({
      ...prev,
      agency_name: formData.agency_name,
      company_name: formData.agency_name,
      contact_person: formData.driver_name,
      driver_name: formData.driver_name,
      email: formData.email,
      phone: formData.phone,
      operating_country: formData.operating_country,
      operating_city: formData.operating_city,
      service_radius_km: formData.service_radius_km,
      patient_assistance: assistance,
      vehicle_types: vehicles
    }));
    onNext();
  };

  const canContinue = formData.agency_name && formData.driver_name && formData.email && formData.phone && formData.operating_country && formData.operating_city && vehicles.length > 0 && assistance.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-semibold text-foreground mb-2">
          {language === 'es' ? 'Información de la Agencia' : language === 'fr' ? 'Informations de l\'Agence' : 'Agency Information'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {language === 'es' ? 'Solo agencias registradas. Cuéntanos sobre tu empresa de transporte.' : language === 'fr' ? 'Agences enregistrées uniquement. Parlez-nous de votre entreprise de transport.' : 'Registered agencies only. Tell us about your transportation company.'}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">🏢 {language === 'es' ? 'Nombre de la Agencia' : language === 'fr' ? 'Nom de l\'Agence' : 'Agency Name'} *</label>
          <Input
            data-testid="taxi-agency-name"
            placeholder={language === 'es' ? 'Ej: Servicios de Transporte XYZ' : 'e.g., XYZ Transportation Services'}
            value={formData.agency_name || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, agency_name: e.target.value }))}
            className="h-12"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'es' ? 'Debe ser una empresa registrada, no conductores individuales.' : language === 'fr' ? 'Doit être une entreprise enregistrée, pas des conducteurs individuels.' : 'Must be a registered company, not individual drivers.'}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">👤 {language === 'es' ? 'Persona de Contacto' : language === 'fr' ? 'Personne de Contact' : 'Contact Person'} *</label>
          <Input
            data-testid="taxi-driver-name"
            placeholder={language === 'es' ? 'Nombre del representante de la agencia' : 'Agency representative name'}
            value={formData.driver_name || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
            className="h-12"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">📧 {language === 'es' ? 'Correo Electrónico de la Agencia' : language === 'fr' ? 'Email de l\'Agence' : 'Agency Email'} *</label>
          <Input
            data-testid="taxi-email"
            type="email"
            placeholder="dispatch@agency.com"
            value={formData.email || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="h-12"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">📞 {language === 'es' ? 'Teléfono' : language === 'fr' ? 'Téléphone' : 'Phone'}</label>
          <Input
            data-testid="taxi-phone"
            placeholder="+1 (555) 000-0000"
            value={formData.phone || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="h-12"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">🗺️ {language === 'es' ? 'País de Operación' : language === 'fr' ? 'Pays d\'Opération' : 'Operating Country'}</label>
          <select
            data-testid="taxi-country"
            value={formData.operating_country || ''}
            onChange={handleSelectCountry}
            className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          >
            <option value="">{language === 'es' ? 'Selecciona un país' : language === 'fr' ? 'Sélectionnez un pays' : 'Select a country'}</option>
            {ALL_COUNTRIES.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">
            📍 {language === 'es' ? 'Ciudad/Región de Operación' : language === 'fr' ? 'Ville/Région d\'Opération' : 'Operating City / Region'}
          </label>
          {availableCities.length > 0 ? (
            <select
              key={`taxi-city-${formData.operating_country}`}
              data-testid="taxi-city"
              value={formData.operating_city || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, operating_city: e.target.value }))}
              className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              <option value="">{language === 'es' ? 'Selecciona una ciudad' : language === 'fr' ? 'Sélectionnez une ville' : 'Select a city'}</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          ) : (
            <Input
              data-testid="taxi-city"
              placeholder={language === 'es' ? 'Ingresa tu ciudad' : language === 'fr' ? 'Entrez votre ville' : 'Enter your city'}
              value={formData.operating_city || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, operating_city: e.target.value }))}
              className="h-12"
            />
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">📏 Service Radius (km)</label>
          <Input
            data-testid="taxi-service-radius"
            type="number"
            min="1"
            placeholder="50"
            value={formData.service_radius_km || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, service_radius_km: e.target.value }))}
            className="h-12"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-3">🤝 Patient Assistance Offered</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ASSISTANCE_OPTIONS.map(option => (
              <button
                key={option}
                data-testid={`taxi-assistance-${option.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => toggleAssistance(option)}
                className={`p-3 rounded-lg border-2 transition-all text-sm font-medium text-center ${
                  assistance.includes(option)
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-border bg-card text-foreground hover:border-blue-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-3">🚗 {language === 'es' ? 'Tipos de Vehículos' : language === 'fr' ? 'Types de Véhicules' : 'Vehicle Types'}</label>
          <div className="grid grid-cols-2 gap-2">
            {VEHICLE_TYPES.map(vehicle => (
              <button
                key={vehicle}
                data-testid={`taxi-vehicle-${vehicle.replace(/\s+/g, '-').toLowerCase()}`}
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
        data-testid="taxi-step1-next"
        onClick={handleNext}
        disabled={!canContinue}
        className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white gap-2"
      >
        {language === 'es' ? 'Siguiente' : language === 'fr' ? 'Suivant' : 'Next'} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}