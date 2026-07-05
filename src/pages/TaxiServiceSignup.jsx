import React, { useState, useEffect } from 'react';
import { translations } from '@/lib/translations';
import { BackButton } from '@/components/nav/BackButton';
import TaxiServiceSignupStep1 from '@/components/partner-signup/TaxiServiceSignupStep1';
import TaxiServiceSignupStep2 from '@/components/partner-signup/TaxiServiceSignupStep2';
import TaxiServiceSignupStep3 from '@/components/partner-signup/TaxiServiceSignupStep3';
import TaxiServiceSuccess from '@/components/partner-signup/TaxiServiceSuccess';
import { MapPin, Save } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { saveSignupDraft, loadSignupDraft, clearSignupDraft, getDraftAge } from '@/lib/signupDraft';

export default function TaxiServiceSignup() {
  const location = useLocation();
  const [language, setLanguage] = useState('en');
  const [step, setStep] = useState(0);
  const [successTaxi, setSuccessTaxi] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    driver_name: '',
    email: '',
    phone: '',
    operating_country: '',
    operating_city: '',
    service_radius_km: '',
    patient_assistance: [],
    vehicle_types: [],
    operating_hours: {},
    pricing_model: {},
    vehicle_photo_url: '',
    driver_license_number: '',
    insurance_provider: '',
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
    const savedDraft = loadSignupDraft('taxi_service');
    if (savedDraft) setFormData(savedDraft);
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (step < 3) {
      saveSignupDraft('taxi_service', formData);
    }
  }, [formData, step]);

  // Auto-detect location using IP geolocation on mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const response = await base44.functions.invoke('getGeolocationAndCurrency', {});
        const { country } = response.data;
        
        if (country) {
          // Map country code to full country name
          const countryNameMap = {
            'US': 'United States',
            'MX': 'Mexico',
            'CA': 'Canada',
            'GB': 'United Kingdom',
            'FR': 'France',
            'DE': 'Germany',
            'IT': 'Italy',
            'ES': 'Spain',
            'PT': 'Portugal',
            'BR': 'Brazil',
            'TT': 'Trinidad and Tobago',
            'GY': 'Guyana',
            'VE': 'Venezuela',
            'JM': 'Jamaica',
            'BB': 'Barbados',
            'BS': 'Bahamas',
            'DO': 'Dominican Republic',
            'PR': 'Puerto Rico',
            'CR': 'Costa Rica',
            'PA': 'Panama',
            'CO': 'Colombia',
            'EC': 'Ecuador',
            'PE': 'Peru',
            'CL': 'Chile',
            'AR': 'Argentina',
            'UY': 'Uruguay',
            'PY': 'Paraguay',
            'BO': 'Bolivia',
            'GT': 'Guatemala',
            'HN': 'Honduras',
            'SV': 'El Salvador',
            'NI': 'Nicaragua',
            'BZ': 'Belize',
            'CU': 'Cuba',
            'HT': 'Haiti',
            'LC': 'Saint Lucia',
            'VC': 'Saint Vincent and the Grenadines',
            'GD': 'Grenada',
            'AG': 'Antigua and Barbuda',
            'KN': 'Saint Kitts and Nevis',
            'DM': 'Dominica',
            'AW': 'Aruba',
            'CW': 'Curaçao',
            'SX': 'Sint Maarten',
            'BQ': 'Caribbean Netherlands',
            'VI': 'U.S. Virgin Islands',
            'VG': 'British Virgin Islands',
            'AI': 'Anguilla',
            'MS': 'Montserrat',
            'GP': 'Guadeloupe',
            'MQ': 'Martinique',
            'GF': 'French Guiana',
            'SR': 'Suriname',
            'CY': 'Cyprus',
            'MT': 'Malta',
            'IS': 'Iceland',
            'NO': 'Norway',
            'SE': 'Sweden',
            'DK': 'Denmark',
            'FI': 'Finland',
            'IE': 'Ireland',
            'NL': 'Netherlands',
            'BE': 'Belgium',
            'LU': 'Luxembourg',
            'CH': 'Switzerland',
            'AT': 'Austria',
            'PL': 'Poland',
            'CZ': 'Czechia',
            'SK': 'Slovakia',
            'HU': 'Hungary',
            'SI': 'Slovenia',
            'HR': 'Croatia',
            'BA': 'Bosnia and Herzegovina',
            'RS': 'Serbia',
            'ME': 'Montenegro',
            'MK': 'North Macedonia',
            'AL': 'Albania',
            'BG': 'Bulgaria',
            'RO': 'Romania',
            'MD': 'Moldova',
            'UA': 'Ukraine',
            'BY': 'Belarus',
            'LT': 'Lithuania',
            'LV': 'Latvia',
            'EE': 'Estonia',
            'RU': 'Russia',
            'GE': 'Georgia',
            'AM': 'Armenia',
            'AZ': 'Azerbaijan',
            'KZ': 'Kazakhstan',
            'UZ': 'Uzbekistan',
            'TM': 'Turkmenistan',
            'KG': 'Kyrgyzstan',
            'TJ': 'Tajikistan',
            'AF': 'Afghanistan',
            'PK': 'Pakistan',
            'IN': 'India',
            'BD': 'Bangladesh',
            'LK': 'Sri Lanka',
            'MV': 'Maldives',
            'NP': 'Nepal',
            'BT': 'Bhutan',
            'MM': 'Myanmar',
            'TH': 'Thailand',
            'LA': 'Laos',
            'KH': 'Cambodia',
            'VN': 'Vietnam',
            'MY': 'Malaysia',
            'SG': 'Singapore',
            'BN': 'Brunei',
            'ID': 'Indonesia',
            'TL': 'Timor-Leste',
            'PH': 'Philippines',
            'TW': 'Taiwan',
            'HK': 'Hong Kong',
            'MO': 'Macau',
            'CN': 'China',
            'MN': 'Mongolia',
            'KP': 'North Korea',
            'KR': 'South Korea',
            'JP': 'Japan',
            'AU': 'Australia',
            'NZ': 'New Zealand',
            'PG': 'Papua New Guinea',
            'FJ': 'Fiji',
            'SB': 'Solomon Islands',
            'VU': 'Vanuatu',
            'NC': 'New Caledonia',
            'PF': 'French Polynesia',
            'WS': 'Samoa',
            'TO': 'Tonga',
            'KI': 'Kiribati',
            'TV': 'Tuvalu',
            'NR': 'Nauru',
            'FM': 'Micronesia',
            'MH': 'Marshall Islands',
            'PW': 'Palau',
            'GU': 'Guam',
            'MP': 'Northern Mariana Islands',
            'AS': 'American Samoa',
            'CK': 'Cook Islands',
            'NU': 'Niue',
            'TK': 'Tokelau',
            'WF': 'Wallis and Futuna',
            'ZA': 'South Africa',
            'NA': 'Namibia',
            'BW': 'Botswana',
            'ZW': 'Zimbabwe',
            'MZ': 'Mozambique',
            'ZM': 'Zambia',
            'MW': 'Malawi',
            'TZ': 'Tanzania',
            'KE': 'Kenya',
            'UG': 'Uganda',
            'RW': 'Rwanda',
            'BI': 'Burundi',
            'ET': 'Ethiopia',
            'ER': 'Eritrea',
            'DJ': 'Djibouti',
            'SO': 'Somalia',
            'SD': 'Sudan',
            'SS': 'South Sudan',
            'EG': 'Egypt',
            'LY': 'Libya',
            'TN': 'Tunisia',
            'DZ': 'Algeria',
            'MA': 'Morocco',
            'EH': 'Western Sahara',
            'MR': 'Mauritania',
            'ML': 'Mali',
            'BF': 'Burkina Faso',
            'NE': 'Niger',
            'NG': 'Nigeria',
            'GH': 'Ghana',
            'TG': 'Togo',
            'BJ': 'Benin',
            'CI': 'Ivory Coast',
            'LR': 'Liberia',
            'SL': 'Sierra Leone',
            'GN': 'Guinea',
            'GW': 'Guinea-Bissau',
            'SN': 'Senegal',
            'GM': 'Gambia',
            'CV': 'Cabo Verde',
            'CM': 'Cameroon',
            'CF': 'Central African Republic',
            'TD': 'Chad',
            'GA': 'Gabon',
            'GQ': 'Equatorial Guinea',
            'ST': 'Sao Tome and Principe',
            'CG': 'Congo (Congo-Brazzaville)',
            'CD': 'Democratic Republic of the Congo',
            'AO': 'Angola',
            'SZ': 'Eswatini',
            'LS': 'Lesotho',
            'MU': 'Mauritius',
            'SC': 'Seychelles',
            'KM': 'Comoros',
            'YT': 'Mayotte',
            'RE': 'Réunion',
            'MG': 'Madagascar',
            'IR': 'Iran',
            'IQ': 'Iraq',
            'SY': 'Syria',
            'LB': 'Lebanon',
            'JO': 'Jordan',
            'IL': 'Israel',
            'PS': 'Palestine',
            'SA': 'Saudi Arabia',
            'KW': 'Kuwait',
            'BH': 'Bahrain',
            'QA': 'Qatar',
            'AE': 'United Arab Emirates',
            'OM': 'Oman',
            'YE': 'Yemen',
            'TR': 'Turkey',
            'GR': 'Greece',
            'AD': 'Andorra',
            'GI': 'Gibraltar',
            'SM': 'San Marino',
            'VA': 'Vatican City',
            'MC': 'Monaco',
            'LI': 'Liechtenstein',
          };
          
          const fullCountryName = countryNameMap[country] || country;
          
          setFormData(prev => ({
            ...prev,
            operating_country: fullCountryName
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
      {/* Main Content - Split Layout */}
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <BackButton fallback="/register-role" className="mb-4" />
        {/* Auto-detection indicator */}
        {formData.operating_country && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">Location auto-detected: {formData.operating_country}</span>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600/20 border border-blue-600/40 mb-4">
            <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm11 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-display font-semibold text-foreground mb-2">
            {language === 'es' ? 'Servicio de Taxi' : language === 'fr' ? 'Service de Taxi' : 'Taxi Service'}
          </h1>
          <p className="text-muted-foreground">{language === 'es' ? 'Registro de Socio' : language === 'fr' ? 'Enregistrement des Partenaires' : 'Partner Sign-Up'}</p>
        </div>

        <div className="space-y-6">

        {/* Progress Indicator */}
        {step < 3 && (
          <>
            <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center gap-2">
              <Save className="w-3 h-3 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">
                Progress saved {getDraftAge('taxi_service') || 'just now'} - you can continue later
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
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-300"
                style={{ width: `${((step + 1) / 3) * 100}%` }}
              ></div>
            </div>
          </div>
          </>
        )}

        {/* Step Content */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-8 shadow-lg">
          {step === 0 && (
            <TaxiServiceSignupStep1
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <TaxiServiceSignupStep2
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && (
            <TaxiServiceSignupStep3
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
              onComplete={async (taxi) => {
                setSuccessTaxi(taxi);
                setStep(3);
                clearSignupDraft('taxi_service');
                
                // Send portal access email
                try {
                  await base44.functions.invoke('sendPartnerWelcomeEmail', {
                    partner_type: 'taxi_service',
                    partner_id: taxi.id,
                  });
                } catch (err) {
                  console.error('Failed to send welcome email:', err);
                }
              }}
            />
          )}

          {step === 3 && successTaxi && (
            <TaxiServiceSuccess
              taxi={successTaxi}
              language={language}
              onDashboard={() => {
                window.location.href = '/taxi-service-dashboard';
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
    </div>
  );
}