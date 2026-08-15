import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui-system/ConfirmDialog';
import { Activity, Plus, Search, Pencil, Trash2, Loader2, AlertCircle, ImagePlus } from 'lucide-react';

const DARK = '#060B16';
const GOLD = '#D4AF37';

const CATEGORIES = ['Cosmetic', 'Dental', 'Orthopedic', 'Cardiac', 'General Surgery', 'Bariatric', 'Ophthalmology', 'Fertility', 'ENT', 'Other'];
const RISK_LEVELS = ['Low', 'Medium', 'High', 'Very High'];

const riskColor = (r) => ({
  'Low': 'bg-emerald-100 text-emerald-700',
  'Medium': 'bg-amber-100 text-amber-700',
  'High': 'bg-orange-100 text-orange-700',
  'Very High': 'bg-red-100 text-red-700',
  'Not Yet Assessed': 'bg-slate-100 text-slate-500',
}[r] || 'bg-secondary text-secondary-foreground');

const EMPTY = {
  procedure_name: '', aliases: [], category: 'Cosmetic', description: '',
  typical_duration: '', recovery_time: '', risk_level: 'Medium',
  risk_factors: [], complication_rate: '', common_complications: [],
  recommended_qualifications: '', pre_op_requirements: [],
  red_flag_combinations: [], smoker_warning: '', questions_to_ask: [],
  is_active: true,
};

// Helper to edit a comma/newline-separated list field.
function listToText(arr) { return Array.isArray(arr) ? arr.join('\n') : ''; }
function textToList(txt) { return (txt || '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean); }

export default function AdminProcedureKnowledge() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // record being edited or EMPTY for new
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null); // working copy
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await base44.entities.ProcedureKnowledge.list('-updated_at', 200);
      setRecords(data || []);
    } catch (e) { setError(e?.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      (r.procedure_name || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q) ||
      (r.aliases || []).some((a) => a.toLowerCase().includes(q))
    );
  }, [records, query]);

  const openNew = () => { setEditing('new'); setForm({ ...EMPTY }); };
  const openEdit = (rec) => { setEditing(rec.id); setForm({ ...EMPTY, ...rec }); };
  const close = () => { setEditing(null); setForm(null); };

  const save = async () => {
    if (!form.procedure_name?.trim()) { setError('Procedure name is required'); return; }
    setSaving(true); setError(null);
    const payload = {
      ...form,
      aliases: textToList(typeof form.aliases === 'string' ? form.aliases : listToText(form.aliases)),
      risk_factors: textToList(typeof form.risk_factors === 'string' ? form.risk_factors : listToText(form.risk_factors)),
      common_complications: textToList(typeof form.common_complications === 'string' ? form.common_complications : listToText(form.common_complications)),
      pre_op_requirements: textToList(typeof form.pre_op_requirements === 'string' ? form.pre_op_requirements : listToText(form.pre_op_requirements)),
      questions_to_ask: textToList(typeof form.questions_to_ask === 'string' ? form.questions_to_ask : listToText(form.questions_to_ask)),
      updated_at: new Date().toISOString(),
    };
    try {
      if (editing === 'new') {
        const created = await base44.entities.ProcedureKnowledge.create(payload);
        setRecords((p) => [created, ...p]);
      } else {
        await base44.entities.ProcedureKnowledge.update(editing, payload);
        setRecords((p) => p.map((r) => (r.id === editing ? { ...r, ...payload } : r)));
      }
      close();
    } catch (e) { setError(e?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const generateMore = async () => {
    setGenerating(true); setGenerateStatus(null); setError(null);
    try {
      const res = await base44.functions.invoke('generateProcedureIllustrations', {});
      setGenerateStatus(res);
      await load();
    } catch (e) {
      setError(e?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (id) => {
    try {
      await base44.entities.ProcedureKnowledge.delete(id);
      setRecords((p) => p.filter((r) => r.id !== id));
    } catch (e) { setError(e?.message || 'Delete failed'); }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: DARK }}>
            <Activity className="h-6 w-6" style={{ color: GOLD }} />
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Procedure Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">M-Care's medical-procedure safety reference — risk, recovery, red flags, and questions to ask. Curate what M-Care guides travelers on.</p>
          </div>
          <Button variant="outline" onClick={generateMore} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Generate More Illustrations
          </Button>
          <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Add Procedure</Button>
        </div>

        {generateStatus && (
          <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Generated {generateStatus.generated} new illustration{generateStatus.generated === 1 ? '' : 's'} this run
            {generateStatus.failed?.length > 0 && ` (${generateStatus.failed.length} failed — retry by clicking again)`}.
            {' '}{generateStatus.remaining} of {generateStatus.total_target_list} procedures still don't have a picture — click again to keep going.
          </div>
        )}

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search procedure, category, or alias…" className="flex-1" />
              <Button variant="outline" onClick={load}>Refresh</Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No procedures yet. Add the first one.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <Card key={r.id} className={r.is_active === false ? 'opacity-60' : ''}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    {r.image_url && (
                      <img src={r.image_url} alt={r.procedure_name} className="h-16 w-16 flex-shrink-0 rounded-lg object-cover border border-border" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{r.procedure_name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${riskColor(r.risk_level)}`}>
                          {r.risk_level === 'Not Yet Assessed' ? 'Not yet assessed' : `${r.risk_level} risk`}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{r.category}</span>
                        {r.is_active === false && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inactive</span>}
                      </div>
                      {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        <span><b className="text-foreground">Duration:</b> {r.typical_duration || '—'}</span>
                        <span><b className="text-foreground">Recovery:</b> {r.recovery_time || '—'}</span>
                        <span><b className="text-foreground">Complication rate:</b> {r.complication_rate || '—'}</span>
                        <span><b className="text-foreground">Qualifications:</b> {r.recommended_qualifications || '—'}</span>
                      </div>
                      {r.risk_factors?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.risk_factors.map((k, i) => <span key={i} className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">{k}</span>)}
                        </div>
                      )}
                      {r.red_flag_combinations?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {r.red_flag_combinations.map((rf, i) => (
                            <p key={i} className="text-xs text-red-600">⚠ {rf.combination} — {rf.severity}. {rf.requirement}</p>
                          ))}
                        </div>
                      )}
                      {r.questions_to_ask?.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-medium text-primary">Questions to ask surgeon ({r.questions_to_ask.length})</summary>
                          <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground space-y-0.5">
                            {r.questions_to_ask.map((q, i) => <li key={i}>{q}</li>)}
                          </ul>
                        </details>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 flex-col gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(r)} className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(r.id)} className="gap-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Add Procedure' : 'Edit Procedure'}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              <div className="sm:col-span-2"><Label>Procedure name *</Label>
                <Input value={form.procedure_name} onChange={(e) => setForm({ ...form, procedure_name: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Aliases (one per line)</Label>
                <Textarea rows={2} value={typeof form.aliases === 'string' ? form.aliases : listToText(form.aliases)} onChange={(e) => setForm({ ...form, aliases: e.target.value })} placeholder="butt lift&#10;gluteal augmentation" /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label>Risk level</Label>
                <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RISK_LEVELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="sm:col-span-2"><Label>Description (what it is)</Label>
                <Textarea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Typical duration</Label><Input value={form.typical_duration || ''} onChange={(e) => setForm({ ...form, typical_duration: e.target.value })} placeholder="2-4 hours" /></div>
              <div><Label>Recovery time</Label><Input value={form.recovery_time || ''} onChange={(e) => setForm({ ...form, recovery_time: e.target.value })} placeholder="7-14 days" /></div>
              <div><Label>Complication rate</Label><Input value={form.complication_rate || ''} onChange={(e) => setForm({ ...form, complication_rate: e.target.value })} placeholder="1 in 500" /></div>
              <div><Label>Recommended qualifications</Label><Input value={form.recommended_qualifications || ''} onChange={(e) => setForm({ ...form, recommended_qualifications: e.target.value })} placeholder="Board-certified plastic surgeon, accredited hospital" /></div>
              <div><Label>Risk factors (one per line)</Label>
                <Textarea rows={3} value={typeof form.risk_factors === 'string' ? form.risk_factors : listToText(form.risk_factors)} onChange={(e) => setForm({ ...form, risk_factors: e.target.value })} placeholder="Diabetes&#10;Hypertension&#10;Smoking" /></div>
              <div><Label>Common complications (one per line)</Label>
                <Textarea rows={3} value={typeof form.common_complications === 'string' ? form.common_complications : listToText(form.common_complications)} onChange={(e) => setForm({ ...form, common_complications: e.target.value })} placeholder="Infection&#10;Bleeding&#10;Scarring" /></div>
              <div><Label>Pre-op requirements (one per line)</Label>
                <Textarea rows={3} value={typeof form.pre_op_requirements === 'string' ? form.pre_op_requirements : listToText(form.pre_op_requirements)} onChange={(e) => setForm({ ...form, pre_op_requirements: e.target.value })} placeholder="Blood work&#10;Medical clearance&#10;Fasting 8 hours" /></div>
              <div><Label>Questions to ask surgeon (one per line)</Label>
                <Textarea rows={4} value={typeof form.questions_to_ask === 'string' ? form.questions_to_ask : listToText(form.questions_to_ask)} onChange={(e) => setForm({ ...form, questions_to_ask: e.target.value })} placeholder="How many times have you performed this?&#10;What is your complication rate?" /></div>
              <div className="sm:col-span-2"><Label>Smoker warning</Label>
                <Textarea rows={2} value={form.smoker_warning || ''} onChange={(e) => setForm({ ...form, smoker_warning: e.target.value })} placeholder="Smoking raises wound-healing/infection risk — quit ≥4-6 weeks before and after." /></div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.is_active !== false}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label>Active (M-Care surfaces this in lookups)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => remove(confirmDeleteId)}
        title="Delete procedure?"
        message="Delete this procedure from the knowledge base?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}