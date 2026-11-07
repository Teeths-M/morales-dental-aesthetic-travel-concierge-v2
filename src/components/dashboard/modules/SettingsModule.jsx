import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { changeLanguage } from '@/i18n';
import { Bell, Lock, Globe, User, Eye, CheckCircle2, Brain, Trash2, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import RecentAccountActivity from '@/components/dashboard/RecentAccountActivity';
import { friendlyError } from '@/lib/friendlyError';
import { openChannelConnect } from '@/lib/mcareChannels';
import ThemePreferenceControl from '@/components/mobile/ThemePreferenceControl';
import PhoneLockCard from '@/components/security/PhoneLockCard';
import { clearPrivateDeviceData } from '@/lib/deviceDataCleanup';
import { callWithFaceCheck, phoneLockErrorMessage } from '@/lib/phoneLock';

const _languages = ['English', 'Español', 'Français', 'Português'];

// Same rule as the server's check in updateMyProfile, so the page can say
// what's wrong before sending. A number may start with "(" ("(868) 555-1234").
const PHONE_PATTERN = /^[+\d(][\d\s().-]{0,30}$/;

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
  signIn: lang === 'es' ? 'Cómo inicias sesión' : lang === 'fr' ? 'Comment vous vous connectez' : lang === 'pt' ? 'Como você entra' : 'How you sign in',
  signInDesc: lang === 'es' ? 'Inicias sesión con tu cuenta de Google. Si usas tu número de teléfono, antes te enviamos también un código de un solo uso a ese teléfono. M-Care nunca guarda una contraseña tuya, así que tu contraseña y la verificación en dos pasos las gestiona Google.' : lang === 'fr' ? 'Vous vous connectez avec votre compte Google. Si vous utilisez votre numéro de téléphone, nous envoyons aussi d\'abord un code à usage unique à ce téléphone. M-Care ne conserve jamais de mot de passe pour vous : votre mot de passe et la validation en deux étapes sont gérés par Google.' : lang === 'pt' ? 'Você entra com sua conta do Google. Se usar seu número de telefone, também enviamos antes um código de uso único para esse telefone. A M-Care nunca guarda uma senha sua, então sua senha e a verificação em duas etapas são gerenciadas pelo Google.' : 'You sign in with your Google account. If you use your phone number, we also send a one-time code to that phone first. M-Care never stores a password for you, so your password and two-step verification are managed by Google.',
  manageGoogleSecurity: lang === 'es' ? 'Administrar la seguridad de tu cuenta de Google' : lang === 'fr' ? 'Gérer la sécurité de votre compte Google' : lang === 'pt' ? 'Gerenciar a segurança da sua conta do Google' : 'Manage your Google account security',
  phoneFormat: lang === 'es' ? 'Usa solo dígitos, espacios y + ( ) - en tu número de teléfono.' : lang === 'fr' ? 'Utilisez uniquement des chiffres, des espaces et + ( ) - dans votre numéro de téléphone.' : lang === 'pt' ? 'Use apenas dígitos, espaços e + ( ) - no seu número de telefone.' : 'Use only digits, spaces, and + ( ) - in your phone number.',
  notifications: lang === 'es' ? 'Preferencias de Notificación' : lang === 'fr' ? 'Préférences de Notification' : lang === 'pt' ? 'Preferências de Notificação' : 'Notification Preferences',
  notificationsDesc: lang === 'es' ? 'Los mensajes sobre tus citas, medicamentos, viaje y documentos forman parte de mantener seguro tu viaje, por eso siempre están activados. Todavía no puedes elegir cuáles recibes.' : lang === 'fr' ? 'Les messages sur vos rendez-vous, vos médicaments, votre voyage et vos documents font partie de la sécurité de votre séjour : ils sont donc toujours activés. Il n\'est pas encore possible de choisir lesquels vous recevez.' : lang === 'pt' ? 'As mensagens sobre suas consultas, medicamentos, viagem e documentos fazem parte de manter sua viagem segura, por isso estão sempre ativadas. Ainda não é possível escolher quais você recebe.' : 'Messages about your appointments, medication, travel, and documents are part of keeping your trip safe, so they\'re always on. Choosing which ones you get isn\'t available yet.',
  languageSelection: lang === 'es' ? 'Selección de Idioma' : lang === 'fr' ? 'Sélection de la Langue' : lang === 'pt' ? 'Seleção de Idioma' : 'Language Selection',
  privacy: lang === 'es' ? 'Privacidad y Gestión del Consentimiento' : lang === 'fr' ? 'Gestion de la Confidentialité et du Consentement' : lang === 'pt' ? 'Privacidade e Gerenciamento de Consentimento' : 'Privacy & Consent Management',
  privacyDesc: lang === 'es' ? 'Aceptas compartir tu información médica cada vez que reservas, y ese consentimiento queda guardado con la reserva. Para retirarlo, o para preguntar qué datos tenemos sobre ti, pide a M-Care que te ponga en contacto con nuestro equipo de atención. También puedes eliminar tu cuenta al final de esta página.' : lang === 'fr' ? 'Vous acceptez de partager vos informations médicales à chaque réservation, et cet accord est enregistré avec la réservation. Pour le retirer, ou pour savoir quelles données nous détenons sur vous, demandez à M-Care de vous mettre en relation avec notre équipe de soins. Vous pouvez aussi supprimer votre compte en bas de cette page.' : lang === 'pt' ? 'Você concorda em compartilhar suas informações médicas a cada reserva, e esse consentimento fica salvo com a reserva. Para retirá-lo, ou para perguntar quais dados temos sobre você, peça à M-Care que coloque você em contato com nossa equipe de atendimento. Você também pode excluir sua conta no fim desta página.' : 'You agree to share your medical information each time you book, and that agreement is saved with the booking. To withdraw it, or to ask what we hold about you, ask M-Care to connect you with our care team. You can also delete your account at the bottom of this page.',
  saveSettings: lang === 'es' ? 'Guardar Configuración' : lang === 'fr' ? 'Enregistrer les Paramètres' : lang === 'pt' ? 'Salvar Configurações' : 'Save Settings',
  saved: lang === 'es' ? '¡Guardado!' : lang === 'fr' ? 'Enregistré !' : lang === 'pt' ? 'Salvo!' : 'Saved!',
});

function ResetSafetyProfileCard({ onReset, isActiveJourney = false }) {
  const [confirm,   setConfirm]   = useState(false);
  const [resetting, setResetting] = useState(false);
  const [done,      setDone]      = useState(false);

  async function handleReset() {
    if (!confirm) { setConfirm(true); return; }
    setResetting(true);
    await onReset();
    setResetting(false);
    setDone(true);
    setConfirm(false);
    setTimeout(() => setDone(false), 4000);
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
          <Brain className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">MedGuard Safety Profile</h3>
          <p className="text-xs text-slate-500">Behavioral fingerprint built over your first 72 hours</p>
        </div>
        {done && (
          <span className="ml-auto text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Reset complete
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        MedGuard learns your unique patterns — when you sleep, when you charge, how often you open the app.
        Reset your profile to start fresh. MedGuard will rebuild it over your next 72 hours of activity.
      </p>

      {isActiveJourney && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <span className="text-base flex-shrink-0">⚠️</span>
          <p className="text-xs text-red-700 leading-relaxed">
            <strong>You are on an active journey.</strong> Resetting now means MedGuard needs 72 hours to relearn your patterns — during that window, anomaly detection will be less accurate and nudges may not fire on time.
          </p>
        </div>
      )}

      {!confirm ? (
        <button
          onClick={handleReset}
          className="text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors"
        >
          Reset my safety profile →
        </button>
      ) : (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-xs text-red-600 flex-1">
            This clears your fingerprint. MedGuard re-learns from scratch. Confirm?
          </p>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="text-xs font-bold text-red-600 hover:text-red-700 flex-shrink-0"
          >
            {resetting ? 'Resetting…' : 'Yes, reset'}
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="text-xs text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * ConnectMCareChannelsCard — Base44's own native "connect your number to
 * this agent" flow (getWhatsAppConnectURL/getTelegramConnectURL), the SAME
 * m_care agent already live in the app. No new backend messaging code —
 * this is purely a link into a platform feature. getWhatsAppConnectURL/
 * getTelegramConnectURL are synchronous URL builders (confirmed by reading
 * the real SDK source), so no loading state is needed before opening them.
 */
function ConnectMCareChannelsCard() {
  // Links come from mcareChannels.js — the same builder the dashboard card
  // uses, so the two can never point at different agents or open differently.
  const openChannel = (channel) => {
    try {
      openChannelConnect(channel);
    } catch (err) {
      toast.error("Couldn't open that right now — please try again.");
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Talk to M-Care by WhatsApp or Telegram</h3>
          <p className="text-xs text-slate-500">Connect once — no need to open the app to keep talking to M-Care</p>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        Connect your number and M-Care becomes reachable right from your messages — the exact
        same assistant, same case, no separate login.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => openChannel('whatsapp')}
          className="text-xs font-semibold"
        >
          <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Connect WhatsApp
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => openChannel('telegram')}
          className="text-xs font-semibold"
        >
          <Send className="w-3.5 h-3.5 mr-1.5" /> Connect Telegram
        </Button>
      </div>
    </div>
  );
}

/**
 * The account's most destructive, irreversible action — placed last on the
 * page, below the reversible 72h safety-profile reset. Confirmation requires
 * re-typing the account's own email rather than a "type DELETE" string:
 * this app ships 10 languages, and re-typing your own email is
 * language-agnostic while still confirming the person acting genuinely knows
 * the account's identity.
 */
function DeleteMyAccountCard({ email }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [step, setStep] = useState('idle'); // idle | confirm | deleting
  const [confirmEmail, setConfirmEmail] = useState('');
  const [error, setError] = useState('');

  const canConfirm = !!email && confirmEmail.trim().toLowerCase() === email.toLowerCase();

  async function handleDelete() {
    setError('');
    setStep('deleting');
    try {
      const res = await base44.functions.invoke('deleteMyAccount', {
        confirm: true,
        confirm_email: confirmEmail.trim(),
      });
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Deletion failed.');
      }
      // The account is gone, so nothing private of it stays on this phone either.
      clearPrivateDeviceData();
      await logout(false);
      navigate('/');
    } catch (err) {
      setError(friendlyError(err, 'Your account could not be deleted. Nothing changed — please try again.', 'DeleteMyAccountCard'));
      setStep('confirm');
    }
  }

  return (
    <div className="bg-white border border-red-100 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Delete My Account</h3>
          <p className="text-xs text-slate-500">Permanently remove your personal data from M-Care</p>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        This immediately removes your name, contact details, and documents from our systems.
        Case and payment records required for financial/medical record-keeping are retained
        with your identity anonymized around them. A signed legal agreement (a waiver, or an
        informed-consent record) is kept as-is, including the name on it, for legal and audit
        compliance — that's what it exists to prove. This happens right away and cannot be undone.
      </p>

      {step === 'idle' && (
        <button
          onClick={() => setStep('confirm')}
          className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
        >
          Delete my account →
        </button>
      )}

      {(step === 'confirm' || step === 'deleting') && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-4 space-y-3">
          <p className="text-xs text-red-700 leading-relaxed">
            To confirm, type your account email (<strong>{email || '…'}</strong>) below. This is instant and cannot be reversed.
          </p>
          <input
            type="email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={email}
            disabled={step === 'deleting'}
            className="w-full text-xs px-3 py-2 rounded-lg border border-red-200 focus:outline-none focus:ring-1 focus:ring-red-400"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={!canConfirm || step === 'deleting'}
              className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {step === 'deleting' ? 'Deleting…' : 'Yes, permanently delete my account'}
            </button>
            <button
              onClick={() => { setStep('idle'); setConfirmEmail(''); setError(''); }}
              disabled={step === 'deleting'}
              className="text-xs text-slate-400 hover:text-slate-600 flex-shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsModule({ onResetSafetyProfile, isActiveJourney = false }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [appLanguage, setAppLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en');
  const [_language, _setLanguage] = useState('English');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  // Bumped after a save, so the activity list shows the change straight away.
  const [activityRefresh, setActivityRefresh] = useState(0);

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

  const labels = getLabels(appLanguage);

  const handleSave = async () => {
    if (phone && !PHONE_PATTERN.test(phone.trim())) {
      toast.error(labels.phoneFormat);
      return;
    }
    setSaving(true);
    try {
      // The server makes the same updateMe() call as the signed-in user, and
      // records the change in the audit log. See updateMyProfile. With the Face
      // ID lock on, a new phone number asks for Face ID or a fingerprint first.
      await callWithFaceCheck('change_phone', (step_up) => base44.functions.invoke('updateMyProfile', {
        full_name: fullName, phone: phone.trim(), ...(step_up ? { step_up } : {}),
      }));
      setSaved(true);
      setActivityRefresh((n) => n + 1);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error(phoneLockErrorMessage(err, 'Failed to save settings. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{labels.settings}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{labels.manageAccount}</p>
      </div>

      {/* Appearance — day/night, following local time of the trip or your own
          choice. Placed first because it changes what every screen below looks
          like, so it should be findable without scrolling. */}
      <ThemePreferenceControl />

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
        <div className="bg-slate-50 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">{labels.signIn}</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{labels.signInDesc}</p>
          <a
            href="https://myaccount.google.com/security"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs font-semibold text-emerald-700 hover:underline"
          >
            {labels.manageGoogleSecurity} →
          </a>
        </div>
      </div>

      {/* The Face ID / fingerprint lock (Phone Lock) */}
      <PhoneLockCard />

      {/* Recent account activity, from the account owner's own audit-log entries */}
      <RecentAccountActivity lang={appLanguage} refreshKey={activityRefresh} />

      {/* Notifications */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">{labels.notifications}</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-xl px-4 py-3">{labels.notificationsDesc}</p>
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
                setAppLanguage(lang);
                changeLanguage(lang); // persists + fires the languageChange bridge
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
        <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-xl px-4 py-3">{labels.privacyDesc}</p>
      </div>

      {/* ── Connect M-Care via WhatsApp/Telegram (Base44's native agent-connect flow) ── */}
      <ConnectMCareChannelsCard />

      {/* ── MedGuard Safety Profile Reset ── */}
      {onResetSafetyProfile && (
        <ResetSafetyProfileCard onReset={onResetSafetyProfile} isActiveJourney={isActiveJourney} />
      )}

      {/* ── Delete My Account — most destructive action, last on the page ── */}
      <DeleteMyAccountCard email={email} />

      <div className="flex justify-end">
        <Button
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-8"
          onClick={handleSave}
          disabled={loading || saving}
        >
          {saving ? 'Saving...' : saved ? <><CheckCircle2 className="w-4 h-4 mr-2" /> {labels.saved}</> : labels.saveSettings}
        </Button>
      </div>
    </div>
  );
}