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
import { formatDate } from '@/lib/format';

const RULE_TYPES = ['quantity', 'bundle', 'promotion', 'seasonal', 'referral', 'volume'];
const EMPTY_FORM = { rule_name: '', rule_type: 'promotion', discount_pct: '', start_date: '', end_date: '', is_active: true };

export default function MarkupTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: rules = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['pricing-rules'],
    queryFn: () => base44.entities.PricingRule.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing?.id
      ? base44.entities.PricingRule.update(editing.id, data)
      : base44.entities.PricingRule.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing-rules'] });
      setEditing(null);
      toast({ title: editing?.id ? 'Rule updated' : 'Rule created' });
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PricingRule.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing-rules'] });
      setDeleting(null);
      toast({ title: 'Rule deleted' });
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.PricingRule.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-rules'] }),
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  });

  const openNew = () => { setForm(EMPTY_FORM); setEditing({}); };
  const openEdit = (r) => { setForm({ ...r }); setEditing(r); };
  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target ? e.target.value : e }));

  const handleSave = () => {
    if (!form.rule_name || !form.rule_type || !form.discount_pct) {
      toast({ title: 'Required fields missing', variant: 'destructive' }); return;
    }
    saveMutation.mutate({ ...form, discount_pct: Number(form.discount_pct) });
  };

  const activeCount = rules.filter(r => r.is_active).length;
  const avgDiscount = rules.length > 0 ? (rules.reduce((s, r) => s + (r.discount_pct || 0), 0) / rules.length).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
          <p className="text-sm text-slate-600 mb-1">Active Rules</p>
          <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-slate-600 mb-1">Avg Discount</p>
          <p className="text-2xl font-bold text-blue-600">{avgDiscount}%</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-slate-600 mb-1">Total Rules</p>
          <p className="text-2xl font-bold text-purple-600">{rules.length}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Rule
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Pricing Rules</h2>
          <p className="text-sm text-slate-600 mt-1">Manage discount rules, promotions, and seasonal pricing</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Rule Name</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Type</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Discount %</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Valid Period</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Status</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-6"><LoadingState rows={3} dark={false} label="Loading pricing rules" /></td></tr>
              ) : isError ? (
                <tr><td colSpan={6} className="px-6 py-6"><ErrorState dark={false} onRetry={refetch} /></td></tr>
              ) : rules.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-6"><EmptyState dark={false} title="No pricing rules yet" message="Add a discount or promotion rule above." /></td></tr>
              ) : rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{r.rule_name}</td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{r.rule_type}</td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600">{r.discount_pct}%</td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {r.start_date || r.end_date ? `${formatDate(r.start_date)} → ${formatDate(r.end_date)}` : 'No expiry'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => toggleMutation.mutate({ id: r.id, is_active: !r.is_active })}
                      className={`px-2 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${r.is_active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => openEdit(r)} className="p-2 hover:bg-blue-100 text-blue-600 rounded"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDeleting(r)} className="p-2 hover:bg-red-100 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
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
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit Rule' : 'New Pricing Rule'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Rule Name *</Label>
              <Input value={form.rule_name} onChange={f('rule_name')} placeholder="e.g. Summer Promo" />
            </div>
            <div>
              <Label>Rule Type *</Label>
              <Select value={form.rule_type} onValueChange={f('rule_type')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RULE_TYPES.map(v => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Discount % *</Label>
              <Input type="number" value={form.discount_pct} onChange={f('discount_pct')} />
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={f('start_date')} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={f('end_date')} />
            </div>
            <div className="col-span-2">
              <Label>Status</Label>
              <Select value={form.is_active ? 'active' : 'inactive'} onValueChange={(v) => setForm(p => ({ ...p, is_active: v === 'active' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
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

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Rule</DialogTitle></DialogHeader>
          <p className="text-slate-600">Delete rule <strong>{deleting?.rule_name}</strong>?</p>
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