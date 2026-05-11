import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronRight } from 'lucide-react';
import ProcedureModal from '../components/procedures/ProcedureModal';

const categories = [
  {
    id: 'dental',
    label: 'Dental',
    color: 'bg-primary/10 text-primary',
    procedures: [
      {
        title: 'Dental Implants',
        tag: 'Most Popular',
        desc: 'Permanent tooth replacement with titanium implants that look, feel, and function like natural teeth.',
        duration: '1–2 hours per implant',
        recovery: '3–6 months (osseointegration)',
        whatToExpect: [
          'CT scan and treatment planning session',
          'Implant placement under local anesthesia',
          'Healing period for the implant to fuse with bone',
          'Crown placement for a seamless final result',
        ],
        benefits: ['Permanent, lifelong solution', 'Preserves jawbone density', 'No impact on adjacent teeth', 'Natural look and feel'],
      },
      {
        title: 'All-on-4 / All-on-6',
        tag: 'Full Arch',
        desc: 'Full arch restoration with just 4–6 implants. Leave with a brand-new fixed smile in a single trip.',
        duration: '4–6 hours',
        recovery: '3–5 days before light activity',
        whatToExpect: [
          'Pre-surgical digital smile design',
          'All extractions and implants in one session',
          'Immediate temporary teeth placed same day',
          'Final permanent bridge after healing',
        ],
        benefits: ['Full mouth in one visit', 'No removable dentures', 'Bone preservation', 'Immediate function and aesthetics'],
      },
      {
        title: 'Porcelain Veneers',
        tag: 'Aesthetic',
        desc: 'Ultra-thin porcelain shells custom-crafted and bonded to the front of teeth for a flawless smile.',
        duration: '2 appointments',
        recovery: 'Minimal — 1–2 days sensitivity',
        whatToExpect: [
          'Smile design and shade selection',
          'Minimal tooth preparation',
          'Temporary veneers while permanent ones are made',
          'Final bonding with precision fit',
        ],
        benefits: ['Hollywood-quality smile', 'Stain-resistant porcelain', 'Minimal tooth removal', 'Lasts 10–20 years'],
      },
      {
        title: 'Smile Makeover',
        tag: 'Premium',
        desc: 'A comprehensive smile transformation combining veneers, whitening, contouring, and alignment for stunning results.',
        duration: '2–5 days',
        recovery: '1–3 days',
        whatToExpect: [
          'Full dental and aesthetic assessment',
          'Digital mock-up so you see the result beforehand',
          'Combination of cosmetic treatments in sequence',
          'Final polishing and bite check',
        ],
        benefits: ['Total aesthetic transformation', 'Customized for your face shape', 'Long-lasting results', 'Confidence-boosting'],
      },
      {
        title: 'Bone Regeneration',
        tag: 'Surgical',
        desc: 'Advanced grafting techniques to rebuild jawbone density—essential preparation for successful implant placement.',
        duration: '1–2 hours',
        recovery: '2–4 weeks',
        whatToExpect: [
          'Cone beam CT scan analysis',
          'Guided bone regeneration with membrane',
          'Healing phase before implant placement',
        ],
        benefits: ['Enables implants where bone was lost', 'Uses biocompatible materials', 'Long-term jaw health'],
      },
      {
        title: 'Teeth Whitening & Cosmetic Dentistry',
        tag: 'Non-Invasive',
        desc: 'From professional whitening to composite bonding—enhance your smile without surgery.',
        duration: '1–2 hours',
        recovery: 'None',
        whatToExpect: [
          'Shade analysis and whitening plan',
          'In-office laser or tray whitening',
          'Optional composite bonding or contouring',
        ],
        benefits: ['Immediate results', 'No downtime', 'Affordable entry-level cosmetic option'],
      },
    ],
  },
  {
    id: 'cosmetic',
    label: 'Cosmetic Surgery',
    color: 'bg-accent/10 text-accent',
    procedures: [
      {
        title: 'Rhinoplasty (Nose Reshaping)',
        tag: 'Facial',
        desc: 'Surgical reshaping of the nose for aesthetic harmony or improved breathing—one of the most refined cosmetic surgeries.',
        duration: '2–4 hours',
        recovery: '1–2 weeks visible swelling, full results in 12 months',
        whatToExpect: [
          '3D imaging consultation to preview results',
          'General anesthesia — open or closed technique',
          'Nasal splint worn for 1 week',
          'Gradual swelling reduction over months',
        ],
        benefits: ['Permanent reshaping', 'Can improve breathing (septoplasty combined)', 'Tailored to facial proportions'],
      },
      {
        title: 'Breast Augmentation / Reduction / Lift',
        tag: 'Body',
        desc: 'Enhance, reduce, or lift the breasts for improved shape, symmetry, and confidence using the latest techniques.',
        duration: '1–3 hours',
        recovery: '1–2 weeks rest, 4–6 weeks full recovery',
        whatToExpect: [
          'Pre-surgical measurements and implant sizing',
          'General anesthesia',
          'Implant placement (augmentation) or tissue reshaping (reduction/lift)',
          'Compression garment worn post-op',
        ],
        benefits: ['Improved proportion and symmetry', 'Long-lasting results', 'Multiple technique options', 'High satisfaction rates'],
      },
      {
        title: 'Liposuction',
        tag: 'Body Contouring',
        desc: 'Targeted fat removal from stubborn areas including abdomen, flanks, thighs, arms, and more.',
        duration: '1–4 hours',
        recovery: '1–2 weeks, compression garment 4–6 weeks',
        whatToExpect: [
          'Pre-op body marking and analysis',
          'Tumescent technique for minimal bleeding',
          'Small incisions, cannula fat removal',
          'Compression garment immediately post-op',
        ],
        benefits: ['Permanent fat cell removal', 'Sculpted, defined contours', 'Minimal scarring', 'Can be combined with other procedures'],
      },
      {
        title: 'Abdominoplasty (Tummy Tuck)',
        tag: 'Body',
        desc: 'Removes excess skin and tightens abdominal muscles for a flat, toned midsection—especially after weight loss or pregnancy.',
        duration: '2–4 hours',
        recovery: '2–4 weeks rest, full recovery 6–8 weeks',
        whatToExpect: [
          'Full or mini tummy tuck planning',
          'Muscle repair and excess skin removal',
          'Repositioning of the navel',
          'Drainage tubes in place for a few days',
        ],
        benefits: ['Flat and toned abdomen', 'Repairs muscle separation (diastasis)', 'Long-lasting with stable weight'],
      },
      {
        title: 'Facelift',
        tag: 'Facial',
        desc: 'Lifts and firms sagging facial and neck tissue for a naturally youthful, refreshed appearance.',
        duration: '3–5 hours',
        recovery: '2 weeks before returning to normal activities',
        whatToExpect: [
          'Deep plane or SMAS technique planning',
          'General or twilight anesthesia',
          'Incisions concealed within hairline and ears',
          'Results visible as swelling resolves over weeks',
        ],
        benefits: ['10–15 years of rejuvenation', 'Natural-looking results', 'Long-lasting — 7–10 years', 'Can be combined with eyelid or brow lift'],
      },
      {
        title: 'Brow Lift',
        tag: 'Facial',
        desc: 'Elevates a heavy or drooping brow to restore a more alert, youthful, and energetic appearance.',
        duration: '1–2 hours',
        recovery: '1–2 weeks',
        whatToExpect: [
          'Endoscopic or open technique based on anatomy',
          'Small incisions within the hairline',
          'Brow repositioned and secured',
        ],
        benefits: ['Opens up the eye area', 'Reduces forehead lines', 'Often paired with facelift or eyelid surgery'],
      },
      {
        title: 'Eyelid Surgery (Blepharoplasty)',
        tag: 'Facial',
        desc: 'Removes excess skin and fat from upper and/or lower eyelids to restore a rested, youthful look.',
        duration: '1–2 hours',
        recovery: '1–2 weeks visible bruising',
        whatToExpect: [
          'Upper, lower, or both eyelids assessed',
          'Local anesthesia with sedation',
          'Fine incisions hidden in natural creases',
          'Sutures removed in 5–7 days',
        ],
        benefits: ['Brighter, more open eyes', 'Removes under-eye bags', 'Minimal scarring', 'Can improve peripheral vision'],
      },
      {
        title: 'Otoplasty (Ear Reshaping)',
        tag: 'Facial',
        desc: 'Reshapes and repositions prominent or asymmetrical ears for improved facial harmony.',
        duration: '1–2 hours',
        recovery: '1 week with head bandage',
        whatToExpect: [
          'Cartilage reshaping and repositioning',
          'Sutures to hold new ear shape',
          'Protective bandage for 1 week',
        ],
        benefits: ['Permanent ear reshaping', 'Suitable for children and adults', 'High patient satisfaction'],
      },
      {
        title: 'Thigh Lift / Arm Lift',
        tag: 'Body',
        desc: 'Removes excess skin from inner thighs or upper arms—ideal after significant weight loss or aging-related skin laxity.',
        duration: '1–3 hours',
        recovery: '2–3 weeks',
        whatToExpect: [
          'Skin excision and contouring plan',
          'Incisions placed in discreet locations',
          'Compression garments worn post-op',
        ],
        benefits: ['Smoother, tighter contour', 'Improves comfort and mobility', 'Often combined with liposuction'],
      },
      {
        title: 'Skin Rejuvenation (Laser Resurfacing)',
        tag: 'Non-Invasive',
        desc: 'Laser treatments to reduce wrinkles, sun damage, acne scars, and uneven tone for radiant, renewed skin.',
        duration: '30–90 minutes',
        recovery: '3–10 days depending on intensity',
        whatToExpect: [
          'Skin assessment and laser type selection',
          'Topical or light anesthesia applied',
          'Laser passes over target areas',
          'Redness and peeling as skin renews',
        ],
        benefits: ['Significant texture and tone improvement', 'Stimulates collagen production', 'Minimal downtime (non-ablative)', 'Natural-looking rejuvenation'],
      },
    ],
  },
  {
    id: 'bariatric',
    label: 'Weight Loss & Bariatric',
    color: 'bg-primary/15 text-primary',
    procedures: [
      {
        title: 'Gastric Sleeve (Sleeve Gastrectomy)',
        tag: 'Bariatric',
        desc: 'Removal of approximately 80% of the stomach to limit food intake and reduce hunger hormones for lasting weight loss.',
        duration: '1–1.5 hours',
        recovery: '2–4 weeks',
        whatToExpect: [
          'Pre-op nutritional and psychological evaluation',
          'Laparoscopic (minimally invasive) approach',
          'Hospital stay of 2–3 days',
          'Liquid diet progressing to solid foods over weeks',
        ],
        benefits: ['60–70% excess weight loss', 'Reduces hunger hormone (ghrelin)', 'No foreign body implanted', 'Improves type 2 diabetes, sleep apnea'],
      },
      {
        title: 'Gastric Bypass (Roux-en-Y)',
        tag: 'Bariatric',
        desc: 'Creates a small stomach pouch and reroutes the small intestine for powerful weight loss and metabolic improvement.',
        duration: '2–3 hours',
        recovery: '3–5 weeks',
        whatToExpect: [
          'Comprehensive pre-surgical health screening',
          'Laparoscopic technique',
          'Hospital stay 3–4 days',
          'Strict dietary progression over 8 weeks',
        ],
        benefits: ['70–80% excess weight loss', 'Highly effective for type 2 diabetes remission', 'Long-term results with lifestyle adherence'],
      },
      {
        title: 'Gastric Band Removal / Revision',
        tag: 'Revision',
        desc: 'Removal or revision of a previously placed gastric band and conversion to sleeve or bypass for better outcomes.',
        duration: '1–2 hours',
        recovery: '2–3 weeks',
        whatToExpect: [
          'Pre-op imaging to assess band position',
          'Laparoscopic removal',
          'Optional conversion to sleeve gastrectomy',
        ],
        benefits: ['Resolves band complications', 'Opportunity for renewed weight loss approach'],
      },
    ],
  },
  {
    id: 'fertility',
    label: 'Fertility & Gynecology',
    color: 'bg-accent/15 text-accent',
    procedures: [
      {
        title: 'Gynecological Diagnostic Exams',
        tag: 'Diagnostics',
        desc: 'Comprehensive gynecological evaluations including pelvic ultrasound, colposcopy, hysteroscopy, and fertility panel bloodwork.',
        duration: '1–2 hours',
        recovery: 'None to minimal',
        whatToExpect: [
          'Full pelvic and transvaginal ultrasound',
          'Hormone and fertility blood panel',
          'Endometrial assessment if indicated',
          'Detailed fertility report with specialist recommendations',
        ],
        benefits: ['Clear baseline for fertility planning', 'Early detection of conditions', 'Guided treatment planning'],
      },
      {
        title: 'IVF (In Vitro Fertilization)',
        tag: 'Fertility',
        desc: 'Egg retrieval and laboratory fertilization followed by embryo transfer — the gold standard for assisted reproduction.',
        duration: '2–6 week cycle',
        recovery: '1–2 days post retrieval',
        whatToExpect: [
          'Ovarian stimulation with monitoring',
          'Egg retrieval under sedation',
          'Fertilization and embryo culture',
          'Embryo transfer — a simple office procedure',
        ],
        benefits: ['Highest IVF success rates in partner clinics', 'Embryo freezing available', 'Genetic testing (PGT) option', 'Personalized protocol'],
      },
      {
        title: 'Fertility Preservation (Egg Freezing)',
        tag: 'Preservation',
        desc: 'Vitrification of eggs for future use — ideal for those not yet ready for pregnancy but wanting to preserve options.',
        duration: '10–14 day stimulation cycle',
        recovery: '1–2 days',
        whatToExpect: [
          'Hormonal stimulation and monitoring',
          'Egg retrieval under sedation',
          'Rapid flash-freezing (vitrification)',
          'Long-term secure storage',
        ],
        benefits: ['Preserves fertility at current age', 'No compromise on future options', 'Safe, proven technology'],
      },
    ],
  },
  {
    id: 'oncology',
    label: 'Cancer Care',
    color: 'bg-primary/10 text-primary',
    procedures: [
      {
        title: 'Oncological Surgical Procedures',
        tag: 'Surgery',
        desc: 'Tumor removal surgeries performed by board-certified oncological surgeons with access to multidisciplinary care teams.',
        duration: 'Varies by case',
        recovery: 'Case-dependent',
        whatToExpect: [
          'Comprehensive oncology consultation',
          'Pre-surgical imaging and staging',
          'Coordinated surgical and oncology team',
          'Post-operative monitoring and pathology',
        ],
        benefits: ['Access to elite oncological surgeons', 'Multidisciplinary team approach', 'Integrated aftercare coordination'],
      },
      {
        title: 'Tumor Marker & Blood Panel Testing',
        tag: 'Diagnostics',
        desc: 'Comprehensive cancer blood panels including tumor markers (CEA, AFP, PSA, CA-125, CA 19-9) and full hematology workup.',
        duration: '1–2 hours',
        recovery: 'None',
        whatToExpect: [
          'Full blood draw at certified laboratory',
          'Panel includes standard tumor markers',
          'Results reviewed by oncology specialist',
          'Report with clinical interpretation',
        ],
        benefits: ['Early detection support', 'Fast results (24–48 hrs)', 'Specialist-reviewed report included'],
      },
    ],
  },
  {
    id: 'orthopedic',
    label: 'Orthopedic Surgery',
    color: 'bg-accent/10 text-accent',
    procedures: [
      {
        title: 'Joint Replacement (Hip & Knee)',
        tag: 'Orthopedic',
        desc: 'Total or partial replacement of worn joints with precision implants to restore pain-free mobility.',
        duration: '1.5–3 hours',
        recovery: '6–12 weeks',
        whatToExpect: [
          'Pre-surgical X-ray and joint assessment',
          'Implant selection and sizing',
          'Physical therapy begins within 24 hours',
          'Gradual return to full activity',
        ],
        benefits: ['Eliminates chronic joint pain', 'Restores mobility and quality of life', 'Implants last 15–25 years'],
      },
      {
        title: 'Spine Surgery',
        tag: 'Orthopedic',
        desc: 'Minimally invasive procedures for herniated discs, spinal stenosis, and vertebral instability.',
        duration: '1–4 hours',
        recovery: '2–6 weeks depending on procedure',
        whatToExpect: [
          'MRI and CT scan analysis',
          'Minimally invasive approach where possible',
          'Pain management protocol',
          'Physiotherapy-guided rehabilitation',
        ],
        benefits: ['Relief from chronic back/neck pain', 'Minimally invasive options available', 'Expert traumatology teams'],
      },
      {
        title: 'Sports Injuries & Arthroscopy',
        tag: 'Traumatology',
        desc: 'Arthroscopic repair of ligaments, tendons, and cartilage—ACL reconstruction, rotator cuff repair, meniscus surgery.',
        duration: '1–2 hours',
        recovery: '4–12 weeks with physiotherapy',
        whatToExpect: [
          'Sports medicine evaluation and imaging',
          'Minimally invasive arthroscopic surgery',
          'Rehabilitation plan from day one',
        ],
        benefits: ['Faster recovery vs open surgery', 'Minimal scarring', 'Return to sport at full capacity'],
      },
      {
        title: 'Fracture Management & Trauma Surgery',
        tag: 'Traumatology',
        desc: 'Surgical fixation and management of complex fractures using plates, screws, and nails by expert traumatologists.',
        duration: 'Varies by fracture',
        recovery: '6–12 weeks',
        whatToExpect: [
          'Emergency or planned fracture assessment',
          'Open reduction and internal fixation (ORIF)',
          'Cast or brace support post-op',
        ],
        benefits: ['Precise alignment for optimal healing', 'Reduced risk of malunion', 'Expert traumatology care'],
      },
    ],
  },
];

export default function Procedures() {
  const [selected, setSelected] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const [ProcedureModal, setProcedureModal] = useState(null);

  React.useEffect(() => {
    import('../components/procedures/ProcedureModal').then(m => setProcedureModal(() => m.default));
  }, []);

  const displayedCategories = activeCategory === 'all'
    ? categories
    : categories.filter(c => c.id === activeCategory);

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Our Services</p>
          <h1 className="font-display text-3xl lg:text-5xl text-foreground mb-4">Procedures & Treatments</h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            World-class medical, dental, and aesthetic care delivered by verified specialists — click any procedure to learn more.
          </p>
        </motion.div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              activeCategory === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                activeCategory === c.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Categories */}
        {displayedCategories.map((cat, catIdx) => (
          <div key={cat.id} className="mb-14">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-6"
            >
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${cat.color}`}>
                {cat.label}
              </span>
              <div className="flex-1 h-px bg-border" />
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.procedures.map((proc, i) => (
                <motion.button
                  key={proc.title}
                  onClick={() => setSelected(proc)}
                  className="text-left bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all group"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-3 ${cat.color}`}>
                    {proc.tag}
                  </div>
                  <h3 className="font-display text-lg text-foreground mb-1.5 leading-tight">{proc.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">{proc.desc}</p>
                  <div className="flex items-center text-xs font-semibold text-accent group-hover:translate-x-1 transition-transform">
                    Learn More <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        ))}

        {/* Bottom CTA */}
        <motion.div
          className="text-center bg-card border border-border rounded-2xl p-8 lg:p-12 mt-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Not Sure Where to Start?</p>
          <h2 className="font-display text-2xl lg:text-3xl text-foreground mb-3">Talk to Our Concierge Team</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Our specialists will guide you to the right treatment based on your goals, health profile, and budget.
          </p>
          <Link to="/booking">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-10">
              Book a Free Consultation <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Modal */}
      {ProcedureModal && <ProcedureModal procedure={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}