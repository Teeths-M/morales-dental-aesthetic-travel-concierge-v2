export const procedureCategories = [
  {
    id: 'dental-general',
    label: 'General Dentistry',
    parent: 'dental',
    icon: '🦷',
    color: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-600' },
    procedures: [
      { title: 'Dental Cleaning', duration: '45–60 min', recovery: 'None', downtime: 'None', tag: 'Preventive', keywords: ['cleaning', 'clean teeth', 'polish', 'scale'] },
      { title: 'Deep Cleaning', duration: '1–2 hours', recovery: '1–2 days sensitivity', downtime: 'Minimal', tag: 'Periodontal', keywords: ['deep clean', 'scaling', 'root planing', 'gum cleaning'] },
      { title: 'Dental Exam', duration: '30–45 min', recovery: 'None', downtime: 'None', tag: 'Diagnostic', keywords: ['exam', 'check up', 'inspection', 'dental checkup'] },
      { title: 'Dental X-Rays', duration: '15–30 min', recovery: 'None', downtime: 'None', tag: 'Diagnostic', keywords: ['xray', 'x-ray', 'imaging', 'panoramic', 'radiograph'] },
      { title: 'Fillings', duration: '30–60 min', recovery: '1–2 hours numbing', downtime: 'Same day', tag: 'Restorative', keywords: ['filling', 'cavity', 'decay', 'composite'] },
      { title: 'Tooth Extraction', duration: '20–45 min', recovery: '2–3 days', downtime: '1–2 days', tag: 'Surgical', keywords: ['extraction', 'pull tooth', 'remove tooth', 'tooth out'] },
      { title: 'Wisdom Tooth Removal', duration: '30–60 min', recovery: '3–5 days', downtime: '2–3 days', tag: 'Surgical', keywords: ['wisdom tooth', 'third molar', 'wisdom teeth'] },
      { title: 'Root Canal Treatment', duration: '1–2 hours', recovery: '2–3 days', downtime: '1 day', tag: 'Endodontic', keywords: ['root canal', 'nerve treatment', 'endodontic'] },
      { title: 'Dental Crowns', duration: '2 appointments', recovery: 'Minimal', downtime: 'Minimal', tag: 'Restorative', keywords: ['crown', 'cap', 'dental cap', 'porcelain crown'] },
      { title: 'Dental Bridges', duration: '2 appointments', recovery: '1–2 days', downtime: 'Minimal', tag: 'Restorative', keywords: ['bridge', 'dental bridge', 'fixed bridge'] },
      { title: 'Dentures', duration: '2–4 visits', recovery: '2–4 weeks adapting', downtime: 'Minimal', tag: 'Prosthetic', keywords: ['dentures', 'false teeth', 'fake teeth', 'full denture'] },
      { title: 'Partial Dentures', duration: '2–3 visits', recovery: '1–2 weeks', downtime: 'Minimal', tag: 'Prosthetic', keywords: ['partial denture', 'partial plate', 'removable partial'] },
      { title: 'Inlays & Onlays', duration: '2 appointments', recovery: '1–2 days', downtime: 'Minimal', tag: 'Restorative', keywords: ['inlay', 'onlay', 'indirect filling'] },
    ],
  },
  {
    id: 'dental-cosmetic',
    label: 'Cosmetic Dentistry',
    parent: 'dental',
    icon: '✨',
    color: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-600' },
    procedures: [
      { title: 'Teeth Whitening', duration: '1–2 hours', recovery: '1–2 days sensitivity', downtime: 'None', tag: 'Cosmetic', keywords: ['whitening', 'bleaching', 'white teeth', 'teeth bleach', 'brighter teeth'] },
      { title: 'Porcelain Veneers', duration: '2 appointments', recovery: '1–2 days sensitivity', downtime: 'Minimal', tag: 'Cosmetic', keywords: ['veneers', 'veneer', 'porcelain shells', 'teeth veneers', 'smile veneers'] },
      { title: 'Composite Bonding', duration: '1 appointment', recovery: 'None', downtime: 'None', tag: 'Cosmetic', keywords: ['bonding', 'composite', 'tooth bonding', 'chip repair'] },
      { title: 'Smile Makeover', duration: '2–5 days', recovery: '1–3 days', downtime: 'Minimal', tag: 'Premium', keywords: ['smile makeover', 'smile design', 'full smile', 'complete smile'] },
      { title: 'Gum Contouring', duration: '1–2 hours', recovery: '1–2 weeks', downtime: '1–2 days', tag: 'Cosmetic', keywords: ['gum contouring', 'gum reshaping', 'gummy smile', 'gum lift'] },
      { title: 'Hollywood Smile', duration: '3–5 days', recovery: 'Minimal', downtime: 'Minimal', tag: 'Premium', keywords: ['hollywood smile', 'perfect smile', 'celebrity smile'] },
    ],
  },
  {
    id: 'dental-implants',
    label: 'Implant Dentistry',
    parent: 'dental',
    icon: '🔩',
    color: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-600' },
    procedures: [
      { title: 'Single Dental Implant', duration: '1–2 hours', recovery: '3–5 days', downtime: '2–3 days', tag: 'Implant', keywords: ['implant', 'single implant', 'tooth implant', 'dental implant'] },
      { title: 'Multiple Dental Implants', duration: '2–4 hours', recovery: '3–7 days', downtime: '3–5 days', tag: 'Implant', keywords: ['multiple implants', 'several implants', 'implants'] },
      { title: 'Full Mouth Implants', duration: '6–8 hours', recovery: '1–2 weeks', downtime: '5–7 days', tag: 'Full Arch', keywords: ['full mouth', 'full arch', 'complete implants', 'all teeth implants'] },
      { title: 'All-on-4 Implants', duration: '4–6 hours', recovery: '3–5 days', downtime: '3–5 days', tag: 'All-on-4', keywords: ['all on 4', 'allon4', 'all-on-4', 'four implants full arch'] },
      { title: 'All-on-6 Implants', duration: '5–7 hours', recovery: '3–5 days', downtime: '3–5 days', tag: 'All-on-6', keywords: ['all on 6', 'all-on-6', 'six implants full arch'] },
      { title: 'Implant-Supported Dentures', duration: '3–4 hours', recovery: '1 week', downtime: '3–5 days', tag: 'Implant', keywords: ['snap on dentures', 'implant dentures', 'overdenture'] },
      { title: 'Bone Grafting', duration: '1–2 hours', recovery: '2–4 weeks', downtime: '3–5 days', tag: 'Surgical', keywords: ['bone graft', 'bone grafting', 'jaw bone'] },
      { title: 'Sinus Lift', duration: '1–2 hours', recovery: '2–4 weeks', downtime: '3–5 days', tag: 'Surgical', keywords: ['sinus lift', 'sinus augmentation', 'upper jaw bone'] },
    ],
  },
  {
    id: 'dental-orthodontics',
    label: 'Orthodontics',
    parent: 'dental',
    icon: '😁',
    color: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-600' },
    procedures: [
      { title: 'Braces', duration: '12–24 months', recovery: 'None', downtime: 'None', tag: 'Orthodontic', keywords: ['braces', 'metal braces', 'orthodontics', 'straight teeth'] },
      { title: 'Invisalign', duration: '12–18 months', recovery: 'None', downtime: 'None', tag: 'Clear Aligner', keywords: ['invisalign', 'clear aligners', 'braces without metal', 'invisible braces'] },
      { title: 'Clear Aligners', duration: '12–18 months', recovery: 'None', downtime: 'None', tag: 'Clear Aligner', keywords: ['clear aligners', 'plastic aligners', 'transparent aligners'] },
      { title: 'Retainers', duration: '1–2 appointments', recovery: 'None', downtime: 'None', tag: 'Maintenance', keywords: ['retainer', 'retainers', 'teeth retainer'] },
    ],
  },
  {
    id: 'aesthetic-face',
    label: 'Facial Aesthetics',
    parent: 'aesthetic',
    icon: '💆',
    color: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-600' },
    procedures: [
      { title: 'Rhinoplasty', duration: '2–4 hours', recovery: '2 weeks visible', downtime: '7–10 days', tag: 'Facial', keywords: ['rhinoplasty', 'nose job', 'nose reshaping', 'nose surgery'] },
      { title: 'Facelift', duration: '3–5 hours', recovery: '2 weeks', downtime: '10–14 days', tag: 'Facial', keywords: ['facelift', 'face lift', 'rhytidectomy', 'face tightening'] },
      { title: 'Neck Lift', duration: '2–3 hours', recovery: '1–2 weeks', downtime: '7–10 days', tag: 'Facial', keywords: ['neck lift', 'neck tightening', 'lower face lift'] },
      { title: 'Eyelid Surgery', duration: '1–2 hours', recovery: '1–2 weeks', downtime: '7–10 days', tag: 'Facial', keywords: ['eyelid surgery', 'blepharoplasty', 'eye bags', 'droopy eyelids'] },
      { title: 'Chin Augmentation', duration: '1 hour', recovery: '1 week', downtime: '5–7 days', tag: 'Facial', keywords: ['chin implant', 'chin augmentation', 'chin surgery', 'genioplasty'] },
      { title: 'Buccal Fat Removal', duration: '45 min', recovery: '1 week', downtime: '3–5 days', tag: 'Facial', keywords: ['buccal fat', 'cheek reduction', 'cheek fat'] },
      { title: 'Lip Lift', duration: '45–60 min', recovery: '1 week', downtime: '5–7 days', tag: 'Facial', keywords: ['lip lift', 'upper lip lift', 'lip surgery'] },
      { title: 'Botox', duration: '15–30 min', recovery: 'None', downtime: 'None', tag: 'Non-Surgical', keywords: ['botox', 'wrinkles', 'anti wrinkle', 'forehead lines'] },
      { title: 'Dermal Fillers', duration: '30–60 min', recovery: 'Minimal', downtime: 'None', tag: 'Non-Surgical', keywords: ['fillers', 'dermal fillers', 'lip filler', 'cheek filler', 'hyaluronic acid'] },
    ],
  },
  {
    id: 'aesthetic-body',
    label: 'Body Contouring',
    parent: 'aesthetic',
    icon: '💪',
    color: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-600' },
    procedures: [
      { title: 'Liposuction', duration: '1–4 hours', recovery: '2 weeks', downtime: '1–2 weeks', tag: 'Body', keywords: ['liposuction', 'lipo', 'fat removal', 'fat suction'] },
      { title: 'Tummy Tuck', duration: '2–4 hours', recovery: '4–6 weeks', downtime: '2–3 weeks', tag: 'Body', keywords: ['tummy tuck', 'abdominoplasty', 'flat stomach', 'stomach tuck'] },
      { title: 'Mommy Makeover', duration: '4–6 hours', recovery: '4–6 weeks', downtime: '2–4 weeks', tag: 'Combo', keywords: ['mommy makeover', 'mommy makover', 'post pregnancy', 'after baby'] },
      { title: 'Brazilian Butt Lift', duration: '2–4 hours', recovery: '2–3 weeks', downtime: '1–2 weeks', tag: 'Body', keywords: ['bbl', 'butt lift', 'brazilian butt', 'buttock augmentation'] },
      { title: 'Body Contouring', duration: '2–4 hours', recovery: '1–2 weeks', downtime: '1 week', tag: 'Body', keywords: ['body contouring', 'body sculpting', 'body shaping'] },
      { title: 'Arm Lift', duration: '1–2 hours', recovery: '1–2 weeks', downtime: '1 week', tag: 'Body', keywords: ['arm lift', 'brachioplasty', 'arm tuck', 'flabby arms'] },
      { title: 'Thigh Lift', duration: '1–3 hours', recovery: '2–3 weeks', downtime: '1–2 weeks', tag: 'Body', keywords: ['thigh lift', 'thighplasty', 'inner thigh', 'thigh reduction'] },
    ],
  },
  {
    id: 'aesthetic-breast',
    label: 'Breast Surgery',
    parent: 'aesthetic',
    icon: '🌸',
    color: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-600' },
    procedures: [
      { title: 'Breast Augmentation', duration: '1–2 hours', recovery: '2–4 weeks', downtime: '1–2 weeks', tag: 'Breast', keywords: ['breast augmentation', 'breast implants', 'boob job', 'bigger breasts'] },
      { title: 'Breast Lift', duration: '2–3 hours', recovery: '2–3 weeks', downtime: '1–2 weeks', tag: 'Breast', keywords: ['breast lift', 'mastopexy', 'lift breasts', 'sagging breasts'] },
      { title: 'Breast Reduction', duration: '2–3 hours', recovery: '2–4 weeks', downtime: '2 weeks', tag: 'Breast', keywords: ['breast reduction', 'smaller breasts', 'reduce breasts', 'mammoplasty'] },
      { title: 'Breast Revision', duration: '2–3 hours', recovery: '2–4 weeks', downtime: '1–2 weeks', tag: 'Breast', keywords: ['breast revision', 'implant revision', 'breast redo'] },
    ],
  },
  {
    id: 'wellness',
    label: 'Wellness & Regenerative',
    parent: 'wellness',
    icon: '🌿',
    color: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-600' },
    procedures: [
      { title: 'IV Therapy', duration: '45–90 min', recovery: 'None', downtime: 'None', tag: 'Wellness', keywords: ['iv therapy', 'iv drip', 'vitamin drip', 'hydration therapy'] },
      { title: 'Stem Cell Therapy', duration: '1–2 hours', recovery: '1–3 days', downtime: 'Minimal', tag: 'Regenerative', keywords: ['stem cell', 'stem cell therapy', 'regenerative'] },
      { title: 'PRP Therapy', duration: '45–60 min', recovery: '1–2 days', downtime: 'Minimal', tag: 'Regenerative', keywords: ['prp', 'platelet rich plasma', 'prp therapy'] },
      { title: 'Hormone Therapy', duration: '30–60 min', recovery: 'None', downtime: 'None', tag: 'Wellness', keywords: ['hormone therapy', 'hrt', 'hormone replacement', 'hormones'] },
      { title: 'Medical Weight Loss', duration: 'Ongoing program', recovery: 'None', downtime: 'None', tag: 'Wellness', keywords: ['weight loss', 'medical weight loss', 'weight management', 'diet program'] },
      { title: 'Nutritional Programs', duration: 'Ongoing', recovery: 'None', downtime: 'None', tag: 'Wellness', keywords: ['nutrition', 'nutritional program', 'diet plan', 'nutritionist'] },
      { title: 'Recovery Therapy', duration: 'Varies', recovery: 'None', downtime: 'None', tag: 'Recovery', keywords: ['recovery therapy', 'physical therapy', 'rehab', 'physiotherapy'] },
    ],
  },
];

export const allProcedures = procedureCategories.flatMap(cat =>
  cat.procedures.map(p => ({ ...p, category: cat.label, categoryId: cat.id, categoryColor: cat.color }))
);

export function searchProcedures(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase();
  return allProcedures.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.keywords.some(k => k.includes(q) || q.includes(k))
  ).slice(0, 8);
}

export function extractProceduresFromText(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const p of allProcedures) {
    if (p.title.toLowerCase().split(' ').some(w => lower.includes(w) && w.length > 3)) {
      if (!found.find(f => f.title === p.title)) found.push(p);
      continue;
    }
    if (p.keywords.some(k => lower.includes(k))) {
      if (!found.find(f => f.title === p.title)) found.push(p);
    }
  }
  return found;
}