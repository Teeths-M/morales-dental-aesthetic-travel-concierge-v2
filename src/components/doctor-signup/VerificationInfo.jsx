import React from 'react';
import { Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function VerificationInfo({ language = 'en' }) {
  const content = {
    en: {
      title: "License Verification Process",
      description: "Your medical license will be automatically verified using AI technology to ensure patient safety.",
      steps: [
        {
          icon: "🤖",
          title: "AI Analysis",
          desc: "Our AI extracts and analyzes your license details instantly"
        },
        {
          icon: "⚡",
          title: "Quick Approval",
          desc: "High-confidence verifications are approved automatically"
        },
        {
          icon: "👤",
          title: "Manual Review",
          desc: "Some licenses may need human review (we'll notify you)"
        }
      ],
      note: "You can start seeing patients while verification is pending. Caribbean licenses often require manual review."
    },
    es: {
      title: "Proceso de Verificación de Licencia",
      description: "Su licencia médica será verificada automáticamente usando tecnología de IA para garantizar la seguridad del paciente.",
      steps: [
        {
          icon: "🤖",
          title: "Análisis de IA",
          desc: "Nuestra IA extrae y analiza los detalles de su licencia instantáneamente"
        },
        {
          icon: "⚡",
          title: "Aprobación Rápida",
          desc: "Las verificaciones de alta confianza se aprueban automáticamente"
        },
        {
          icon: "👤",
          title: "Revisión Manual",
          desc: "Algunas licencias pueden necesitar revisión humana (le notificaremos)"
        }
      ],
      note: "Puede comenzar a atender pacientes mientras la verificación está pendiente. Las licencias del Caribe a menudo requieren revisión manual."
    },
    fr: {
      title: "Processus de Vérification de Licence",
      description: "Votre licence médicale sera automatiquement vérifiée en utilisant la technologie IA pour assurer la sécurité des patients.",
      steps: [
        {
          icon: "🤖",
          title: "Analyse IA",
          desc: "Notre IA extrait et analyse les détails de votre licence instantanément"
        },
        {
          icon: "⚡",
          title: "Approbation Rapide",
          desc: "Les vérifications haute confiance sont approuvées automatiquement"
        },
        {
          icon: "👤",
          title: "Révision Manuelle",
          desc: "Certaines licences peuvent nécessiter une révision humaine (nous vous informerons)"
        }
      ],
      note: "Vous pouvez commencer à voir des patients pendant que la vérification est en cours. Les licences des Caraïbes nécessitent souvent une révision manuelle."
    }
  };

  const t = content[language] || content.en;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 mb-1">{t.title}</h3>
          <p className="text-sm text-slate-600">{t.description}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        {t.steps.map((step, idx) => (
          <div key={idx} className="bg-white/70 backdrop-blur rounded-xl p-4 border border-white/50">
            <div className="text-2xl mb-2">{step.icon}</div>
            <h4 className="font-semibold text-sm text-slate-900 mb-1">{step.title}</h4>
            <p className="text-xs text-slate-600">{step.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">{t.note}</p>
      </div>
    </div>
  );
}