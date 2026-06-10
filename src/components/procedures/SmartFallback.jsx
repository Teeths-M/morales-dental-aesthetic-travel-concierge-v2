import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, ArrowRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const GOLD = '#D4AF37';

export default function SmartFallback({ onProcedureSelect, language = 'en', originalQuery }) {
  const [patientQuery, setPatientQuery] = useState(originalQuery || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedProcedures, setMatchedProcedures] = useState(null);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [patientNote, setPatientNote] = useState('');

  const handleFindMatches = async () => {
    if (!patientQuery.trim()) return;
    
    setIsAnalyzing(true);
    try {
      // Call backend AI matching function using Base44 SDK
      const response = await base44.functions.invoke('aiProcedureFallback', {
        patient_query: patientQuery.trim(),
        patient_custom_note: ''
      });

      if (response.data && response.data.matched_procedures) {
        setMatchedProcedures(response.data.matched_procedures);
        // Save the search record with is_matched=false (0 results triggered this)
        try {
          const user = await base44.auth.me();
          await base44.entities.ProcedureSearch.create({
            user_id: user.id,
            raw_query_text: patientQuery.trim(),
            result_count: 0,
            is_matched: false,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          console.error('Failed to save search:', e);
        }
      }
    } catch (error) {
      console.error('AI matching failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectProcedure = (procedure) => {
    onProcedureSelect?.(procedure);
    // Reset state to allow continued searching
    setMatchedProcedures(null);
    setSelectedProcedure(null);
    setPatientQuery('');
    setPatientNote('');
  };

  const handleConfirmWithNote = async () => {
    if (!selectedProcedure) return;

    try {
      // Save the final selection with patient note
      const response = await base44.functions.invoke('aiProcedureFallback', {
        patient_query: patientQuery,
        patient_custom_note: patientNote,
        selected_procedure_id: selectedProcedure.procedure_id,
        selected_procedure_name: selectedProcedure.procedure_name
      });

      if (response.data && response.data.success) {
        console.log('AI fallback match saved:', response.data);
      }
    } catch (error) {
      console.error('Failed to save fallback match:', error);
    } finally {
      // Reset to allow continued searching
      setMatchedProcedures(null);
      setSelectedProcedure(null);
      setPatientQuery('');
      setPatientNote('');
    }
  };

  const translations = {
    en: {
      heading: "No exact matches found",
      subheading: "Tell us what you want to achieve, and our AI will match it for you.",
      placeholder: "Describe what procedure or treatment you want in your own words...",
      button: "Find Closest Options",
      analyzing: "Analyzing your request...",
      noteLabel: "Add a personal note for your doctor (optional)",
      notePlaceholder: "Explain in your own words what you'd like the specialist to know about your case. No medical jargon needed!",
      confirmButton: "Continue with Booking"
    },
    es: {
      heading: "No se encontraron coincidencias exactas",
      subheading: "Cuéntanos qué quieres lograr, y nuestra IA lo emparejará por ti.",
      placeholder: "Describe qué procedimiento o tratamiento quieres con tus propias palabras...",
      button: "Encontrar las opciones más cercanas",
      analyzing: "Analizando tu solicitud...",
      noteLabel: "Agrega una nota personal para tu doctor (opcional)",
      notePlaceholder: "¡Explica con tus propias palabras qué te gustaría que el especialista sepa sobre tu caso. No se necesita jerga médica!",
      confirmButton: "Continuar con la reserva"
    },
    fr: {
      heading: "Aucune correspondance exacte trouvée",
      subheading: "Dites-nous ce que vous voulez accomplir, et notre IA le correspondra pour vous.",
      placeholder: "Décrivez quelle procédure ou traitement vous voulez avec vos propres mots...",
      button: "Trouver les options les plus proches",
      analyzing: "Analyse de votre demande...",
      noteLabel: "Ajoutez une note personnelle pour votre médecin (facultatif)",
      notePlaceholder: "Expliquez avec vos propres mots ce que vous aimeriez que le spécialiste sache de votre cas. Pas de jargon médical nécessaire !",
      confirmButton: "Continuer avec la réservation"
    }
  };

  const t = translations[language] || translations.en;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 rounded-2xl border border-emerald-100 p-0 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-blue-700 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-base mb-1">
            {t.heading}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {t.subheading}
          </p>
        </div>
      </div>

      {/* Patient Query Input */}
      {!matchedProcedures && (
        <div className="space-y-4">
          <textarea
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            placeholder={t.placeholder}
            className="w-full min-h-[120px] p-4 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none text-sm leading-relaxed"
          />
          <Button
            onClick={handleFindMatches}
            disabled={!patientQuery.trim() || isAnalyzing}
            className="w-full bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t.analyzing}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {t.button} <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Matched Procedures Display */}
      {matchedProcedures && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Top 3 AI Matches
          </p>
          <div className="space-y-2">
            {matchedProcedures.map((match, idx) => (
              <motion.button
                key={match.procedure_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => handleSelectProcedure(match)}
                className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-emerald-600">
                        {match.match_confidence}% match
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-800 text-xs mb-0.5 truncate">
                      {match.procedure_name}
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                      {match.rationale}
                    </p>
                  </div>
                  <Check className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
              </motion.button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 italic mt-2">Click to add to your procedures</p>
        </div>
      )}

      {/* Selected Procedure + Optional Note */}
      {selectedProcedure && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Selected Procedure Card */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Selected
              </span>
            </div>
            <h4 className="font-semibold text-slate-800 text-base mb-1">
              {selectedProcedure.procedure_name}
            </h4>
            <p className="text-xs text-slate-500">
              {selectedProcedure.rationale}
            </p>
          </div>

          {/* Optional Patient Note */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              {t.noteLabel}
            </label>
            <textarea
              value={patientNote}
              onChange={(e) => setPatientNote(e.target.value)}
              placeholder={t.notePlaceholder}
              className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 bg-white/80 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none text-sm leading-relaxed"
            />
            <p className="text-[10px] text-slate-400 italic">
              This note will be sent directly to your specialist
            </p>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirmWithNote}
            className="w-full bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-all"
          >
            {t.confirmButton} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}