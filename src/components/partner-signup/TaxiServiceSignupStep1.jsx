import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ChevronDown, Search } from 'lucide-react';
import { translations } from '@/lib/translations';
import cityData from '@/lib/cityData.json';

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
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryRef = useRef(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityRef = useRef(null);
  const [citySearch, setCitySearch] = useState('');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities = useCallback(() => {
    if (!formData.operating_country || !cityData[formData.operating_country]) return [];
    return cityData[formData.operating_country].filter(city =>
      city.toLowerCase().includes(citySearch.toLowerCase())
    );
  }, [formData.operating_country, citySearch]);

  const handleSelectCountry = (country) => {
    setFormData(prev => ({ ...prev, operating_country: country, operating_city: '' }));
    setShowCountryDropdown(false);
    setCountrySearch('');
  };

  const handleSelectCity = (city) => {
    setFormData(prev => ({ ...prev, operating_city: city }));
    setShowCityDropdown(false);
    setCitySearch('');
  };

  const filteredCountries = ALL_COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

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
            placeholder={language === 'es' ? 'Nombre del representante de la agencia' : 'Agency representative name'}
            value={formData.driver_name || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
            className="h-12"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">📧 {language === 'es' ? 'Correo Electrónico de la Agencia' : language === 'fr' ? 'Email de l\'Agence' : 'Agency Email'} *</label>
          <Input
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
            placeholder="+1 (555) 000-0000"
            value={formData.phone || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="h-12"
          />
        </div>

        <div ref={countryRef} className="relative">
          <label className="text-sm font-medium text-foreground block mb-2">🗺️ {language === 'es' ? 'País de Operación' : language === 'fr' ? 'Pays d\'Opération' : 'Operating Country'}</label>
          <button
            type="button"
            data-testid="taxi-country-select"
            onClick={() => setShowCountryDropdown(v => !v)}
            className="w-full h-12 flex items-center justify-between px-4 border border-input rounded-md bg-background text-sm text-left focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span className={formData.operating_country ? 'text-foreground' : 'text-muted-foreground'}>
              {formData.operating_country || (language === 'es' ? 'Selecciona un país' : language === 'fr' ? 'Sélectionnez un pays' : 'Select a country')}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
          {showCountryDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-border flex items-center gap-2 bg-slate-50">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  autoFocus
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  placeholder={language === 'es' ? 'Buscar país...' : language === 'fr' ? 'Rechercher un pays...' : 'Search country...'}
                  className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <ul className="max-h-56 overflow-y-auto">
                {filteredCountries.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-muted-foreground text-center">No results</li>
                ) : filteredCountries.map(country => (
                  <li key={country}>
                    <button
                      type="button"
                      data-testid={`taxi-country-option-${country.replace(/\s+/g, '-')}`}
                      onClick={() => handleSelectCountry(country)}
                      className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors ${formData.operating_country === country ? 'bg-blue-50 text-blue-700 font-medium' : 'text-foreground'}`}
                    >
                      {country}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div ref={cityRef} className="relative">
          <label className="text-sm font-medium text-foreground block mb-2">
            📍 {language === 'es' ? 'Ciudad/Regi\u00f3n de Operaci\u00f3n' : language === 'fr' ? 'Ville/R\u00e9gion d\'Op\u00e9ration' : 'Operating City / Region'}
          </label>
          <button
            type="button"
            data-testid="taxi-city-select"
            onClick={() => setShowCityDropdown(v => !v)}
            className="w-full h-12 flex items-center justify-between px-4 border border-input rounded-md bg-background text-sm text-left focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            disabled={!formData.operating_country}
          >
            <span className={formData.operating_city ? 'text-foreground' : 'text-muted-foreground'}>
              {formData.operating_city || (language === 'es' ? 'Selecciona una ciudad' : language === 'fr' ? 'Sélectionnez une ville' : 'Select a city')}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
          {showCityDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-border flex items-center gap-2 bg-slate-50">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  autoFocus
                  value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                  placeholder={language === 'es' ? 'Buscar ciudad...' : language === 'fr' ? 'Rechercher une ville...' : 'Search city...'}
                  className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <ul className="max-h-56 overflow-y-auto">
                {filteredCities().length === 0 ? (
                  <li className="px-4 py-3 text-sm text-muted-foreground text-center">
                    {formData.operating_country ? (language === 'es' ? 'No se encontraron ciudades' : language === 'fr' ? 'Aucune ville trouv\u00e9e' : 'No cities found') : (language === 'es' ? 'Primero selecciona un pa\u00eds' : language === 'fr' ? 'S\u00e9lectionnez un pays d\u0027abord' : 'Select a country first')}
                  </li>
                ) : (
                  filteredCities().map(city => (
                    <li key={city}>
                      <button
                        type="button"
                        data-testid={`taxi-city-option-${city.replace(/\s+/g, '-')}`}
                        onClick={() => handleSelectCity(city)}
                        className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors ${formData.operating_city === city ? 'bg-blue-50 text-blue-700 font-medium' : 'text-foreground'}`}
                      >
                        {city}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">📏 Service Radius (km)</label>
          <Input
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