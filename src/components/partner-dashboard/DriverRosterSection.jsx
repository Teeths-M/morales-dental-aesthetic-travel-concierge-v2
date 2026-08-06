import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const GOLD = '#D4AF37';

/**
 * DriverRosterSection — Transport Partner Platform, Foundation. TaxiService
 * used to have exactly one driver_name/driver_license_number STRING pair on
 * the company row — no way to represent a real fleet. This is the first
 * dashboard surface that reads/writes the new Driver entity (base44/entities/
 * Driver.jsonc), scoped to the caller's own company via Driver's RLS
 * (data.taxi_service_email === caller's own email — enforced server-side,
 * not just by this component only ever setting it to `taxi.email`).
 *
 * license_verified is deliberately READ-ONLY here — it can only ever be set
 * true by an admin review action, never by the company adding its own
 * drivers. A newly-added driver always starts unverified.
 */
export default function DriverRosterSection({ taxi }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ driver_name: '', driver_license_number: '', phone: '', vehicle_type: '', vehicle_plate: '' });

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['taxi-drivers', taxi?.id],
    queryFn: () => base44.entities.Driver.filter({ taxi_service_id: taxi.id }, '-created_date', 50).catch(() => []),
    enabled: !!taxi?.id,
    staleTime: 30_000,
  });

  const resetForm = () => setForm({ driver_name: '', driver_license_number: '', phone: '', vehicle_type: '', vehicle_plate: '' });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.driver_name.trim() || !form.driver_license_number.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Driver.create({
        taxi_service_id: taxi.id,
        taxi_service_email: taxi.email,
        driver_name: form.driver_name.trim(),
        driver_license_number: form.driver_license_number.trim(),
        phone: form.phone.trim(),
        vehicle_type: form.vehicle_type.trim(),
        vehicle_plate: form.vehicle_plate.trim(),
      });
      resetForm();
      setAdding(false);
      queryClient.invalidateQueries({ queryKey: ['taxi-drivers', taxi.id] });
      toast.success('Driver added');
    } catch (_) {
      toast.error('Could not add driver');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (driver) => {
    const next = driver.status === 'active' ? 'inactive' : 'active';
    try {
      await base44.entities.Driver.update(driver.id, { status: next });
      queryClient.invalidateQueries({ queryKey: ['taxi-drivers', taxi.id] });
    } catch (_) {
      toast.error('Could not update driver');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: GOLD }} />
          <h2 className="text-sm font-semibold text-white">Drivers &amp; Vehicles ({drivers.length})</h2>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: 'rgba(212,175,55,0.1)', color: GOLD, border: '1px solid rgba(212,175,55,0.25)' }}
        >
          {adding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {adding ? 'Cancel' : 'Add Driver'}
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="rounded-2xl p-4 mb-3 space-y-3" style={{ background: '#0C1A1D', border: '1px solid rgba(212,175,55,0.25)' }}>
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Driver name" value={form.driver_name}
              onChange={(e) => setForm((f) => ({ ...f, driver_name: e.target.value }))}
              className="col-span-2 sm:col-span-1 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none" />
            <input required placeholder="License number" value={form.driver_license_number}
              onChange={(e) => setForm((f) => ({ ...f, driver_license_number: e.target.value }))}
              className="col-span-2 sm:col-span-1 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none" />
            <input placeholder="Phone" value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none" />
            <input placeholder="Vehicle type" value={form.vehicle_type}
              onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value }))}
              className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none" />
            <input placeholder="Plate number" value={form.vehicle_plate}
              onChange={(e) => setForm((f) => ({ ...f, vehicle_plate: e.target.value }))}
              className="col-span-2 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none" />
          </div>
          <button type="submit" disabled={saving || !form.driver_name.trim() || !form.driver_license_number.trim()}
            className="w-full py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: GOLD, color: '#060B16' }}>
            {saving ? 'Adding...' : 'Add to roster'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
          <p className="text-sm" style={{ color: '#64748b' }}>No drivers on your roster yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {drivers.map((d) => (
            <div key={d.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{d.driver_name}</p>
                <p className="text-xs truncate" style={{ color: '#64748b' }}>
                  {d.driver_license_number}{d.vehicle_type ? ` · ${d.vehicle_type}` : ''}{d.vehicle_plate ? ` · ${d.vehicle_plate}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: d.license_verified ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
                    color: d.license_verified ? '#22c55e' : '#94a3b8',
                  }}>
                  {d.license_verified ? 'Verified' : 'Unverified'}
                </span>
                <button onClick={() => toggleStatus(d)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/10 text-white/60 hover:bg-white/5">
                  {d.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
