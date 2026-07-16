import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, ShieldCheck, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { saveUserOnboardingProfile } from '@/lib/onboardingProfile';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PhoneField from '@/components/ui-system/PhoneField';
import SearchSelect from '@/components/ui-system/SearchSelect';
import { COUNTRY_NAMES } from '@/lib/countryDialCodes';
import ProcedureWelcomeModal from '@/components/welcome/ProcedureWelcomeModal';

export default function ClientSignup() {
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    nationality: '',
    preferred_language: 'en',
    emergency_contact_name: '',
    emergency_contact_number: ''
  });

  useEffect(() => {
    base44.auth.me().then((user) => {
      setForm((prev) => ({
        ...prev,
        full_name: user.full_name || prev.full_name,
        email: user.email || prev.email
      }));
      if (user?.email) {
        setUserEmail(user.email);
      }
    });
    
    // Auto-detect nationality using IP geolocation
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
          
          setForm(prev => ({
            ...prev,
            nationality: fullCountryName
          }));
        }
      } catch (_error) {
      }
    };

    detectLocation();
  }, []);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit = form.full_name && form.email && form.phone && form.emergency_contact_name && form.emergency_contact_number;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    const _profile = await saveUserOnboardingProfile({
      role: 'client',
      status: 'completed',
      profileData: {
        ...form,
        selected_role: 'client',
        completed_from: 'client_signup'
      }
    });


    localStorage.setItem('signupRole', 'client');
    await checkUserAuth();
    setShowWelcomeModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background px-4 py-14">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          {/* Auto-detection indicator */}
          {form.nationality && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">Location auto-detected: {form.nationality}</span>
            </div>
          )}
          
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UserRound className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary mb-3">Client profile</p>
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-foreground mb-4">Tell us about you</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Complete your client profile first. You can book a consultation anytime from your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-3xl shadow-xl p-6 md:p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground">Full name</label>
              <Input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} className="mt-2" required />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Email</label>
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="mt-2" required />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Phone number</label>
              <div className="mt-2">
                <PhoneField value={form.phone} onChange={(v) => update('phone', v)} defaultCountryName={form.nationality} placeholder="Phone number" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Nationality</label>
              <div className="mt-2">
                <SearchSelect boxed value={form.nationality} onChange={(v) => update('nationality', v)} options={COUNTRY_NAMES} placeholder="Optional — select or type" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Preferred language</label>
              <Select value={form.preferred_language} onValueChange={(value) => update('preferred_language', value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-2xl bg-secondary/60 border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Emergency contact</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-foreground">Contact name</label>
                <Input value={form.emergency_contact_name} onChange={(e) => update('emergency_contact_name', e.target.value)} className="mt-2" required />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground">Contact number</label>
                <div className="mt-2">
                  <PhoneField value={form.emergency_contact_number} onChange={(v) => update('emergency_contact_number', v)} defaultCountryName={form.nationality} placeholder="Contact number" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/register-role')}>Back</Button>
            <Button type="submit" disabled={!canSubmit || isSaving} className="bg-primary hover:bg-primary/90">
              {isSaving ? 'Saving...' : 'Go to my dashboard'}
            </Button>
          </div>
        </form>
      </div>

      <ProcedureWelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        userEmail={userEmail}
        isFirstTimeSignup={true}
      />
    </div>
  );
}