import React from 'react';
import { Shield, WifiOff, Smartphone, CheckCircle, AlertTriangle, Lock, Key } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OfflineVaultGuide() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-900/50 to-blue-900/50 border border-emerald-700/50 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-emerald-700/50 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Offline Vault Access Guide</h2>
            <p className="text-sm text-emerald-200">Access your documents anytime, anywhere — no internet required</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-emerald-950/50 border border-emerald-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-emerald-100">How It Works</h3>
            </div>
            <ol className="space-y-2 text-xs text-emerald-200">
              <li className="flex gap-2">
                <span className="font-bold text-emerald-400">1.</span>
                <span>Set up your 6-digit Emergency PIN while online (works offline too)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-emerald-400">2.</span>
                <span>Your PIN is saved using PBKDF2-SHA256 encryption on this device only</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-emerald-400">3.</span>
                <span>Go to /emergency and select "Offline Vault Access"</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-emerald-400">4.</span>
                <span>Enter your email and PIN — vault opens instantly, no network needed</span>
              </li>
            </ol>
          </div>

          <div className="bg-blue-950/50 border border-blue-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <WifiOff className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-blue-100">When to Use</h3>
            </div>
            <ul className="space-y-2 text-xs text-blue-200">
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>Airplane mode during flights</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>Lost phone / new device (use any device)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>Network outages or emergencies</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>Border control / police checkpoints</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>Medical emergencies (show passport info)</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
        >
          <div className="w-10 h-10 bg-amber-900/50 rounded-lg flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-2">🔒 Secure by Design</h3>
          <p className="text-xs text-slate-300">
            Your PIN is hashed using PBKDF2 with 600,000 iterations — the same standard used by password managers. Even if someone steals your device, they can't extract your PIN.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
        >
          <div className="w-10 h-10 bg-emerald-900/50 rounded-lg flex items-center justify-center mb-3">
            <Smartphone className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-2">📱 Device-Specific</h3>
          <p className="text-xs text-slate-300">
            Your PIN is stored only on the device you set it up on. Each new device needs its own PIN setup. This keeps your vault secure even if one device is compromised.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
        >
          <div className="w-10 h-10 bg-blue-900/50 rounded-lg flex items-center justify-center mb-3">
            <Key className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-2">🔑 No Account Needed</h3>
          <p className="text-xs text-slate-300">
            Once set up, you don't need to be logged into the app. Just go to /emergency, enter your email and PIN, and access your vault instantly.
          </p>
        </motion.div>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-200 mb-1">⚠️ Important Notes</h3>
            <ul className="space-y-1 text-xs text-amber-300">
              <li>• You must open "My Vault" at least once while online to cache your documents for offline use</li>
              <li>• Use the "Prepare All Documents for Offline" button in My Vault before traveling</li>
              <li>• If you clear your browser data, you'll need to set up your PIN again</li>
              <li>• Documents are cached in encrypted form — even local storage can't read them without your PIN</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="text-center">
        <a
          href="/emergency"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition-all"
        >
          <Shield className="w-5 h-5" />
          Go to Emergency Access
        </a>
      </div>
    </div>
  );
}