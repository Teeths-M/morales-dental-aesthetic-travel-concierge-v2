import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plane, DollarSign, Star, LogOut } from 'lucide-react';
import { translations } from '@/lib/translations';
import { base44 } from '@/api/base44Client';

export default function TravelAgencyDashboard({ agency, language }) {
  const t = translations[language];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-emerald-600 font-semibold mb-1">✈️ {language === 'es' ? 'Bienvenido' : language === 'fr' ? 'Bienvenue' : 'Welcome'}</p>
            <h1 className="text-3xl font-display font-semibold text-foreground">{agency.agency_name}</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {language === 'es'
                ? `Sirviendo a ${agency.service_regions?.length || 0} regiones`
                : language === 'fr'
                ? `Servant ${agency.service_regions?.length || 0} régions`
                : `Serving ${agency.service_regions?.length || 0} regions`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">{language === 'es' ? 'Este Mes' : language === 'fr' ? 'Ce Mois' : 'This Month'}</p>
              <p className="text-2xl font-semibold text-foreground">${agency.earnings_this_month || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{language === 'es' ? 'Pendiente' : language === 'fr' ? 'En attente' : 'Pending'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Plane className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">{language === 'es' ? 'Servicios' : language === 'fr' ? 'Services' : 'Services'}</p>
              <p className="text-2xl font-semibold text-foreground">{agency.services_offered?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{agency.services_offered?.join(', ')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="space-y-3">
        <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-semibold h-12">
          👀 {language === 'es' ? 'Ver Solicitudes de Pacientes' : language === 'fr' ? 'Voir Demandes de Patients' : 'View Patient Requests'}
        </Button>
        <Link to="/partner-portal" className="block">
          <Button variant="outline" className="w-full h-12">
            📊 {language === 'es' ? 'Portal de Socios' : language === 'fr' ? 'Portail Partenaire' : 'Partner Portal'}
          </Button>
        </Link>
        <Link to="/partner-reviews" className="block">
          <Button variant="outline" className="w-full h-12">
            <Star className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Mis Reseñas' : language === 'fr' ? 'Mes Avis' : 'My Reviews'}
          </Button>
        </Link>
        <Button variant="outline" className="w-full h-12">
          ✏️ {language === 'es' ? 'Editar Perfil' : language === 'fr' ? 'Modifier le Profil' : 'Edit Profile'}
        </Button>
        <Button variant="outline" className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50" onClick={() => base44.auth.logout()}>
          <LogOut className="w-4 h-4 mr-2" />
          {language === 'es' ? 'Cerrar Sesión' : language === 'fr' ? 'Se Déconnecter' : 'Logout'}
        </Button>
      </div>

      {/* Status Box */}
      {!agency.approved_by_admin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-900 font-medium">
            ⏳ {language === 'es'
              ? 'Tu perfil está en revisión. Será aprobado pronto.'
              : language === 'fr'
              ? 'Votre profil est en cours d\'examen. Il sera approuvé bientôt.'
              : 'Your profile is under review. It will be approved soon.'}
          </p>
        </div>
      )}
      {agency.approved_by_admin && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-900 font-medium">
            ✅ {language === 'es'
              ? 'Tu perfil está aprobado y activo.'
              : language === 'fr'
              ? 'Votre profil est approuvé et actif.'
              : 'Your profile is approved and active.'}
          </p>
        </div>
      )}
    </div>
  );
}