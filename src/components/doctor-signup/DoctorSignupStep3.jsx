import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { translations } from '@/lib/translations';
import { ArrowRight, ChevronLeft, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function DoctorSignupStep3({ formData, setFormData, language, onNext, onBack, onComplete }) {
  const t = translations[language];
  const [payoutMethod, setPayoutMethod] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!formData.license_url || !payoutMethod || !formData.payout_account || !confirmed) {
      return;
    }

    setIsSubmitting(true);
    try {
      const doctorData = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        clinic_country: formData.clinic_country,
        clinic_name: formData.clinic_name,
        license_url: formData.license_url,
        payout_method: formData.payout_method,
        payout_account: formData.payout_account,
        language_preference: language,
        status: 'pending_verification',
        sign_up_completed_at: new Date().toISOString()
      };

      const doctor = await base44.entities.Doctor.create(doctorData);

      // Auto-assign specialties
      if (formData.specialties && formData.specialties.length > 0) {
        const specialtyData = formData.specialties.map(spec => ({
          doctor_id: doctor.id,
          procedure_name: spec,
          category: formData.selectedCategory
        }));
        await base44.entities.DoctorSpecialty.bulkCreate(specialtyData);
      }

      // Auto-create Partner entry
      const partnerData = {
        name: formData.full_name,
        title: 'Medical Professional',
        specialty: formData.specialties?.length > 0 ? formData.specialties[0] : 'General',
        bio: `Doctor from ${formData.clinic_country}${formData.clinic_name ? ` - ${formData.clinic_name}` : ''}`,
        is_featured: false
      };
      await base44.entities.Partner.create(partnerData);

      onComplete(doctor);
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = formData.license_url && payoutMethod && formData.payout_account && confirmed;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">{t.step3Title}</h2>
        <p className="text-muted-foreground text-sm">{t.step3Subtitle}</p>
      </div>

      <div className="space-y-6">
        {/* License Upload */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">📄 {t.uploadLicense}</label>
          <div className="space-y-3">
            <div className="flex gap-3">
              <label className="flex-1">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                  {licenseUploading ? (
                    <div className="text-sm text-muted-foreground">Uploading...</div>
                  ) : licenseFile ? (
                    <div className="text-sm text-foreground">✓ {licenseFile}</div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
                      <div className="text-sm text-foreground font-medium">{t.uploadFile}</div>
                    </div>
                  )}
                  <input
                    type="file"
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
              type={payoutMethod === 'paypal' ? 'email' : 'text'}
              placeholder={
                payoutMethod === 'stripe' ? 'XXXXXXXXXX' :
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
            checked={confirmed}
            onCheckedChange={setConfirmed}
            className="mt-1"
          />
          <label className="text-sm text-foreground cursor-pointer">
            {t.confirmLegal} <strong>{formData.clinic_country}</strong>.
          </label>
        </div>
      </div>

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