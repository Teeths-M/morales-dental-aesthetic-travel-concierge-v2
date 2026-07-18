import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MODULES = [
  {
    id: 'welcome',
    title: 'Welcome to Morales Medical',
    icon: '🌍',
    description: 'Learn how your journey works, who your team is, and what to expect at every stage.',
    steps: [
      { title: 'Your Personal Concierge Team', content: 'You have a dedicated coordinator available 24/7 throughout your entire medical journey — from booking to recovery.' },
      { title: 'Your Digital Journey Passport', content: 'All your documents, appointments, and case updates are centralized in your secure dashboard.' },
      { title: 'The 7 Journey Stages', content: 'Consultation → Planning → Booking → Travel → Procedure → Recovery → Aftercare. We guide you through each one.' }
    ]
  },
  {
    id: 'emergency_crash_course',
    title: 'Emergency Survival Crash Course',
    icon: '🚨',
    description: 'Critical emergency protocols — know exactly what to do if something unexpected happens abroad.',
    steps: [
      { title: 'Emergency Numbers', content: 'Always save: your coordinator\'s direct line, your hotel address in local language, and the nearest hospital. These are pre-loaded in your dashboard.' },
      { title: 'The SOS Button', content: 'Your dashboard has a one-tap SOS button that instantly translates your emergency into the local language and sends your location to our response team.' },
      { title: 'Never Travel Alone', content: 'If you are flagged as requiring a companion, this is non-negotiable. Your safety protocol depends on it.' }
    ]
  },
  {
    id: 'preflight_sim',
    title: 'Pre-Flight Simulation',
    icon: '✈️',
    description: 'Walk through a simulated travel day so nothing surprises you on the real one.',
    steps: [
      { title: 'Airport Pickup Protocol', content: 'Your chauffeur will hold a sign with your name. Confirm the license plate matches what was sent to you. Never get into an unverified vehicle.' },
      { title: 'Hotel Check-In', content: 'Your hotel is pre-booked and confirmed. Present your Morales welcome card at check-in — all arrangements are pre-paid.' },
      { title: 'Clinic Arrival Day', content: 'Your driver takes you directly to the clinic. A bilingual liaison will greet you and guide you through pre-operative preparation.' }
    ]
  },
  {
    id: 'nudge_setup',
    title: 'Set Your Reminder Preferences',
    icon: '🔔',
    description: 'Configure how we keep you informed and prepared throughout your journey.',
    isPreferences: true
  }
];

function ModuleStep({ step, onNext, isLast }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
      <p className="text-gray-600 leading-relaxed">{step.content}</p>
      <Button onClick={onNext} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
        {isLast ? 'Complete Module ✓' : 'Continue →'}
      </Button>
    </motion.div>
  );
}

function NudgePreferences({ prefs, onChange, onSave }) {
  return (
    <div className="space-y-4">
      {['email', 'push', 'sms'].map(ch => (
        <label key={ch} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
          <span className="font-medium capitalize text-gray-700">{ch === 'push' ? 'Push Notifications' : ch.toUpperCase()} Reminders</span>
          <input type="checkbox" checked={prefs[ch]} onChange={e => onChange({ ...prefs, [ch]: e.target.checked })}
            className="w-4 h-4 accent-emerald-600" />
        </label>
      ))}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">Reminder Frequency</p>
        {['daily', 'weekly', 'milestone_only'].map(f => (
          <label key={f} className="flex items-center gap-3 mb-2 cursor-pointer">
            <input type="radio" name="frequency" value={f} checked={prefs.frequency === f}
              onChange={() => onChange({ ...prefs, frequency: f })} className="accent-emerald-600" />
            <span className="capitalize text-gray-700">{f.replace('_', ' ')}</span>
          </label>
        ))}
      </div>
      <Button onClick={onSave} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
        Save Preferences & Complete ✓
      </Button>
    </div>
  );
}

export default function OnboardingEducation() {
  const [progress, setProgress] = useState(null);
  const [user, setUser] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [moduleStep, setModuleStep] = useState(0);
  const [nudgePrefs, setNudgePrefs] = useState({ email: true, push: true, sms: false, frequency: 'milestone_only' });
  const [_saving, setSaving] = useState(false);
  const { navigateToLogin } = useAuth();

  useEffect(() => {
    // /onboarding is a PUBLIC route, so a visitor with no session is expected
    // here. base44.auth.me() throws for them ("Authentication required to view
    // users"); unguarded, that surfaced as an uncaught rejection and left user
    // null while the page still rendered — so completing a module then hit
    // user.id on null and crashed the page.
    const load = async () => {
      const u = await base44.auth.me().catch(() => null);
      if (!u) return; // browse the modules signed-out; saving prompts for login
      setUser(u);
      const records = await base44.entities.OnboardingProgress
        .filter({ user_id: u.id })
        .catch(() => []);
      if (records[0]) setProgress(records[0]);
    };
    load();
  }, []);

  const completed = progress?.modules_completed || [];

  const saveModuleComplete = async (moduleId, extra = {}) => {
    // Signed-out visitors can read every module, but progress belongs to an
    // account. Send them to log in and back here, rather than throwing on
    // user.id — losing their place is friction; a crashed page is worse.
    if (!user) {
      navigateToLogin(window.location.href);
      return;
    }
    setSaving(true);
    const newCompleted = [...new Set([...completed, moduleId])];
    const allDone = MODULES.every(m => newCompleted.includes(m.id));
    const data = {
      user_id: user.id,
      user_email: user.email,
      role: user.role,
      modules_completed: newCompleted,
      preflight_simulation_passed: newCompleted.includes('preflight_sim'),
      emergency_course_completed: newCompleted.includes('emergency_crash_course'),
      onboarding_completed: allDone,
      completed_at: allDone ? new Date().toISOString() : null,
      ...extra
    };
    if (progress) {
      await base44.entities.OnboardingProgress.update(progress.id, data);
      setProgress({ ...progress, ...data });
    } else {
      const r = await base44.entities.OnboardingProgress.create(data);
      setProgress(r);
    }
    setActiveModule(null);
    setSaving(false);
  };

  const allCompleted = MODULES.every(m => completed.includes(m.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-4xl mb-3">🎓</div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Pre-Journey Education</h1>
          <p className="text-gray-500">Complete all modules before your procedure date.</p>
          {allCompleted && (
            <div className="mt-4 inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-semibold">
              <Trophy className="w-4 h-4" /> All modules completed!
            </div>
          )}
        </div>

        <div className="space-y-4">
          {MODULES.map((module, idx) => {
            const isDone = completed.includes(module.id);
            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${isDone ? 'border-emerald-200' : 'border-gray-100'}`}
                onClick={() => { if (!isDone) { setActiveModule(module); setModuleStep(0); } }}
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{module.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{module.title}</h3>
                      {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{module.description}</p>
                  </div>
                  {!isDone && <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                  {isDone && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Complete</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Module Modal */}
      <AnimatePresence>
        {activeModule && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{activeModule.icon}</span>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{activeModule.title}</h2>
                  {!activeModule.isPreferences && (
                    <p className="text-xs text-gray-400">Step {moduleStep + 1} of {activeModule.steps.length}</p>
                  )}
                </div>
              </div>

              {activeModule.isPreferences ? (
                <NudgePreferences
                  prefs={nudgePrefs}
                  onChange={setNudgePrefs}
                  onSave={() => saveModuleComplete(activeModule.id, { nudge_preferences: nudgePrefs, last_nudge_sent_at: null })}
                />
              ) : (
                <ModuleStep
                  step={activeModule.steps[moduleStep]}
                  onNext={() => {
                    if (moduleStep < activeModule.steps.length - 1) {
                      setModuleStep(moduleStep + 1);
                    } else {
                      saveModuleComplete(activeModule.id);
                    }
                  }}
                  isLast={moduleStep === activeModule.steps.length - 1}
                />
              )}

              <button onClick={() => setActiveModule(null)} className="mt-4 w-full text-gray-400 text-sm hover:text-gray-600">
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}