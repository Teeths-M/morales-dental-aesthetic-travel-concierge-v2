import React, { useState, useEffect } from 'react';
import { translations } from '@/lib/translations';
import { BackButton } from '@/components/nav/BackButton';
import TravelAgencySignupStep1 from '@/components/partner-signup/TravelAgencySignupStep1';
import TravelAgencySignupStep2 from '@/components/partner-signup/TravelAgencySignupStep2';
import TravelAgencySignupStep3 from '@/components/partner-signup/TravelAgencySignupStep3';
import TravelAgencySuccess from '@/components/partner-signup/TravelAgencySuccess';
import { Plane, MapPin, Save } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { saveSignupDraft, loadSignupDraft, clearSignupDraft, getDraftAge } from '@/lib/signupDraft';

export default function TravelAgencySignup() {
  const location = useLocation();
  const [language, setLanguage] = useState('en');
  const [step, setStep] = useState(0);
  const [successAgency, setSuccessAgency] = useState(null);
  const [formData, setFormData] = useState({
    agency_name: '',
    contact_person: '',
    email: '',
    phone: '',
    headquarters_country: '',
    website_url: '',
    medical_travel_experience_years: '',
    emergency_support_available: false,
    service_regions: [],
    services_offered: [],
    service_options: {},
    business_license_url: '',
    payout_method: '',
    payout_account: ''
  });

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    const handleLanguageChange = (event) => setLanguage(event.detail.language);
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  // Load saved draft — must be its own effect so it runs after the cleanup-returning language effect
  useEffect(() => {
    const savedDraft = loadSignupDraft('travel_agency');
    if (savedDraft) setFormData(savedDraft);
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (step < 3) {
      saveSignupDraft('travel_agency', formData);
    }
  }, [formData, step]);

  // Auto-detect location using IP geolocation on mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const response = await base44.functions.invoke('getGeolocationAndCurrency', {});
        const { country } = response.data;
        
        if (country) {
          const countryNameMap = {
            'US': 'United States', 'MX': 'Mexico', 'CA': 'Canada', 'GB': 'United Kingdom',
            'FR': 'France', 'DE': 'Germany', 'IT': 'Italy', 'ES': 'Spain', 'PT': 'Portugal',
            'BR': 'Brazil', 'TT': 'Trinidad and Tobago', 'GY': 'Guyana', 'VE': 'Venezuela',
            'JM': 'Jamaica', 'BB': 'Barbados', 'BS': 'Bahamas', 'DO': 'Dominican Republic',
            'PR': 'Puerto Rico', 'CR': 'Costa Rica', 'PA': 'Panama', 'CO': 'Colombia',
            'EC': 'Ecuador', 'PE': 'Peru', 'CL': 'Chile', 'AR': 'Argentina', 'UY': 'Uruguay',
            'PY': 'Paraguay', 'BO': 'Bolivia', 'GT': 'Guatemala', 'HN': 'Honduras',
            'SV': 'El Salvador', 'NI': 'Nicaragua', 'BZ': 'Belize', 'CU': 'Cuba', 'HT': 'Haiti',
            'LC': 'Saint Lucia', 'VC': 'Saint Vincent and the Grenadines', 'GD': 'Grenada',
            'AG': 'Antigua and Barbuda', 'KN': 'Saint Kitts and Nevis', 'DM': 'Dominica',
            'AW': 'Aruba', 'CW': 'Curaçao', 'SX': 'Sint Maarten', 'BQ': 'Caribbean Netherlands',
            'VI': 'U.S. Virgin Islands', 'VG': 'British Virgin Islands', 'AI': 'Anguilla',
            'MS': 'Montserrat', 'GP': 'Guadeloupe', 'MQ': 'Martinique', 'GF': 'French Guiana',
            'SR': 'Suriname', 'NL': 'Netherlands', 'BE': 'Belgium', 'CH': 'Switzerland',
            'AT': 'Austria', 'PL': 'Poland', 'CZ': 'Czechia', 'SK': 'Slovakia', 'HU': 'Hungary',
            'SI': 'Slovenia', 'HR': 'Croatia', 'GR': 'Greece', 'TR': 'Turkey', 'IL': 'Israel',
            'AE': 'United Arab Emirates', 'SA': 'Saudi Arabia', 'QA': 'Qatar', 'KW': 'Kuwait',
            'BH': 'Bahrain', 'OM': 'Oman', 'JO': 'Jordan', 'LB': 'Lebanon', 'EG': 'Egypt',
            'ZA': 'South Africa', 'KE': 'Kenya', 'NG': 'Nigeria', 'GH': 'Ghana', 'MA': 'Morocco',
            'TN': 'Tunisia', 'DZ': 'Algeria', 'IN': 'India', 'PK': 'Pakistan', 'BD': 'Bangladesh',
            'LK': 'Sri Lanka', 'TH': 'Thailand', 'MY': 'Malaysia', 'SG': 'Singapore',
            'ID': 'Indonesia', 'PH': 'Philippines', 'VN': 'Vietnam', 'KH': 'Cambodia',
            'LA': 'Laos', 'MM': 'Myanmar', 'CN': 'China', 'JP': 'Japan', 'KR': 'South Korea',
            'TW': 'Taiwan', 'HK': 'Hong Kong', 'MO': 'Macau', 'AU': 'Australia', 'NZ': 'New Zealand',
            'FJ': 'Fiji', 'PG': 'Papua New Guinea', 'RU': 'Russia', 'UA': 'Ukraine', 'BY': 'Belarus',
            'LT': 'Lithuania', 'LV': 'Latvia', 'EE': 'Estonia', 'FI': 'Finland', 'SE': 'Sweden',
            'NO': 'Norway', 'DK': 'Denmark', 'IS': 'Iceland', 'IE': 'Ireland', 'RO': 'Romania',
            'BG': 'Bulgaria', 'RS': 'Serbia', 'BA': 'Bosnia and Herzegovina', 'ME': 'Montenegro',
            'MK': 'North Macedonia', 'AL': 'Albania', 'MD': 'Moldova', 'GE': 'Georgia',
            'AM': 'Armenia', 'AZ': 'Azerbaijan', 'KZ': 'Kazakhstan', 'UZ': 'Uzbekistan',
            'TM': 'Turkmenistan', 'KG': 'Kyrgyzstan', 'TJ': 'Tajikistan', 'AF': 'Afghanistan',
            'NP': 'Nepal', 'BT': 'Bhutan', 'MV': 'Maldives', 'MN': 'Mongolia', 'KP': 'North Korea',
            'IR': 'Iran', 'IQ': 'Iraq', 'SY': 'Syria', 'YE': 'Yemen', 'ET': 'Ethiopia',
            'TZ': 'Tanzania', 'UG': 'Uganda', 'RW': 'Rwanda', 'BI': 'Burundi', 'SO': 'Somalia',
            'ER': 'Eritrea', 'DJ': 'Djibouti', 'SD': 'Sudan', 'SS': 'South Sudan', 'LY': 'Libya',
            'MR': 'Mauritania', 'ML': 'Mali', 'BF': 'Burkina Faso', 'NE': 'Niger', 'SN': 'Senegal',
            'GM': 'Gambia', 'CV': 'Cabo Verde', 'CI': 'Ivory Coast', 'LR': 'Liberia', 'SL': 'Sierra Leone',
            'GN': 'Guinea', 'GW': 'Guinea-Bissau', 'CM': 'Cameroon', 'CF': 'Central African Republic',
            'TD': 'Chad', 'GA': 'Gabon', 'GQ': 'Equatorial Guinea', 'ST': 'Sao Tome and Principe',
            'CG': 'Congo (Congo-Brazzaville)', 'CD': 'Democratic Republic of the Congo', 'AO': 'Angola',
            'NA': 'Namibia', 'BW': 'Botswana', 'ZW': 'Zimbabwe', 'MZ': 'Mozambique', 'ZM': 'Zambia',
            'MW': 'Malawi', 'SZ': 'Eswatini', 'LS': 'Lesotho', 'MU': 'Mauritius', 'SC': 'Seychelles',
            'KM': 'Comoros', 'MG': 'Madagascar', 'RE': 'Réunion', 'YT': 'Mayotte'
          };
          
          const fullCountryName = countryNameMap[country] || country;
          
          setFormData(prev => ({
            ...prev,
            headquarters_country: fullCountryName
          }));
        }
      } catch (error) {
        console.log('Could not auto-detect location:', error.message);
      }
    };

    detectLocation();
  }, []);

  const t = translations[language];

  const allLanguages = [
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'es', flag: '🇪🇸', name: 'Español' },
    { code: 'fr', flag: '🇫🇷', name: 'Français' },
    { code: 'pt', flag: '🇵🇹', name: 'Português' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
    { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <BackButton fallback="/register-role" className="mb-4" />
        {/* Auto-detection indicator */}
        {formData.headquarters_country && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">Location auto-detected: {formData.headquarters_country}</span>
          </div>
        )}
        
        {/* Logo & Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky-600/20 border border-sky-600/40 mb-4">
            <Plane className="w-6 h-6 text-sky-600" />
          </div>
          <h1 className="text-4xl font-display font-semibold text-foreground mb-2">
            {language === 'es' ? 'Agencia de Viajes' : language === 'fr' ? 'Agence de Voyages' : 'Travel Agency'}
          </h1>
          <p className="text-muted-foreground">{language === 'es' ? 'Registro de Socio' : language === 'fr' ? 'Enregistrement des Partenaires' : 'Partner Sign-Up'}</p>
        </div>

        {/* Progress Indicator */}
        {step < 3 && (
          <>
            <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center gap-2">
              <Save className="w-3 h-3 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">
                Progress saved {getDraftAge('travel_agency') || 'just now'} - you can continue later
              </span>
            </div>
            <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                {step === 0 ? '1 of 3' : step === 1 ? '2 of 3' : '3 of 3'}
              </span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 transition-all duration-300"
                style={{ width: `${((step + 1) / 3) * 100}%` }}
              ></div>
            </div>
          </div>
          </>
        )}

        {/* Step Content */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-8 shadow-lg">
          {step === 0 && (
            <TravelAgencySignupStep1
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <TravelAgencySignupStep2
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && (
            <TravelAgencySignupStep3
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
              onComplete={async (agency) => {
                setSuccessAgency(agency);
                setStep(3);
                clearSignupDraft('travel_agency');
                
                // Send portal access email
                try {
                  await base44.functions.invoke('sendPartnerWelcomeEmail', {
                    partner_type: 'travel_agency',
                    partner_id: agency.id,
                  });
                } catch (err) {
                  console.error('Failed to send welcome email:', err);
                }
              }}
            />
          )}

          {step === 3 && successAgency && (
            <TravelAgencySuccess
              agency={successAgency}
              language={language}
              onDashboard={() => {
                window.location.href = '/travel-agency-dashboard';
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          <p>SAFE-T 4LIFE™ Medical Tourism Platform</p>
        </div>
      </div>
    </div>
  );
}