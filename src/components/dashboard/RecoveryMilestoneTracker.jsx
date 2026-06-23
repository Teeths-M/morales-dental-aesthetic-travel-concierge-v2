import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Heart, Clock, ChevronRight, Shield, Star, Calendar, FileText, Plane, Utensils, Bed, Smile } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const MILESTONES = [
  { id: 'prep', label: 'Pre-Procedure Prep', icon: '📋', tips: ['Complete all lab work and blood tests', 'Arrange time off work/school', 'Prepare recovery space at home', 'Stock up on soft foods and supplies'] },
  { id: 'travel', label: 'Travel Day', icon: '✈️', tips: ['Keep all documents easily accessible', 'Stay hydrated during flight', 'Wear loose, comfortable clothing', 'Have emergency contacts saved'] },
  { id: 'procedure', label: 'Procedure Day', icon: '🏥', tips: ['Follow fasting instructions', 'Arrive early with your companion', 'Ask final questions to your doctor', 'Trust the medical team'] },
  { id: 'recovery1', label: 'Recovery Days 1-3', icon: '🛌', tips: ['Rest as much as possible', 'Take prescribed medications on time', 'Apply ice packs as directed', 'Keep surgical area clean and dry'] },
  { id: 'recovery2', label: 'Recovery Days 4-7', icon: '🌿', tips: ['Begin gentle walking', 'Continue proper nutrition', 'Attend follow-up appointments', 'Watch for any warning signs'] },
  { id: 'followup', label: 'Follow-Up', icon: '📞', tips: ['Complete virtual check-ins', 'Send progress photos if requested', 'Report any concerns immediately', 'Celebrate your progress!'] },
];

const CARE_TIPS = {
  prep: ['💧 Stay well-hydrated before your procedure', '🥗 Eat nutrient-rich foods to support healing', '😴 Get 8+ hours of sleep each night', '🚭 Avoid smoking and alcohol completely'],
  travel: ['💊 Keep medications in your carry-on bag', '📱 Save local emergency numbers', '🧴 Pack compression socks for long flights', '📋 Keep copies of all medical documents'],
  procedure: ['🙏 Practice calming breathing exercises', '👕 Wear button-up shirts for easy dressing', '🚗 Arrange reliable transportation', '💬 Communicate openly with your care team'],
  recovery1: ['🧊 Use cold compresses to reduce swelling', '💊 Set phone alarms for medication times', '🛏️ Sleep with head elevated', '📞 Have your companion nearby for support'],
  recovery2: ['🚶 Take short, gentle walks daily', '🥤 Continue drinking plenty of water', '🍲 Eat protein-rich meals for healing', '📸 Document your recovery progress'],
  followup: ['📅 Schedule all follow-up appointments', '📷 Take consistent progress photos', '💬 Join patient support communities', '🎉 Acknowledge your healing milestones'],
};

export default function RecoveryMilestoneTracker({ caseRecord }) {
  const [completedMilestones, setCompletedMilestones] = useState([]);
  const [expandedTip, setExpandedTip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load completed milestones from case record or local storage
    const loadMilestones = async () => {
      try {
        // Could fetch from CaseRecord.cultural_care_package or a dedicated entity
        const saved = localStorage.getItem(`milestones_${caseRecord?.id || 'default'}`);
        if (saved) {
          setCompletedMilestones(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load milestones', e);
      } finally {
        setLoading(false);
      }
    };
    loadMilestones();
  }, [caseRecord?.id]);

  const toggleMilestone = (milestoneId) => {
    const updated = completedMilestones.includes(milestoneId)
      ? completedMilestones.filter(id => id !== milestoneId)
      : [...completedMilestones, milestoneId];
    
    setCompletedMilestones(updated);
    localStorage.setItem(`milestones_${caseRecord?.id || 'default'}`, JSON.stringify(updated));
  };

  const progress = Math.round((completedMilestones.length / MILESTONES.length) * 100);

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-100 rounded w-1/3"></div>
          <div className="h-4 bg-slate-100 rounded w-1/2"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-50 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-blue-800 flex items-center justify-center">
          <Heart className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Recovery Milestone Tracker</h3>
          <p className="text-xs text-slate-400">Track your healing journey</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs font-semibold text-emerald-700">{progress}% Complete</p>
          <p className="text-[10px] text-slate-400">{completedMilestones.length}/{MILESTONES.length}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-slate-100 rounded-full mb-5 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-600 to-blue-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Milestones */}
      <div className="space-y-2">
        {MILESTONES.map((milestone, index) => {
          const isCompleted = completedMilestones.includes(milestone.id);
          const isExpanded = expandedTip === milestone.id;
          const tips = CARE_TIPS[milestone.id] || [];

          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`border rounded-xl overflow-hidden transition-all ${
                isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white'
              }`}
            >
              <div className="flex items-center gap-3 p-3">
                <button
                  onClick={() => toggleMilestone(milestone.id)}
                  className="flex-shrink-0"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-500 transition-colors" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{milestone.icon}</span>
                    <span className={`text-sm font-semibold ${isCompleted ? 'text-emerald-800' : 'text-slate-700'}`}>
                      {milestone.label}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setExpandedTip(isExpanded ? null : milestone.id)}
                  className="flex-shrink-0 text-slate-400 hover:text-slate-600"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
              </div>

              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3 pb-3"
                >
                  <div className="bg-white rounded-lg border border-slate-100 p-3 space-y-2">
                    {tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Encouragement */}
      {completedMilestones.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-3 border border-emerald-100"
        >
          <p className="text-xs text-emerald-800 font-semibold text-center">
            🎉 Great progress! You're {progress}% through your recovery journey.
          </p>
        </motion.div>
      )}
    </div>
  );
}