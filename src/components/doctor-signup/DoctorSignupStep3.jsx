import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { translations } from '@/lib/translations';
import { ChevronLeft, Upload, CloudUpload, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { saveUserOnboardingProfile } from '@/lib/onboardingProfile';
import VerificationInfo from './VerificationInfo';

export default function DoctorSignupStep3({ formData, setFormData, language = 'en', _onNext, onBack, onComplete }) {
  const t = translations[language] || translations['en'];
  const [payoutMethod, setPayoutMethod] = useState(formData.payout_method || null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  const handleLicenseUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLicenseUploading(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        license_url: uploadRes.file_url
      }));
      setLicenseFile(file.name);
    } catch (error) {
      console.error('License upload failed:', error);
    } finally {
      setLicenseUploading(false);
    }
  };

  const handlePayoutChange = (method) => {
    setPayoutMethod(method);
    setFormData(prev => ({
      ...prev,
      payout_method: method,
      payout_account: ''
    }));
  };

  const handlePayoutAccount = (value) => {
    setFormData(prev => ({
      ...prev,
      payout_account: value
    }));
  };

  const handleSubmit = async () => {
     if (!formData.license_number || !payoutMethod || !formData.payout_account || !confirmed) {
       return;
     }

     setIsSubmitting(true);
     try {
       const doctorData = {
         full_name: formData.full_name,
         email: formData.email,
         phone: formData.phone,
         clinic_country: formData.clinic_country,
         clinic_city: formData.clinic_city,
         clinic_name: formData.clinic_name,
         professional_background: formData.professional_background,
         years_experience: Number(formData.years_experience) || 0,
         bio: formData.bio,
         license_number: formData.license_number,
         license_url: formData.license_url,
         website_url: formData.website_url || undefined,
         social_facebook: formData.social_facebook || undefined,
         social_instagram: formData.social_instagram || undefined,
         social_tiktok: formData.social_tiktok || undefined,
         payout_method: formData.payout_method,
         payout_account: formData.payout_account,
         language_preference: language,
         status: 'pending_verification',
         sign_up_completed_at: new Date().toISOString()
       };

       const doctor = await base44.entities.Doctor.create(doctorData);
       try { await saveUserOnboardingProfile({
         role: 'doctor',
         status: 'completed',
         linkedEntityName: 'Doctor',
         linkedEntityId: doctor.id,
         profileData: { ...formData, ...doctorData }
       }); } catch (_) { /* non-fatal — Doctor entity is created */ }

       // Auto-assign specialties (non-fatal)
       try {
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

         // Save pricing information
         if (formData.procedurePrices && Object.keys(formData.procedurePrices).length > 0) {
           const pricingData = Object.entries(formData.procedurePrices)
             .filter(([, price]) => price !== '' && price !== null && price > 0)
             .map(([procedure_name, doctor_price_usd]) => {
               const matched = masterProcs.find(mp => mp.en_name === procedure_name);
               return {
                 doctor_id: doctor.id,
                 procedure_id: matched?.procedure_id || procedure_name,
                 procedure_name: procedure_name,
                 doctor_price_usd: parseFloat(doctor_price_usd),
               };
             });
           if (pricingData.length > 0) {
             await base44.entities.DoctorPricing.bulkCreate(pricingData);
           }
         }
         }
         } catch (_) { /* non-fatal — pricing/specialty creation */ }

         onComplete(doctor);
     } catch (error) {
       console.error('Submit failed:', error);
       setSyncMessage({ type: 'error', text: 'Submission failed: ' + error.message });
     } finally {
       setIsSubmitting(false);
     }
   };

      const handleSyncToPortalHub = async () => {
      if (!formData.full_name || !formData.email) {
      setSyncMessage({ type: 'error', text: 'Doctor info required' });
      return;
      }

      setIsSyncing(true);
      setSyncMessage(null);
      try {
      const _response = await base44.functions.invoke('syncDoctorToPortalHub', {
        event: { type: 'update', entity_name: 'Doctor' },
        data: {
          id: 'manual_sync_' + Date.now(),
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          clinic_country: formData.clinic_country,
          clinic_name: formData.clinic_name,
          status: 'active'
        }
      });
      setSyncMessage({ type: 'success', text: 'Synced to Portal Hub!' });
      } catch (error) {
      console.error('Sync failed:', error);
      setSyncMessage({ type: 'error', text: 'Sync failed: ' + error.message });
      } finally {
      setIsSyncing(false);
      }
      };

  const canSubmit = formData.license_number && payoutMethod && formData.payout_account && confirmed;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-semibold text-foreground mb-2">{t.step3Title}</h2>
        <p className="text-muted-foreground text-sm">{t.step3Subtitle}</p>
      </div>

      <div className="space-y-6">
        {/* Verification Info */}
        <VerificationInfo language={language} />

        {/* Digital Presence — used by the Internet Intelligence scan */}
        <div className="space-y-4 p-4 rounded-lg border border-border bg-secondary/20">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Digital Presence</h3>
            <p className="text-xs text-muted-foreground mt-1">
              These are checked live during your verification scan — add what you have.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">🌐 Website URL</label>
            <Input
              data-testid="doctor-website-url"
              type="url"
              value={formData.website_url || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
              placeholder="https://yourclinic.com"
              className="h-12"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Facebook</label>
              <Input
                data-testid="doctor-social-facebook"
                type="text"
                value={formData.social_facebook || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, social_facebook: e.target.value }))}
                placeholder="yourclinic"
                className="h-12"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Instagram</label>
              <Input
                data-testid="doctor-social-instagram"
                type="text"
                value={formData.social_instagram || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, social_instagram: e.target.value }))}
                placeholder="yourclinic"
                className="h-12"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">TikTok</label>
              <Input
                data-testid="doctor-social-tiktok"
                type="text"
                value={formData.social_tiktok || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, social_tiktok: e.target.value }))}
                placeholder="yourclinic"
                className="h-12"
              />
            </div>
          </div>
        </div>

        {/* License Number */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">🪪 Medical License Number</label>
          <input
            type="text"
            data-testid="doctor-license-number"
            value={formData.license_number || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
            placeholder="e.g. CO-123456 or RETHUS-789"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">Used for government registry verification during the fraud scan.</p>
        </div>

        {/* License Upload */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">📄 {t.uploadLicense}</label>
          <div className="space-y-3">
            <div className="flex gap-3">
              <label className="flex-1" data-testid="doctor-license-upload-label">
                <div
                  data-testid={licenseFile ? 'doctor-license-upload-success' : 'doctor-license-upload-zone'}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all ${
                    licenseFile ? 'border-emerald-500 bg-emerald-50' : 'border-border'
                  }`}
                >
                  {licenseUploading ? (
                    <div className="text-sm text-muted-foreground" data-testid="doctor-license-uploading">Uploading...</div>
                  ) : licenseFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 font-medium">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span>{licenseFile}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
                      <div className="text-sm text-foreground font-medium">{t.uploadFile}</div>
                    </div>
                  )}
                  <input
                    type="file"
                    data-testid="doctor-license-file-input"
                    onChange={handleLicenseUpload}
                    accept="image/*,.pdf"
                    className="hidden"
                  />
                </div>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">{t.verifyNote}</p>
          </div>
        </div>

        {/* Payout Method */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">{t.payoutMethod}</label>
          <div className="grid grid-cols-3 gap-3">
            {['stripe', 'paypal', 'wipay'].map((method) => (
              <button
                key={method}
                data-testid={`doctor-payout-${method}`}
                onClick={() => handlePayoutChange(method)}
                className={`p-3 rounded-lg border-2 transition-all text-center font-medium ${
                  payoutMethod === method
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-primary/50'
                }`}
              >
                {method === 'stripe' && '💳 Stripe'}
                {method === 'paypal' && '🅿️ PayPal'}
                {method === 'wipay' && '💰 WiPay'}
              </button>
            ))}
          </div>
        </div>

        {/* Payout Account Details */}
        {payoutMethod && (
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {payoutMethod === 'stripe' && t.bankAccount}
              {payoutMethod === 'paypal' && t.paypalEmail}
              {payoutMethod === 'wipay' && t.wipayAccount}
            </label>
            <Input
              data-testid="doctor-payout-account"
              type={payoutMethod === 'paypal' ? 'email' : 'text'}
              placeholder={
                payoutMethod === 'stripe' ? 'acct_XXXXXXXXXXXXXXXX' :
                payoutMethod === 'paypal' ? 'your@email.com' :
                'WiPay account number'
              }
              value={formData.payout_account}
              onChange={(e) => handlePayoutAccount(e.target.value)}
              className="h-12"
            />
          </div>
        )}

        {/* Legal Confirmation */}
        <div className="flex items-start gap-3 bg-secondary/50 border border-secondary rounded-lg p-4">
          <Checkbox
            data-testid="doctor-legal-checkbox"
            checked={confirmed}
            onCheckedChange={/** @type {any} */(setConfirmed)}
            className="mt-1"
          />
          <label className="text-sm text-foreground cursor-pointer">
            {t.confirmLegal} <strong>{formData.clinic_country}</strong>.
          </label>
        </div>
      </div>

      {/* Sync Message */}
      {syncMessage && (
        <div className={`p-3 rounded-lg text-sm font-medium text-center ${
          syncMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {syncMessage.text}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1 h-12"
        >
          <ChevronLeft className="w-4 h-4" /> {t.back}
        </Button>
        <Button
          onClick={handleSyncToPortalHub}
          disabled={!formData.full_name || isSyncing}
          variant="outline"
          className="flex-1 h-12 gap-2"
        >
          <CloudUpload className="w-4 h-4" />
          {isSyncing ? 'Syncing...' : 'Sync to Portal Hub'}
        </Button>
        <Button
          data-testid="doctor-submit-join"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white gap-2"
        >
          {isSubmitting ? 'Submitting...' : t.submitJoin}
        </Button>
      </div>
    </div>
  );
}