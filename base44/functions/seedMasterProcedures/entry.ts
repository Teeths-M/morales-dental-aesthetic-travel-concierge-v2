import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const masterProcedures = [
  // Dental - General
  { id: 'DENT-CLEAN-01', category: 'Dental', cat_sub: 'General Dentistry', emoji: '🦷', en: 'Dental Cleaning', es: 'Limpieza Dental', fr: 'Nettoyage Dentaire' },
  { id: 'DENT-DEEP-01', category: 'Dental', cat_sub: 'General Dentistry', emoji: '🦷', en: 'Deep Cleaning', es: 'Limpieza Profunda', fr: 'Détartrage Profond' },
  { id: 'DENT-EXAM-01', category: 'Dental', cat_sub: 'General Dentistry', emoji: '🦷', en: 'Dental Exam', es: 'Examen Dental', fr: 'Examen Dentaire' },
  { id: 'DENT-XRAY-01', category: 'Dental', cat_sub: 'General Dentistry', emoji: '🦷', en: 'Dental X-Rays', es: 'Radiografías Dentales', fr: 'Radiographies Dentaires' },
  { id: 'DENT-FILL-01', category: 'Dental', cat_sub: 'General Dentistry', emoji: '🦷', en: 'Fillings', es: 'Empastes', fr: 'Obturations' },
  { id: 'DENT-EXTR-01', category: 'Dental', cat_sub: 'General Dentistry', emoji: '🦷', en: 'Tooth Extraction', es: 'Extracción de Dientes', fr: 'Extraction Dentaire' },
  { id: 'DENT-WISDOM-01', category: 'Dental', cat_sub: 'General Dentistry', emoji: '🦷', en: 'Wisdom Tooth Removal', es: 'Extracción de Muelas', fr: 'Extraction Dents de Sagesse' },
  { id: 'DENT-ROOT-01', category: 'Dental', cat_sub: 'General Dentistry', emoji: '🦷', en: 'Root Canal Treatment', es: 'Tratamiento de Conducto', fr: 'Traitement Canalaire' },
  { id: 'DENT-CROWN-01', category: 'Dental', cat_sub: 'General Dentistry', emoji: '🦷', en: 'Dental Crowns', es: 'Coronas Dentales', fr: 'Couronnes Dentaires' },
  { id: 'DENT-BRIDGE-01', category: 'Dental', cat_sub: 'General Dentistry', emoji: '🦷', en: 'Dental Bridges', es: 'Puentes Dentales', fr: 'Bridges Dentaires' },
  { id: 'DENT-DENTURE-01', category: 'Dental', cat_sub: 'General Dentistry', emoji: '🦷', en: 'Dentures', es: 'Dentaduras', fr: 'Prothèses Dentaires' },
  { id: 'DENT-PARTIAL-01', category: 'Dental', cat_sub: 'General Dentistry', emoji: '🦷', en: 'Partial Dentures', es: 'Dentaduras Parciales', fr: 'Prothèses Partielles' },
  { id: 'DENT-INLAY-01', category: 'Dental', cat_sub: 'General Dentistry', emoji: '🦷', en: 'Inlays & Onlays', es: 'Incrustaciones', fr: 'Inlays & Onlays' },

  // Dental - Cosmetic
  { id: 'DENT-WHIT-01', category: 'Dental', cat_sub: 'Cosmetic Dentistry', emoji: '✨', en: 'Teeth Whitening', es: 'Blanqueamiento de Dientes', fr: 'Blanchiment des Dents' },
  { id: 'DENT-VENEER-01', category: 'Dental', cat_sub: 'Cosmetic Dentistry', emoji: '✨', en: 'Porcelain Veneers', es: 'Carillas de Porcelana', fr: 'Facettes Dentaires' },
  { id: 'DENT-BOND-01', category: 'Dental', cat_sub: 'Cosmetic Dentistry', emoji: '✨', en: 'Composite Bonding', es: 'Adhesión Composite', fr: 'Collage Composite' },
  { id: 'DENT-SMILE-01', category: 'Dental', cat_sub: 'Cosmetic Dentistry', emoji: '✨', en: 'Smile Makeover', es: 'Rediseño de Sonrisa', fr: 'Relooking du Sourire' },
  { id: 'DENT-GUM-01', category: 'Dental', cat_sub: 'Cosmetic Dentistry', emoji: '✨', en: 'Gum Contouring', es: 'Contorneado de Encías', fr: 'Détourage des Gencives' },
  { id: 'DENT-HOLLYWOOD-01', category: 'Dental', cat_sub: 'Cosmetic Dentistry', emoji: '✨', en: 'Hollywood Smile', es: 'Sonrisa Hollywood', fr: 'Sourire Hollywood' },

  // Dental - Implants
  { id: 'DENT-IMP-SINGLE-01', category: 'Dental', cat_sub: 'Implant Dentistry', emoji: '🔩', en: 'Single Dental Implant', es: 'Implante Dental Simple', fr: 'Implant Dentaire Simple' },
  { id: 'DENT-IMP-MULTI-01', category: 'Dental', cat_sub: 'Implant Dentistry', emoji: '🔩', en: 'Multiple Dental Implants', es: 'Múltiples Implantes', fr: 'Implants Multiples' },
  { id: 'DENT-IMP-FULL-01', category: 'Dental', cat_sub: 'Implant Dentistry', emoji: '🔩', en: 'Full Mouth Implants', es: 'Implantes de Boca Completa', fr: 'Implants Bouche Entière' },
  { id: 'DENT-IMP-AON4-01', category: 'Dental', cat_sub: 'Implant Dentistry', emoji: '🔩', en: 'All-on-4 Implants', es: 'All-on-4', fr: 'All-on-4' },
  { id: 'DENT-IMP-AON6-01', category: 'Dental', cat_sub: 'Implant Dentistry', emoji: '🔩', en: 'All-on-6 Implants', es: 'All-on-6', fr: 'All-on-6' },
  { id: 'DENT-IMP-SUPP-01', category: 'Dental', cat_sub: 'Implant Dentistry', emoji: '🔩', en: 'Implant-Supported Dentures', es: 'Dentaduras Soportadas por Implantes', fr: 'Prothèses Implanto-Portées' },
  { id: 'DENT-BONE-01', category: 'Dental', cat_sub: 'Implant Dentistry', emoji: '🔩', en: 'Bone Grafting', es: 'Injerto Óseo', fr: 'Greffe Osseuse' },
  { id: 'DENT-SINUS-01', category: 'Dental', cat_sub: 'Implant Dentistry', emoji: '🔩', en: 'Sinus Lift', es: 'Levantamiento de Seno', fr: 'Relevage du Sinus' },

  // Dental - Orthodontics
  { id: 'DENT-BRACES-01', category: 'Dental', cat_sub: 'Orthodontics', emoji: '😁', en: 'Braces', es: 'Aparatos de Ortodoncia', fr: 'Bagues' },
  { id: 'DENT-INVISALIGN-01', category: 'Dental', cat_sub: 'Orthodontics', emoji: '😁', en: 'Invisalign', es: 'Invisalign', fr: 'Invisalign' },
  { id: 'DENT-CLEAR-01', category: 'Dental', cat_sub: 'Orthodontics', emoji: '😁', en: 'Clear Aligners', es: 'Alineadores Transparentes', fr: 'Aligneurs Invisibles' },
  { id: 'DENT-RETAINER-01', category: 'Dental', cat_sub: 'Orthodontics', emoji: '😁', en: 'Retainers', es: 'Retenedores', fr: 'Contention' },

  // Facial Aesthetics
  { id: 'FACE-RHINO-01', category: 'Facial', cat_sub: 'Facial Aesthetics', emoji: '💆', en: 'Rhinoplasty', es: 'Rinoplastia', fr: 'Rhinoplastie' },
  { id: 'FACE-LIFT-01', category: 'Facial', cat_sub: 'Facial Aesthetics', emoji: '💆', en: 'Facelift', es: 'Lifting Facial', fr: 'Lifting Facial' },
  { id: 'FACE-NECK-01', category: 'Facial', cat_sub: 'Facial Aesthetics', emoji: '💆', en: 'Neck Lift', es: 'Lifting de Cuello', fr: 'Lifting du Cou' },
  { id: 'FACE-EYELID-01', category: 'Facial', cat_sub: 'Facial Aesthetics', emoji: '💆', en: 'Eyelid Surgery', es: 'Cirugía de Párpados', fr: 'Blépharoplastie' },
  { id: 'FACE-CHIN-01', category: 'Facial', cat_sub: 'Facial Aesthetics', emoji: '💆', en: 'Chin Augmentation', es: 'Aumento de Mentón', fr: 'Augmentation du Menton' },
  { id: 'FACE-BUCCAL-01', category: 'Facial', cat_sub: 'Facial Aesthetics', emoji: '💆', en: 'Buccal Fat Removal', es: 'Extirpación de Grasa Bucal', fr: 'Extraction Graisse Jugale' },
  { id: 'FACE-LIP-01', category: 'Facial', cat_sub: 'Facial Aesthetics', emoji: '💆', en: 'Lip Lift', es: 'Lifting de Labios', fr: 'Relevage des Lèvres' },
  { id: 'FACE-BOTOX-01', category: 'Facial', cat_sub: 'Facial Aesthetics', emoji: '💆', en: 'Botox', es: 'Botox', fr: 'Botox' },
  { id: 'FACE-FILL-01', category: 'Facial', cat_sub: 'Facial Aesthetics', emoji: '💆', en: 'Dermal Fillers', es: 'Rellenos Dérmicos', fr: 'Comblement Hyaluronique' },

  // Body Contouring
  { id: 'BODY-LIPO-01', category: 'Body', cat_sub: 'Body Contouring', emoji: '💪', en: 'Liposuction', es: 'Liposucción', fr: 'Liposuccion' },
  { id: 'BODY-TUMMY-01', category: 'Body', cat_sub: 'Body Contouring', emoji: '💪', en: 'Tummy Tuck', es: 'Abdominoplastia', fr: 'Abdominoplastie' },
  { id: 'BODY-MOMMY-01', category: 'Body', cat_sub: 'Body Contouring', emoji: '💪', en: 'Mommy Makeover', es: 'Cambio Corporal de Mamá', fr: 'Relooking Post-Maternité' },
  { id: 'BODY-BBL-01', category: 'Body', cat_sub: 'Body Contouring', emoji: '💪', en: 'Brazilian Butt Lift', es: 'Aumento de Glúteos', fr: 'Augmentation Fessière' },
  { id: 'BODY-CONTOUR-01', category: 'Body', cat_sub: 'Body Contouring', emoji: '💪', en: 'Body Contouring', es: 'Contorneado Corporal', fr: 'Contouring du Corps' },
  { id: 'BODY-ARM-01', category: 'Body', cat_sub: 'Body Contouring', emoji: '💪', en: 'Arm Lift', es: 'Levantamiento de Brazos', fr: 'Lifting des Bras' },
  { id: 'BODY-THIGH-01', category: 'Body', cat_sub: 'Body Contouring', emoji: '💪', en: 'Thigh Lift', es: 'Levantamiento de Muslos', fr: 'Lifting des Cuisses' },

  // Breast Surgery
  { id: 'BREAST-AUG-01', category: 'Breast', cat_sub: 'Breast Surgery', emoji: '🌸', en: 'Breast Augmentation', es: 'Aumento de Senos', fr: 'Augmentation Mammaire' },
  { id: 'BREAST-LIFT-01', category: 'Breast', cat_sub: 'Breast Surgery', emoji: '🌸', en: 'Breast Lift', es: 'Lifting de Senos', fr: 'Lifting Mammaire' },
  { id: 'BREAST-RED-01', category: 'Breast', cat_sub: 'Breast Surgery', emoji: '🌸', en: 'Breast Reduction', es: 'Reducción de Senos', fr: 'Réduction Mammaire' },
  { id: 'BREAST-REV-01', category: 'Breast', cat_sub: 'Breast Surgery', emoji: '🌸', en: 'Breast Revision', es: 'Revisión de Implantes', fr: 'Révision Mammaire' },

  // Wellness & Regenerative
  { id: 'WELL-IV-01', category: 'Wellness', cat_sub: 'Wellness & Regenerative', emoji: '🌿', en: 'IV Therapy', es: 'Terapia IV', fr: 'Thérapie IV' },
  { id: 'WELL-STEM-01', category: 'Wellness', cat_sub: 'Wellness & Regenerative', emoji: '🌿', en: 'Stem Cell Therapy', es: 'Terapia de Células Madre', fr: 'Thérapie Cellulaire' },
  { id: 'WELL-PRP-01', category: 'Wellness', cat_sub: 'Wellness & Regenerative', emoji: '🌿', en: 'PRP Therapy', es: 'Terapia PRP', fr: 'Thérapie PRP' },
  { id: 'WELL-HORMONE-01', category: 'Wellness', cat_sub: 'Wellness & Regenerative', emoji: '🌿', en: 'Hormone Therapy', es: 'Terapia Hormonal', fr: 'Thérapie Hormonale' },
  { id: 'WELL-WEIGHT-01', category: 'Wellness', cat_sub: 'Wellness & Regenerative', emoji: '🌿', en: 'Medical Weight Loss', es: 'Pérdida de Peso Médica', fr: 'Perte de Poids Médicale' },
  { id: 'WELL-NUTRITION-01', category: 'Wellness', cat_sub: 'Wellness & Regenerative', emoji: '🌿', en: 'Nutritional Programs', es: 'Programas Nutricionales', fr: 'Programmes Nutritionnels' },
  { id: 'WELL-RECOVERY-01', category: 'Wellness', cat_sub: 'Wellness & Regenerative', emoji: '🌿', en: 'Recovery Therapy', es: 'Terapia de Recuperación', fr: 'Thérapie de Récupération' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can seed data
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
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