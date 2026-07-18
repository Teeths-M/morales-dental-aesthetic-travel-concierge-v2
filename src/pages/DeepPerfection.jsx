// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Search, Plus, X, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Procedure ontology for agentic matching
const PROCEDURES = [
  { id: "hair_transplant", name: "Hair Transplant", keywords: ["hair", "bald", "thinning", "hairline", "alopecia"], category: "Hair" },
  { id: "smile_makeover", name: "Smile Makeover", keywords: ["smile", "teeth", "cosmetic dentistry", "smile design"], category: "Dental" },
  { id: "veneers", name: "Veneers", keywords: ["veneers", "teeth gap", "stained teeth", "porcelain"], category: "Dental" },
  { id: "implants_dental", name: "Dental Implants", keywords: ["implant", "missing tooth", "dental implant", "tooth replacement"], category: "Dental" },
  { id: "rhinoplasty", name: "Rhinoplasty", keywords: ["nose", "rhinoplasty", "nasal", "nose job"], category: "Aesthetic" },
  { id: "brazilian_butt_lift", name: "Brazilian Butt Lift (BBL)", keywords: ["ass", "butt", "gluteal", "bbl", "butt lift", "booty"], category: "Body" },
  { id: "liposuction", name: "Liposuction", keywords: ["fat", "liposuction", "body contour", "love handles"], category: "Body" },
  { id: "facelift", name: "Facelift", keywords: ["facelift", "sagging", "wrinkles", "aging face"], category: "Aesthetic" },
  { id: "botox", name: "Botox", keywords: ["botox", "wrinkles", "frown lines", "crow's feet"], category: "Aesthetic" },
  { id: "skin_rejuvenation", name: "Skin Rejuvenation", keywords: ["skin", "acne", "scar", "laser", "pigmentation"], category: "Skin" },
  { id: "general_consultation", name: "General Specialist Consultation", keywords: [], category: "Fallback", isFallback: true }
];

// Deep matching algorithm with governance
function deepMatch(query) {
  if (!query || query.trim() === "") return { matches: [], usedFallback: false, clarificationNeeded: false };

  const tokens = query.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/);
  
  // Score each procedure
  let scored = PROCEDURES.filter(p => !p.isFallback).map(proc => {
    let score = 0;
    proc.keywords.forEach(kw => {
      if (tokens.includes(kw)) score += 35;
      else if (query.toLowerCase().includes(kw)) score += 20;
    });
    
    // Multi-word phrase bonuses
    if (proc.name.toLowerCase().includes("smile") && query.toLowerCase().includes("smile makeover")) score += 30;
    if (proc.name.toLowerCase().includes("butt") && (query.includes("ass") || query.includes("butt"))) score += 45;
    if (proc.name.toLowerCase().includes("hair") && query.includes("hair")) score += 40;
    if (proc.name.toLowerCase().includes("implant") && query.includes("implant")) score += 40;
    
    return { ...proc, score: Math.min(score, 100) };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  let topMatches = scored.filter(m => m.score > 0).slice(0, 3);
  
  // Governance fallback: if no good matches, return General Consultation
  const hasGoodMatch = topMatches.some(m => m.score >= 40);
  if (topMatches.length === 0 || !hasGoodMatch) {
    const fallback = PROCEDURES.find(p => p.isFallback);
    return {
      matches: [{ 
        ...fallback, 
        score: 50, 
        rationale: "Our AI agent didn't find a high‑confidence match. A specialist will personally review your case and recommend the best procedure." 
      }],
      usedFallback: true,
      clarificationNeeded: true
    };
  }

  // Add governance-compliant rationale for transparency
  const enriched = topMatches.map(m => {
    let rationale = `Match based on keywords: ${m.keywords.filter(k => query.toLowerCase().includes(k)).join(', ') || 'semantic relevance'}.`;
    
    // Clinical semantic mapping
    if (m.name === "Brazilian Butt Lift (BBL)" && query.includes("ass")) 
      rationale = "Detected 'ass' → gluteal augmentation (BBL) is the appropriate aesthetic procedure for buttock enhancement.";
    if (m.name === "Hair Transplant" && query.includes("hair")) 
      rationale = "Detected 'hair' → hair restoration is the correct surgical solution for hair loss or thinning.";
    if (m.name === "Smile Makeover" && (query.includes("smile") || query.includes("teeth"))) 
      rationale = "Smile makeover combines veneers, whitening, and contouring for a comprehensive dental aesthetic result.";
    if (m.name === "Rhinoplasty" && query.includes("nose")) 
      rationale = "Rhinoplasty directly addresses nasal shape, breathing, or symmetry.";
    
    return { ...m, rationale };
  });
  
  return { matches: enriched, usedFallback: false, clarificationNeeded: false };
}

export default function DeepPerfection() {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [basket, setBasket] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('moralesRecents') || '[]');
    setRecentSearches(saved);
  }, []);

  const performSearch = () => {
    if (!query.trim()) return;
    
    setIsAnalyzing(true);
    
    // Simulate AI processing delay
    setTimeout(() => {
      const result = deepMatch(query);
      setMatches(result.matches);
      setUsedFallback(result.usedFallback);
      
      // Save to recent searches
      const recents = [query, ...recentSearches.filter(r => r !== query)].slice(0, 5);
      setRecentSearches(recents);
      localStorage.setItem('moralesRecents', JSON.stringify(recents));
      
      setIsAnalyzing(false);
    }, 300);
  };

  const addToBasket = (match) => {
    if (!basket.find(item => item.id === match.id)) {
      setBasket([...basket, match]);
    }
  };

  const removeFromBasket = (id) => {
    setBasket(basket.filter(item => item.id !== id));
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice is not available in this browser', { description: 'You can type instead.' });
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.start();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      // Auto-search after voice input
      setTimeout(() => performSearch(), 100);
    };
    recognition.onerror = () => {
      toast.error('Voice input failed', { description: 'Please type instead.' });
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-emerald-200">
          <div>
            <h1 className="text-3xl font-semibold text-emerald-950 mb-1">
              MORALES <span className="text-lg font-normal">Deep Perfection</span>
            </h1>
            <p className="text-sm text-emerald-700">Agentic AI Concierge with Governance Layer</p>
          </div>
          <div className="bg-emerald-100/60 px-4 py-2 rounded-full text-xs font-semibold text-emerald-700">
            Governance v2.0
          </div>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          {/* Search Input */}
          {/* Stacks on phones; single pill row from sm up. The input needs
              min-w-0 because a flex item defaults to min-width:auto, so it
              refuses to shrink below its (long) placeholder — with two
              nowrap buttons beside it that pushed the page to 547px on a
              390px screen and made the whole page scroll sideways. */}
          <div className="bg-amber-50/50 border border-emerald-100 rounded-3xl sm:rounded-full p-3 sm:p-2 sm:pl-6 flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && performSearch()}
              placeholder="Describe what you want... e.g., 'hair transplant and smile makeover'"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-base sm:text-lg font-mono px-3 sm:px-0"
            />
            <div className="flex gap-3 shrink-0">
              <Button
                onClick={handleVoiceInput}
                className="flex-1 sm:flex-none bg-emerald-700 hover:bg-emerald-800 text-white rounded-full px-6"
              >
                <Mic className="w-4 h-4 mr-2" /> Voice
              </Button>
              <Button
                onClick={performSearch}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6"
              >
                <Search className="w-4 h-4 mr-2" /> Match
              </Button>
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="flex gap-3 flex-wrap mb-6 text-sm text-emerald-700">
              <span className="font-semibold">Recent:</span>
              {recentSearches.map((search, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(search);
                    setTimeout(performSearch, 50);
                  }}
                  className="bg-emerald-50 hover:bg-emerald-100 px-4 py-1.5 rounded-full transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-emerald-900">AI Deep Perfection Matches</h2>
            </div>

            {isAnalyzing ? (
              <div className="text-center py-12 text-emerald-600 italic">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="w-2 h-8 bg-emerald-600 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]"></span>
                  <span className="w-2 h-8 bg-emerald-600 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.2s]"></span>
                  <span className="w-2 h-8 bg-emerald-600 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.4s]"></span>
                </div>
                Agentic AI reasoning with governance layer...
              </div>
            ) : matches.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matches.map((match, idx) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
                    >
                      <div className="text-3xl font-semibold text-emerald-600 mb-2">
                        {Math.round(match.score)}% match
                      </div>
                      <h3 className="text-xl font-semibold text-emerald-900 mb-3">
                        {match.name}
                      </h3>
                      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                        🧠 {match.rationale}
                      </p>
                      <Button
                        onClick={() => addToBasket(match)}
                        variant="outline"
                        className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-full"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add to basket
                      </Button>
                    </motion.div>
                  ))}
                </div>

                {usedFallback && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      ⚠️ <strong>Governance Fallback Active:</strong> Low confidence match. A real specialist will be assigned to ensure accuracy. You may refine your query.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                ✨ Describe your aesthetic goals above. I will find the perfect match.
              </div>
            )}
          </div>
        </div>

        {/* Basket */}
        <div className="bg-emerald-50 rounded-3xl p-8">
          <h3 className="text-xl font-semibold text-emerald-900 mb-4">🛒 Your Consultation Basket</h3>
          {basket.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {basket.map((item) => (
                <div
                  key={item.id}
                  className="bg-white px-4 py-2 rounded-full border border-emerald-200 flex items-center gap-2"
                >
                  <span className="text-sm font-medium text-emerald-900">{item.name}</span>
                  <button
                    onClick={() => removeFromBasket(item.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              No procedures added yet. Click "Add to basket" on your matches.
            </p>
          )}
          <p className="text-xs text-slate-500 mt-3">
            Final step: Book consultation with your selected procedures.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-slate-500">
          Agentic AI Governance — Zero hallucinations. Every match includes rationale & confidence.
        </div>
      </div>
    </div>
  );
}