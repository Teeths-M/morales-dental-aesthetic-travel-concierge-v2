import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const masterProcedures = [
  // Dental
  { id: 'DENT-IMP-01', category: 'Dental', emoji: '🦷', en: 'Implants', es: 'Implantes', fr: 'Implants' },
  { id: 'DENT-ROOT-01', category: 'Dental', emoji: '🦷', en: 'Root canal', es: 'Endodoncia', fr: 'Traitement canalaire' },
  { id: 'DENT-CROWN-01', category: 'Dental', emoji: '🦷', en: 'Crowns', es: 'Coronas', fr: 'Couronnes' },
  { id: 'DENT-WHIT-01', category: 'Dental', emoji: '🦷', en: 'Whitening', es: 'Blanqueamiento', fr: 'Blanchiment' },

  // Cardiology
  { id: 'CARD-BYPASS-01', category: 'Cardiology', emoji: '❤️', en: 'Bypass', es: 'Derivación', fr: 'Pontage' },
  { id: 'CARD-ANGIO-01', category: 'Cardiology', emoji: '❤️', en: 'Angioplasty', es: 'Angioplastia', fr: 'Angioplastie' },
  { id: 'CARD-VALVE-01', category: 'Cardiology', emoji: '❤️', en: 'Valve replacement', es: 'Reemplazo de válvula', fr: 'Remplacement valvulaire' },

  // Orthopedics
  { id: 'ORTHO-KNEE-01', category: 'Orthopedics', emoji: '🦴', en: 'Knee replacement', es: 'Reemplazo de rodilla', fr: 'Remplacement du genou' },
  { id: 'ORTHO-HIP-01', category: 'Orthopedics', emoji: '🦴', en: 'Hip replacement', es: 'Reemplazo de cadera', fr: 'Remplacement de la hanche' },
  { id: 'ORTHO-ARTH-01', category: 'Orthopedics', emoji: '🦴', en: 'Arthroscopy', es: 'Artroscopia', fr: 'Arthroscopie' },

  // Ophthalmology
  { id: 'EYE-LASIK-01', category: 'Ophthalmology', emoji: '👁️', en: 'LASIK', es: 'LASIK', fr: 'LASIK' },
  { id: 'EYE-CATA-01', category: 'Ophthalmology', emoji: '👁️', en: 'Cataract', es: 'Cataratas', fr: 'Cataracte' },
  { id: 'EYE-CORN-01', category: 'Ophthalmology', emoji: '👁️', en: 'Corneal transplant', es: 'Trasplante de córnea', fr: 'Greffe de cornée' },

  // Fertility
  { id: 'FERT-IVF-01', category: 'Fertility', emoji: '🤰', en: 'IVF', es: 'FIV', fr: 'FIV' },
  { id: 'FERT-EGG-01', category: 'Fertility', emoji: '🤰', en: 'Egg freezing', es: 'Congelación de óvulos', fr: 'Congélation d\'ovules' },
  { id: 'FERT-EMBY-01', category: 'Fertility', emoji: '🤰', en: 'Embryo transfer', es: 'Transferencia de embriones', fr: 'Transfert d\'embryons' },

  // Cosmetic
  { id: 'COSM-RHINO-01', category: 'Cosmetic', emoji: '💉', en: 'Rhinoplasty', es: 'Rinoplastia', fr: 'Rhinoplastie' },
  { id: 'COSM-FACE-01', category: 'Cosmetic', emoji: '💉', en: 'Facelift', es: 'Lifting facial', fr: 'Lifting facial' },
  { id: 'COSM-BREAST-01', category: 'Cosmetic', emoji: '💉', en: 'Breast augmentation', es: 'Aumento de senos', fr: 'Augmentation mammaire' },
  { id: 'COSM-BBL-01', category: 'Cosmetic', emoji: '💉', en: 'BBL', es: 'Transferencia de grasa', fr: 'Augmentation des fesses' },

  // General Surgery
  { id: 'GEN-HERNIA-01', category: 'General Surgery', emoji: '🔪', en: 'Hernia repair', es: 'Reparación de hernia', fr: 'Réparation de hernie' },
  { id: 'GEN-GALL-01', category: 'General Surgery', emoji: '🔪', en: 'Gallbladder removal', es: 'Extirpación de vesícula', fr: 'Ablation de la vésicule biliaire' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can seed data
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if procedures already exist
    const existing = await base44.entities.MasterProcedure.list();
    
    if (existing.length > 0) {
      return Response.json({ 
        message: 'Master procedures already seeded',
        count: existing.length 
      });
    }

    // Create procedures
    const created = await base44.entities.MasterProcedure.bulkCreate(
      masterProcedures.map(proc => ({
        procedure_id: proc.id,
        category: proc.category,
        category_emoji: proc.emoji,
        en_name: proc.en,
        es_name: proc.es,
        fr_name: proc.fr,
        pt_name: proc.pt || proc.en,
        de_name: proc.de || proc.en,
        it_name: proc.it || proc.en,
        is_active: true
      }))
    );

    return Response.json({ 
      message: 'Master procedures seeded successfully',
      count: created.length 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});