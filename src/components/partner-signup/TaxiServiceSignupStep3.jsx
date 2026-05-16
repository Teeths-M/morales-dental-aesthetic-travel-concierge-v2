import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ChevronLeft, Upload } from 'lucide-react';
import { translations } from '@/lib/translations';
import { base44 } from '@/api/base44Client';

export default function TaxiServiceSignupStep3({ formData, setFormData, language, onNext, onBack, onComplete }) {
  const t = translations[language];
  const [payoutMethod, setPayoutMethod] = useState(null);
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [insuranceConfirmed, setInsuranceConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    try {
      const taxiData = {
        company_name: formData.company_name,
        driver_name: formData.driver_name,
        email: formData.email,
        phone: formData.phone,
        operating_city: formData.operating_city,
        vehicle_types: formData.vehicle_types,
        operating_hours: formData.operating_hours,
        pricing_model: formData.pricing_model,
        vehicle_photo_url: formData.vehicle_photo_url || '',
        payout_method: formData.payout_method,
        payout_account: formData.payout_account,
        language_preference: language,
        license_verified: licenseConfirmed,
        insurance_verified: insuranceConfirmed,
        status: 'pending_verification',
        sign_up_completed_at: new Date().toISOString()
      };

      const taxi = await base44.entities.TaxiService.create(taxiData);

      // Auto-create Partner entry
      const partnerData = {
        name: formData.driver_name || formData.company_name,
        title: 'Taxi / Transport Service',
        specialty: formData.vehicle_types?.join(', ') || 'Patient Transport',
        bio: `Transport service based in ${formData.operating_city}, specializing in patient transfers`,
        is_featured: false
      };
      await base44.entities.Partner.create(partnerData);

      onComplete(taxi);
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = payoutMethod && formData.payout_account && licenseConfirmed && insuranceConfirmed;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">
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
              type={payoutMethod === 'paypal' ? 'email' : 'text'}
              placeholder={payoutMethod === 'paypal' ? 'your@email.com' : 'Account number'}
              value={formData.payout_account}
              onChange={(e) => handlePayoutAccount(e.target.value)}
              className="h-12"
            />
          </div>
        )}

        {/* Legal Confirmations */}
        <div className="space-y-3 border-t border-border pt-6">
          <div className="flex items-start gap-3 bg-secondary/50 border border-secondary rounded-lg p-4">
            <Checkbox checked={licenseConfirmed} onCheckedChange={setLicenseConfirmed} className="mt-1" />
            <label className="text-sm text-foreground cursor-pointer">
              {language === 'es'
                ? 'Tengo una licencia de conducir válida.'
                : language === 'fr'
                ? 'J\'ai un permis de conduire valide.'
                : 'I have a valid driver license.'}
            </label>
          </div>

          <div className="flex items-start gap-3 bg-secondary/50 border border-secondary rounded-lg p-4">
            <Checkbox checked={insuranceConfirmed} onCheckedChange={setInsuranceConfirmed} className="mt-1" />
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
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white gap-2"
        >
          {isSubmitting ? (language === 'es' ? 'Enviando...' : 'Submitting...') : (language === 'es' ? 'Comenzar a Transportar' : language === 'fr' ? 'Commencer à Transporter' : 'Start Transporting')} 
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}