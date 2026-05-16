import React, { useState, useEffect } from 'react';
import { Settings, Bell, Lock, Globe, Shield, User, Eye, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const languages = ['English', 'Español', 'Français', 'Português'];

const getLabels = (lang) => ({
  settings: lang === 'es' ? 'Configuración' : lang === 'fr' ? 'Paramètres' : lang === 'pt' ? 'Configurações' : 'Settings',
  manageAccount: lang === 'es' ? 'Gestionar tu cuenta, privacidad y preferencias' : lang === 'fr' ? 'Gérer votre compte, confidentialité et préférences' : lang === 'pt' ? 'Gerenciar sua conta, privacidade e preferências' : 'Manage your account, privacy, and preferences',
  account: lang === 'es' ? 'Gestión de Cuenta' : lang === 'fr' ? 'Gestion du Compte' : lang === 'pt' ? 'Gerenciamento de Conta' : 'Account Management',
  fullName: lang === 'es' ? 'Nombre Completo' : lang === 'fr' ? 'Nom Complet' : lang === 'pt' ? 'Nome Completo' : 'Full Name',
  email: lang === 'es' ? 'Dirección de Correo' : lang === 'fr' ? 'Adresse Email' : lang === 'pt' ? 'Endereço de Email' : 'Email Address',
  phone: lang === 'es' ? 'Número de Teléfono' : lang === 'fr' ? 'Numéro de Téléphone' : lang === 'pt' ? 'Número de Telefone' : 'Phone Number',
  accountType: lang === 'es' ? 'Tipo de Cuenta' : lang === 'fr' ? 'Type de Compte' : lang === 'pt' ? 'Tipo de Conta' : 'Account Type',
  patient: lang === 'es' ? 'Paciente / Cliente' : lang === 'fr' ? 'Patient / Client' : lang === 'pt' ? 'Paciente / Cliente' : 'Patient / Client',
  security: lang === 'es' ? 'Configuración de Seguridad' : lang === 'fr' ? 'Paramètres de Sécurité' : lang === 'pt' ? 'Configurações de Segurança' : 'Security Settings',
  mfa: lang === 'es' ? 'Autenticación de Dos Factores (MFA)' : lang === 'fr' ? 'Authentification Multi-Facteurs (MFA)' : lang === 'pt' ? 'Autenticação Multifator (MFA)' : 'Two-Factor Authentication (MFA)',
  mfaDesc: lang === 'es' ? 'Añade una capa extra de seguridad a tu cuenta' : lang === 'fr' ? 'Ajouter une couche de sécurité supplémentaire à votre compte' : lang === 'pt' ? 'Adicionar uma camada extra de segurança à sua conta' : 'Add an extra layer of security to your account',
  changePassword: lang === 'es' ? 'Cambiar Contraseña' : lang === 'fr' ? 'Changer le Mot de Passe' : lang === 'pt' ? 'Alterar Senha' : 'Change Password',
  notifications: lang === 'es' ? 'Preferencias de Notificación' : lang === 'fr' ? 'Préférences de Notification' : lang === 'pt' ? 'Preferências de Notificação' : 'Notification Preferences',
  appointments: lang === 'es' ? 'Alertas de Citas' : lang === 'fr' ? 'Alertes de Rendez-vous' : lang === 'pt' ? 'Alertas de Compromissos' : 'Appointments Alerts',
  medications: lang === 'es' ? 'Alertas de Medicamentos' : lang === 'fr' ? 'Alertes de Médicaments' : lang === 'pt' ? 'Alertas de Medicamentos' : 'Medications Alerts',
  travel: lang === 'es' ? 'Alertas de Viaje' : lang === 'fr' ? 'Alertes de Voyage' : lang === 'pt' ? 'Alertas de Viagem' : 'Travel Alerts',
  documents: lang === 'es' ? 'Alertas de Documentos' : lang === 'fr' ? 'Alertes de Documents' : lang === 'pt' ? 'Alertas de Documentos' : 'Documents Alerts',
  promotions: lang === 'es' ? 'Alertas de Promociones' : lang === 'fr' ? 'Alertes de Promotions' : lang === 'pt' ? 'Alertas de Promoções' : 'Promotions Alerts',
  languageSelection: lang === 'es' ? 'Selección de Idioma' : lang === 'fr' ? 'Sélection de la Langue' : lang === 'pt' ? 'Seleção de Idioma' : 'Language Selection',
  privacy: lang === 'es' ? 'Privacidad y Gestión del Consentimiento' : lang === 'fr' ? 'Gestion de la Confidentialité et du Consentement' : lang === 'pt' ? 'Privacidade e Gerenciamento de Consentimento' : 'Privacy & Consent Management',
  shareData: lang === 'es' ? 'Doy mi consentimiento para compartir mis datos médicos con los proveedores asignados' : lang === 'fr' ? 'Je consens au partage de mes données médicales avec les prestataires désignés' : lang === 'pt' ? 'Consinto em compartilhar meus dados médicos com provedores designados' : 'I consent to sharing my medical data with assigned providers',
  communications: lang === 'es' ? 'Doy mi consentimiento para recibir comunicaciones de mi equipo de cuidado' : lang === 'fr' ? 'Je consens à recevoir des communications de mon équipe de soins' : lang === 'pt' ? 'Consinto em receber comunicações de minha equipe de cuidados' : 'I consent to receiving communications from my care team',
  terms: lang === 'es' ? 'Acepto los Términos de Servicio y la Política de Privacidad' : lang === 'fr' ? 'J\'accepte les Conditions de Service et la Politique de Confidentialité' : lang === 'pt' ? 'Concordo com os Termos de Serviço e a Política de Privacidade' : 'I agree to the Terms of Service and Privacy Policy',
  safeTEducational: lang === 'es' ? 'Reconozco que SAFE-T 4LIFE™ es un sistema de apoyo educativo solamente' : lang === 'fr' ? 'Je reconnais que SAFE-T 4LIFE™ est un système de support éducatif uniquement' : lang === 'pt' ? 'Reconheço que SAFE-T 4LIFE™ é um sistema de suporte educacional apenas' : 'I acknowledge SAFE-T 4LIFE™ is an educational support system only',
  saveSettings: lang === 'es' ? 'Guardar Configuración' : lang === 'fr' ? 'Enregistrer les Paramètres' : lang === 'pt' ? 'Salvar Configurações' : 'Save Settings',
  saved: lang === 'es' ? '¡Guardado!' : lang === 'fr' ? 'Enregistré !' : lang === 'pt' ? 'Salvo!' : 'Saved!',
});

export default function SettingsModule() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [appLanguage, setAppLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en');
  const [language, setLanguage] = useState('English');
  const [notifications, setNotifications] = useState({
    appointments: true, medications: true, travel: true, documents: true, promotions: false,
  });
  const [mfa, setMfa] = useState(false);
  const [consents, setConsents] = useState({
    shareData: false,
    communications: false,
    terms: false,
    safeTEducational: false,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          setFullName(user.full_name || '');
          setEmail(user.email || '');
          setPhone(user.phone || '');
        }
      } catch (err) {
        console.error('Failed to load user data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setAppLanguage(event.detail.language);
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const toggleNotif = (key) => setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleConsent = (key) => setConsents(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    try {
      await base44.auth.updateMe({
        full_name: fullName,
        phone,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const labels = getLabels(appLanguage);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{labels.settings}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{labels.manageAccount}</p>
      </div>

      {/* Account */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-700" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">{labels.account}</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">{labels.fullName}</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">{labels.email}</label>
            <input
              value={email}
              disabled
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-500 bg-slate-50 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">{labels.phone}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">{labels.accountType}</label>
            <input
              value={labels.patient}
              disabled
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-500 bg-slate-50 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Lock className="w-5 h-5 text-emerald-700" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">{labels.security}</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{labels.mfa}</p>
              <p className="text-xs text-slate-400 mt-0.5">{labels.mfaDesc}</p>
            </div>
            <button
              onClick={() => setMfa(!mfa)}
              className={`w-12 h-6 rounded-full transition-all ${mfa ? 'bg-emerald-600' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${mfa ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <button className="w-full text-left bg-slate-50 hover:bg-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 font-medium transition-colors">
            {labels.changePassword} →
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">{labels.notifications}</h3>
        </div>
        <div className="space-y-2">
          {[
            { key: 'appointments', label: labels.appointments },
            { key: 'medications', label: labels.medications },
            { key: 'travel', label: labels.travel },
            { key: 'documents', label: labels.documents },
            { key: 'promotions', label: labels.promotions },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-sm text-slate-700 font-medium">{label}</p>
              <button
                onClick={() => toggleNotif(key)}
                className={`w-10 h-5 rounded-full transition-all ${notifications[key] ? 'bg-emerald-600' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${notifications[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              </div>
              ))}
        </div>
      </div>

      {/* Language */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
            <Globe className="w-5 h-5 text-sky-700" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">{labels.languageSelection}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { lang: 'en', label: 'English' },
            { lang: 'es', label: 'Español' },
            { lang: 'fr', label: 'Français' },
            { lang: 'pt', label: 'Português' },
          ].map(({ lang, label }) => (
            <button
              key={lang}
              onClick={() => {
                localStorage.setItem('appLanguage', lang);
                setAppLanguage(lang);
                window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: lang } }));
              }}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all
                ${appLanguage === lang ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Privacy & Consent */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <Eye className="w-5 h-5 text-violet-700" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">{labels.privacy}</h3>
        </div>
        <div className="space-y-2">
          <label className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100">
            <input 
              type="checkbox" 
              checked={consents.shareData}
              onChange={() => toggleConsent('shareData')}
              className="mt-0.5 rounded" 
            />
            <span className="text-xs text-slate-700">{labels.shareData}</span>
          </label>
          <label className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100">
            <input 
              type="checkbox" 
              checked={consents.communications}
              onChange={() => toggleConsent('communications')}
              className="mt-0.5 rounded" 
            />
            <span className="text-xs text-slate-700">{labels.communications}</span>
          </label>
          <label className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100">
            <input 
              type="checkbox" 
              checked={consents.terms}
              onChange={() => toggleConsent('terms')}
              className="mt-0.5 rounded" 
            />
            <span className="text-xs text-slate-700">{labels.terms}</span>
          </label>
          <label className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100">
            <input 
              type="checkbox" 
              checked={consents.safeTEducational}
              onChange={() => toggleConsent('safeTEducational')}
              className="mt-0.5 rounded" 
            />
            <span className="text-xs text-slate-700">{labels.safeTEducational}</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-8"
          onClick={handleSave}
          disabled={loading}
        >
          {saved ? <><CheckCircle2 className="w-4 h-4 mr-2" /> {labels.saved}</> : labels.saveSettings}
        </Button>
      </div>
    </div>
  );
}