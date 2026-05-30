import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { ArrowRight, Sparkles } from 'lucide-react';

const CARDS = [
  {
    id: 'restoration',
    title: 'Restoration',
    subtitle: 'Smile & Dental Excellence',
    icon: '🦷',
    tagline: 'Rebuild with precision.',
    backText: 'From dental implants to full smile makeovers — internationally accredited dental specialists restore your confidence with precision-crafted results.',
    procedures: [
      { name: 'Dental Implants', value: 'dental_implants' },
      { name: 'All-on-4 / All-on-6', value: 'all_on_4' },
      { name: 'Porcelain Veneers', value: 'porcelain_veneers' },
      { name: 'Smile Makeover', value: 'smile_makeover' },
    ],
    accent: '#C5A059',
    glow: 'rgba(197,160,89,0.25)',
  },
  {
    id: 'radiance',
    title: 'Radiance',
    subtitle: 'Aesthetic & Cosmetic Surgery',
    icon: '✨',
    tagline: 'Reveal your best self.',
    backText: 'Board-certified cosmetic surgeons specialising in transformative body and facial aesthetics — all coordinated within a fully managed luxury concierge experience.',
    procedures: [
      { name: 'Rhinoplasty', value: 'rhinoplasty' },
      { name: 'Breast Surgery', value: 'breast_surgery' },
      { name: 'Facelift', value: 'facelift' },
      { name: 'Liposuction', value: 'liposuction' },
    ],
    accent: '#a78bfa',
    glow: 'rgba(167,139,250,0.2)',
  },
  {
    id: 'vitality',
    title: 'Vitality',
    subtitle: 'Wellness & Advanced Care',
    icon: '💚',
    tagline: 'Reclaim your strength.',
    backText: 'From bariatric transformation to orthopaedic renewal and fertility care — elite clinical teams deliver life-changing outcomes within a serene recovery environment.',
    procedures: [
      { name: 'Gastric Sleeve', value: 'gastric_sleeve' },
      { name: 'Joint Replacement', value: 'joint_replacement' },
      { name: 'IVF', value: 'ivf' },
      { name: 'Oncology Surgery', value: 'oncology_surgery' },
    ],
    accent: '#34d399',
    glow: 'rgba(52,211,153,0.2)',
  },
];

function TarotCard({ card, isSelected, onSelect }) {
  const [flipped, setFlipped] = useState(false);
  const navigate = useNavigate();

  const handleSelect = () => {
    onSelect(card.id);
  };

  return (
    <motion.div
      className="relative cursor-pointer flex-shrink-0 will-change-transform transform-gpu"
      style={{ width: 260, height: 380, perspective: 1000, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!flipped ? { y: -12, scale: 1.03 } : {}}
      onClick={() => !flipped && setFlipped(true)}
    >
      {/* Card inner wrapper — flips on state */}
      <motion.div
        className="w-full h-full relative will-change-transform transform-gpu"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.43, 0.13, 0.23, 0.96] }}
        style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center px-6 text-center select-none"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(160deg, #0a2614 0%, #0F3A20 60%, #0a1f10 100%)',
            border: `1.5px solid ${card.accent}`,
            boxShadow: `0 0 40px ${card.glow}, inset 0 0 20px rgba(255,255,255,0.03)`,
          }}
        >
          {/* Ornamental top line */}
          <div className="absolute top-5 left-8 right-8 h-px opacity-30" style={{ background: `linear-gradient(to right, transparent, ${card.accent}, transparent)` }} />

          <div className="text-5xl mb-4">{card.icon}</div>

          <h3
            className="font-display text-3xl mb-1"
            style={{ color: card.accent, fontStyle: 'italic' }}
          >
            {card.title}
          </h3>
          <p className="text-xs tracking-[0.2em] uppercase text-slate-400 mb-5">{card.subtitle}</p>

          <p className="text-slate-300 text-sm leading-relaxed italic opacity-80 mb-6">{card.tagline}</p>

          {/* Procedures preview */}
          <div className="space-y-1.5 w-full">
            {card.procedures.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: card.accent }} />
                {p.name}
              </div>
            ))}
          </div>

          {/* Tap hint */}
          <div className="absolute bottom-5 flex items-center gap-1.5 opacity-40">
            <Sparkles className="w-3 h-3" style={{ color: card.accent }} />
            <span className="text-[9px] tracking-widest uppercase" style={{ color: card.accent }}>Reveal Path</span>
          </div>

          {/* Ornamental bottom line */}
          <div className="absolute bottom-5 left-8 right-8 h-px opacity-30" style={{ background: `linear-gradient(to right, transparent, ${card.accent}, transparent)` }} />
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center px-6 text-center"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: `linear-gradient(160deg, #0a1810 0%, #0F3A20 100%)`,
            border: `1.5px solid ${card.accent}`,
            boxShadow: `0 0 60px ${card.glow}`,
          }}
        >
          <div className="text-3xl mb-4">{card.icon}</div>
          <h3 className="font-display text-xl mb-3" style={{ color: card.accent }}>
            Path of {card.title}
          </h3>
          <p className="text-slate-300 text-xs leading-relaxed mb-6">{card.backText}</p>

          <button
            onClick={handleSelect}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-200 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${card.accent}22, ${card.accent}44)`,
              border: `1px solid ${card.accent}`,
              color: card.accent,
            }}
          >
            Select Path <ArrowRight className="w-3 h-3" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
            className="mt-3 text-[10px] text-slate-500 hover:text-slate-300 transition-colors tracking-widest uppercase"
          >
            ← Go back
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function TarotSelection() {
  const [selectedCard, setSelectedCard] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedCard) {
      navigate('/procedures');
    }
  }, [selectedCard, navigate]);

  return (
    <section
      className="relative min-h-screen w-full flex flex-col items-center justify-center py-20 px-4 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #050f09 0%, #071510 40%, #050f09 100%)' }}
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: '#C5A059' }} />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: '#0F3A20' }} />
      </div>

      {/* Header */}
      <motion.div
        className="text-center mb-14 relative z-10 will-change-transform transform-gpu"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
      >
        <p className="text-[10px] font-bold tracking-[0.4em] uppercase mb-4" style={{ color: '#C5A059' }}>
          Choose Your Journey
        </p>
        <h2 className="font-display text-4xl sm:text-5xl text-white mb-4">
          Which path calls to you?
        </h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Each card reveals a curated care pathway. Click to unveil your personalised treatment overview.
        </p>
      </motion.div>

      {/* Cards row */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-8 flex-wrap">
        {CARDS.map((card, i) => (
          <motion.div
            key={card.id}
            className="will-change-transform transform-gpu"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: i * 0.15 }}
          >
            <TarotCard
              card={card}
              isSelected={selectedCard === card.id}
              onSelect={setSelectedCard}
            />
          </motion.div>
        ))}
      </div>

      {/* Bottom divider */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px opacity-20"
        style={{ background: 'linear-gradient(to right, transparent, #C5A059, transparent)' }}
      />
    </section>
  );
}