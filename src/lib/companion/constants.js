// lib/companion/constants.js
export const ACCOUNT_TYPES = {
  INDIVIDUAL: 'individual',
  AGENCY: 'agency',
};

export const STEPS = {
  ABOUT_YOU: 1,
  EXPERIENCE: 2,
  AVAILABILITY: 3,
};

export const COUNTRIES = [
  // Caribbean
  'Trinidad and Tobago', 'Jamaica', 'Barbados', 'Bahamas', 'Guyana', 'Dominican Republic', 'Puerto Rico', 'Cuba', 'Haiti', 'Saint Lucia', 'Grenada', 'Antigua and Barbuda', 'Dominica', 'Saint Vincent and the Grenadines', 'Saint Kitts and Nevis', 'Aruba', 'Curacao', 'Cayman Islands', 'Turks and Caicos', 'British Virgin Islands', 'US Virgin Islands',
  // North America
  'United States', 'Canada', 'Mexico',
  // Central America
  'Costa Rica', 'Panama', 'Guatemala', 'Belize', 'Honduras', 'El Salvador', 'Nicaragua',
  // South America
  'Colombia', 'Brazil', 'Argentina', 'Chile', 'Peru', 'Ecuador', 'Uruguay', 'Paraguay', 'Bolivia', 'Venezuela',
  // Europe
  'United Kingdom', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Portugal', 'Greece', 'Turkey', 'Poland', 'Czech Republic', 'Hungary', 'Thailand', 'India', 'Singapore', 'Malaysia', 'Philippines', 'Indonesia', 'Vietnam', 'South Korea', 'Japan', 'China', 'Taiwan', 'Hong Kong',
  // Middle East
  'United Arab Emirates', 'Israel', 'Jordan', 'Lebanon', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain',
  // Africa
  'South Africa', 'Egypt', 'Morocco', 'Tunisia', 'Kenya', 'Nigeria', 'Ghana',
  // Oceania
  'Australia', 'New Zealand', 'Fiji',
];

export const LANGUAGES = ['English', 'Spanish', 'French', 'Hindi', 'Urdu', 'Mandarin', 'Arabic'];

export const EXPERIENCE_LEVELS = ['Just starting out', '1-2 years', '3-5 years', '5-10 years', '10+ years'];

export const AVAILABILITY_OPTIONS = [
  { value: 'full-time', label: 'Full-time', desc: 'Available any day, any time' },
  { value: 'part-time', label: 'Part-time', desc: 'Weekends or evenings' },
  { value: 'flexible', label: 'Flexible', desc: 'Can adjust my schedule' },
];

export const INITIAL_FORM_DATA = {
  full_name: '',
  agency_name: '',
  contact_person: '',
  email: '',
  phone: '',
  country: '',
  city: '',
  languages: [],
  years_experience: 'Just starting out',
  availability: 'flexible',
  has_medical_training: 'no',
};

export const VALIDATION_RULES = {
  required: ['email', 'phone', 'country', 'languages'],
  individual: ['full_name'],
  agency: ['agency_name', 'contact_person'],
};