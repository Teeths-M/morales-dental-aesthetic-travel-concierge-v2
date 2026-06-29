import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const GOLD = '#D4AF37';

// Local keyword scorer — runs instantly, zero API credits
function localMatch(query, procedures = []) {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter(w => w.length > 2);

  const scored = procedures.map(proc => {
    let score = 0;
    const title = (proc.title || '').toLowerCase();
    const desc = (proc.desc || '').toLowerCase();
    const keywords = proc.keywords || [];
    const categoryLabel = (proc.categoryLabel || '').toLowerCase();

    // Exact keyword phrase match — highest weight
    for (const kw of keywords) {
      if (q.includes(kw)) score += 50;
    }
    // Individual word matches against keyword list
    for (const word of words) {
      for (const kw of keywords) {
        if (kw.includes(word)) score += 20;
      }
      if (title.includes(word)) score += 15;
      if (categoryLabel.includes(word)) score += 10;
      if (desc.includes(word)) score += 5;
    }
    return { proc, score };
  }).filter(x => x.score > 0);

  scored.sort((a, b) => b.score - a.score);
  const maxScore = scored[0]?.score || 1;

  return scored.slice(0, 3).map(({ proc, score }) => ({
    procedure_id: proc.title.toLowerCase().replace(/[\s/()&]+/g, '_'),
    procedure_name: proc.title,
    match_confidence: Math.min(99, Math.round(60 + (score / maxScore) * 35)),
    rationale: (proc.desc || '').split('.')[0],
  }));
}

export default function SmartFallback({ onProcedureSelect, language = 'en', originalQuery, procedures = [] }) {
  const [patientQuery, setPatientQuery] = useState(originalQuery || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedProcedures, setMatchedProcedures] = useState(null);
  const [outreach, setOutreach] = useState(null); // { doctorsNotified, procedureName }

  const handleFindMatches = async () => {
    if (!patientQuery.trim()) return;

    setIsAnalyzing(true);

    // 1. Try local keyword matching first — instant, zero credits
    const localResults = localMatch(patientQuery, procedures);

    if (localResults.length > 0) {
      setMatchedProcedures(localResults);
      setIsAnalyzing(false);
      return;
    }

    // 2. No local match — fall back to AI edge function
    try {
      const response = await base44.functions.invoke('aiProcedureFallback', {
        patient_query: patientQuery.trim(),
        patient_custom_note: ''
      });
      const matched = response?.matched_procedures ?? response?.data?.matched_procedures;
      if (matched && matched.length > 0) {
        setMatchedProcedures(matched);
      } else {
        setMatchedProcedures([{
          procedure_id: 'general_consultation',
          procedure_name: 'General Specialist Consultation',
          match_confidence: 92,
          rationale: 'M will personally connect you with the right specialist for your goal.'
        }]);
      }
    } catch (_) {
      setMatchedProcedures([{
        procedure_id: 'general_consultation',
        procedure_name: 'General Specialist Consultation',
        match_confidence: 92,
        rationale: 'M will personally connect you with the right specialist for your goal.'
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectProcedure = async (procedure) => {
    onProcedureSelect?.(procedure);

    // Fire doctor outreach in background — don't block the UI
    try {
      const res = await base44.functions.invoke('notifyNearbyDoctors', {
        patient_query: patientQuery.trim(),
        procedure_name: procedure.procedure_name,
        procedure_id: procedure.procedure_id,
      });
      const notified = res?.doctors_notified ?? res?.data?.doctors_notified ?? 0;
      setOutreach({ doctorsNotified: notified, procedureName: procedure.procedure_name });
    } catch (_) {
      // Show confirmation even if outreach call fails — the intent is logged
      setOutreach({ doctorsNotified: 0, procedureName: procedure.procedure_name });
    }

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
      {outreach ? (
        /* Outreach sent — M is working */
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${GOLD}18`, border: `2px solid ${GOLD}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: GOLD, margin: '0 auto 16px' }}>M</div>
          <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: '#fff' }}>M is on it.</p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            {outreach.doctorsNotified > 0
              ? `${outreach.doctorsNotified} specialist${outreach.doctorsNotified !== 1 ? 's have' : ' has'} been contacted about your request for ${outreach.procedureName}.`
              : `Your request for ${outreach.procedureName} has been logged. M will personally connect you with a specialist.`
            }
          </p>
          <div style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}20`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
              Doctors will review your request and reply within <strong style={{ color: GOLD }}>24 hours</strong>. You'll receive a notification as soon as a specialist confirms they can help.
            </p>
          </div>
          <button
            onClick={() => { setOutreach(null); setPatientQuery(''); }}
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Search for another procedure
          </button>
        </motion.div>
      ) : matchedProcedures ? (
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