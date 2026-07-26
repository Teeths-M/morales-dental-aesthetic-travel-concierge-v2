import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Award, Heart, Headphones, CheckCircle } from 'lucide-react';
import LanguageSwitcher from '@/components/ui-system/LanguageSwitcher';
import { ROUTES } from '@/lib/constants';
import { useTranslation } from '@/i18n';

export default function Footer() {
  const { t } = useTranslation();

  const trustItems = [
    { icon: Shield,      label: t('footer.trust_intelligence') },
    { icon: Award,       label: t('footer.trust_ai') },
    { icon: Heart,       label: t('footer.trust_escalation') },
    { icon: Headphones,  label: t('footer.trust_concierge') },
    { icon: CheckCircle, label: t('footer.trust_sos') },
  ];

  const badges = [
    t('footer.badge_countries'),
    t('footer.badge_intelligence'),
    t('footer.badge_ai'),
    t('footer.badge_satellite'),
    t('footer.badge_golden'),
  ];

  return (
    <footer className="bg-foreground text-background">
      {/* Trust Bar */}
      <div className="border-b border-background/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-12">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-background/70">
                <Icon className="w-4 h-4 text-accent" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/morales-m-mark.png"
                alt="Morales"
                className="w-9 h-9 object-contain"
              />
              <div>
                <p className="font-display text-base text-background">MORALES</p>
                <p className="text-[9px] tracking-[0.15em] text-background/50 uppercase">Medical Travel Safety</p>
              </div>
            </div>
            <p className="text-sm text-background/60 leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-background/90">{t('footer.services_heading')}</h4>
            <div className="space-y-2.5">
              {[
                { label: t('nav.find_doctors'),    path: '/providers' },
                { label: t('nav.procedures'),      path: '/procedures' },
                { label: t('footer.visa_assist'),   path: '/visa-assist' },
                { label: t('footer.travel_safety'), path: '/safe-t' },
              ].map(({ label, path }) => (
                <Link key={path} to={path} className="block text-sm text-background/50 hover:text-background/80 transition-colors">{label}</Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-background/90">{t('footer.portals_heading')}</h4>
            <div className="space-y-2.5">
              {[
                { label: t('footer.doctor_portal'),        path: '/doctor-dashboard' },
                { label: t('footer.travel_agency_portal'), path: '/travel-agency-dashboard' },
                { label: t('footer.chauffeur_portal'),     path: '/taxi-service-dashboard' },
                { label: t('footer.companion_portal'),     path: '/companion-dashboard' },
                { label: t('footer.join_provider'),        path: '/partner-signup' },
              ].map(({ label, path }) => (
                <Link key={path} to={path} className="block text-sm text-background/50 hover:text-background/80 transition-colors">{label}</Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-background/90">{t('footer.company_heading')}</h4>
            <div className="space-y-2.5">
              {[
                { label: t('footer.about_us'), path: '/about' },
                { label: t('nav.how_it_works'), path: '/how-it-works' },
              ].map(l => (
                <Link key={l.path} to={l.path} className="block text-sm text-background/50 hover:text-background/80 transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-background/90">{t('footer.contact_heading')}</h4>
            <div className="space-y-2.5">
              <a href="mailto:info@moralesconcierge.com" className="block text-sm text-background/50 hover:text-background/80 transition-colors">info@moralesconcierge.com</a>
              <a href="tel:+18005550199" className="block text-sm text-background/50 hover:text-background/80 transition-colors">+1 (800) 555-0199</a>
              <p className="text-sm text-background/50">{t('footer.hours')}</p>
            </div>
          </div>
        </div>

        {/* Leadership badges */}
        <div className="border-t border-background/10 mt-12 pt-6 mb-4 flex flex-wrap justify-center gap-3">
          {badges.map(b => (
            <span key={b} className="text-[10px] font-semibold px-3 py-1.5 rounded-full border text-background/50 border-background/15">
              {b}
            </span>
          ))}
        </div>

        <div className="border-t border-background/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-background/40">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-6">
            <div className="flex gap-6 text-xs text-background/40">
              <Link to={ROUTES.PRIVACY} className="hover:text-background/60 transition-colors">{t('footer.privacy')}</Link>
              <Link to={ROUTES.TERMS} className="hover:text-background/60 transition-colors">{t('footer.terms')}</Link>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}