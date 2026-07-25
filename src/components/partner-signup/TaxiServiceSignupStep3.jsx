import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ChevronLeft, Upload } from 'lucide-react';
import { translations } from '@/lib/translations';
import { base44 } from '@/api/base44Client';
import { saveUserOnboardingProfile } from '@/lib/onboardingProfile';
import SignupAuthGate from '@/components/auth/SignupAuthGate';

export default function TaxiServiceSignupStep3({ formData, setFormData, language, _onNext, onBack, onComplete }) {
  const _t = translations[language];
  const [payoutMethod, setPayoutMethod] = useState(formData.payout_method || null);
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [insuranceConfirmed, setInsuranceConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        vehicle_photo_url: uploadRes.file_url
      }));
      setVehiclePhotoFile(file.name);
    } catch (error) {
      console.error('Photo upload failed:', error);
    } finally {
      setPhotoUploading(false);
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
    if (!payoutMethod || !formData.payout_account || !licenseConfirmed || !insuranceConfirmed) {
      return;
    }

    // The TaxiService record below can be created as a guest, but
    // saveUserOnboardingProfile → syncTenantRole (which grants this account
    // the 'taxi_service' role the chauffeur dashboard requires) needs an
    // authenticated session — it silently no-ops for a guest, permanently
    // locking a newly-signed-up driver out of their own dashboard with no
    // recovery path. Require sign-in before creating anything. The form is
    // already auto-saved (signupDraft.js), so nothing is lost on the round trip.
    const currentUser = await base44.auth.me().catch(() => null);
    if (!currentUser) {
      setShowAuthGate(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const taxiData = {
        agency_name: formData.agency_name,
        company_name: formData.agency_name,
        contact_person: formData.driver_name,
        driver_name: formData.driver_name,
        email: formData.email,
        phone: formData.phone,
        operating_country: formData.operating_country,
        operating_city: formData.operating_city,
        service_radius_km: Number(formData.service_radius_km) || 0,
        patient_assistance: formData.patient_assistance,
        vehicle_types: formData.vehicle_types,
        operating_hours: formData.operating_hours,
        pricing_model: formData.pricing_model,
        vehicle_photo_url: formData.vehicle_photo_url || '',
        driver_license_number: formData.driver_license_number,
        insurance_provider: formData.insurance_provider,
        payout_method: formData.payout_method,
        payout_account: formData.payout_account,
        language_preference: language,
        license_verified: licenseConfirmed,
        insurance_verified: insuranceConfirmed,
        is_agency: true,
        status: 'pending_verification',
        sign_up_completed_at: new Date().toISOString()
      };

      const taxi = await base44.entities.TaxiService.create(taxiData);
      try { await saveUserOnboardingProfile({
        role: 'taxi_service',
        status: 'completed',
        linkedEntityName: 'TaxiService',
        linkedEntityId: taxi.id,
        profileData: { ...formData, ...taxiData }
      }); } catch (_) { /* non-fatal — entity is created */ }
      try {
        await base44.functions.invoke('initiatePartnerVerification', {
          partner_id: taxi.id,
          partner_type: 'taxi_service',
          documents: formData.vehicle_photo_url ? [formData.vehicle_photo_url] : [],
        });
      } catch (_) { /* non-fatal */ }
      onComplete(taxi);
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = payoutMethod && formData.payout_account && formData.driver_license_number && formData.insurance_provider && licenseConfirmed && insuranceConfirmed;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-semibold text-foreground mb-2">
          {language === 'es' ? 'Fotos del Vehículo y Pago' : language === 'fr' ? 'Photos du Véhicule et Paiement' : 'Vehicle Photos & Payout'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {language === 'es' ? 'Sube fotos de tu vehículo y configura el pago.' : language === 'fr' ? 'Téléchargez des photos de votre véhicule et configurez le paiement.' : 'Upload vehicle photos and set up payout.'}
        </p>
      </div>

      <div className="space-y-6">
        {/* Vehicle Photo */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">📸 {language === 'es' ? 'Foto del Vehículo' : language === 'fr' ? 'Photo du Véhicule' : 'Vehicle Photo'}</label>
          <div className="flex gap-3">
            <label className="flex-1">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-blue-400/50 hover:bg-blue-50/30 transition-all">
                {photoUploading ? (
                  <div className="text-sm text-muted-foreground">{language === 'es' ? 'Subiendo...' : 'Uploading...'}</div>
                ) : vehiclePhotoFile ? (
                  <div className="text-sm text-foreground">✓ {vehiclePhotoFile}</div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
                    <div className="text-sm text-foreground font-medium">{language === 'es' ? 'Seleccionar foto' : 'Choose photo'}</div>
                  </div>
                )}
                <input type="file" onChange={handlePhotoUpload} accept="image/*" className="hidden" />
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
                data-testid={`taxi-payout-${method}`}
                onClick={() => handlePayoutChange(method)}
                className={`p-3 rounded-lg border-2 transition-all text-center font-medium ${
                  payoutMethod === method
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-border bg-card text-foreground hover:border-blue-300'
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
              data-testid="taxi-payout-account"
              type={payoutMethod === 'paypal' ? 'email' : 'text'}
              placeholder={payoutMethod === 'paypal' ? 'your@email.com' : 'Account number'}
              value={formData.payout_account}
              onChange={(e) => handlePayoutAccount(e.target.value)}
              className="h-12"
            />
          </div>
        )}

        <div className="grid gap-4 border-t border-border pt-6">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">🪪 Driver License Number</label>
            <Input
              data-testid="taxi-license-number"
              placeholder="License number"
              value={formData.driver_license_number || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, driver_license_number: e.target.value }))}
              className="h-12"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">🛡️ Insurance Provider</label>
            <Input
              data-testid="taxi-insurance-provider"
              placeholder="Insurance company name"
              value={formData.insurance_provider || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, insurance_provider: e.target.value }))}
              className="h-12"
            />
          </div>
        </div>

        {/* Legal Confirmations */}
        <div className="space-y-3 border-t border-border pt-6">
          <div className="flex items-start gap-3 bg-secondary/50 border border-secondary rounded-lg p-4">
            <Checkbox data-testid="taxi-license-checkbox" checked={licenseConfirmed} onCheckedChange={/** @type {any} */(setLicenseConfirmed)} className="mt-1" />
            <label className="text-sm text-foreground cursor-pointer">
              {language === 'es'
                ? 'Tengo una licencia de conducir válida.'
                : language === 'fr'
                ? 'J\'ai un permis de conduire valide.'
                : 'I have a valid driver license.'}
            </label>
          </div>

          <div className="flex items-start gap-3 bg-secondary/50 border border-secondary rounded-lg p-4">
            <Checkbox data-testid="taxi-insurance-checkbox" checked={insuranceConfirmed} onCheckedChange={/** @type {any} */(setInsuranceConfirmed)} className="mt-1" />
            <label className="text-sm text-foreground cursor-pointer">
              {language === 'es'
                ? 'Tengo seguro válido para transportar pacientes.'
                : language === 'fr'
                ? 'Je dispose d\'une assurance valide pour transporter les patients.'
                : 'I have valid insurance for patient transport.'}
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={onBack} variant="outline" className="flex-1 h-12">
          <ChevronLeft className="w-4 h-4" /> {language === 'es' ? 'Atrás' : language === 'fr' ? 'Retour' : 'Back'}
        </Button>
        <Button
          data-testid="taxi-submit"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white gap-2"
        >
          {isSubmitting ? (language === 'es' ? 'Enviando...' : 'Submitting...') : (language === 'es' ? 'Comenzar a Transportar' : language === 'fr' ? 'Commencer à Transporter' : 'Start Transporting')}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <SignupAuthGate
        isOpen={showAuthGate}
        redirectPath="/partner-signup/taxi-service"
        title="One step left — sign in"
        message="Sign in to finish creating your chauffeur account. Your form is saved — you'll be right back here to submit."
        onCancel={() => setShowAuthGate(false)}
      />
    </div>
  );
}