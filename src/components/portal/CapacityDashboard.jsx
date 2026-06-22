import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  RefreshCw, Users, TrendingUp, Zap, CheckCircle2, Clock, Edit2, Save, X
} from 'lucide-react';

function formatMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'short', year: 'numeric' });
}

function UtilizationBar({ pct }) {
  const color = pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="w-full bg-secondary rounded-full h-2 mt-1">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function MonthCard({ month, onSave }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({
    capacity_limit: month.capacity_limit,
    scarcity_markup_threshold: month.scarcity_markup_threshold,
    base_markup_pct: month.base_markup_pct,
    scarcity_markup_pct: month.scarcity_markup_pct,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.functions.invoke('capacityCheck', {
      action: 'update_capacity',
      record_id: month.record_id,
      updates: {
        capacity_limit: Number(fields.capacity_limit),
        scarcity_markup_threshold: Number(fields.scarcity_markup_threshold),
        base_markup_pct: Number(fields.base_markup_pct),
        scarcity_markup_pct: Number(fields.scarcity_markup_pct),
      },
    });
    setSaving(false);
    setEditing(false);
    onSave();
  };

  return (
    <div className={`bg-card border rounded-2xl p-5 ${month.is_full ? 'border-red-200' : 'border-border'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-foreground">{formatMonth(month.year_month)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {month.confirmed_count} / {month.capacity_limit} confirmed
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {month.is_full && (
            <span className="text-[11px] bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">FULL</span>
          )}
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            month.active_markup_pct > month.base_markup_pct
              ? 'bg-amber-100 text-amber-700'
              : 'bg-secondary text-muted-foreground'
          }`}>
            <Zap className="w-2.5 h-2.5 inline mr-0.5" />{month.active_markup_pct}% markup
          </span>
        </div>
      </div>

      <UtilizationBar pct={month.utilization_pct} />
      <p className="text-xs text-muted-foreground mt-1">{month.utilization_pct}% utilization</p>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {month.waiting_list_count} waiting</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> {month.converted_count} converted</span>
        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {month.remaining} left</span>
      </div>

      {!editing ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 h-7 text-xs text-muted-foreground gap-1 hover:text-foreground"
          onClick={() => setEditing(true)}
        >
          <Edit2 className="w-3 h-3" /> Override
        </Button>
      ) : (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Max Capacity</Label>
              <Input type="number" value={fields.capacity_limit} className="h-8 text-sm mt-1"
                onChange={e => setFields(f => ({ ...f, capacity_limit: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Scarcity Threshold</Label>
              <Input type="number" value={fields.scarcity_markup_threshold} className="h-8 text-sm mt-1"
                onChange={e => setFields(f => ({ ...f, scarcity_markup_threshold: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Base Markup %</Label>
              <Input type="number" value={fields.base_markup_pct} className="h-8 text-sm mt-1"
                onChange={e => setFields(f => ({ ...f, base_markup_pct: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Scarcity Markup %</Label>
              <Input type="number" value={fields.scarcity_markup_pct} className="h-8 text-sm mt-1"
                onChange={e => setFields(f => ({ ...f, scarcity_markup_pct: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs gap-1" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : <><Save className="w-3 h-3" /> Save</>}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setEditing(false)}>
              <X className="w-3 h-3" /> Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function WaitingListTable({ list }) {
  const active = list.filter(w => w.status === 'waiting' || w.status === 'notified');
  if (active.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-8">No active waiting list entries.</p>
  );

  const statusColor = {
    waiting: 'bg-muted text-muted-foreground',
    notified: 'bg-blue-100 text-blue-700',
    converted: 'bg-green-100 text-green-700',
    expired: 'bg-secondary text-muted-foreground',
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Patient</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Month</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Procedure</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Offer Expires</th>
          </tr>
        </thead>
        <tbody>
          {active.map(w => (
            <tr key={w.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{w.patient_name}</p>
                <p className="text-xs text-muted-foreground">{w.email}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatMonth(w.desired_month)}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                {w.procedure_interest?.replace(/_/g, ' ') || '—'}
              </td>
              <td className="px-4 py-3">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColor[w.status]}`}>
                  {w.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {w.offer_expires_at
                  ? new Date(w.offer_expires_at).toLocaleString()
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CapacityDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('capacity'); // 'capacity' | 'waitlist'

  const load = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('capacityCheck', { action: 'get_overview' });
    setData(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
      <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading capacity data…
    </div>
  );

  if (!data) return null;

  // Summary stats
  const totalConfirmed = data.overview.reduce((s, m) => s + m.confirmed_count, 0);
  const totalWaiting = data.waiting_list.filter(w => w.status === 'waiting').length;
  const totalConverted = data.waiting_list.filter(w => w.status === 'converted').length;
  const conversionRate = totalWaiting + totalConverted > 0
    ? Math.round((totalConverted / (totalWaiting + totalConverted)) * 100)
    : 0;

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Confirmed', value: totalConfirmed, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'On Waiting List', value: totalWaiting, icon: Clock, color: 'text-amber-600' },
          { label: 'WL Converted', value: totalConverted, icon: TrendingUp, color: 'text-primary' },
          { label: 'WL Conversion Rate', value: `${conversionRate}%`, icon: Zap, color: 'text-accent' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className={`font-display text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setView('capacity')}
          className={`text-sm font-medium px-4 py-1.5 rounded-full border transition-colors ${
            view === 'capacity'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          Monthly Capacity
        </button>
        <button
          onClick={() => setView('waitlist')}
          className={`text-sm font-medium px-4 py-1.5 rounded-full border transition-colors ${
            view === 'waitlist'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          Waiting List {totalWaiting > 0 && `(${totalWaiting})`}
        </button>
        <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs gap-1.5" onClick={load}>
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {view === 'capacity' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.overview.map(month => (
            <MonthCard key={month.year_month} month={month} onSave={load} />
          ))}
        </div>
      )}

      {view === 'waitlist' && (
        <WaitingListTable list={data.waiting_list} />
      )}
    </div>
  );
}