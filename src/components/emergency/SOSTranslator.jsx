import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Phone, Globe, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const URGENCY_COLORS = {
  critical: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', badge: 'bg-red-600' },
  urgent: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', badge: 'bg-amber-500' },
  moderate: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-500' }
};

export default function SOSTranslator({ destinationCountry, patientName, onClose }) {
  const [message, setMessage] = useState('');
  const [emergencyType, setEmergencyType] = useState('Medical Emergency');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTranslate = async () => {
    if (!message.trim()) return;
    setLoading(true);
    const res = await base44.functions.invoke('translateEmergencySOS', {
      message: message.trim(),
      destination_country: destinationCountry,
      patient_name: patientName,
      emergency_type: emergencyType
    });
    setResult(res.data);
    setLoading(false);
  };

  const handleCopy = () => {
    if (result?.translated_message) {
      navigator.clipboard.writeText(result.translated_message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const urgencyStyle = result ? (URGENCY_COLORS[result.urgency_level] || URGENCY_COLORS.urgent) : null;

  return (
    <div className="bg-white rounded-2xl border border-red-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-red-600 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Emergency SOS Translator</h3>
            <p className="text-red-200 text-xs">Real-time translation for {destinationCountry || 'local'} first responders</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Emergency Type</label>
          <select
            value={emergencyType}
            onChange={e => setEmergencyType(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            {['Medical Emergency', 'Allergic Reaction', 'Post-Surgery Complication', 'Cardiac Event', 'Respiratory Distress', 'Severe Pain', 'Bleeding', 'Unconscious Patient'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Describe the Emergency</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={`e.g. "Patient has severe chest pain and difficulty breathing after procedure. Needs immediate ambulance."`}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            rows={3}
          />
        </div>

        <Button
          onClick={handleTranslate}
          disabled={!message.trim() || loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-semibold"
        >
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Translating...</span>
          ) : (
            <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Translate to Local Language</span>
          )}
        </Button>

        {/* Result */}
        <AnimatePresence>
          {result && urgencyStyle && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border ${urgencyStyle.bg} ${urgencyStyle.border} p-4 space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className={`w-4 h-4 ${urgencyStyle.text}`} />
                  <span className={`font-semibold text-sm ${urgencyStyle.text}`}>{result.local_language}</span>
                </div>
                <span className={`text-xs font-semibold text-white px-2 py-0.5 rounded-full uppercase ${urgencyStyle.badge}`}>
                  {result.urgency_level}
                </span>
              </div>

              <div className={`bg-white/70 rounded-xl p-3 relative`}>
                <p className="text-sm font-medium text-gray-800 leading-relaxed">{result.translated_message}</p>
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              </div>

              {result.emergency_numbers?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">📞 Emergency Numbers</p>
                  <div className="flex flex-wrap gap-2">
                    {result.emergency_numbers.map((num, i) => (
                      <a key={i} href={`tel:${num}`}
                        className={`flex items-center gap-1.5 ${urgencyStyle.text} bg-white/70 border ${urgencyStyle.border} rounded-full px-3 py-1 text-xs font-semibold hover:bg-white transition-colors`}>
                        <Phone className="w-3 h-3" /> {num}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {result.phonetic_key_phrases?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">🗣️ Say These Now (Phonetic)</p>
                  <div className="space-y-1">
                    {result.phonetic_key_phrases.map((phrase, i) => (
                      <p key={i} className="text-xs bg-white/70 rounded-lg px-3 py-1.5 text-gray-700 font-mono">{phrase}</p>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}