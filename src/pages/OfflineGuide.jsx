import React from 'react';
import { Link } from 'react-router-dom';
import { WifiOff, AlertTriangle, Shield, Smartphone, MessageSquare, Download, ArrowLeft, CheckCircle } from 'lucide-react';

const Step = ({ number, title, children }) => (
  <div className="flex gap-4">
    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mt-0.5">{number}</div>
    <div>
      <p className="text-white font-semibold mb-1">{title}</p>
      <div className="text-slate-400 text-sm leading-relaxed">{children}</div>
    </div>
  </div>
);

const Section = ({ icon: Icon, color, title, children }) => (
  <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
    <div className={`flex items-center gap-3 mb-4`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-white font-semibold text-lg">{title}</h2>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

export default function OfflineGuide() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-900/50 border border-blue-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">No Signal? No Problem.</h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Everything you need to stay safe and access your documents even when you have no internet connection.
          </p>
        </div>

        <div className="space-y-5">

          {/* Install the app */}
          <Section icon={Download} color="bg-emerald-700/50 text-emerald-300" title="Step 1 — Install the App on Your Phone">
            <p className="text-slate-400 text-sm">This is the most important step. Installing the app on your home screen lets it work offline.</p>
            <div className="space-y-3">
              {(isIOS || (!isIOS && !isAndroid)) && (
                <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700">
                  <p className="text-white text-sm font-semibold mb-1">📱 iPhone / iPad (Safari)</p>
                  <ol className="text-slate-400 text-sm space-y-1 list-decimal list-inside">
                    <li>Open this page in <strong className="text-white">Safari</strong></li>
                    <li>Tap the <strong className="text-white">Share ⬆</strong> button at the bottom</li>
                    <li>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></li>
                    <li>Tap <strong className="text-white">Add</strong> — done!</li>
                  </ol>
                </div>
              )}
              {(isAndroid || (!isIOS && !isAndroid)) && (
                <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700">
                  <p className="text-white text-sm font-semibold mb-1">🤖 Android (Chrome)</p>
                  <ol className="text-slate-400 text-sm space-y-1 list-decimal list-inside">
                    <li>Open this page in <strong className="text-white">Chrome</strong></li>
                    <li>Tap the <strong className="text-white">⋮ menu</strong> (top right)</li>
                    <li>Tap <strong className="text-white">"Add to Home screen"</strong></li>
                    <li>Tap <strong className="text-white">Add</strong> — done!</li>
                  </ol>
                </div>
              )}
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle className="w-4 h-4" />
                Once installed, the app loads instantly — even in Airplane Mode.
              </div>
            </div>
          </Section>

          {/* Access SOS */}
          <Section icon={AlertTriangle} color="bg-red-700/50 text-red-300" title="Accessing SOS Without Signal">
            <Step number="1" title="Open the installed app">
              Tap the Morales Medical icon on your home screen. It loads from your device — no internet needed.
            </Step>
            <Step number="2" title='Tap the red SOS button'>
              A pulsing red <strong className="text-white">Emergency SOS</strong> button is always visible in the bottom-left corner of every screen. Tap it to reach the Emergency Hub.
            </Step>
            <Step number="3" title="Use offline emergency options">
              The Emergency Hub works without internet and gives you:
              <ul className="mt-2 space-y-1 list-disc list-inside text-slate-400">
                <li>Emergency PIN vault access</li>
                <li>SMS shortcodes to alert your guardian</li>
                <li>Local emergency numbers</li>
                <li>Your cached passport & documents</li>
              </ul>
            </Step>
          </Section>

          {/* Access Documents Offline */}
          <Section icon={Shield} color="bg-amber-700/50 text-amber-300" title="Access Your Documents Offline">
            <Step number="1" title="Set up your Emergency PIN before you travel">
              Go to <Link to="/emergency" className="text-blue-400 underline">Emergency Access</Link> → set a 4-digit PIN. This lets you unlock your vault without internet.
            </Step>
            <Step number="2" title="Open Emergency Access when offline">
              Navigate to <strong className="text-white">/emergency-access</strong> in the app. Enter your email and PIN — your passport, visas, and bookings will be displayed from the local cache.
            </Step>
          </Section>

          {/* SMS Backup */}
          <Section icon={MessageSquare} color="bg-purple-700/50 text-purple-300" title="SMS Backup — No App Needed">
            <p className="text-slate-400 text-sm">If you have no data but have cellular signal, SMS shortcodes still work:</p>
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700 space-y-3">
              <div className="flex gap-3 items-start">
                <code className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs font-mono shrink-0">SOS</code>
                <p className="text-slate-400 text-sm">Send to your Morales number to trigger an emergency alert to your guardian</p>
              </div>
              <div className="flex gap-3 items-start">
                <code className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs font-mono shrink-0">CHECKIN ok</code>
                <p className="text-slate-400 text-sm">Confirms your Solo Traveler safety check-in via SMS</p>
              </div>
              <div className="flex gap-3 items-start">
                <code className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs font-mono shrink-0">DRIVER [code]</code>
                <p className="text-slate-400 text-sm">Verify your assigned driver via SMS handshake</p>
              </div>
            </div>
            <p className="text-slate-500 text-xs">Your Morales SMS number is provided in your onboarding email and on the Emergency Hub page.</p>
          </Section>

          {/* Quick links */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5">
            <p className="text-white font-semibold mb-3">Quick Links</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '🆘 Emergency Hub', to: '/emergency' },
                { label: '🔐 Emergency Access', to: '/emergency-access' },
                { label: '📂 Offline Mode', to: '/offline' },
                { label: '🛂 My Vault', to: '/passport-vault' },
              ].map(({ label, to }) => (
                <Link key={to} to={to}
                  className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white text-center transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>

        </div>

        <p className="text-center text-xs text-slate-600 mt-8 pb-4">
          Morales Medical · Emergency Infrastructure · No signal required after installation
        </p>
      </div>
    </div>
  );
}