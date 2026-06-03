import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Edit, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

const EMPTY_FORM = { doctor_id: '', doctor_name: '', procedure_id: '', procedure_name: '', doctor_price_usd: '', specialty_expertise_level: 'intermediate', promotional_discount_pct: '', approved_by_admin: false, notes: '' };

export default function DoctorPricingTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState('all'); // all | pending | approved

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['doctor-pricing'],
    queryFn: () => base44.entities.DoctorPricing.list(),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => base44.entities.Doctor.filter({ status: 'active' }),
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ['procedure-pricing'],
    queryFn: () => base44.entities.ProcedurePricing.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing?.id
      ? base44.entities.DoctorPricing.update(editing.id, data)
      : base44.entities.DoctorPricing.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor-pricing'] });
      setEditing(null);
      toast({ title: editing?.id ? 'Doctor pricing updated' : 'Doctor pricing created' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DoctorPricing.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor-pricing'] });
      setDeleting(null);
      toast({ title: 'Entry deleted' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approved }) => base44.entities.DoctorPricing.update(id, { approved_by_admin: approved }),
    onSuccess: (_, { approved }) => {
      qc.invalidateQueries({ queryKey: ['doctor-pricing'] });
      toast({ title: approved ? 'Pricing approved' : 'Approval revoked' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openNew = () => { setForm(EMPTY_FORM); setEditing({}); };
  const openEdit = (p) => { setForm({ ...p }); setEditing(p); };
  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target ? e.target.value : e }));

  const handleDoctorChange = (id) => {
    const doc = doctors.find(d => d.id === id);
    setForm(prev => ({ ...prev, doctor_id: id, doctor_name: doc?.full_name || '' }));
  };
  const handleProcedureChange = (id) => {
    const proc = procedures.find(p => p.id === id);
    setForm(prev => ({ ...prev, procedure_id: id, procedure_name: proc?.procedure_name || '' }));
  };

  const handleSave = () => {
    if (!form.doctor_id || !form.procedure_id || !form.doctor_price_usd) {
      toast({ title: 'Required fields missing', variant: 'destructive' }); return;
    }
    saveMutation.mutate({
      ...form,
      doctor_price_usd: Number(form.doctor_price_usd),
      promotional_discount_pct: form.promotional_discount_pct ? Number(form.promotional_discount_pct) : undefined,
    });
  };

  const pending = entries.filter(e => !e.approved_by_admin);
  const filtered = filter === 'pending' ? pending : filter === 'approved' ? entries.filter(e => e.approved_by_admin) : entries;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'pending', 'approved'].map(v => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1.5 text-sm rounded-full font-medium ${filter === v ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {v.charAt(0).toUpperCase() + v.slice(1)} {v === 'pending' && pending.length > 0 && `(${pending.length})`}
            </button>
          ))}
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Doctor Pricing
        </Button>
      </div>

      {pending.length > 0 && filter === 'all' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          ⚠️ <strong>{pending.length}</strong> doctor pricing {pending.length === 1 ? 'entry' : 'entries'} awaiting admin approval.
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Doctor Pricing</h2>
          <p className="text-sm text-slate-600 mt-1">Manage and approve doctor-specific procedure pricing</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Doctor</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Procedure</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Price</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Level</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Promo %</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Approved</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">No entries.</td></tr>
              ) : filtered.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{e.doctor_name}</td>
                  <td className="px-6 py-4 text-slate-600">{e.procedure_name}</td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600">${e.doctor_price_usd?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{e.specialty_expertise_level}</td>
                  <td className="px-6 py-4 text-right text-slate-600">{e.promotional_discount_pct != null ? `${e.promotional_discount_pct}%` : '—'}</td>
                  <td className="px-6 py-4 text-center">
                    {e.approved_by_admin
                      ? <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">Approved</span>
                      : <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">Pending</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-1 justify-center">
                      {!e.approved_by_admin
                        ? <button onClick={() => approveMutation.mutate({ id: e.id, approved: true })} title="Approve" className="p-2 hover:bg-emerald-100 text-emerald-600 rounded"><CheckCircle className="w-4 h-4" /></button>
                        : <button onClick={() => approveMutation.mutate({ id: e.id, approved: false })} title="Revoke" className="p-2 hover:bg-amber-100 text-amber-600 rounded"><XCircle className="w-4 h-4" /></button>}
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
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit Doctor Pricing' : 'New Doctor Pricing'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Doctor *</Label>
              <Select value={form.doctor_id} onValueChange={handleDoctorChange}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Procedure *</Label>
              <Select value={form.procedure_id} onValueChange={handleProcedureChange}>
                <SelectTrigger><SelectValue placeholder="Select procedure" /></SelectTrigger>
                <SelectContent>{procedures.map(p => <SelectItem key={p.id} value={p.id}>{p.procedure_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price (USD) *</Label>
              <Input type="number" value={form.doctor_price_usd} onChange={f('doctor_price_usd')} />
            </div>
            <div>
              <Label>Expertise Level</Label>
              <Select value={form.specialty_expertise_level} onValueChange={f('specialty_expertise_level')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['beginner', 'intermediate', 'expert'].map(v => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Promo Discount %</Label>
              <Input type="number" value={form.promotional_discount_pct} onChange={f('promotional_discount_pct')} />
            </div>
            <div>
              <Label>Approved</Label>
              <Select value={form.approved_by_admin ? 'yes' : 'no'} onValueChange={(v) => setForm(p => ({ ...p, approved_by_admin: v === 'yes' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={f('notes')} />
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
          <p className="text-slate-600">Delete pricing for <strong>{deleting?.doctor_name}</strong> — <strong>{deleting?.procedure_name}</strong>?</p>
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