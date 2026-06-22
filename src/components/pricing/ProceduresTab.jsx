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

const EMPTY_FORM = {
  procedure_name: '', category: '', subcategory: '', base_price_usd: '',
  min_price_usd: '', max_price_usd: '', complexity_level: 'moderate',
  estimated_time_minutes: '', recovery_days: '', is_active: true,
};

export default function ProceduresTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(null); // null = closed, {} = new, record = edit
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: procedures = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['procedure-pricing'],
    queryFn: () => base44.entities.ProcedurePricing.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing?.id
      ? base44.entities.ProcedurePricing.update(editing.id, data)
      : base44.entities.ProcedurePricing.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procedure-pricing'] });
      setEditing(null);
      toast({ title: editing?.id ? 'Procedure updated' : 'Procedure created' });
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProcedurePricing.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procedure-pricing'] });
      setDeleting(null);
      toast({ title: 'Procedure deleted' });
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  });

  const openNew = () => { setForm(EMPTY_FORM); setEditing({}); };
  const openEdit = (p) => { setForm({ ...p }); setEditing(p); };
  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target ? e.target.value : e }));

  const handleSave = () => {
    if (!form.procedure_name || !form.category || !form.base_price_usd) {
      toast({ title: 'Required fields missing', variant: 'destructive' }); return;
    }
    saveMutation.mutate({
      ...form,
      base_price_usd: Number(form.base_price_usd),
      min_price_usd: form.min_price_usd ? Number(form.min_price_usd) : undefined,
      max_price_usd: form.max_price_usd ? Number(form.max_price_usd) : undefined,
      estimated_time_minutes: form.estimated_time_minutes ? Number(form.estimated_time_minutes) : undefined,
      recovery_days: form.recovery_days ? Number(form.recovery_days) : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Procedure
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">All Procedures</h2>
          <p className="text-sm text-slate-600 mt-1">Manage base pricing, complexity, and recovery settings</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Procedure</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Category</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Base Price</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Min – Max</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Complexity</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-6"><LoadingState rows={3} dark={false} /></td></tr>
              ) : isError ? (
                <tr><td colSpan={7} className="px-6 py-6"><ErrorState dark={false} onRetry={refetch} /></td></tr>
              ) : procedures.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-6"><EmptyState dark={false} title="No procedures yet" message="Add one above to get started." /></td></tr>
              ) : procedures.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{p.procedure_name}</td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{p.category}</td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600">{formatCurrency(p.base_price_usd)}</td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {p.min_price_usd || p.max_price_usd ? `${formatCurrency(p.min_price_usd)} – ${formatCurrency(p.max_price_usd)}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{p.complexity_level}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => openEdit(p)} className="p-2 hover:bg-blue-100 text-blue-600 rounded"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDeleting(p)} className="p-2 hover:bg-red-100 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit Procedure' : 'New Procedure'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Procedure Name *</Label>
              <Input value={form.procedure_name} onChange={f('procedure_name')} placeholder="e.g. Dental Crown" />
            </div>
            <div>
              <Label>Category *</Label>
              <Input value={form.category} onChange={f('category')} placeholder="e.g. Dental" />
            </div>
            <div>
              <Label>Subcategory</Label>
              <Input value={form.subcategory} onChange={f('subcategory')} placeholder="e.g. Implants" />
            </div>
            <div>
              <Label>Base Price (USD) *</Label>
              <Input type="number" value={form.base_price_usd} onChange={f('base_price_usd')} />
            </div>
            <div>
              <Label>Complexity</Label>
              <Select value={form.complexity_level} onValueChange={f('complexity_level')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['simple', 'moderate', 'complex', 'advanced'].map(v => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Min Price (USD)</Label>
              <Input type="number" value={form.min_price_usd} onChange={f('min_price_usd')} />
            </div>
            <div>
              <Label>Max Price (USD)</Label>
              <Input type="number" value={form.max_price_usd} onChange={f('max_price_usd')} />
            </div>
            <div>
              <Label>Est. Time (min)</Label>
              <Input type="number" value={form.estimated_time_minutes} onChange={f('estimated_time_minutes')} />
            </div>
            <div>
              <Label>Recovery Days</Label>
              <Input type="number" value={form.recovery_days} onChange={f('recovery_days')} />
            </div>
            <div className="col-span-2">
              <Label>Status</Label>
              <Select value={form.is_active ? 'active' : 'inactive'} onValueChange={(v) => setForm(p => ({ ...p, is_active: v === 'active' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Delete Confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Procedure</DialogTitle></DialogHeader>
          <p className="text-slate-600">Delete <strong>{deleting?.procedure_name}</strong>? This cannot be undone.</p>
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