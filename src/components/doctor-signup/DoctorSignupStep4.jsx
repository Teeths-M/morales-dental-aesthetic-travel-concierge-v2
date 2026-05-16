import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { translations } from '@/lib/translations';
import { ChevronLeft, Upload, Wand2, Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function DoctorSignupStep4({ formData, setFormData, language = 'en', onNext, onBack, onComplete }) {
  const t = translations[language] || translations['en'];
  const [yearsExp, setYearsExp] = useState(formData.years_experience || '');
  const [selfRating, setSelfRating] = useState(formData.self_rating || 5);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [generatingProPhoto, setGeneratingProPhoto] = useState(false);
  const [reviews, setReviews] = useState(formData.reviews || []);
  const [newReview, setNewReview] = useState({ client_name: '', comment: '', rating: 5 });
  const [expertise, setExpertise] = useState(formData.areas_of_expertise || []);
  const [newExpertise, setNewExpertise] = useState('');
  const [certifications, setCertifications] = useState(formData.certifications || []);
  const [newCert, setNewCert] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        photo_url: uploadRes.file_url
      }));
      setPhotoFile(file.name);
    } catch (error) {
      console.error('Photo upload failed:', error);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleGenerateProPhoto = async () => {
    if (!formData.photo_url) {
      alert('Please upload a clean photo first');
      return;
    }

    setGeneratingProPhoto(true);
    try {
      const response = await base44.integrations.Core.GenerateImage({
        prompt: `Professional headshot of a medical doctor in formal business attire. Professional suit, tie, clean background. Based on the photo provided: ${formData.photo_url}. High quality, professional lighting, corporate appearance.`,
        existing_image_urls: [formData.photo_url]
      });
      setFormData(prev => ({
        ...prev,
        professional_photo_url: response.url
      }));
    } catch (error) {
      console.error('Professional photo generation failed:', error);
    } finally {
      setGeneratingProPhoto(false);
    }
  };

  const addReview = () => {
    if (newReview.client_name && newReview.comment) {
      setReviews([...reviews, { ...newReview, date: new Date().toISOString().split('T')[0] }]);
      setNewReview({ client_name: '', comment: '', rating: 5 });
    }
  };

  const removeReview = (idx) => {
    setReviews(reviews.filter((_, i) => i !== idx));
  };

  const addExpertise = () => {
    if (newExpertise.trim() && !expertise.includes(newExpertise)) {
      setExpertise([...expertise, newExpertise.trim()]);
      setNewExpertise('');
    }
  };

  const addCertification = () => {
    if (newCert.trim() && !certifications.includes(newCert)) {
      setCertifications([...certifications, newCert.trim()]);
      setNewCert('');
    }
  };

  const handleSubmit = async () => {
    setFormData(prev => ({
      ...prev,
      years_experience: parseInt(yearsExp) || 0,
      self_rating: selfRating,
      reviews,
      areas_of_expertise: expertise,
      certifications
    }));

    setIsSubmitting(true);
    try {
      const doctorData = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        clinic_country: formData.clinic_country,
        clinic_name: formData.clinic_name,
        license_url: formData.license_url,
        photo_url: formData.photo_url,
        professional_photo_url: formData.professional_photo_url,
        payout_method: formData.payout_method,
        payout_account: formData.payout_account,
        language_preference: language,
        status: 'pending_verification',
        years_experience: parseInt(yearsExp) || 0,
        self_rating: selfRating,
        reviews,
        areas_of_expertise: expertise,
        certifications,
        sign_up_completed_at: new Date().toISOString()
      };

      const doctor = await base44.entities.Doctor.create(doctorData);

      // Auto-assign specialties
      if (formData.specialties && formData.specialties.length > 0) {
        const masterProcs = await base44.entities.MasterProcedure.list('-created_date', 500);

        const specialtyData = formData.specialties.map(spec => {
          const matched = masterProcs.find(mp => mp.en_name === spec);
          return {
            doctor_id: doctor.id,
            procedure_id: matched?.procedure_id || spec,
            procedure_name: spec,
            category: matched?.category || 'General'
          };
        });

        if (specialtyData.length > 0) {
          await base44.entities.DoctorSpecialty.bulkCreate(specialtyData);
        }
      }

      onComplete(doctor);
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canContinue = yearsExp && expertise.length > 0 && reviews.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">Specialist Profile</h2>
        <p className="text-muted-foreground text-sm">Build your world-class specialist profile</p>
      </div>

      {/* Experience */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Years of Experience *</label>
        <Input
          type="number"
          min="0"
          max="70"
          placeholder="e.g. 15"
          value={yearsExp}
          onChange={(e) => setYearsExp(e.target.value)}
          className="h-12"
        />
      </div>

      {/* Self Rating */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">Rate Yourself Honestly (1-5 stars)</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setSelfRating(star)}
              className={`text-4xl transition-transform ${selfRating >= star ? 'scale-125' : 'opacity-30'}`}
            >
              ⭐
            </button>
          ))}
        </div>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">📸 Upload Clean Professional Photo *</label>
        <div className="space-y-3">
          <label className="block">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
              {photoUploading ? (
                <div className="text-sm text-muted-foreground">Uploading...</div>
              ) : photoFile ? (
                <div className="text-sm text-foreground">✓ {photoFile}</div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
                  <div className="text-sm text-foreground font-medium">Upload Photo</div>
                </div>
              )}
              <input
                type="file"
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </label>
          {formData.photo_url && (
            <Button
              onClick={handleGenerateProPhoto}
              disabled={generatingProPhoto}
              variant="outline"
              className="w-full gap-2"
            >
              <Wand2 className="w-4 h-4" />
              {generatingProPhoto ? 'Generating Professional Look...' : 'AI: Generate Professional Suit Photo'}
            </Button>
          )}
          {formData.professional_photo_url && (
            <p className="text-xs text-emerald-600">✓ Professional photo generated</p>
          )}
        </div>
      </div>

      {/* Areas of Expertise */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Areas of Expertise *</label>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="e.g. Dental Implants, Smile Design"
            value={newExpertise}
            onChange={(e) => setNewExpertise(e.target.value)}
            className="h-10"
          />
          <Button onClick={addExpertise} variant="outline" className="w-12" size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {expertise.map((exp, i) => (
            <div key={i} className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm flex items-center gap-2">
              {exp}
              <button onClick={() => setExpertise(expertise.filter((_, idx) => idx !== i))} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Certifications & Memberships</label>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="e.g. Board Certified, IAAI Member"
            value={newCert}
            onChange={(e) => setNewCert(e.target.value)}
            className="h-10"
          />
          <Button onClick={addCertification} variant="outline" className="w-12" size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {certifications.map((cert, i) => (
            <div key={i} className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm flex items-center gap-2">
              {cert}
              <button onClick={() => setCertifications(certifications.filter((_, idx) => idx !== i))} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">Client Reviews & Testimonials *</label>
        <div className="space-y-3 mb-4">
          <Input
            placeholder="Client name"
            value={newReview.client_name}
            onChange={(e) => setNewReview({ ...newReview, client_name: e.target.value })}
            className="h-10"
          />
          <textarea
            placeholder="Review comment - describe the client's experience"
            value={newReview.comment}
            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
            className="w-full p-3 border border-border rounded-lg text-sm resize-none"
            rows="3"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Rating</label>
              <select
                value={newReview.rating}
                onChange={(e) => setNewReview({ ...newReview, rating: parseInt(e.target.value) })}
                className="w-full p-2 border border-border rounded-lg text-sm"
              >
                {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r} stars</option>)}
              </select>
            </div>
            <Button onClick={addReview} className="mt-6 self-end gap-2">
              <Plus className="w-4 h-4" /> Add Review
            </Button>
          </div>
        </div>

        {reviews.length > 0 && (
          <div className="space-y-2">
            {reviews.map((review, i) => (
              <div key={i} className="bg-secondary/40 border border-secondary rounded-lg p-3">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-sm">{review.client_name}</p>
                  <button onClick={() => removeReview(i)} className="text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{review.comment}</p>
                <div className="flex gap-1">
                  {Array(review.rating).fill('⭐').map((_, j) => <span key={j} className="text-sm">⭐</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button onClick={onBack} variant="outline" className="flex-1 h-12">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canContinue || isSubmitting}
          className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white"
        >
          {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
        </Button>
      </div>
    </div>
  );
}