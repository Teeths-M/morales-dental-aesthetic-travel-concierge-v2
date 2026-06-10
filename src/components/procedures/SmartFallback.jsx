import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const GOLD = '#D4AF37';

export default function SmartFallback({ onProcedureSelect, language = 'en', originalQuery }) {
  const [patientQuery, setPatientQuery] = useState(originalQuery || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedProcedures, setMatchedProcedures] = useState(null);

  const handleFindMatches = async () => {
    if (!patientQuery.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const response = await base44.functions.invoke('aiProcedureFallback', {
        patient_query: patientQuery.trim(),
        patient_custom_note: ''
      });

      if (response.data && response.data.matched_procedures) {
        setMatchedProcedures(response.data.matched_procedures);
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
    // Reset to allow continued searching - basket updates on right
    setMatchedProcedures(null);
    setPatientQuery('');
  };



  const translations = {
    en: {
      heading: "No exact matches found",
      subheading: "Tell us what you want to achieve, and our AI will match it for you.",
      placeholder: "Describe what procedure or treatment you want in your own words...",
      button: "Find Closest Options",
      analyzing: "Analyzing your request..."
    },
    es: {
      heading: "No se encontraron coincidencias exactas",
      subheading: "Cuéntanos qué quieres lograr, y nuestra IA lo emparejará por ti.",
      placeholder: "Describe qué procedimiento o tratamiento quieres con tus propias palabras...",
      button: "Encontrar las opciones más cercanas",
      analyzing: "Analizando tu solicitud..."
    },
    fr: {
      heading: "Aucune correspondance exacte trouvée",
      subheading: "Dites-nous ce que vous voulez accomplir, et notre IA le correspondra pour vous.",
      placeholder: "Décrivez quelle procédure ou traitement vous voulez avec vos propres mots...",
      button: "Trouver les options les plus proches",
      analyzing: "Analyse de votre demande..."
    }
  };

  const t = translations[language] || translations.en;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm"
    >
      {matchedProcedures ? (
        /* Matched Procedures Display */
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
          <p className="text-[10px] text-slate-400 italic mt-2">Click to add to your basket</p>
        </div>
      ) : (
        /* Input Mode - Horizontal Layout */
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left Side - Icon + Heading + Description */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 text-lg mb-1 whitespace-nowrap">
                {t.heading}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {t.subheading}
              </p>
            </div>
          </div>

          {/* Right Side - Input + Button (side-by-side) */}
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <textarea
              value={patientQuery}
              onChange={(e) => setPatientQuery(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 min-w-0 p-3 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none text-sm leading-relaxed min-h-[80px] md:min-h-[60px]"
            />
            <Button
              onClick={handleFindMatches}
              disabled={!patientQuery.trim() || isAnalyzing}
              className="flex-shrink-0 bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t.analyzing}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {t.button} <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}