import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, AlertCircle, Upload, FileText, Plane, Heart, Pill, Utensils } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const ICON_MAP = {
  upload: Upload,
  document: FileText,
  travel: Plane,
  health: Heart,
  medication: Pill,
  food: Utensils,
};

export default function PreparationChecklist({ userEmail }) {
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChecklist = async () => {
      try {
        const consultations = await base44.entities.Consultation.filter(
          userEmail ? { email: userEmail } : {},
          '-created_date',
          1
        );
        
        if (consultations.length === 0) {
          setLoading(false);
          return;
        }

        const form = consultations[0];
        const builtList = buildChecklist(form);
        
        // Load saved state
        const user = await base44.auth.me();
        const saved = localStorage.getItem(`checklist_${user.id}`);
        if (saved) {
          const savedState = JSON.parse(saved);
          const merged = builtList.map(item => ({
            ...item,
            done: savedState.find(s => s.id === item.id)?.done || item.done,
          }));
          setChecklist(merged);
        } else {
          setChecklist(builtList);
        }
      } catch (e) {
        console.error('Failed to load checklist', e);
      } finally {
        setLoading(false);
      }
    };

    loadChecklist();
  }, [userEmail]);

  const buildChecklist = (form) => {
    const items = [
      { id: 'lab_work', label: 'Upload lab work (blood tests, CBC)', priority: 'high', icon: 'upload', done: !!form.uploaded_files?.length },
      { id: 'passport', label: 'Upload valid passport copy', priority: 'high', icon: 'document', done: form.document_types?.includes('Passport') },
      { id: 'companion', label: 'Confirm travel companion arrangements', priority: 'medium', icon: 'travel', done: !!form.has_companion },
      { id: 'insurance', label: 'Arrange travel insurance', priority: 'high', icon: 'document', done: form.document_types?.includes('Insurance') },
      { id: 'flights', label: 'Book flights to destination', priority: 'medium', icon: 'travel', done: false },
      { id: 'transfer', label: 'Arrange airport transfer', priority: 'medium', icon: 'travel', done: false },
      { id: 'supplies', label: 'Prepare recovery clothing & supplies', priority: 'medium', icon: 'health', done: false },
      { id: 'consent', label: 'Review consent forms when received', priority: 'medium', icon: 'document', done: false },
      { id: 'blood_test', label: 'Complete pre-procedure blood testing', priority: 'high', icon: 'health', done: false },
    ];

    if (form.lifestyle_habits?.some(h => h.toLowerCase().includes('smok') || h.toLowerCase().includes('vap'))) {
      items.push({ id: 'smoking', label: 'Begin smoking cessation program (4+ weeks before)', priority: 'high', icon: 'health', done: false });
    }

    if (form.takes_medications) {
      items.push({ id: 'medications', label: 'Review all medications with assigned doctor', priority: 'high', icon: 'medication', done: false });
    }

    return items;
  };

  const toggleItem = async (itemId) => {
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    setChecklist(updated);

    try {
      const user = await base44.auth.me();
      localStorage.setItem(`checklist_${user.id}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save checklist', e);
    }
  };

  const highPriority = checklist.filter(c => c.priority === 'high' && !c.done);
  const doneCount = checklist.filter(c => c.done).length;
  const progress = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-100 rounded w-1/3"></div>
          <div className="h-3 bg-slate-100 rounded w-1/2"></div>
          <div className="h-3 bg-slate-100 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (checklist.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-sm">Preparation Tasks</h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          doneCount === checklist.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {doneCount}/{checklist.length} done
        </span>
      </div>

      {highPriority.length > 0 && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            <strong>{highPriority.length} high-priority item{highPriority.length > 1 ? 's' : ''}</strong> require attention before your procedure.
          </p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500">Progress</span>
          <span className="font-bold text-slate-700">{progress}%</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-600 to-blue-800 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {checklist.map((item) => {
          const IconComponent = ICON_MAP[item.icon] || CheckCircle2;
          
          return (
            <label
              key={item.id}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors group"
            >
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="flex-shrink-0"
              >
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Circle className={`w-5 h-5 ${item.priority === 'high' ? 'text-amber-500' : 'text-slate-300'} group-hover:text-emerald-500 transition-colors`} />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.done ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                  {item.label}
                </p>
                {item.priority === 'high' && !item.done && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                    High Priority
                  </span>
                )}
              </div>

              <IconComponent className={`w-4 h-4 flex-shrink-0 ${
                item.done ? 'text-emerald-400' : 'text-slate-300'
              }`} />
            </label>
          );
        })}
      </div>
    </motion.div>
  );
}