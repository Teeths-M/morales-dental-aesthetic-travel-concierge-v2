// Unique images per procedure
const IMG = {
  dentalCleaning:      'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/b2983c249_generated_image.png',
  deepCleaning:        'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/42eabec7f_generated_image.png',
  dentalExam:          'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/d9668e791_generated_image.png',
  dentalXrays:         'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/2c5497fbf_generated_image.png',
  fillings:            'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/8c1e2e611_generated_image.png',
  extraction:          'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/1b90de227_generated_image.png',
  wisdomTooth:         'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/4fea17587_generated_image.png',
  rootCanal:           'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/ff3a19215_generated_image.png',
  dentalCrown:         'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/9de664f8a_generated_image.png',
  dentalBridge:        'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/6786a7407_generated_image.png',
  dentures:            'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/c5ed27ae2_generated_image.png',
  partialDentures:     'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/4b5edef52_generated_image.png',
  inlaysOnlays:        'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/793637e45_generated_image.png',
  teethWhitening:      'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/731f479fb_generated_image.png',
  porcelainVeneers:    'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/591289dd5_generated_image.png',
  compositeBonding:    'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/215ecfb79_generated_image.png',
  smileMakeover:       'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/8018f783e_generated_image.png',
  gumContouring:       'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/a3ba07ed9_generated_image.png',
  hollywoodSmile:      'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/f29253328_generated_image.png',
  singleImplant:       'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/7b5cbc521_generated_image.png',
  multipleImplants:    'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/2487f91b8_generated_image.png',
  fullMouthImplants:   'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/f625ad608_generated_image.png',
  allOn4:              'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/835718b01_generated_image.png',
  allOn6:              'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/672a74915_generated_image.png',
  implantDentures:     'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/8fe0bdef9_generated_image.png',
  boneGrafting:        'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/4ad5c45b1_generated_image.png',
  sinusLift:           'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/5cf249626_generated_image.png',
  braces:              'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/8c7931ca5_generated_image.png',
  invisalign:          'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/1f5f9ec4a_generated_image.png',
  clearAligners:       'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/2f0d45a3f_generated_image.png',
  retainers:           'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/b5bead54d_generated_image.png',
  rhinoplasty:         'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/4ff2fab82_generated_image.png',
  facelift:            'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/9b31409d1_generated_image.png',
  neckLift:            'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/925ef806e_generated_image.png',
  eyelidSurgery:       'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/b4030fcfe_generated_image.png',
  chinAugmentation:    'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/1d1c0fb25_generated_image.png',
  buccalFat:           'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/ae3408202_generated_image.png',
  lipLift:             'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/1a7e70a7c_generated_image.png',
  botox:               'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/cd89aa77f_generated_image.png',
  dermalFillers:       'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/b4abd1cb0_generated_image.png',
  liposuction:         'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/8f883eb62_generated_image.png',
  tummyTuck:           'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/8493029e5_generated_image.png',
  mommyMakeover:       'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/1aa8c66bc_generated_image.png',
  bbl:                 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/c29e83ae2_generated_image.png',
  bodyContouring:      'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/dd7ea2908_generated_image.png',
  armLift:             'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/9a7a97b2e_generated_image.png',
  thighLift:           'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/bd934f47e_generated_image.png',
  breastAugmentation:  'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/3a6bbe68c_generated_image.png',
  breastLift:          'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/e97a74c40_generated_image.png',
  breastReduction:     'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/542df42a8_generated_image.png',
  breastRevision:      'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/687ca2ae3_generated_image.png',
  ivTherapy:           'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/8bbbcccca_generated_image.png',
  stemCell:            'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/f3141d0aa_generated_image.png',
  prpTherapy:          'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/2f1794ff0_generated_image.png',
  hormoneTherapy:      'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/999590008_generated_image.png',
  weightLoss:          'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/ce72d2add_generated_image.png',
  nutritional:         'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/e694004ca_generated_image.png',
  recoveryTherapy:     'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/961a2cd4e_generated_image.png',
  sapphireFUE:         'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/785e50718_generated_image.png',
  dhiImplanter:        'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/b6f678afa_generated_image.png',
  beardTransplant:     'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/dcdd9c6e8_generated_image.png',
  eyebrowRestoration:  'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/005901708_generated_image.png',
  prpScalp:            'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/f8e38ef58_generated_image.png',
  ivfIcsi:             'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/2ad5dc8a8_generated_image.png',
  eggFreezing:         'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/fda95c2d3_generated_image.png',
};

export const procedureCategories = [
  {
    id: 'dental-general',
    label: 'General Dentistry',
    parent: 'dental',
    icon: '🦷',
    color: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-600' },
    procedures: [
      { image: IMG.dentalCleaning, title: 'Dental Cleaning', desc: 'Professional removal of plaque, tartar, and stains to maintain optimal oral health and prevent gum disease.', duration: '45–60 min', recovery: 'None', downtime: 'None', tag: 'Preventive', keywords: ['cleaning', 'clean teeth', 'polish', 'scale'], whatToExpect: ['Ultrasonic and hand scaling', 'Polishing with professional paste', 'Fluoride treatment if needed'], benefits: ['Prevents cavities and gum disease', 'Brighter, fresher smile', 'Early detection of issues'] },
      { image: IMG.deepCleaning, title: 'Deep Cleaning', desc: 'Scaling and root planing procedure that removes tartar below the gumline to treat early-stage gum disease.', duration: '1–2 hours', recovery: '1–2 days sensitivity', downtime: 'Minimal', tag: 'Periodontal', keywords: ['deep clean', 'scaling', 'root planing', 'gum cleaning'], whatToExpect: ['Local anesthesia applied', 'Scaling below gumline', 'Root surface smoothing'], benefits: ['Halts progression of gum disease', 'Reduces pocket depths', 'Prevents tooth loss'] },
      { image: IMG.dentalExam, title: 'Dental Exam', desc: 'Comprehensive oral health assessment including bite analysis, gum evaluation, and cancer screening.', duration: '30–45 min', recovery: 'None', downtime: 'None', tag: 'Diagnostic', keywords: ['exam', 'check up', 'inspection', 'dental checkup'], whatToExpect: ['Visual inspection of all teeth', 'Gum pocket measurements', 'Oral cancer screening'], benefits: ['Early problem detection', 'Personalized treatment plan', 'Peace of mind'] },
      { image: IMG.dentalXrays, title: 'Dental X-Rays', desc: 'Digital radiographs that reveal hidden decay, bone loss, and issues not visible to the naked eye.', duration: '15–30 min', recovery: 'None', downtime: 'None', tag: 'Diagnostic', keywords: ['xray', 'x-ray', 'imaging', 'panoramic', 'radiograph'], whatToExpect: ['Panoramic or bitewing x-rays', 'Digital low-radiation imaging', 'Immediate results review'], benefits: ['Detects hidden cavities', 'Assesses bone health', 'Guides treatment planning'] },
      { image: IMG.fillings, title: 'Fillings', desc: 'Tooth-colored composite or porcelain restorations that repair cavities and restore function seamlessly.', duration: '30–60 min', recovery: '1–2 hours numbing', downtime: 'Same day', tag: 'Restorative', keywords: ['filling', 'cavity', 'decay', 'composite'], whatToExpect: ['Local anesthesia', 'Decay removal', 'Composite bonding and shaping'], benefits: ['Matches natural tooth color', 'Strengthens damaged tooth', 'Long-lasting results'] },
      { image: IMG.extraction, title: 'Tooth Extraction', desc: 'Safe, gentle removal of damaged, infected, or crowded teeth under local or general anesthesia.', duration: '20–45 min', recovery: '2–3 days', downtime: '1–2 days', tag: 'Surgical', keywords: ['extraction', 'pull tooth', 'remove tooth', 'tooth out'], whatToExpect: ['Local anesthesia injection', 'Gentle loosening and removal', 'Gauze packing and aftercare instructions'], benefits: ['Relieves pain and infection', 'Creates space for orthodontics', 'Prevents spread of infection'] },
      { image: IMG.wisdomTooth, title: 'Wisdom Tooth Removal', desc: 'Surgical extraction of third molars that are impacted, misaligned, or causing crowding and pain.', duration: '30–60 min', recovery: '3–5 days', downtime: '2–3 days', tag: 'Surgical', keywords: ['wisdom tooth', 'third molar', 'wisdom teeth'], whatToExpect: ['Pre-surgical panoramic x-ray', 'Local or IV sedation', 'Sutures placed if needed'], benefits: ['Prevents crowding and misalignment', 'Eliminates pain and infection risk', 'Improves overall oral health'] },
      { image: IMG.rootCanal, title: 'Root Canal Treatment', desc: 'Removes infected pulp to save a natural tooth, eliminating pain and preventing extraction.', duration: '1–2 hours', recovery: '2–3 days', downtime: '1 day', tag: 'Endodontic', keywords: ['root canal', 'nerve treatment', 'endodontic'], whatToExpect: ['Local anesthesia', 'Infected pulp removal', 'Canal cleaning and sealing', 'Crown placement recommended'], benefits: ['Saves natural tooth', 'Eliminates severe toothache', 'Prevents abscess spread'] },
      { image: IMG.dentalCrown, title: 'Dental Crowns', desc: 'Custom-made porcelain or zirconia caps that fully restore damaged, cracked, or root canal treated teeth.', duration: '2 appointments', recovery: 'Minimal', downtime: 'Minimal', tag: 'Restorative', keywords: ['crown', 'cap', 'dental cap', 'porcelain crown'], whatToExpect: ['Tooth preparation and impression', 'Temporary crown placement', 'Final crown bonding'], benefits: ['Full tooth restoration', 'Natural appearance', 'Protects weakened teeth'] },
      { image: IMG.dentalBridge, title: 'Dental Bridges', desc: 'Fixed prosthetics that replace one or more missing teeth by anchoring to adjacent natural teeth.', duration: '2 appointments', recovery: '1–2 days', downtime: 'Minimal', tag: 'Restorative', keywords: ['bridge', 'dental bridge', 'fixed bridge'], whatToExpect: ['Abutment teeth preparation', 'Impressions and lab fabrication', 'Final bridge cementation'], benefits: ['Fixed, non-removable solution', 'Restores bite and smile', 'Prevents teeth shifting'] },
      { image: IMG.dentures, title: 'Dentures', desc: 'Custom removable full-arch prosthetics that replace all teeth, restoring function, aesthetics, and confidence.', duration: '2–4 visits', recovery: '2–4 weeks adapting', downtime: 'Minimal', tag: 'Prosthetic', keywords: ['dentures', 'false teeth', 'fake teeth', 'full denture'], whatToExpect: ['Impressions and measurements', 'Try-in for fit and appearance', 'Final delivery and adjustments'], benefits: ['Restores chewing ability', 'Improves facial appearance', 'Affordable tooth replacement'] },
      { image: IMG.partialDentures, title: 'Partial Dentures', desc: 'Removable appliances that replace several missing teeth while preserving existing natural teeth.', duration: '2–3 visits', recovery: '1–2 weeks', downtime: 'Minimal', tag: 'Prosthetic', keywords: ['partial denture', 'partial plate', 'removable partial'], whatToExpect: ['Impressions of existing teeth', 'Framework fabrication', 'Fitting and adjustment'], benefits: ['Cost-effective tooth replacement', 'Preserves remaining teeth', 'Improves speech and chewing'] },
      { image: IMG.inlaysOnlays, title: 'Inlays & Onlays', desc: 'Precision porcelain or gold restorations for moderate decay — stronger than fillings, less invasive than crowns.', duration: '2 appointments', recovery: '1–2 days', downtime: 'Minimal', tag: 'Restorative', keywords: ['inlay', 'onlay', 'indirect filling'], whatToExpect: ['Tooth preparation', 'Impression taken for lab', 'Bonding at second visit'], benefits: ['Stronger than composite fillings', 'Preserves more tooth structure', 'Long-lasting ceramic material'] },
    ],
  },
  {
    id: 'dental-cosmetic',
    label: 'Cosmetic Dentistry',
    parent: 'dental',
    icon: '✨',
    color: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-600' },
    procedures: [
      { image: IMG.teethWhitening, title: 'Teeth Whitening', desc: 'Professional in-office laser whitening that lifts stains and brightens your smile by up to 8 shades in one visit.', duration: '1–2 hours', recovery: '1–2 days sensitivity', downtime: 'None', tag: 'Cosmetic', keywords: ['whitening', 'bleaching', 'white teeth', 'teeth bleach', 'brighter teeth'], whatToExpect: ['Shade assessment', 'Protective gel on gums', 'Laser or light activation', 'Immediate shade comparison'], benefits: ['Up to 8 shades whiter', 'Long-lasting results', 'No downtime', 'Immediate visible change'] },
      { image: IMG.porcelainVeneers, title: 'Porcelain Veneers', desc: 'Ultra-thin porcelain shells custom-crafted and bonded to teeth for a flawless, permanent Hollywood smile.', duration: '2 appointments', recovery: '1–2 days sensitivity', downtime: 'Minimal', tag: 'Cosmetic', keywords: ['veneers', 'veneer', 'porcelain shells', 'teeth veneers', 'smile veneers'], whatToExpect: ['Digital smile design', 'Minimal tooth preparation', 'Temporaries placed', 'Final bonding session'], benefits: ['Hollywood-quality smile', 'Stain resistant', 'Lasts 10–20 years', 'Minimal tooth removal'] },
      { image: IMG.compositeBonding, title: 'Composite Bonding', desc: 'Tooth-colored resin applied and sculpted to repair chips, gaps, and discoloration — no lab required.', duration: '1 appointment', recovery: 'None', downtime: 'None', tag: 'Cosmetic', keywords: ['bonding', 'composite', 'tooth bonding', 'chip repair'], whatToExpect: ['Tooth surface preparation', 'Resin application and shaping', 'Hardening with UV light'], benefits: ['Same-day results', 'No anesthesia needed', 'Affordable cosmetic fix', 'Reversible procedure'] },
      { image: IMG.smileMakeover, title: 'Smile Makeover', desc: 'A full smile transformation combining veneers, whitening, contouring, and alignment for stunning, custom results.', duration: '2–5 days', recovery: '1–3 days', downtime: 'Minimal', tag: 'Premium', keywords: ['smile makeover', 'smile design', 'full smile', 'complete smile'], whatToExpect: ['Full dental assessment', 'Digital mock-up preview', 'Combination of treatments', 'Final polish and bite check'], benefits: ['Total aesthetic transformation', 'Customized to face shape', 'Confidence boosting', 'Long-lasting results'] },
      { image: IMG.gumContouring, title: 'Gum Contouring', desc: 'Laser reshaping of the gumline to correct a gummy smile or uneven gums for a more balanced, symmetrical look.', duration: '1–2 hours', recovery: '1–2 weeks', downtime: '1–2 days', tag: 'Cosmetic', keywords: ['gum contouring', 'gum reshaping', 'gummy smile', 'gum lift'], whatToExpect: ['Local anesthesia', 'Laser gum reshaping', 'Immediate visible improvement'], benefits: ['Balances teeth-to-gum ratio', 'Permanent results', 'Minimal bleeding with laser'] },
      { image: IMG.hollywoodSmile, title: 'Hollywood Smile', desc: 'The premium total smile package — veneers, whitening, contouring, and alignment for a red-carpet-ready result.', duration: '3–5 days', recovery: 'Minimal', downtime: 'Minimal', tag: 'Premium', keywords: ['hollywood smile', 'perfect smile', 'celebrity smile'], whatToExpect: ['Comprehensive smile design consultation', 'Digital simulation of final result', 'Multi-procedure treatment in one stay'], benefits: ['Complete smile transformation', 'Customized to facial features', 'Permanent, natural-looking results'] },
    ],
  },
  {
    id: 'dental-implants',
    label: 'Implant Dentistry',
    parent: 'dental',
    icon: '🔩',
    color: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-600' },
    procedures: [
      { image: IMG.singleImplant, title: 'Single Dental Implant', desc: 'Permanent titanium implant replacing a single missing tooth — looks, feels, and functions like your natural tooth.', duration: '1–2 hours', recovery: '3–5 days', downtime: '2–3 days', tag: 'Implant', keywords: ['implant', 'single implant', 'tooth implant', 'dental implant'], whatToExpect: ['CT scan and planning', 'Implant placement under anesthesia', 'Healing period', 'Crown placement'], benefits: ['Permanent lifelong solution', 'Preserves jawbone', 'No impact on adjacent teeth'] },
      { image: IMG.multipleImplants, title: 'Multiple Dental Implants', desc: 'Replacing several missing teeth with individual implants for the most natural-feeling, long-term restoration.', duration: '2–4 hours', recovery: '3–7 days', downtime: '3–5 days', tag: 'Implant', keywords: ['multiple implants', 'several implants', 'implants'], whatToExpect: ['3D CT scan treatment planning', 'Staged or same-day placement', 'Individual crown per implant'], benefits: ['Independent tooth restoration', 'No denture adhesives', 'Bone preservation'] },
      { image: IMG.fullMouthImplants, title: 'Full Mouth Implants', desc: 'Complete replacement of all upper and/or lower teeth with individual implants for a fully fixed, permanent smile.', duration: '6–8 hours', recovery: '1–2 weeks', downtime: '5–7 days', tag: 'Full Arch', keywords: ['full mouth', 'full arch', 'complete implants', 'all teeth implants'], whatToExpect: ['Comprehensive treatment planning', 'Full arch implant placement', 'Immediate temporary teeth'], benefits: ['Fixed, non-removable result', 'Maximum bone preservation', 'Natural appearance and function'] },
      { image: IMG.allOn4, title: 'All-on-4 Implants', desc: 'Full arch restoration using just 4 strategically placed implants — leave with a brand-new smile in a single trip.', duration: '4–6 hours', recovery: '3–5 days', downtime: '3–5 days', tag: 'All-on-4', keywords: ['all on 4', 'allon4', 'all-on-4', 'four implants full arch'], whatToExpect: ['Pre-surgical smile design', 'All extractions and implants same day', 'Immediate temporary teeth'], benefits: ['Full arch in one visit', 'No removable dentures', 'Bone preservation'] },
      { image: IMG.allOn6, title: 'All-on-6 Implants', desc: 'Enhanced full arch restoration with 6 implants for superior stability and load distribution across the jaw.', duration: '5–7 hours', recovery: '3–5 days', downtime: '3–5 days', tag: 'All-on-6', keywords: ['all on 6', 'all-on-6', 'six implants full arch'], whatToExpect: ['CT-guided implant planning', 'Six-implant placement', 'Immediate fixed temporary bridge'], benefits: ['Greater stability than All-on-4', 'Better force distribution', 'Ideal for full bone support'] },
      { image: IMG.implantDentures, title: 'Implant-Supported Dentures', desc: 'Removable or fixed dentures anchored to implants for superior stability compared to traditional dentures.', duration: '3–4 hours', recovery: '1 week', downtime: '3–5 days', tag: 'Implant', keywords: ['snap on dentures', 'implant dentures', 'overdenture'], whatToExpect: ['Implant placement', 'Healing period', 'Denture attachment fitting'], benefits: ['Eliminates denture slipping', 'More affordable than full implants', 'Improved chewing confidence'] },
      { image: IMG.boneGrafting, title: 'Bone Grafting', desc: 'Advanced grafting rebuilds jaw bone density — essential preparation for implants where bone has been lost.', duration: '1–2 hours', recovery: '2–4 weeks', downtime: '3–5 days', tag: 'Surgical', keywords: ['bone graft', 'bone grafting', 'jaw bone'], whatToExpect: ['Cone beam CT analysis', 'Guided bone regeneration', 'Membrane placement', 'Healing before implants'], benefits: ['Enables implants where bone was lost', 'Biocompatible materials', 'Long-term jaw health'] },
      { image: IMG.sinusLift, title: 'Sinus Lift', desc: 'Surgical procedure that adds bone to the upper jaw near the sinuses to create space for upper implants.', duration: '1–2 hours', recovery: '2–4 weeks', downtime: '3–5 days', tag: 'Surgical', keywords: ['sinus lift', 'sinus augmentation', 'upper jaw bone'], whatToExpect: ['CT scan assessment', 'Sinus membrane elevation', 'Bone graft placement', 'Healing phase'], benefits: ['Creates foundation for upper implants', 'Predictable success rate', 'Permanent bone augmentation'] },
    ],
  },
  {
    id: 'dental-orthodontics',
    label: 'Orthodontics',
    parent: 'dental',
    icon: '😁',
    color: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-600' },
    procedures: [
      { image: IMG.braces, title: 'Braces', desc: 'Traditional metal or ceramic brackets that gradually align teeth for a straighter, healthier bite.', duration: '12–24 months', recovery: 'None', downtime: 'None', tag: 'Orthodontic', keywords: ['braces', 'metal braces', 'orthodontics', 'straight teeth'], whatToExpect: ['Orthodontic assessment and x-rays', 'Bracket bonding appointment', 'Monthly adjustments'], benefits: ['Corrects complex alignment', 'Improves bite function', 'Long-lasting results'] },
      { image: IMG.invisalign, title: 'Invisalign', desc: 'Clear, removable aligners that straighten teeth invisibly — no wires, no brackets, just results.', duration: '12–18 months', recovery: 'None', downtime: 'None', tag: 'Clear Aligner', keywords: ['invisalign', 'clear aligners', 'braces without metal', 'invisible braces'], whatToExpect: ['3D digital scan', 'Custom aligner series fabricated', 'New trays every 1–2 weeks'], benefits: ['Virtually invisible', 'Removable for eating', 'Comfortable with no wires'] },
      { image: IMG.clearAligners, title: 'Clear Aligners', desc: 'Custom-made transparent trays that progressively shift teeth into ideal alignment with maximum comfort.', duration: '12–18 months', recovery: 'None', downtime: 'None', tag: 'Clear Aligner', keywords: ['clear aligners', 'plastic aligners', 'transparent aligners'], whatToExpect: ['Digital impressions', 'Series of custom trays', 'Regular progress monitoring'], benefits: ['Discreet treatment', 'Easy oral hygiene', 'Predictable outcome'] },
      { image: IMG.retainers, title: 'Retainers', desc: 'Custom-fitted appliances worn after orthodontic treatment to maintain your newly aligned smile permanently.', duration: '1–2 appointments', recovery: 'None', downtime: 'None', tag: 'Maintenance', keywords: ['retainer', 'retainers', 'teeth retainer'], whatToExpect: ['Impressions or digital scan', 'Custom retainer fabrication', 'Fitting and wear instructions'], benefits: ['Maintains orthodontic results', 'Fixed or removable options', 'Essential for lasting results'] },
    ],
  },
  {
    id: 'aesthetic-face',
    label: 'Facial Aesthetics',
    parent: 'aesthetic',
    icon: '💆',
    color: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-600' },
    procedures: [
      { image: IMG.rhinoplasty, title: 'Rhinoplasty', desc: 'Surgical reshaping of the nose for aesthetic harmony or improved breathing — one of the most refined cosmetic surgeries.', duration: '2–4 hours', recovery: '2 weeks visible', downtime: '7–10 days', tag: 'Facial', keywords: ['rhinoplasty', 'nose job', 'nose reshaping', 'nose surgery'], whatToExpect: ['3D imaging consultation', 'General anesthesia', 'Nasal splint worn for 1 week', 'Gradual swelling reduction'], benefits: ['Permanent reshaping', 'Can improve breathing', 'Tailored to facial proportions'] },
      { image: IMG.facelift, title: 'Facelift', desc: 'Lifts and firms sagging facial and neck tissue for a naturally youthful, refreshed appearance lasting 7–10 years.', duration: '3–5 hours', recovery: '2 weeks', downtime: '10–14 days', tag: 'Facial', keywords: ['facelift', 'face lift', 'rhytidectomy', 'face tightening'], whatToExpect: ['Deep plane technique planning', 'General anesthesia', 'Concealed incisions', 'Gradual swelling resolution'], benefits: ['10–15 years of rejuvenation', 'Natural-looking results', 'Long-lasting — 7–10 years'] },
      { image: IMG.neckLift, title: 'Neck Lift', desc: 'Removes excess skin and tightens neck muscles to eliminate turkey neck and restore a defined jawline.', duration: '2–3 hours', recovery: '1–2 weeks', downtime: '7–10 days', tag: 'Facial', keywords: ['neck lift', 'neck tightening', 'lower face lift'], whatToExpect: ['Pre-op consultation', 'Local or general anesthesia', 'Neck muscle tightening', 'Incisions hidden behind ears'], benefits: ['Defined, youthful neckline', 'Can be combined with facelift', 'Long-lasting improvement'] },
      { image: IMG.eyelidSurgery, title: 'Eyelid Surgery', desc: 'Removes excess skin and fat from eyelids to restore a rested, youthful, and bright-eyed appearance.', duration: '1–2 hours', recovery: '1–2 weeks', downtime: '7–10 days', tag: 'Facial', keywords: ['eyelid surgery', 'blepharoplasty', 'eye bags', 'droopy eyelids'], whatToExpect: ['Upper/lower eyelid assessment', 'Local anesthesia with sedation', 'Natural crease incisions', 'Sutures removed in 5–7 days'], benefits: ['Brighter, open eyes', 'Removes under-eye bags', 'Can improve peripheral vision'] },
      { image: IMG.chinAugmentation, title: 'Chin Augmentation', desc: 'Implant or fat-transfer procedure to enhance a recessed chin and improve overall facial balance and projection.', duration: '1 hour', recovery: '1 week', downtime: '5–7 days', tag: 'Facial', keywords: ['chin implant', 'chin augmentation', 'chin surgery', 'genioplasty'], whatToExpect: ['Facial proportions analysis', 'Implant selection', 'Small incision under chin'], benefits: ['Improves facial symmetry', 'Permanent result', 'Often combined with rhinoplasty'] },
      { image: IMG.buccalFat, title: 'Buccal Fat Removal', desc: 'Removal of buccal fat pads to slim and define the lower face for a more sculpted, contoured appearance.', duration: '45 min', recovery: '1 week', downtime: '3–5 days', tag: 'Facial', keywords: ['buccal fat', 'cheek reduction', 'cheek fat'], whatToExpect: ['Intraoral incisions inside mouth', 'Fat pad removal', 'Dissolvable sutures'], benefits: ['Slimmer, defined face', 'No visible scarring', 'Permanent result'] },
      { image: IMG.lipLift, title: 'Lip Lift', desc: 'Surgical procedure that shortens the space between the nose and upper lip, creating a fuller, more youthful lip.', duration: '45–60 min', recovery: '1 week', downtime: '5–7 days', tag: 'Facial', keywords: ['lip lift', 'upper lip lift', 'lip surgery'], whatToExpect: ['Incision hidden under nose', 'Skin excision', 'Permanent elevation of lip'], benefits: ['Permanently fuller upper lip', 'More youthful smile', 'No fillers required'] },
      { image: IMG.botox, title: 'Botox', desc: 'Precision injections of botulinum toxin to relax dynamic wrinkles on the forehead, crow\'s feet, and frown lines.', duration: '15–30 min', recovery: 'None', downtime: 'None', tag: 'Non-Surgical', keywords: ['botox', 'wrinkles', 'anti wrinkle', 'forehead lines'], whatToExpect: ['Mark injection points', 'Fine needle injections', 'Full effect in 7–14 days'], benefits: ['No downtime', 'Natural-looking relaxation', 'Lasts 3–4 months'] },
      { image: IMG.dermalFillers, title: 'Dermal Fillers', desc: 'Hyaluronic acid injections that restore volume, define lips, lift cheeks, and smooth nasolabial folds instantly.', duration: '30–60 min', recovery: 'Minimal', downtime: 'None', tag: 'Non-Surgical', keywords: ['fillers', 'dermal fillers', 'lip filler', 'cheek filler', 'hyaluronic acid'], whatToExpect: ['Consultation and treatment plan', 'Topical numbing cream', 'Filler injections', 'Massage and assessment'], benefits: ['Immediate volume restoration', 'Reversible with hyaluronidase', 'Lasts 6–18 months'] },
    ],
  },
  {
    id: 'aesthetic-body',
    label: 'Body Contouring',
    parent: 'aesthetic',
    icon: '💪',
    color: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-600' },
    procedures: [
      { image: IMG.liposuction, title: 'Liposuction', desc: 'Targeted fat removal from stubborn areas including abdomen, flanks, thighs, arms, and more with minimal scarring.', duration: '1–4 hours', recovery: '2 weeks', downtime: '1–2 weeks', tag: 'Body', keywords: ['liposuction', 'lipo', 'fat removal', 'fat suction'], whatToExpect: ['Pre-op body marking', 'Tumescent technique', 'Small cannula incisions', 'Compression garment'], benefits: ['Permanent fat cell removal', 'Sculpted contours', 'Can be combined with other procedures'] },
      { image: IMG.tummyTuck, title: 'Tummy Tuck', desc: 'Removes excess abdominal skin and tightens muscles for a flat, toned midsection — ideal after weight loss or pregnancy.', duration: '2–4 hours', recovery: '4–6 weeks', downtime: '2–3 weeks', tag: 'Body', keywords: ['tummy tuck', 'abdominoplasty', 'flat stomach', 'stomach tuck'], whatToExpect: ['Full or mini tummy tuck', 'Muscle repair', 'Navel repositioning', 'Drain tubes placed'], benefits: ['Flat, toned abdomen', 'Repairs muscle separation', 'Long-lasting with stable weight'] },
      { image: IMG.mommyMakeover, title: 'Mommy Makeover', desc: 'A combination of breast, abdomen, and body procedures designed to restore your pre-pregnancy figure in one trip.', duration: '4–6 hours', recovery: '4–6 weeks', downtime: '2–4 weeks', tag: 'Combo', keywords: ['mommy makeover', 'mommy makover', 'post pregnancy', 'after baby'], whatToExpect: ['Customized procedure combination', 'Tummy tuck and breast lift/augmentation', 'Liposuction as needed'], benefits: ['Comprehensive body restoration', 'One recovery period', 'High patient satisfaction'] },
      { image: IMG.bbl, title: 'Brazilian Butt Lift', desc: 'Fat transfer from other areas to the buttocks to create natural-looking, shapely curves using your own tissue.', duration: '2–4 hours', recovery: '2–3 weeks', downtime: '1–2 weeks', tag: 'Body', keywords: ['bbl', 'butt lift', 'brazilian butt', 'buttock augmentation'], whatToExpect: ['Liposuction for fat harvest', 'Fat processing', 'Fat injection into buttocks', 'Special sitting restrictions'], benefits: ['Natural result using own fat', 'Simultaneous body contouring', 'No implants needed'] },
      { image: IMG.bodyContouring, title: 'Body Contouring', desc: 'Comprehensive sculpting combining liposuction and skin tightening to define and reshape your overall silhouette.', duration: '2–4 hours', recovery: '1–2 weeks', downtime: '1 week', tag: 'Body', keywords: ['body contouring', 'body sculpting', 'body shaping'], whatToExpect: ['Full body analysis', 'Targeted fat removal', 'Skin tightening if needed'], benefits: ['Comprehensive reshaping', 'Defined, athletic silhouette', 'Boosted confidence'] },
      { image: IMG.armLift, title: 'Arm Lift', desc: 'Removes excess skin from inner upper arms to create a smooth, toned contour — ideal after significant weight loss.', duration: '1–2 hours', recovery: '1–2 weeks', downtime: '1 week', tag: 'Body', keywords: ['arm lift', 'brachioplasty', 'arm tuck', 'flabby arms'], whatToExpect: ['Skin excision plan', 'Incision in arm crease', 'Compression garment'], benefits: ['Smooth, tighter arms', 'Improved comfort', 'Often combined with liposuction'] },
      { image: IMG.thighLift, title: 'Thigh Lift', desc: 'Tightens and reshapes inner or outer thighs by removing loose, sagging skin for a slimmer contour.', duration: '1–3 hours', recovery: '2–3 weeks', downtime: '1–2 weeks', tag: 'Body', keywords: ['thigh lift', 'thighplasty', 'inner thigh', 'thigh reduction'], whatToExpect: ['Incision placement planning', 'Skin excision and tightening', 'Compression garments'], benefits: ['Smoother thigh contour', 'Improves mobility', 'Often combined with liposuction'] },
    ],
  },
  {
    id: 'aesthetic-breast',
    label: 'Breast Surgery',
    parent: 'aesthetic',
    icon: '🌸',
    color: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-600' },
    procedures: [
      { image: IMG.breastAugmentation, title: 'Breast Augmentation', desc: 'Enhance breast size and shape using silicone or saline implants — customized to your desired profile and body type.', duration: '1–2 hours', recovery: '2–4 weeks', downtime: '1–2 weeks', tag: 'Breast', keywords: ['breast augmentation', 'breast implants', 'boob job', 'bigger breasts'], whatToExpect: ['Implant type and size consultation', 'General anesthesia', 'Pocket creation and placement', 'Compression bra worn post-op'], benefits: ['Enhanced volume and shape', 'High satisfaction rates', 'Multiple implant options'] },
      { image: IMG.breastLift, title: 'Breast Lift', desc: 'Reshapes and elevates sagging or drooping breasts to restore a youthful, perky position without implants.', duration: '2–3 hours', recovery: '2–3 weeks', downtime: '1–2 weeks', tag: 'Breast', keywords: ['breast lift', 'mastopexy', 'lift breasts', 'sagging breasts'], whatToExpect: ['Breast shape analysis', 'Excess skin removal', 'Nipple repositioning', 'Compression bra'], benefits: ['Elevated, youthful shape', 'Can be combined with augmentation', 'Long-lasting results'] },
      { image: IMG.breastReduction, title: 'Breast Reduction', desc: 'Removes excess tissue to alleviate chronic back pain, posture issues, and skin irritation from overly large breasts.', duration: '2–3 hours', recovery: '2–4 weeks', downtime: '2 weeks', tag: 'Breast', keywords: ['breast reduction', 'smaller breasts', 'reduce breasts', 'mammoplasty'], whatToExpect: ['Assessment of tissue to remove', 'General anesthesia', 'Tissue and skin removal', 'Drainage tubes placed'], benefits: ['Relief from chronic back pain', 'Improved posture', 'Greater comfort and mobility'] },
      { image: IMG.breastRevision, title: 'Breast Revision', desc: 'Corrective surgery to replace, reposition, or remove existing implants and address complications or aesthetic changes.', duration: '2–3 hours', recovery: '2–4 weeks', downtime: '1–2 weeks', tag: 'Breast', keywords: ['breast revision', 'implant revision', 'breast redo'], whatToExpect: ['Assessment of existing implants', 'Implant removal/replacement', 'Capsule removal if needed'], benefits: ['Corrects previous results', 'Improved safety and aesthetics', 'Modern implant options'] },
    ],
  },
  {
    id: 'wellness',
    label: 'Wellness & Regenerative',
    parent: 'wellness',
    icon: '🌿',
    color: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-600' },
    procedures: [
      { image: IMG.ivTherapy, title: 'IV Therapy', desc: 'Customized vitamin, mineral, and hydration infusions delivered directly into the bloodstream for maximum absorption.', duration: '45–90 min', recovery: 'None', downtime: 'None', tag: 'Wellness', keywords: ['iv therapy', 'iv drip', 'vitamin drip', 'hydration therapy'], whatToExpect: ['Health assessment', 'IV line placement', 'Custom infusion delivery'], benefits: ['Instant nutrient absorption', 'Boosts energy and immunity', 'Rehydration and recovery'] },
      { image: IMG.stemCell, title: 'Stem Cell Therapy', desc: 'Regenerative treatment using your body\'s own stem cells to promote healing, reduce inflammation, and restore tissue.', duration: '1–2 hours', recovery: '1–3 days', downtime: 'Minimal', tag: 'Regenerative', keywords: ['stem cell', 'stem cell therapy', 'regenerative'], whatToExpect: ['Cell harvest procedure', 'Laboratory processing', 'Targeted reinjection'], benefits: ['Harnesses body\'s healing power', 'Anti-inflammatory effects', 'Broad therapeutic applications'] },
      { image: IMG.prpTherapy, title: 'PRP Therapy', desc: 'Platelet-rich plasma injections that accelerate healing and stimulate collagen production for skin and joints.', duration: '45–60 min', recovery: '1–2 days', downtime: 'Minimal', tag: 'Regenerative', keywords: ['prp', 'platelet rich plasma', 'prp therapy'], whatToExpect: ['Blood draw and centrifuge', 'PRP preparation', 'Injection into treatment area'], benefits: ['Uses your own plasma', 'Natural collagen stimulation', 'Effective for skin and hair'] },
      { image: IMG.hormoneTherapy, title: 'Hormone Therapy', desc: 'Personalized hormone optimization to restore balance, energy, libido, and overall wellbeing through evidence-based protocols.', duration: '30–60 min', recovery: 'None', downtime: 'None', tag: 'Wellness', keywords: ['hormone therapy', 'hrt', 'hormone replacement', 'hormones'], whatToExpect: ['Comprehensive hormone panel', 'Personalized prescription', 'Regular monitoring'], benefits: ['Restored energy levels', 'Improved mood and sleep', 'Evidence-based protocols'] },
      { image: IMG.weightLoss, title: 'Medical Weight Loss', desc: 'Physician-supervised weight management combining nutrition, medications, and lifestyle coaching for lasting results.', duration: 'Ongoing program', recovery: 'None', downtime: 'None', tag: 'Wellness', keywords: ['weight loss', 'medical weight loss', 'weight management', 'diet program'], whatToExpect: ['Full metabolic assessment', 'Personalized plan creation', 'Regular check-ins and adjustments'], benefits: ['Medically supervised safety', 'Sustainable long-term results', 'Treats underlying conditions'] },
      { image: IMG.nutritional, title: 'Nutritional Programs', desc: 'Personalized nutrition plans designed by registered dietitians to optimize health, energy, and recovery outcomes.', duration: 'Ongoing', recovery: 'None', downtime: 'None', tag: 'Wellness', keywords: ['nutrition', 'nutritional program', 'diet plan', 'nutritionist'], whatToExpect: ['Diet assessment and goals', 'Custom meal planning', 'Ongoing coaching support'], benefits: ['Improved energy and performance', 'Supports surgical recovery', 'Long-term health optimization'] },
      { image: IMG.recoveryTherapy, title: 'Recovery Therapy', desc: 'Post-procedure physiotherapy and rehabilitation designed to accelerate healing and restore full function safely.', duration: 'Varies', recovery: 'None', downtime: 'None', tag: 'Recovery', keywords: ['recovery therapy', 'physical therapy', 'rehab', 'physiotherapy'], whatToExpect: ['Post-op assessment', 'Tailored exercise program', 'Manual therapy and modalities'], benefits: ['Faster recovery', 'Reduced scar tissue', 'Restored full range of motion'] },
    ],
  },
  {
    id: 'hair-restoration',
    label: 'Hair Restoration & Transplants',
    parent: 'hair_restoration',
    icon: '💇',
    color: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-600' },
    procedures: [
      { image: IMG.sapphireFUE, title: 'Sapphire FUE Hair Transplant', desc: 'Gold-standard restoration utilizing ultra-precise sapphire gemstone blades for rapid healing, maximum graft density, and zero linear scars.', duration: '4–8 hours', recovery: '2–3 weeks', downtime: '1–2 weeks', tag: '98% Success Rate', keywords: ['fue', 'sapphire', 'hair transplant', 'baldness', 'hair loss'], whatToExpect: ['Donor area extraction with sapphire blades', 'Recipient site creation', 'Graft placement under local anesthesia'], benefits: ['Minimal scarring', 'Faster healing', 'Higher graft survival rate', 'Natural-looking density'] },
      { image: IMG.dhiImplanter, title: 'DHI (Direct Hair Implantation)', desc: 'Premium precision grafting using an advanced Choi Implanter Pen to control depth, angle, and hair direction simultaneously without channel incisions.', duration: '4–8 hours', recovery: '2–3 weeks', downtime: '1–2 weeks', tag: 'Advanced Precision', keywords: ['dhi', 'choi implanter', 'direct implantation', 'hair transplant'], whatToExpect: ['FUE extraction', 'Loading grafts into Choi pen', 'Direct implantation without pre-made channels'], benefits: ['No linear scars', 'Precise angle control', 'Faster procedure', 'Higher density possible'] },
      { image: IMG.beardTransplant, title: 'Beard & Facial Hair Transplant', desc: 'Meticulous follicular unit mapping to resolve patchy facial hair, building a permanently dense, natural-looking beard and jawline profile.', duration: '3–5 hours', recovery: '1–2 weeks', downtime: '5–7 days', tag: 'High Density', keywords: ['beard transplant', 'facial hair', 'patchy beard', 'beard restoration'], whatToExpect: ['Beard design consultation', 'FUE extraction from donor area', 'Precise graft placement following natural growth patterns'], benefits: ['Permanent facial hair', 'Natural growth direction', 'Confidence boosting', 'Customizable density'] },
      { image: IMG.eyebrowRestoration, title: 'Eyebrow Restoration Micro-Grafts', desc: 'Artistic, ultra-fine individual graft placements to permanently sculpt, reshape, and restore thinning or over-plucked eyebrows.', duration: '2–3 hours', recovery: '1–2 weeks', downtime: '3–5 days', tag: 'Artistic Precision', keywords: ['eyebrow transplant', 'eyebrow restoration', 'thin eyebrows', 'eyebrow micrografts'], whatToExpect: ['Eyebrow shape design', 'Single-hair graft extraction', 'Artistic placement following natural arch'], benefits: ['Permanent eyebrow restoration', 'Natural-looking results', 'No daily makeup needed', 'Customized to face shape'] },
      { image: IMG.prpScalp, title: 'Cellular PRP Scalp Therapy', desc: 'Non-surgical, autologous growth-factor injections engineered to halt active shedding, accelerate post-op transplant recovery, and thicken hair shafts.', duration: '45–60 min', recovery: 'None', downtime: 'None', tag: 'Non-Surgical Add-on', keywords: ['prp', 'platelet rich plasma', 'scalp therapy', 'hair growth', 'hair loss treatment'], whatToExpect: ['Blood draw and centrifugation', 'PRP preparation', 'Scalp injections under local anesthesia'], benefits: ['Stimulates natural growth', 'No surgery required', 'Accelerates healing', 'Thickens existing hair'] },
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