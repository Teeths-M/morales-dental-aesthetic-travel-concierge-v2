import React, { useState, useEffect } from 'react';
import { Settings, Bell, Lock, Globe, Shield, User, Eye, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const languages = ['English', 'Español', 'Français', 'Português'];

export default function SettingsModule() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Settings</h2>
        <p className="text-xs text-slate-400 mt-0.5">Manage your account, privacy, and preferences</p>
      </div>

      {/* Account */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-700" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Account Management</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Email Address</label>
            <input
              value={email}
              disabled
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-500 bg-slate-50 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Account Type</label>
            <input
              value="Patient / Client"
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
          <h3 className="font-semibold text-slate-800 text-sm">Security Settings</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Two-Factor Authentication (MFA)</p>
              <p className="text-xs text-slate-400 mt-0.5">Add an extra layer of security to your account</p>
            </div>
            <button
              onClick={() => setMfa(!mfa)}
              className={`w-12 h-6 rounded-full transition-all ${mfa ? 'bg-emerald-600' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${mfa ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <button className="w-full text-left bg-slate-50 hover:bg-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 font-medium transition-colors">
            Change Password →
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Notification Preferences</h3>
        </div>
        <div className="space-y-2">
          {Object.entries(notifications).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-sm text-slate-700 capitalize font-medium">{key.replace(/([A-Z])/g, ' $1')} Alerts</p>
              <button
                onClick={() => toggleNotif(key)}
                className={`w-10 h-5 rounded-full transition-all ${val ? 'bg-emerald-600' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${val ? 'translate-x-5' : 'translate-x-0.5'}`} />
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
          <h3 className="font-semibold text-slate-800 text-sm">Language Selection</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {languages.map(l => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all
                ${language === l ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Privacy & Consent */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <Eye className="w-5 h-5 text-violet-700" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Privacy & Consent Management</h3>
        </div>
        <div className="space-y-2">
          <label className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100">
            <input 
              type="checkbox" 
              checked={consents.shareData}
              onChange={() => toggleConsent('shareData')}
              className="mt-0.5 rounded" 
            />
            <span className="text-xs text-slate-700">I consent to sharing my medical data with assigned providers</span>
          </label>
          <label className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100">
            <input 
              type="checkbox" 
              checked={consents.communications}
              onChange={() => toggleConsent('communications')}
              className="mt-0.5 rounded" 
            />
            <span className="text-xs text-slate-700">I consent to receiving communications from my care team</span>
          </label>
          <label className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100">
            <input 
              type="checkbox" 
              checked={consents.terms}
              onChange={() => toggleConsent('terms')}
              className="mt-0.5 rounded" 
            />
            <span className="text-xs text-slate-700">I agree to the Terms of Service and Privacy Policy</span>
          </label>
          <label className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100">
            <input 
              type="checkbox" 
              checked={consents.safeTEducational}
              onChange={() => toggleConsent('safeTEducational')}
              className="mt-0.5 rounded" 
            />
            <span className="text-xs text-slate-700">I acknowledge SAFE-T 4LIFE™ is an educational support system only</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-8"
          onClick={handleSave}
          disabled={loading}
        >
          {saved ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved!</> : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}