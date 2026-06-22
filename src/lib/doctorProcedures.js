// Shared procedure data for doctor signup

export const categoryMap = {
  'dental-general': { emoji: '🦷', label: 'General Dentistry' },
  'dental-cosmetic': { emoji: '✨', label: 'Cosmetic Dentistry' },
  'dental-implants': { emoji: '🔩', label: 'Implant Dentistry' },
  'dental-orthodontics': { emoji: '😁', label: 'Orthodontics' },
  'aesthetic-face': { emoji: '💆', label: 'Facial Aesthetics' },
  'aesthetic-body': { emoji: '💪', label: 'Body Contouring' },
  'aesthetic-breast': { emoji: '🌸', label: 'Breast Surgery' },
  'wellness': { emoji: '🌿', label: 'Wellness & Regenerative' },
};

export const PROCEDURES_BY_CATEGORY = {
  'dental-general': [
    'Dental Cleaning', 'Deep Cleaning', 'Dental Exam', 'Dental X-Rays', 'Fillings',
    'Tooth Extraction', 'Wisdom Tooth Removal', 'Root Canal Treatment', 'Dental Crowns',
    'Dental Bridges', 'Dentures', 'Partial Dentures', 'Inlays & Onlays'
  ],
  'dental-cosmetic': [
    'Teeth Whitening', 'Porcelain Veneers', 'Composite Bonding', 'Smile Makeover',
    'Gum Contouring', 'Hollywood Smile'
  ],
  'dental-implants': [
    'Single Dental Implant', 'Multiple Dental Implants', 'Full Mouth Implants',
    'All-on-4 Implants', 'All-on-6 Implants', 'Implant-Supported Dentures', 'Bone Grafting', 'Sinus Lift'
  ],
  'dental-orthodontics': [
    'Braces', 'Invisalign', 'Clear Aligners', 'Retainers'
  ],
  'aesthetic-face': [
    'Rhinoplasty', 'Facelift', 'Neck Lift', 'Eyelid Surgery', 'Chin Augmentation',
    'Buccal Fat Removal', 'Lip Lift', 'Botox', 'Dermal Fillers'
  ],
  'aesthetic-body': [
    'Liposuction', 'Tummy Tuck', 'Mommy Makeover', 'Brazilian Butt Lift', 'Body Contouring',
    'Arm Lift', 'Thigh Lift'
  ],
  'aesthetic-breast': [
    'Breast Augmentation', 'Breast Lift', 'Breast Reduction', 'Breast Revision'
  ],
  'wellness': [
    'IV Therapy', 'Stem Cell Therapy', 'PRP Therapy', 'Hormone Therapy',
    'Medical Weight Loss', 'Nutritional Programs', 'Recovery Therapy'
  ],
};