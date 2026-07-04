import { createHandler, ok, err } from '../_shared/createHandler.ts';

// Demo doctor seed — creates 8 verified doctors across the 5 Morales destinations
// with matching DoctorSpecialty records so all filter chips work on /providers.
// Idempotent: skips creation if doctors already exist (checks by email).
const DOCTORS = [
  {
    doc: {
      full_name: 'Dr. Alejandro Ríos',
      email: 'a.rios@cartagena-smile.co',
      clinic_name: 'Cartagena Dental Excellence',
      clinic_country: 'Colombia',
      clinic_city: 'Cartagena',
      years_experience: 14,
      rating: 4.9,
      bio: 'Board-certified prosthodontist specialising in full smile transformations and All-on-4 implant systems.',
      status: 'active',
      verification_status: 'verified',
      successful_procedures_count: 520,
    },
    specialties: [
      { procedure_name: 'Dental Implants',   category: 'Dental', price_usd: 1800 },
      { procedure_name: 'Porcelain Veneers', category: 'Dental', price_usd: 650 },
      { procedure_name: 'All-on-4 Implants', category: 'Dental', price_usd: 9500 },
      { procedure_name: 'Smile Makeover',    category: 'Dental', price_usd: 3200 },
    ],
  },
  {
    doc: {
      full_name: 'Dr. Isabella Moreno',
      email: 'i.moreno@medellin-aesthetics.co',
      clinic_name: 'Medellín Aesthetic Institute',
      clinic_country: 'Colombia',
      clinic_city: 'Medellín',
      years_experience: 11,
      rating: 4.8,
      bio: 'Plastic surgeon trained in São Paulo and Miami. Specialist in body contouring and rhinoplasty.',
      status: 'active',
      verification_status: 'verified',
      successful_procedures_count: 390,
    },
    specialties: [
      { procedure_name: 'Rhinoplasty',        category: 'Aesthetic', price_usd: 3400 },
      { procedure_name: 'Tummy Tuck',          category: 'Aesthetic', price_usd: 4100 },
      { procedure_name: 'Breast Augmentation', category: 'Aesthetic', price_usd: 3800 },
    ],
  },
  {
    doc: {
      full_name: 'Dr. Kemal Yıldız',
      email: 'k.yildiz@istanbul-smileplus.tr',
      clinic_name: 'Istanbul SmilePlus Clinic',
      clinic_country: 'Turkey',
      clinic_city: 'Istanbul',
      years_experience: 18,
      rating: 4.9,
      bio: 'Pioneer of the Istanbul smile design method. Over 700 full smile makeovers in 18 years.',
      status: 'active',
      verification_status: 'verified',
      successful_procedures_count: 712,
    },
    specialties: [
      { procedure_name: 'Porcelain Veneers', category: 'Dental', price_usd: 350 },
      { procedure_name: 'Smile Makeover',    category: 'Dental', price_usd: 2800 },
      { procedure_name: 'Dental Implants',   category: 'Dental', price_usd: 900 },
    ],
  },
  {
    doc: {
      full_name: 'Dr. Ayşe Demir',
      email: 'a.demir@istanbul-rhinoclinic.tr',
      clinic_name: 'Istanbul Rhinoplasty Center',
      clinic_country: 'Turkey',
      clinic_city: 'Istanbul',
      years_experience: 13,
      rating: 4.7,
      bio: 'Facial plastic surgeon and rhinoplasty specialist. Trained at Vienna General Hospital.',
      status: 'active',
      verification_status: 'verified',
      successful_procedures_count: 440,
    },
    specialties: [
      { procedure_name: 'Rhinoplasty',     category: 'Aesthetic', price_usd: 2900 },
      { procedure_name: 'Facelift',        category: 'Aesthetic', price_usd: 4500 },
    ],
  },
  {
    doc: {
      full_name: 'Dr. Somchai Wongkittirat',
      email: 's.wongkittirat@bkk-bodymed.th',
      clinic_name: 'Bangkok Body Medical Center',
      clinic_country: 'Thailand',
      clinic_city: 'Bangkok',
      years_experience: 20,
      rating: 4.9,
      bio: 'FRCS-certified reconstructive and aesthetic surgeon. 20 years, 600+ international patients.',
      status: 'active',
      verification_status: 'verified',
      successful_procedures_count: 631,
    },
    specialties: [
      { procedure_name: 'Breast Augmentation', category: 'Aesthetic', price_usd: 3200 },
      { procedure_name: 'Liposuction',          category: 'Aesthetic', price_usd: 2400 },
      { procedure_name: 'Tummy Tuck',           category: 'Aesthetic', price_usd: 3600 },
    ],
  },
  {
    doc: {
      full_name: 'Dr. Napat Kanchanawong',
      email: 'n.kanchanawong@bkk-dental.th',
      clinic_name: 'Bangkok International Dental',
      clinic_country: 'Thailand',
      clinic_city: 'Bangkok',
      years_experience: 10,
      rating: 4.8,
      bio: 'Digital smile design pioneer in Southeast Asia. All procedures performed under ISO-certified protocols.',
      status: 'active',
      verification_status: 'verified',
      successful_procedures_count: 310,
    },
    specialties: [
      { procedure_name: 'All-on-4 Implants', category: 'Dental', price_usd: 8800 },
      { procedure_name: 'Dental Implants',   category: 'Dental', price_usd: 1400 },
      { procedure_name: 'Porcelain Veneers', category: 'Dental', price_usd: 420 },
    ],
  },
  {
    doc: {
      full_name: 'Dr. Carlos Mendez',
      email: 'c.mendez@sanjose-dental.cr',
      clinic_name: 'San José Dental Institute',
      clinic_country: 'Costa Rica',
      clinic_city: 'San José',
      years_experience: 15,
      rating: 4.9,
      bio: 'DDS from Universidad de Costa Rica. Specialist in implantology and full mouth rehabilitation.',
      status: 'active',
      verification_status: 'verified',
      successful_procedures_count: 460,
    },
    specialties: [
      { procedure_name: 'Dental Implants',   category: 'Dental', price_usd: 1600 },
      { procedure_name: 'All-on-4 Implants', category: 'Dental', price_usd: 8200 },
      { procedure_name: 'Smile Makeover',    category: 'Dental', price_usd: 2400 },
    ],
  },
  {
    doc: {
      full_name: 'Dr. Elena Fuentes',
      email: 'e.fuentes@margarita-clinic.ve',
      clinic_name: 'Isla Margarita Medical Spa',
      clinic_country: 'Venezuela',
      clinic_city: 'Margarita Island',
      years_experience: 9,
      rating: 4.7,
      bio: 'Aesthetic physician specialising in non-surgical facial rejuvenation and smile design.',
      status: 'active',
      verification_status: 'verified',
      successful_procedures_count: 230,
    },
    specialties: [
      { procedure_name: 'Porcelain Veneers', category: 'Dental',    price_usd: 580 },
      { procedure_name: 'Smile Makeover',    category: 'Dental',    price_usd: 2200 },
      { procedure_name: 'Rhinoplasty',       category: 'Aesthetic', price_usd: 2600 },
    ],
  },
];

Deno.serve(createHandler(async ({ base44, body }) => {
  const { force } = await body();

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const { doc, specialties } of DOCTORS) {
    try {
      // Idempotency: skip if doctor email already exists
      if (!force) {
        const existing = await base44.asServiceRole.entities.Doctor.filter({ email: doc.email }, '-created_date', 1);
        if (existing.length > 0) { skipped++; continue; }
      }

      const doctor = await base44.asServiceRole.entities.Doctor.create(doc);

      for (const spec of specialties) {
        await base44.asServiceRole.entities.DoctorSpecialty.create({
          doctor_id: doctor.id,
          ...spec,
        });
      }

      created++;
    } catch (e) {
      errors.push(`${doc.full_name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return ok({ created, skipped, errors, total_doctors: DOCTORS.length });
}, { name: 'seedDemoDoctors', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
