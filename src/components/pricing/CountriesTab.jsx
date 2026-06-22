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

const EMPTY_FORM = { procedure_id: '', procedure_name: '', country: '', country_price_usd: '', price_adjustment_pct: '', is_available: true, notes: '' };

export default function CountriesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: entries = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['country-pricing'],
    queryFn: () => base44.entities.CountryPricing.list(),
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ['procedure-pricing'],
    queryFn: () => base44.entities.ProcedurePricing.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing?.id
      ? base44.entities.CountryPricing.update(editing.id, data)
      : base44.entities.CountryPricing.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['country-pricing'] });
      setEditing(null);
      toast({ title: editing?.id ? 'Country pricing updated' : 'Country pricing created' });
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CountryPricing.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['country-pricing'] });
      setDeleting(null);
      toast({ title: 'Entry deleted' });
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  });

  const openNew = () => { setForm(EMPTY_FORM); setEditing({}); };
  const openEdit = (p) => { setForm({ ...p }); setEditing(p); };
  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target ? e.target.value : e }));

  const handleProcedureChange = (id) => {
    const proc = procedures.find(p => p.id === id);
    setForm(prev => ({ ...prev, procedure_id: id, procedure_name: proc?.procedure_name || '' }));
  };

  const handleSave = () => {
    if (!form.procedure_id || !form.country || !form.country_price_usd) {
      toast({ title: 'Required fields missing', variant: 'destructive' }); return;
    }
    saveMutation.mutate({
      ...form,
      country_price_usd: Number(form.country_price_usd),
      price_adjustment_pct: form.price_adjustment_pct ? Number(form.price_adjustment_pct) : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Country Pricing
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Country Pricing</h2>
          <p className="text-sm text-slate-600 mt-1">Set localized prices and enable/disable countries per procedure</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Procedure</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Country</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Country Price</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Adjustment %</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Available</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-6"><LoadingState rows={3} dark={false} /></td></tr>
              ) : isError ? (
                <tr><td colSpan={6} className="px-6 py-6"><ErrorState dark={false} onRetry={refetch} /></td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-6"><EmptyState dark={false} title="No country pricing yet" message="Add one above to get started." /></td></tr>
              ) : entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{e.procedure_name || e.procedure_id}</td>
                  <td className="px-6 py-4 text-slate-600">{e.country}</td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600">{formatCurrency(e.country_price_usd)}</td>
                  <td className="px-6 py-4 text-right text-slate-600">{e.price_adjustment_pct != null ? `${e.price_adjustment_pct}%` : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${e.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                      {e.is_available ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => openEdit(e)} className="p-2 hover:bg-blue-100 text-blue-600 rounded"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDeleting(e)} className="p-2 hover:bg-red-100 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit Country Pricing' : 'New Country Pricing'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Procedure *</Label>
              <Select value={form.procedure_id} onValueChange={handleProcedureChange}>
                <SelectTrigger><SelectValue placeholder="Select procedure" /></SelectTrigger>
                <SelectContent>
                  {procedures.map(p => <SelectItem key={p.id} value={p.id}>{p.procedure_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Country *</Label>
              <Input value={form.country} onChange={f('country')} placeholder="e.g. Venezuela" />
            </div>
            <div>
              <Label>Country Price (USD) *</Label>
              <Input type="number" value={form.country_price_usd} onChange={f('country_price_usd')} />
            </div>
            <div>
              <Label>Adjustment %</Label>
              <Input type="number" value={form.price_adjustment_pct} onChange={f('price_adjustment_pct')} placeholder="-20 or +15" />
            </div>
            <div>
              <Label>Available</Label>
              <Select value={form.is_available ? 'yes' : 'no'} onValueChange={(v) => setForm(p => ({ ...p, is_available: v === 'yes' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={f('notes')} placeholder="Any special notes..." />
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
          <DialogHeader><DialogTitle>Delete Entry</DialogTitle></DialogHeader>
          <p className="text-slate-600">Delete pricing for <strong>{deleting?.country}</strong> — <strong>{deleting?.procedure_name}</strong>?</p>
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