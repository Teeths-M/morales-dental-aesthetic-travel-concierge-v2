import React from 'react';
import { ArrowLeft, WifiOff, Smartphone, FileText, MessageSquare, QrCode, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    number: '1',
    title: 'Before You Travel — While on Wi-Fi',
    color: 'bg-emerald-50 border-emerald-200',
    titleColor: 'text-emerald-800',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    items: [
      'Open the app and go to your Dashboard.',
      'Tap "Passport Vault" and open each document one by one — this saves them to your phone.',
      'Visit the "Offline Mode" page so your phone downloads the emergency tools.',
      'In Safari, tap the Share button (square with arrow) → "Add to Home Screen" for best offline access.',
    ],
  },
  {
    number: '2',
    title: 'When You Have No Signal',
    color: 'bg-blue-50 border-blue-200',
    titleColor: 'text-blue-800',
    icon: WifiOff,
    iconColor: 'text-blue-600',
    items: [
      'Open the app from your Home Screen icon (not Safari directly).',
      'Navigate to "Offline Mode" from the menu.',
      'Your saved documents and emergency tools will load without internet.',
      'The green/amber dot on screen shows your current connection status.',
    ],
  },
  {
    number: '3',
    title: 'SMS Shortcodes — Works on Any Network',
    color: 'bg-violet-50 border-violet-200',
    titleColor: 'text-violet-800',
    icon: MessageSquare,
    iconColor: 'text-violet-600',
    items: [
      'Even with no data, SMS still works on most mobile networks.',
      'Open your phone\'s regular text messaging app.',
      'Text CHECKIN OK [your case ID] to confirm you are safe.',
      'Text SOS [your case ID] to trigger an emergency escalation.',
      'Your coordinator number is shown on the Offline Mode page.',
    ],
  },
  {
    number: '4',
    title: 'Emergency PIN — No Internet Needed',
    color: 'bg-amber-50 border-amber-200',
    titleColor: 'text-amber-800',
    icon: Smartphone,
    iconColor: 'text-amber-600',
    items: [
      'Go to Offline Mode → tap the "Emergency PIN" tab.',
      'Generate your PIN while you still have internet.',
      'Write it down or screenshot it — keep it safe.',
      'Give this PIN to any Morales coordinator or kiosk to identify yourself without your phone.',
    ],
  },
  {
    number: '5',
    title: 'Offline Documents — Your Vault',
    color: 'bg-slate-50 border-slate-200',
    titleColor: 'text-slate-800',
    icon: FileText,
    iconColor: 'text-slate-600',
    items: [
      'Go to Offline Mode → tap the "Offline Docs" tab.',
      'Any document you opened before losing signal is cached here.',
      'Your passport, medical records, and travel itinerary are available.',
      'Documents are encrypted — only you can view them.',
    ],
  },
];

const tips = [
  { icon: '📵', text: 'Turn off Airplane Mode before you travel so the app can fully download your data.' },
  { icon: '🔒', text: 'Never use Private/Incognito mode — it prevents the app from saving anything offline.' },
  { icon: '🔋', text: 'Keep your phone charged. Offline mode only works if your phone is on.' },
  { icon: '📝', text: 'Write down your Emergency PIN and Case ID on paper as a backup.' },
];

export default function OfflineGuide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-blue-900/50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <WifiOff className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Traveler Guide</p>
              <h1 className="text-2xl font-bold text-white">No Signal? No Problem.</h1>
            </div>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Follow these simple steps to stay safe and connected even when you have no internet.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Steps */}
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.number} className={`rounded-2xl border p-5 ${step.color}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-sm font-black text-slate-700">{step.number}</span>
                </div>
                <Icon className={`w-4 h-4 ${step.iconColor} flex-shrink-0`} />
                <h2 className={`font-bold text-sm ${step.titleColor}`}>{step.title}</h2>
              </div>
              <ul className="space-y-2.5">
                {step.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 flex-shrink-0 opacity-50" />
                    <p className="text-sm text-slate-700 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {/* Tips */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Important Reminders</h3>
          </div>
          <div className="space-y-3">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-base flex-shrink-0">{tip.icon}</span>
                <p className="text-sm text-slate-300 leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/offline')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl text-sm transition-colors">
          Open Offline Mode Now →
        </button>

        <p className="text-center text-xs text-slate-500 pb-4">
          Access this guide anytime at <span className="text-slate-300 font-mono">/offline-guide</span>
        </p>
      </div>
    </div>
  );
}