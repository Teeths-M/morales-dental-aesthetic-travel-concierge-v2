import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ChevronLeft, Upload } from 'lucide-react';
import { translations } from '@/lib/translations';
import { base44 } from '@/api/base44Client';
import { saveUserOnboardingProfile } from '@/lib/onboardingProfile';

export default function TravelAgencySignupStep3({ formData, setFormData, language, _onNext, onBack, onComplete }) {
  const _t = translations[language];
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
        business_license_url: uploadRes.file_url
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
    if (!payoutMethod || !formData.payout_account || !confirmed) {
      return;
    }

    setIsSubmitting(true);
    try {
      const agencyData = {
        agency_name: formData.agency_name,
        email: formData.email,
        phone: formData.phone,
        contact_person: formData.contact_person,
        headquarters_country: formData.headquarters_country,
        website_url: formData.website_url,
        medical_travel_experience_years: Number(formData.medical_travel_experience_years) || 0,
        emergency_support_available: !!formData.emergency_support_available,
        service_regions: formData.service_regions,
        services_offered: formData.services_offered,
        service_options: formData.service_options,
        payout_method: formData.payout_method,
        payout_account: formData.payout_account,
        business_license_url: formData.business_license_url || '',
        language_preference: language,
        is_agency: true,
        status: 'pending_verification',
        sign_up_completed_at: new Date().toISOString()
      };

      const agency = await base44.entities.TravelAgency.create(agencyData);
      await saveUserOnboardingProfile({
        role: 'travel_agency',
        status: 'completed',
        linkedEntityName: 'TravelAgency',
        linkedEntityId: agency.id,
        profileData: { ...formData, ...agencyData }
      });
      try {
        await base44.functions.invoke('initiatePartnerVerification', {
          partner_id: agency.id,
          partner_type: 'travel_agency',
          documents: formData.business_license_url ? [formData.business_license_url] : [],
        });
      } catch (_) { /* non-fatal */ }
      onComplete(agency);
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = payoutMethod && formData.payout_account && confirmed;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-semibold text-foreground mb-2">
          {language === 'es' ? 'Pago y Acuerdos' : language === 'fr' ? 'Paiement et Accords' : 'Payout & Agreements'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {language === 'es' ? 'Configura tu método de pago y confirma los términos.' : language === 'fr' ? 'Configurez votre méthode de paiement et confirmez les conditions.' : 'Set up your payout method and confirm terms.'}
        </p>
      </div>

      <div className="space-y-6">
        {/* License Upload */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">📄 {language === 'es' ? 'Licencia Comercial (Opcional)' : language === 'fr' ? 'Permis Commercial (Optionnel)' : 'Business License (Optional)'}</label>
          <div className="flex gap-3">
            <label className="flex-1">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                {licenseUploading ? (
                  <div className="text-sm text-muted-foreground">{language === 'es' ? 'Subiendo...' : 'Uploading...'}</div>
                ) : licenseFile ? (
                  <div className="text-sm text-foreground">✓ {licenseFile}</div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
                    <div className="text-sm text-foreground font-medium">{language === 'es' ? 'Seleccionar archivo' : 'Choose file'}</div>
                  </div>
                )}
                <input type="file" onChange={handleLicenseUpload} accept=".pdf,image/*" className="hidden" />
              </div>
            </label>
          </div>
        </div>

        {/* Payout Method */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">{language === 'es' ? 'Método de Pago' : language === 'fr' ? 'Méthode de Paiement' : 'Payout Method'}</label>
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

        {/* Payout Account */}
        {payoutMethod && (
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {payoutMethod === 'stripe' && (language === 'es' ? 'Cuenta Bancaria' : language === 'fr' ? 'Compte Bancaire' : 'Bank Account')}
              {payoutMethod === 'paypal' && (language === 'es' ? 'Email de PayPal' : language === 'fr' ? 'Email PayPal' : 'PayPal Email')}
              {payoutMethod === 'wipay' && (language === 'es' ? 'Cuenta WiPay' : language === 'fr' ? 'Compte WiPay' : 'WiPay Account')}
            </label>
            <Input
              type={payoutMethod === 'paypal' ? 'email' : 'text'}
              placeholder={payoutMethod === 'paypal' ? 'your@email.com' : 'Account number'}
              value={formData.payout_account}
              onChange={(e) => handlePayoutAccount(e.target.value)}
              className="h-12"
            />
          </div>
        )}

        {/* Legal Confirmation */}
        <div className="flex items-start gap-3 bg-secondary/50 border border-secondary rounded-lg p-4">
          <Checkbox checked={confirmed} onCheckedChange={/** @type {any} */(setConfirmed)} className="mt-1" />
          <label className="text-sm text-foreground cursor-pointer">
            {language === 'es'
              ? 'Confirmo que puedo proporcionar legalmente servicios de viaje en las regiones seleccionadas.'
              : language === 'fr'
              ? 'Je confirme que je peux fournir légalement des services de voyage dans les régions sélectionnées.'
              : 'I confirm I can legally provide travel services in the selected regions.'}
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={onBack} variant="outline" className="flex-1 h-12">
          <ChevronLeft className="w-4 h-4" /> {language === 'es' ? 'Atrás' : language === 'fr' ? 'Retour' : 'Back'}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white gap-2"
        >
          {isSubmitting ? (language === 'es' ? 'Enviando...' : 'Submitting...') : (language === 'es' ? 'Enviar y Unirse' : language === 'fr' ? 'Soumettre et Rejoindre' : 'Submit & Join')} 
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}