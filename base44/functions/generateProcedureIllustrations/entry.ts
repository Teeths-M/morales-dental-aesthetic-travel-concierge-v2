import { createHandler, ok } from '../../shared/createHandler.ts';
import { z, strictObject } from '../../shared/validate.ts';

// ── generateProcedureIllustrations ───────────────────────────────────────────
// Admin-run, repeatable batch tool: expands M-Care's picture coverage well
// beyond ProcedureData.jsx's static 69 by generating a real, generic,
// non-personalized illustrative diagram for each procedure in TARGET_LIST
// via Core.GenerateImage (a genuine Base44 platform capability — confirmed
// present in the SDK, this is how the original 69 illustrations were almost
// certainly made). Never generates a before/after, never a specific patient,
// never a photorealistic human — the prompt template is fixed and deliberately
// constrained to a clinical/diagram style, matching RULE 22's own "mild,
// non-graphic illustration" promise.
//
// Writes ProcedureKnowledge rows with risk_level:'Not Yet Assessed' — an
// honest placeholder, never a guessed clinical risk level (this app already
// ruled out inventing risk/complication content once; see CLAUDE.md). Those
// rows are excluded from getProcedureKnowledge/getProcedureRiskSummaries (the
// safety-relevant lookups) and only ever surfaced by getProcedureIllustration
// (image-only, never returns risk data) — see the risk_level enum comment on
// ProcedureKnowledge.jsonc for the full reasoning.
//
// Idempotent and safely re-invokable: skips any TARGET_LIST name that already
// has an image_url, so Portia can click this repeatedly to make progress
// without regenerating (and re-billing) anything already done. Processes a
// bounded batch per call — Base44 functions have a real request timeout, and
// Core.GenerateImage is a slow, sequential, real network call per item — so
// one call can never realistically finish 150 images. A single generation
// failure (content-policy refusal, transient error) is skipped and reported,
// never aborts the rest of the batch.

const bodySchema = strictObject({
  batch_size: z.number().int().min(1).max(25).optional(),
});

// A real, curated list of common medical-tourism procedures NOT already
// covered by ProcedureData.jsx's 69 (dental cleaning/implants/veneers,
// rhinoplasty/facelift/BBL/tummy tuck, hair transplant, gastric sleeve/bypass,
// hip/knee replacement, IVF/egg freezing, etc. are all already real and
// pictured there — deliberately not duplicated here).
const TARGET_LIST: Array<{ name: string; category: string }> = [
  // Dental
  { name: 'Gum Grafting', category: 'Dental' },
  { name: 'Scaling and Root Planing', category: 'Dental' },
  { name: 'Same-Day CEREC Crowns', category: 'Dental' },
  { name: 'Zirconia Crowns', category: 'Dental' },
  { name: 'Occlusal Night Guard', category: 'Dental' },
  { name: 'TMJ Treatment', category: 'Dental' },
  { name: 'Dental Sealants', category: 'Dental' },
  { name: 'Laser Gum Surgery', category: 'Dental' },
  { name: 'Crown Lengthening', category: 'Dental' },
  { name: 'Apicoectomy', category: 'Dental' },
  { name: 'Full Mouth Reconstruction', category: 'Dental' },
  { name: 'Snap-On Dentures', category: 'Dental' },
  { name: 'Mini Dental Implants', category: 'Dental' },
  { name: 'Zygomatic Implants', category: 'Dental' },
  { name: 'Frenectomy', category: 'Dental' },
  { name: 'Orthognathic Jaw Surgery', category: 'Dental' },
  { name: 'Digital Smile Design', category: 'Dental' },
  { name: 'Ridge Preservation', category: 'Dental' },
  { name: 'Guided Bone Regeneration', category: 'Dental' },
  { name: 'Palatal Expander', category: 'Dental' },
  // Cosmetic
  { name: 'Otoplasty', category: 'Cosmetic' },
  { name: 'Brow Lift', category: 'Cosmetic' },
  { name: 'Cheek Implants', category: 'Cosmetic' },
  { name: 'Facial Fat Grafting', category: 'Cosmetic' },
  { name: 'Fat Transfer to Breast', category: 'Cosmetic' },
  { name: 'Labiaplasty', category: 'Cosmetic' },
  { name: 'Gynecomastia Surgery (Male Breast Reduction)', category: 'Cosmetic' },
  { name: 'Calf Augmentation', category: 'Cosmetic' },
  { name: 'Buttock Implants', category: 'Cosmetic' },
  { name: 'Non-Surgical Skin Tightening', category: 'Cosmetic' },
  { name: 'Laser Skin Resurfacing', category: 'Cosmetic' },
  { name: 'Chemical Peel', category: 'Cosmetic' },
  { name: 'Microneedling', category: 'Cosmetic' },
  { name: 'CoolSculpting', category: 'Cosmetic' },
  { name: 'Scar Revision', category: 'Cosmetic' },
  { name: 'Mole Removal', category: 'Cosmetic' },
  { name: 'Tattoo Removal', category: 'Cosmetic' },
  { name: 'Earlobe Repair', category: 'Cosmetic' },
  { name: 'PDO Thread Lift', category: 'Cosmetic' },
  { name: 'Kybella (Double Chin Reduction)', category: 'Cosmetic' },
  { name: 'Non-Surgical Rhinoplasty', category: 'Cosmetic' },
  { name: 'Jawline Contouring', category: 'Cosmetic' },
  { name: 'Post-Bariatric Body Lift', category: 'Cosmetic' },
  { name: 'Panniculectomy', category: 'Cosmetic' },
  { name: 'Vaser Liposuction', category: 'Cosmetic' },
  { name: '360 Lipo', category: 'Cosmetic' },
  { name: 'Non-Surgical BBL', category: 'Cosmetic' },
  { name: 'Breast Implant Removal', category: 'Cosmetic' },
  { name: 'Breast Asymmetry Correction', category: 'Cosmetic' },
  { name: 'Areola Reduction', category: 'Cosmetic' },
  { name: 'Deep Plane Facelift', category: 'Cosmetic' },
  { name: 'Mini Facelift', category: 'Cosmetic' },
  { name: 'Liquid Facelift', category: 'Cosmetic' },
  { name: 'HIFU Facelift', category: 'Cosmetic' },
  { name: 'Microdermabrasion', category: 'Cosmetic' },
  { name: 'Dermaplaning', category: 'Cosmetic' },
  { name: 'Laser Hair Removal', category: 'Cosmetic' },
  { name: 'IPL Photofacial', category: 'Cosmetic' },
  { name: 'Acne Scar Treatment', category: 'Cosmetic' },
  { name: 'Stretch Mark Removal', category: 'Cosmetic' },
  { name: 'Cellulite Treatment', category: 'Cosmetic' },
  { name: 'Neck Liposuction', category: 'Cosmetic' },
  { name: 'Asian Double Eyelid Surgery', category: 'Cosmetic' },
  { name: 'Ear Pinning', category: 'Cosmetic' },
  { name: 'Cheek Filler', category: 'Cosmetic' },
  { name: 'Under-Eye Filler', category: 'Cosmetic' },
  { name: 'Jawline Filler', category: 'Cosmetic' },
  { name: 'Radiofrequency Skin Tightening', category: 'Cosmetic' },
  // ENT
  { name: 'Septoplasty', category: 'ENT' },
  { name: 'Turbinate Reduction', category: 'ENT' },
  { name: 'Tonsillectomy', category: 'ENT' },
  { name: 'Adenoidectomy', category: 'ENT' },
  { name: 'Ear Tube Placement', category: 'ENT' },
  { name: 'Functional Endoscopic Sinus Surgery', category: 'ENT' },
  { name: 'Hearing Aid Fitting', category: 'ENT' },
  { name: 'Cochlear Implant', category: 'ENT' },
  { name: 'Snoring Surgery', category: 'ENT' },
  { name: 'Vocal Cord Surgery', category: 'ENT' },
  { name: 'Nasal Valve Repair', category: 'ENT' },
  { name: 'Parotid Gland Surgery', category: 'ENT' },
  // Ophthalmology
  { name: 'LASIK Eye Surgery', category: 'Ophthalmology' },
  { name: 'PRK Surgery', category: 'Ophthalmology' },
  { name: 'Cataract Surgery', category: 'Ophthalmology' },
  { name: 'Glaucoma Surgery', category: 'Ophthalmology' },
  { name: 'Corneal Transplant', category: 'Ophthalmology' },
  { name: 'Retinal Detachment Repair', category: 'Ophthalmology' },
  { name: 'Strabismus Surgery', category: 'Ophthalmology' },
  { name: 'ICL (Implantable Collamer Lens)', category: 'Ophthalmology' },
  { name: 'Pterygium Removal', category: 'Ophthalmology' },
  { name: 'Diabetic Retinopathy Treatment', category: 'Ophthalmology' },
  // Cardiac
  { name: 'Coronary Artery Bypass Graft', category: 'Cardiac' },
  { name: 'Heart Valve Replacement', category: 'Cardiac' },
  { name: 'Angioplasty and Stenting', category: 'Cardiac' },
  { name: 'Pacemaker Implantation', category: 'Cardiac' },
  { name: 'Atrial Fibrillation Ablation', category: 'Cardiac' },
  { name: 'Transcatheter Aortic Valve Replacement', category: 'Cardiac' },
  { name: 'Cardiac Catheterization', category: 'Cardiac' },
  // General Surgery
  { name: 'Gallbladder Removal', category: 'General Surgery' },
  { name: 'Appendectomy', category: 'General Surgery' },
  { name: 'Hernia Repair', category: 'General Surgery' },
  { name: 'Hemorrhoidectomy', category: 'General Surgery' },
  { name: 'Varicose Vein Treatment', category: 'General Surgery' },
  { name: 'Thyroidectomy', category: 'General Surgery' },
  { name: 'Endoscopic Sleeve Gastroplasty', category: 'General Surgery' },
  { name: 'Splenectomy', category: 'General Surgery' },
  { name: 'Anal Fistula Repair', category: 'General Surgery' },
  { name: 'Pilonidal Cyst Removal', category: 'General Surgery' },
  { name: 'Liver Resection', category: 'General Surgery' },
  { name: 'Pancreatic Surgery', category: 'General Surgery' },
  // Bariatric
  { name: 'Gastric Balloon', category: 'Bariatric' },
  { name: 'Mini Gastric Bypass', category: 'Bariatric' },
  { name: 'Duodenal Switch', category: 'Bariatric' },
  { name: 'Gastric Band', category: 'Bariatric' },
  { name: 'Revisional Bariatric Surgery', category: 'Bariatric' },
  // Orthopedic
  { name: 'Total Shoulder Replacement', category: 'Orthopedic' },
  { name: 'ACL Reconstruction', category: 'Orthopedic' },
  { name: 'Rotator Cuff Repair', category: 'Orthopedic' },
  { name: 'Spinal Fusion', category: 'Orthopedic' },
  { name: 'Herniated Disc Surgery', category: 'Orthopedic' },
  { name: 'Arthroscopic Knee Surgery', category: 'Orthopedic' },
  { name: 'Ankle Replacement', category: 'Orthopedic' },
  { name: 'Carpal Tunnel Release', category: 'Orthopedic' },
  { name: 'Bunion Surgery', category: 'Orthopedic' },
  { name: 'Scoliosis Correction Surgery', category: 'Orthopedic' },
  { name: 'Meniscus Repair', category: 'Orthopedic' },
  { name: 'Elbow Replacement', category: 'Orthopedic' },
  { name: 'Wrist Replacement', category: 'Orthopedic' },
  { name: 'Trigger Finger Release', category: 'Orthopedic' },
  { name: 'Achilles Tendon Repair', category: 'Orthopedic' },
  { name: 'Hip Resurfacing', category: 'Orthopedic' },
  { name: 'Kyphoplasty', category: 'Orthopedic' },
  { name: 'Spinal Decompression Surgery', category: 'Orthopedic' },
  // Fertility
  { name: 'Intrauterine Insemination (IUI)', category: 'Fertility' },
  { name: 'Standard IVF', category: 'Fertility' },
  { name: 'Donor Egg IVF', category: 'Fertility' },
  { name: 'Tubal Ligation Reversal', category: 'Fertility' },
  { name: 'Vasectomy Reversal', category: 'Fertility' },
  { name: 'Fertility Preservation', category: 'Fertility' },
  { name: 'Preimplantation Genetic Testing (PGT)', category: 'Fertility' },
  { name: 'Endometriosis Surgery', category: 'Fertility' },
  { name: 'Myomectomy (Fibroid Removal)', category: 'Fertility' },
  { name: 'Hysteroscopy', category: 'Fertility' },
  // Other / Wellness
  { name: 'Full Body Health Screening', category: 'Other' },
  { name: 'Executive Health Checkup', category: 'Other' },
  { name: 'Anti-Aging IV Drip', category: 'Other' },
  { name: 'Ozone Therapy', category: 'Other' },
  { name: 'Hyperbaric Oxygen Therapy', category: 'Other' },
  { name: 'Medical Detox Program', category: 'Other' },
  { name: 'Regenerative Joint Injections', category: 'Other' },
  { name: 'Bioidentical Hormone Replacement', category: 'Other' },
];

const DEFAULT_BATCH_SIZE = 12;

function buildPrompt(name: string): string {
  return `A clean, minimalist medical/clinical diagram illustrating the concept of "${name}" for a patient-education app. `
    + 'Anatomical or schematic illustration style, calm neutral color palette, professional healthcare aesthetic. '
    + 'Absolutely no real or photorealistic human faces or bodies, no depiction of a specific person, no graphic surgical '
    + 'imagery, no blood, and no before-and-after comparison of any kind — this must read as a generic educational diagram, '
    + 'never as a photo of a real patient or a real outcome.';
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { batch_size } = await body();
  const limit = batch_size ?? DEFAULT_BATCH_SIZE;

  const existing: any[] = await base44.asServiceRole.entities.ProcedureKnowledge.list('-updated_at', 400);
  const alreadyCovered = new Set(
    existing.filter((r) => !!r.image_url).map((r) => (r.procedure_name || '').trim().toLowerCase())
  );

  const remainingTargets = TARGET_LIST.filter((t) => !alreadyCovered.has(t.name.trim().toLowerCase()));
  const thisBatch = remainingTargets.slice(0, limit);

  let generated = 0;
  const failed: string[] = [];

  for (const target of thisBatch) {
    try {
      const { url } = await base44.integrations.Core.GenerateImage({ prompt: buildPrompt(target.name) });
      if (!url) {
        failed.push(target.name);
        continue;
      }

      // Re-check for an existing (possibly admin-curated) row by name before
      // creating a duplicate — upsert, not blind create.
      const matchingExisting = existing.find(
        (r) => (r.procedure_name || '').trim().toLowerCase() === target.name.trim().toLowerCase()
      );
      if (matchingExisting) {
        await base44.asServiceRole.entities.ProcedureKnowledge.update(matchingExisting.id, {
          image_url: url,
          updated_at: new Date().toISOString(),
        });
      } else {
        await base44.asServiceRole.entities.ProcedureKnowledge.create({
          procedure_name: target.name,
          category: target.category,
          risk_level: 'Not Yet Assessed',
          image_url: url,
          is_active: true,
          updated_at: new Date().toISOString(),
        });
      }
      generated++;
    } catch (e) {
      console.error('[generateProcedureIllustrations] failed for', target.name, e?.message || e);
      failed.push(target.name);
    }
  }

  return ok({
    generated,
    failed,
    remaining: remainingTargets.length - thisBatch.length,
    total_target_list: TARGET_LIST.length,
    already_covered: alreadyCovered.size,
  });
}, { name: 'generateProcedureIllustrations', requireAuth: true, allowedRoles: ['admin', 'platform_admin'], bodySchema }));