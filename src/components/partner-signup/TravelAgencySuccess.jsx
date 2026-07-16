import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { translations } from '@/lib/translations';

export default function TravelAgencySuccess({ agency, language, onDashboard }) {
  const _t = translations[language];

  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
        <h2 className="text-3xl font-display font-semibold text-foreground">
          {language === 'es' ? '¡Bienvenido!' : language === 'fr' ? 'Bienvenue!' : 'Welcome!'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'es'
            ? 'Tu agencia de viajes ha sido registrada exitosamente.'
            : language === 'fr'
            ? 'Votre agence de voyages a été enregistrée avec succès.'
            : 'Your travel agency has been registered successfully.'}
        </p>
      </div>

      <div className="bg-secondary/50 border border-secondary rounded-2xl p-6 space-y-3 text-left">
        <p className="text-sm font-semibold text-foreground">📊 {language === 'es' ? 'Tu Perfil' : language === 'fr' ? 'Votre Profil' : 'Your Profile'}:</p>
        <div className="space-y-2 text-sm text-foreground">
          <div><strong>{language === 'es' ? 'Nombre:' : language === 'fr' ? 'Nom:' : 'Name:'}</strong> {agency.agency_name}</div>
          <div><strong>{language === 'es' ? 'Email:' : language === 'fr' ? 'Email:' : 'Email:'}</strong> {agency.email}</div>
          <div><strong>{language === 'es' ? 'Regiones:' : language === 'fr' ? 'Régions:' : 'Regions:'}</strong> {agency.service_regions?.join(', ')}</div>
          <div><strong>{language === 'es' ? 'Servicios:' : language === 'fr' ? 'Services:' : 'Services:'}</strong> {agency.services_offered?.join(', ')}</div>
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
            ? 'Tu perfil está en revisión. Serás notificado cuando sea aprobado.'
            : language === 'fr'
            ? 'Votre profil est en cours d\'examen. Vous serez notifié lorsqu\'il sera approuvé.'
            : 'Your profile is under review. You\'ll be notified when approved.'}
        </p>
        <Button
          onClick={onDashboard}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-semibold py-3 rounded-xl gap-2 text-base h-12"
        >
          {language === 'es' ? 'Ir a Portal Hub' : language === 'fr' ? 'Aller au Portal Hub' : 'Go to Portal Hub'} 
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}