import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Star, Zap, DollarSign, MapPin, LogOut } from 'lucide-react';
import { translations } from '@/lib/translations';

export default function TaxiServiceDashboard({ taxi, language }) {
  const t = translations[language];
  const [isOnline, setIsOnline] = useState(false);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-blue-600 font-semibold mb-1">
              🚕 {isOnline ? (language === 'es' ? 'En Línea' : language === 'fr' ? 'En Ligne' : 'Online') : (language === 'es' ? 'Desconectado' : language === 'fr' ? 'Hors ligne' : 'Offline')}
            </p>
            <h1 className="text-3xl font-display font-bold text-foreground">{taxi.driver_name || taxi.company_name}</h1>
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {language === 'es' ? 'Zona:' : language === 'fr' ? 'Zone:' : 'Zone:'} {taxi.operating_city}
            </p>
          </div>
          <Badge className={isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
            {isOnline ? '🟢 Online' : '⚪ Offline'}
          </Badge>
        </div>
      </div>

      {/* Today's Trip Assignment */}
      <Card className="p-6 border-2 border-blue-200 bg-blue-50/50">
        <p className="text-sm font-semibold text-foreground mb-4">📋 {language === 'es' ? 'Viaje de Hoy' : language === 'fr' ? 'Voyage d\'Aujourd\'hui' : 'Today\'s Trip'}:</p>
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-foreground">Maria G. <span className="text-xs text-blue-600 font-semibold ml-2">3:00 PM</span></p>
              <p className="text-sm text-muted-foreground">{language === 'es' ? 'Clínica Abreu → Marriott Hotel' : 'CIMA Hospital → Marriott Hotel'}</p>
              <p className="text-xs text-amber-700 mt-1">⚠️ {language === 'es' ? 'Post-cirugía de rodilla – asistir con silla de ruedas' : 'Post-knee surgery – assist with wheelchair'}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs">{language === 'es' ? 'Llamar' : 'Call'}</Button>
              <Button size="sm" className="bg-blue-600 text-white text-xs">{language === 'es' ? 'Estoy Aquí' : 'I\'m Here'}</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">{language === 'es' ? 'Viajes Esta Semana' : language === 'fr' ? 'Trajets Cette Semaine' : 'This Week\'s Trips'}</p>
              <p className="text-2xl font-bold text-foreground">{taxi.total_trips || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">{language === 'es' ? 'Ganancias' : language === 'fr' ? 'Revenus' : 'Earnings'}</p>
              <p className="text-2xl font-bold text-foreground">${taxi.earnings_this_week || 0}</p>
              <p className="text-xs text-emerald-600 mt-1">+ ${Math.round((taxi.earnings_this_week || 0) * 0.1)} tips</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">{language === 'es' ? 'Calificación' : language === 'fr' ? 'Évaluation' : 'Rating'}</p>
              <p className="text-2xl font-bold text-foreground">{taxi.quality_score?.toFixed(1) || '5.0'} ⭐</p>
              <p className="text-xs text-yellow-600 mt-1">{language === 'es' ? 'Top 10% de conductores' : 'Top 10% drivers'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Bonus Progress */}
      <Card className="p-6">
        <p className="text-sm font-semibold text-foreground mb-3">🏆 {language === 'es' ? 'Progreso de Bonificación' : language === 'fr' ? 'Progression du Bonus' : 'Bonus Progress'}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{taxi.bonus_progress || 0} / 50 {language === 'es' ? 'viajes' : language === 'fr' ? 'trajets' : 'trips'}</p>
            <p className="text-sm font-semibold text-emerald-600">$50 {language === 'es' ? 'bonificación' : language === 'fr' ? 'bonus' : 'bonus'}</p>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 transition-all"
              style={{ width: `${((taxi.bonus_progress || 0) / 50) * 100}%` }}
            ></div>
          </div>
        </div>
      </Card>

      {/* Main Actions */}
      <div className="space-y-3">
        <Button
          onClick={() => setIsOnline(!isOnline)}
          className={`w-full font-semibold h-12 ${
            isOnline
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white'
          }`}
        >
          <Zap className="w-5 h-5 mr-2" />
          {isOnline ? (language === 'es' ? 'Desconectarse' : language === 'fr' ? 'Se Déconnecter' : 'Go Offline') : (language === 'es' ? 'Conectarse' : language === 'fr' ? 'Se Connecter' : 'Go Online')}
        </Button>
        <Button 
          variant="outline" 
          className="w-full h-12"
          onClick={() => alert(language === 'es' ? 'Próximamente: Actualizar Disponibilidad' : language === 'fr' ? 'Bientôt: Mettre à jour la disponibilité' : 'Coming Soon: Update Availability')}
        >
          📅 {language === 'es' ? 'Actualizar Disponibilidad' : language === 'fr' ? 'Mettre à Jour la Disponibilité' : 'Update Availability'}
        </Button>
        <Button 
          variant="outline" 
          className="w-full h-12"
          onClick={() => alert(language === 'es' ? 'Próximamente: Ver Historial de Viajes' : language === 'fr' ? 'Bientôt: Afficher l\'historique des trajets' : 'Coming Soon: View Trip History')}
        >
          📊 {language === 'es' ? 'Ver Historial' : language === 'fr' ? 'Afficher l\'Historique' : 'View Trip History'}
        </Button>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-900 font-medium">
          ⏳ {language === 'es'
            ? 'Tu perfil está en revisión. Serás notificado cuando sea aprobado.'
            : language === 'fr'
            ? 'Votre profil est en cours d\'examen. Vous serez notifié lorsqu\'il sera approuvé.'
            : 'Your profile is under review. You\'ll be notified when approved.'}
        </p>
      </div>
    </div>
  );
}