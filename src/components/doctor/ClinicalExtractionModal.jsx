import React, { useState, useEffect } from 'react';
import { useClinicalNoteExtraction } from '@/hooks/useClinicalNoteExtraction';
import { X, Sparkles, RotateCcw, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Format extracted data as structured doctor note text ─────────────────────
function formatForNotes(data) {
  const lines = ['=== AI Clinical Extraction (Reviewed & Approved) ===\n'];

  if (data.chief_complaint)
    lines.push(`Chief Complaint: ${data.chief_complaint}`);

  if (data.diagnosis?.length) {
    lines.push('\nDiagnosis:');
    data.diagnosis.forEach(d => lines.push(`  • ${d}`));
  }

  if (data.procedures?.length) {
    lines.push('\nProcedures:');
    data.procedures.forEach(p => lines.push(`  • ${p}`));
  }

  if (data.medications?.length) {
    lines.push('\nMedications:');
    data.medications.forEach(m => {
      let entry = `  • ${m.name}`;
      if (m.dosage)    entry += ` — ${m.dosage}`;
      if (m.frequency) entry += `, ${m.frequency}`;
      lines.push(entry);
    });
  }

  if (data.allergies?.length)
    lines.push(`\nAllergies: ${data.allergies.join(', ')}`);

  if (data.vital_signs?.length) {
    lines.push('\nVital Signs:');
    data.vital_signs.forEach(v => lines.push(`  • ${v.type}: ${v.value}`));
  }

  if (data.dates?.length) {
    lines.push('\nKey Dates:');
    data.dates.forEach(d => lines.push(`  • ${d.type}: ${d.date}`));
  }

  if (data.summary)
    lines.push(`\nSummary: ${data.summary}`);

  lines.push('\n=====================================================\n');
  lines.push('Doctor Notes:');
  return lines.join('\n');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{children}</p>
  );
}

function TagList({ label, items, tagClass = 'bg-violet-50 border-violet-200 text-violet-700', onChange }) {
  const [input, setInput] = useState('');

  function add() {
    const v = input.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setInput('');
  }

  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {items.map((item, i) => (
          <span key={i} className={`flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border ${tagClass}`}>
            {item}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="opacity-50 hover:opacity-100 leading-none text-base">×</button>
          </span>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-300 italic self-center">None extracted</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={`Add ${label.toLowerCase()}…`}
          className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 placeholder-slate-300"
        />
        <button onClick={add}
          className="text-xs px-3 py-1.5 rounded-lg border border-violet-300 text-violet-600 hover:bg-violet-50 transition-colors font-medium">
          Add
        </button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

/**
 * ClinicalExtractionModal
 *
 * Props:
 *   onApply(text: string) — called with formatted clinical text to insert into notes
 *   onClose()             — called when modal should close
 */
export default function ClinicalExtractionModal({ onApply, onClose }) {
  const { extract, data, isLoading, error, reset } = useClinicalNoteExtraction();
  const [noteText,  setNoteText]  = useState('');
  const [editData,  setEditData]  = useState(null);

  // Sync edit state when extraction returns
  useEffect(() => {
    if (data) setEditData(JSON.parse(JSON.stringify(data)));
  }, [data]);

  const display = editData || data;

  function handleApply() {
    onApply(formatForNotes(display));
    onClose();
  }

  function handleReset() {
    reset();
    setEditData(null);
  }

  function updateEdit(key, val) {
    setEditData(prev => ({ ...prev, [key]: val }));
  }

  function updateMed(i, field, val) {
    const meds = [...(display.medications || [])];
    meds[i] = { ...meds[i], [field]: val };
    updateEdit('medications', meds);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 48px)' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">AI Clinical Note Extraction</p>
              <p className="text-[10px] text-slate-400">Powered by Claude Haiku · Review before applying</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* STEP 1: Paste text */}
          {!display && !isLoading && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Paste any clinical note, discharge summary, or referral letter. The AI extracts diagnosis, procedures, medications, allergies, vital signs, and key dates for your review.
              </p>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Paste clinical note text here…&#10;&#10;e.g. SOAP note, discharge summary, specialist referral, operative report"
                className="w-full h-52 text-sm border border-slate-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700 placeholder-slate-300 leading-relaxed"
              />
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
              <p className="text-[11px] text-slate-400">
                PDFs / DOCX: copy and paste the text content · Max ~8,000 characters
              </p>
            </div>
          )}

          {/* STEP 2: Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 border-2 border-violet-200 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              </div>
              <p className="font-semibold text-slate-700">Extracting clinical data…</p>
              <p className="text-sm text-slate-400 text-center max-w-xs">
                Analyzing diagnosis, medications, procedures, dates, and allergies
              </p>
            </div>
          )}

          {/* STEP 3: Review extracted fields */}
          {display && !isLoading && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm font-medium">Extraction complete — edit any field before applying</p>
              </div>

              {/* Chief Complaint */}
              <div>
                <SectionLabel>Chief Complaint</SectionLabel>
                <input
                  value={display.chief_complaint || ''}
                  onChange={e => updateEdit('chief_complaint', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder-slate-300"
                  placeholder="None extracted"
                />
              </div>

              {/* Diagnosis */}
              <TagList
                label="Diagnosis"
                items={display.diagnosis || []}
                onChange={v => updateEdit('diagnosis', v)}
              />

              {/* Procedures */}
              <TagList
                label="Procedures"
                items={display.procedures || []}
                tagClass="bg-blue-50 border-blue-200 text-blue-700"
                onChange={v => updateEdit('procedures', v)}
              />

              {/* Medications */}
              <div>
                <SectionLabel>Medications</SectionLabel>
                {(display.medications?.length ?? 0) > 0 ? (
                  <div className="space-y-2">
                    {display.medications.map((med, i) => (
                      <div key={i} className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        {[['name', 'Drug name'], ['dosage', 'Dosage'], ['frequency', 'Frequency']].map(([field, ph]) => (
                          <input key={field}
                            value={med[field] || ''}
                            onChange={e => updateMed(i, field, e.target.value)}
                            placeholder={ph}
                            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 italic">None extracted</p>
                )}
              </div>

              {/* Allergies */}
              <TagList
                label="Allergies"
                items={display.allergies || []}
                tagClass="bg-red-50 border-red-200 text-red-700"
                onChange={v => updateEdit('allergies', v)}
              />

              {/* Vital Signs */}
              {(display.vital_signs?.length ?? 0) > 0 && (
                <div>
                  <SectionLabel>Vital Signs</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {display.vital_signs.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2">
                        <span className="text-xs text-slate-500 min-w-[60px]">{v.type}:</span>
                        <span className="text-xs font-semibold text-slate-800">{v.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Dates */}
              {(display.dates?.length ?? 0) > 0 && (
                <div>
                  <SectionLabel>Key Dates</SectionLabel>
                  <div className="space-y-1.5">
                    {display.dates.map((d, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs bg-slate-50 border border-slate-100 rounded-xl px-4 py-2">
                        <span className="text-slate-400 capitalize w-24 flex-shrink-0">{d.type}</span>
                        <span className="font-medium text-slate-700">{d.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {display.summary !== undefined && (
                <div>
                  <SectionLabel>Summary</SectionLabel>
                  <textarea
                    value={display.summary || ''}
                    onChange={e => updateEdit('summary', e.target.value)}
                    rows={3}
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 leading-relaxed"
                  />
                </div>
              )}

              <p className="text-[10px] text-slate-300">
                Model: {display.model} · Extracted {new Date(display.extracted_at).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
          {display ? (
            <>
              <button onClick={handleReset}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />Re-extract
              </button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="text-sm">Cancel</Button>
                <Button onClick={handleApply}
                  className="text-sm bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
                  <ArrowRight className="w-4 h-4" />Apply to Notes
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} className="text-sm">Cancel</Button>
              <Button
                onClick={() => extract(noteText)}
                disabled={isLoading || noteText.trim().length < 10}
                className="text-sm bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Extracting…</>
                  : <><Sparkles className="w-4 h-4" />Extract Clinical Data</>
                }
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
