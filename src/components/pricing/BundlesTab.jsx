import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import LoadingState from '@/components/ui-system/LoadingState';
import ErrorState from '@/components/ui-system/ErrorState';
import EmptyState from '@/components/ui-system/EmptyState';
import { formatCurrency } from '@/lib/format';

const EMPTY_FORM = { bundle_name: '', bundle_description: '', procedures_included: [], individual_total_usd: '', bundle_price_usd: '', bundle_discount_pct: '', savings_message: '', is_active: true };

export default function BundlesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [procInput, setProcInput] = useState('');

  const { data: bundles = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['procedure-bundles'],
    queryFn: () => base44.entities.ProcedureBundle.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing?.id
      ? base44.entities.ProcedureBundle.update(editing.id, data)
      : base44.entities.ProcedureBundle.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procedure-bundles'] });
      setEditing(null);
      toast({ title: editing?.id ? 'Bundle updated' : 'Bundle created' });
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProcedureBundle.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procedure-bundles'] });
      setDeleting(null);
      toast({ title: 'Bundle deleted' });
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  });

  const openNew = () => { setForm(EMPTY_FORM); setProcInput(''); setEditing({}); };
  const openEdit = (b) => { setForm({ ...b, procedures_included: b.procedures_included || [] }); setProcInput(''); setEditing(b); };
  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target ? e.target.value : e }));

  const addProc = () => {
    const v = procInput.trim();
    if (v && !form.procedures_included.includes(v)) {
      setForm(prev => ({ ...prev, procedures_included: [...prev.procedures_included, v] }));
    }
    setProcInput('');
  };
  const removeProc = (p) => setForm(prev => ({ ...prev, procedures_included: prev.procedures_included.filter(x => x !== p) }));

  const handleSave = () => {
    if (!form.bundle_name || !form.bundle_price_usd) {
      toast({ title: 'Required fields missing', variant: 'destructive' }); return;
    }
    saveMutation.mutate({
      ...form,
      individual_total_usd: form.individual_total_usd ? Number(form.individual_total_usd) : undefined,
      bundle_price_usd: Number(form.bundle_price_usd),
      bundle_discount_pct: form.bundle_discount_pct ? Number(form.bundle_discount_pct) : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Bundle
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Procedure Bundles</h2>
          <p className="text-sm text-slate-600 mt-1">Create combo packages with special pricing</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Bundle</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Procedures</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Individual Total</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Bundle Price</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Discount %</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-6"><LoadingState rows={3} dark={false} label="Loading bundles" /></td></tr>
              ) : isError ? (
                <tr><td colSpan={7} className="px-6 py-6"><ErrorState dark={false} onRetry={refetch} /></td></tr>
              ) : bundles.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-6"><EmptyState dark={false} title="No bundles yet" message="Create a combo package above." /></td></tr>
              ) : bundles.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{b.bundle_name}</td>
                  <td className="px-6 py-4 text-slate-600">{(b.procedures_included || []).length} procedures</td>
                  <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(b.individual_total_usd)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600">{formatCurrency(b.bundle_price_usd)}</td>
                  <td className="px-6 py-4 text-right text-slate-600">{b.bundle_discount_pct != null ? `${b.bundle_discount_pct}%` : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${b.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => openEdit(b)} className="p-2 hover:bg-blue-100 text-blue-600 rounded"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDeleting(b)} className="p-2 hover:bg-red-100 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit Bundle' : 'New Bundle'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Bundle Name *</Label>
              <Input value={form.bundle_name} onChange={f('bundle_name')} placeholder="e.g. Smile Makeover" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Input value={form.bundle_description} onChange={f('bundle_description')} />
            </div>
            <div>
              <Label>Individual Total (USD)</Label>
              <Input type="number" value={form.individual_total_usd} onChange={f('individual_total_usd')} />
            </div>
            <div>
              <Label>Bundle Price (USD) *</Label>
              <Input type="number" value={form.bundle_price_usd} onChange={f('bundle_price_usd')} />
            </div>
            <div>
              <Label>Discount %</Label>
              <Input type="number" value={form.bundle_discount_pct} onChange={f('bundle_discount_pct')} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.is_active ? 'active' : 'inactive'} onValueChange={(v) => setForm(p => ({ ...p, is_active: v === 'active' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Savings Message</Label>
              <Input value={form.savings_message} onChange={f('savings_message')} placeholder="e.g. Save $500 with this bundle" />
            </div>
            <div className="col-span-2">
              <Label>Procedures Included</Label>
              <div className="flex gap-2 mt-1">
                <Input value={procInput} onChange={e => setProcInput(e.target.value)} placeholder="Type procedure name and press Add"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addProc())} />
                <Button type="button" variant="outline" onClick={addProc}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.procedures_included.map(p => (
                  <span key={p} className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                    {p}
                    <button onClick={() => removeProc(p)} className="ml-1 text-emerald-600 hover:text-red-600">×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing?.id ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Bundle</DialogTitle></DialogHeader>
          <p className="text-slate-600">Delete bundle <strong>{deleting?.bundle_name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleting.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}