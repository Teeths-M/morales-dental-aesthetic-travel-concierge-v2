import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
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
      heading: "Don't see your procedure? M will find it.",
      subheading: "Describe what you want in your own words — any procedure, any goal. M searches our entire specialist network to find the right doctor for you.",
      placeholder: "e.g. 'I want a smaller nose' · 'fix my back pain' · 'whiter straighter teeth' · anything...",
      button: "M — Find My Specialist",
      analyzing: "M is searching our specialist network...",
      matchHeading: "M found the right specialists for you",
      noMatchFallback: "M will personally connect you with a specialist — no procedure request is too specific."
    },
    es: {
      heading: "¿No ves tu procedimiento? M lo encontrará.",
      subheading: "Describe lo que quieres con tus propias palabras. M busca en toda nuestra red de especialistas.",
      placeholder: "ej. 'quiero una nariz más pequeña' · 'dolor de espalda' · 'dientes más blancos'...",
      button: "M — Encontrar mi especialista",
      analyzing: "M está buscando en la red de especialistas...",
      matchHeading: "M encontró los especialistas correctos para ti",
      noMatchFallback: "M te conectará personalmente con un especialista."
    },
    fr: {
      heading: "Vous ne voyez pas votre procédure ? M la trouvera.",
      subheading: "Décrivez ce que vous voulez avec vos propres mots. M recherche dans tout notre réseau de spécialistes.",
      placeholder: "ex. 'je veux un nez plus petit' · 'douleur au dos' · 'dents plus blanches'...",
      button: "M — Trouver mon spécialiste",
      analyzing: "M recherche dans le réseau de spécialistes...",
      matchHeading: "M a trouvé les bons spécialistes pour vous",
      noMatchFallback: "M vous connectera personnellement avec un spécialiste."
    }
  };

  const t = translations[language] || translations.en;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: 'linear-gradient(135deg, #0C1A1D 0%, #080F18 100%)', border: `1px solid ${GOLD}30`, borderRadius: 20, padding: 24 }}
    >
      {matchedProcedures ? (
        /* M found specialists */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${GOLD}18`, border: `1.5px solid ${GOLD}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: GOLD }}>M</div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.matchHeading}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {matchedProcedures.map((match, idx) => (
              <motion.button
                key={match.procedure_id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => handleSelectProcedure(match)}
                style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}50`; e.currentTarget.style.background = `${GOLD}08`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: '0.06em' }}>{match.match_confidence}% MATCH</span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#fff' }}>{match.procedure_name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{match.rationale}</p>
                  </div>
                  <Check style={{ width: 16, height: 16, color: GOLD, flexShrink: 0 }} />
                </div>
              </motion.button>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: `${GOLD}08`, border: `1px solid ${GOLD}20` }}>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              {t.noMatchFallback}
            </p>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>Tap a procedure to add it to your plan</p>
        </div>
      ) : (
        /* Input Mode */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${GOLD}18`, border: `1.5px solid ${GOLD}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: GOLD, flexShrink: 0 }}>M</div>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 800, color: '#fff' }}>{t.heading}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{t.subheading}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              value={patientQuery}
              onChange={(e) => setPatientQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && patientQuery.trim()) { e.preventDefault(); handleFindMatches(); } }}
              placeholder={t.placeholder}
              rows={2}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid rgba(255,255,255,0.12)`, background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = `${GOLD}60`}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
            <button
              onClick={handleFindMatches}
              disabled={!patientQuery.trim() || isAnalyzing}
              style={{
                padding: '13px 0', borderRadius: 12, cursor: patientQuery.trim() && !isAnalyzing ? 'pointer' : 'not-allowed',
                background: patientQuery.trim() && !isAnalyzing ? `linear-gradient(135deg, ${GOLD}, #E8C85C)` : 'rgba(212,175,55,0.2)',
                border: 'none', color: patientQuery.trim() && !isAnalyzing ? '#060B16' : 'rgba(255,255,255,0.3)',
                fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: patientQuery.trim() && !isAnalyzing ? '0 6px 20px rgba(212,175,55,0.3)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {isAnalyzing ? (
                <>
                  <span style={{ display: 'flex', gap: 3 }}>
                    {[0,1,2].map(i => <span key={i} style={{ width: 4, height: 14, background: 'rgba(255,255,255,0.5)', borderRadius: 2, animation: `pulse 0.6s ease ${i * 0.2}s infinite` }} />)}
                  </span>
                  {t.analyzing}
                </>
              ) : (
                <>{t.button} <ArrowRight style={{ width: 15, height: 15 }} /></>
              )}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}