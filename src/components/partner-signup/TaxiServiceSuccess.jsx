import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { translations } from '@/lib/translations';

export default function TaxiServiceSuccess({ taxi, language, onDashboard }) {
  const _t = translations[language];

  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-3xl font-display font-semibold text-foreground">
          {language === 'es' ? '¡Bienvenido!' : language === 'fr' ? 'Bienvenue!' : 'Welcome!'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'es'
            ? 'Tu servicio de taxi ha sido registrado exitosamente.'
            : language === 'fr'
            ? 'Votre service de taxi a été enregistré avec succès.'
            : 'Your taxi service has been registered successfully.'}
        </p>
      </div>

      <div className="bg-secondary/50 border border-secondary rounded-2xl p-6 space-y-3 text-left">
        <p className="text-sm font-semibold text-foreground">🚕 {language === 'es' ? 'Tu Perfil' : language === 'fr' ? 'Votre Profil' : 'Your Profile'}:</p>
        <div className="space-y-2 text-sm text-foreground">
          <div><strong>{language === 'es' ? 'Conductor:' : language === 'fr' ? 'Conducteur:' : 'Driver:'}</strong> {taxi.driver_name || taxi.company_name}</div>
          <div><strong>{language === 'es' ? 'Email:' : language === 'fr' ? 'Email:' : 'Email:'}</strong> {taxi.email}</div>
          <div><strong>{language === 'es' ? 'Ciudad:' : language === 'fr' ? 'Ville:' : 'City:'}</strong> {taxi.operating_city}</div>
          <div><strong>{language === 'es' ? 'Vehículos:' : language === 'fr' ? 'Véhicules:' : 'Vehicles:'}</strong> {taxi.vehicle_types?.join(', ')}</div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
        <p className="text-sm text-green-900 font-medium">
          {language === 'es'
            ? '✉️ Te hemos enviado un email con acceso a tu portal. Verifica tu bandeja de entrada.'
            : language === 'fr'
            ? '✉️ Nous vous avons envoyé un email avec accès à votre portail. Vérifiez votre boîte de réception.'
            : '✉️ We sent you a portal access email. Check your inbox.'}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {language === 'es'
            ? 'Tu perfil está en revisión. Serás notificado cuando sea aprobado para comenzar a transportar pacientes.'
            : language === 'fr'
            ? 'Votre profil est en cours d\'examen. Vous serez notifié lorsqu\'il sera approuvé pour commencer à transporter les patients.'
            : 'Your profile is under review. You\'ll be notified when approved to start transporting patients.'}
        </p>
        <Button
          onClick={onDashboard}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white font-semibold py-3 rounded-xl gap-2 text-base h-12"
        >
          {language === 'es' ? 'Ir a Portal Hub' : language === 'fr' ? 'Aller au Portal Hub' : 'Go to Portal Hub'} 
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}