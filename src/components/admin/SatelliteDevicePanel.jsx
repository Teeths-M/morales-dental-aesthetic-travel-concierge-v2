import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Send, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const GOLD = '#D4AF37';

const DEVICE_LABELS = {
  rockblock_iridium: { icon: '🛰️', name: 'RockBLOCT / Iridium SBD',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30'  },
  inreach_sms:       { icon: '📡', name: 'Garmin inReach (SMS)',       badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  inreach_email:     { icon: '📧', name: 'Garmin inReach (Email)',     badge: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  iphone_guidance:   { icon: '📱', name: 'iPhone Native Satellite',    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/30'  },
};

const STATUS_COLORS = {
  verified: 'text-emerald-400',
  pending:  'text-amber-400',
  inactive: 'text-slate-500',
};

function DeviceCard({ device, onSendMessage }) {
  const meta   = DEVICE_LABELS[device.device_type] || DEVICE_LABELS.iphone_guidance;
  const status = STATUS_COLORS[device.registration_status] || STATUS_COLORS.pending;

  return (
    <div className="rounded-2xl p-4" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <p className="text-sm font-semibold text-white">{device.device_label || meta.name}</p>
            <p className="text-xs text-white/45">{device.patient_name || device.patient_email}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${meta.badge}`}>
          {meta.name.split(' ')[0]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Status</p>
          <p className={`text-xs font-semibold ${status}`}>{device.registration_status}</p>
        </div>
        <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Messages</p>
          <p className="text-xs font-semibold text-white">{device.messages_sent || 0} sent · {device.messages_received || 0} received</p>
        </div>
      </div>

      {device.last_gps_lat && device.last_gps_lng && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-emerald-400">
          <MapPin className="w-3 h-3" />
          Last GPS: {Number(device.last_gps_lat).toFixed(4)}, {Number(device.last_gps_lng).toFixed(4)}
          {device.last_ping_at && (
            <span className="text-white/30 ml-1">
              · {new Date(device.last_ping_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {device.last_mo_message && (
        <div className="rounded-xl px-3 py-2 mb-3" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider mb-0.5">Last message from device</p>
          <p className="text-xs text-emerald-300 font-mono">{device.last_mo_message}</p>
        </div>
      )}

      <Button
        size="sm"
        onClick={() => onSendMessage(device)}
        className="w-full h-9 text-xs gap-1.5"
        style={{ background: 'rgba(212,175,55,0.1)', color: GOLD, border: `1px solid rgba(212,175,55,0.3)` }}
      >
        <Send className="w-3.5 h-3.5" /> Send Satellite Message
      </Button>
    </div>
  );
}

function RegisterForm({ onSuccess }) {
  const [form, setForm] = useState({
    case_id: '', device_type: 'rockblock_iridium',
    rock7_imei: '', device_phone: '', device_label: '',
    include_in_package: false, send_test: true,
  });

  const mut = useMutation({
    mutationFn: () => base44.functions.invoke('registerSatelliteDevice', form),
    onSuccess:  () => { onSuccess(); setForm(f => ({ ...f, case_id: '', rock7_imei: '', device_phone: '' })); },
  });

  return (
    <div className="rounded-2xl p-5" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: GOLD }}>Register Satellite Device</p>

      <div className="space-y-3">
        <Input placeholder="Case ID" value={form.case_id} onChange={e => setForm(f => ({ ...f, case_id: e.target.value }))}
          className="bg-white/[0.04] border-white/10 text-white text-sm placeholder:text-white/30 h-11" />

        <select value={form.device_type} onChange={e => setForm(f => ({ ...f, device_type: e.target.value }))}
          className="w-full h-11 rounded-xl px-3 text-sm font-medium bg-white/[0.04] border border-white/10 text-white"
          style={{ outline: 'none' }}>
          {Object.entries(DEVICE_LABELS).map(([k, v]) => (
            <option key={k} value={k} className="bg-slate-900">{v.icon} {v.name}</option>
          ))}
        </select>

        {form.device_type === 'rockblock_iridium' && (
          <Input placeholder="Rock Seven IMEI (15 digits)" value={form.rock7_imei}
            onChange={e => setForm(f => ({ ...f, rock7_imei: e.target.value }))}
            className="bg-white/[0.04] border-white/10 text-white text-sm placeholder:text-white/30 h-11" />
        )}

        {(form.device_type === 'inreach_sms' || form.device_type === 'inreach_email') && (
          <Input placeholder="Device phone number (+1…)" value={form.device_phone}
            onChange={e => setForm(f => ({ ...f, device_phone: e.target.value }))}
            className="bg-white/[0.04] border-white/10 text-white text-sm placeholder:text-white/30 h-11" />
        )}

        <Input placeholder="Device label (e.g. Garmin inReach Mini 2 — silver)"
          value={form.device_label} onChange={e => setForm(f => ({ ...f, device_label: e.target.value }))}
          className="bg-white/[0.04] border-white/10 text-white text-sm placeholder:text-white/30 h-11" />

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.include_in_package}
              onChange={e => setForm(f => ({ ...f, include_in_package: e.target.checked }))}
              className="w-4 h-4 rounded accent-amber-400" />
            <span className="text-xs text-white/60">Include in patient's care package</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.send_test}
              onChange={e => setForm(f => ({ ...f, send_test: e.target.checked }))}
              className="w-4 h-4 rounded accent-amber-400" />
            <span className="text-xs text-white/60">Send verification message</span>
          </label>
        </div>

        <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.case_id}
          className="w-full h-12 text-sm font-semibold" style={{ background: GOLD, color: '#060B16' }}>
          {mut.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Registering…</> : '+ Register Device'}
        </Button>

        {mut.isSuccess && (
          <div className="flex items-center gap-2 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4" /> Device registered. Verification message sent via satellite.
          </div>
        )}
        {mut.isError && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertTriangle className="w-4 h-4" /> {mut.error?.message || 'Registration failed'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SatelliteDevicePanel() {
  const queryClient = useQueryClient();
  const [sendTarget, setSendTarget] = useState(null);
  const [customMsg,  setCustomMsg]  = useState('');

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['satellite-devices'],
    queryFn:  () => base44.asServiceRole.entities.SatelliteDevice.list('-created_date', 100),
    staleTime: 60_000,
  });

  const sendMut = useMutation({
    mutationFn: (device) => base44.functions.invoke('sendSatelliteMessage', {
      case_id: device.case_id,
      message: customMsg || `MORALES: Admin message. Reply SAFE to confirm. — Morales Concierge`,
      reason:  'admin_manual',
    }),
    onSuccess: () => { setSendTarget(null); setCustomMsg(''); queryClient.invalidateQueries({ queryKey: ['satellite-devices'] }); },
  });

  const activeDevices   = devices.filter(d => d.registration_status !== 'inactive');
  const verifiedCount   = devices.filter(d => d.registration_status === 'verified').length;
  const withGPS         = devices.filter(d => d.last_gps_lat).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Registered', value: devices.length, icon: '🛰️' },
          { label: 'Verified',   value: verifiedCount,  icon: '✅' },
          { label: 'GPS Active', value: withGPS,         icon: '📍' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-2xl font-semibold text-white">{s.value}</p>
            <p className="text-xs text-white/40">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Device list */}
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>
            Registered Devices ({activeDevices.length})
          </p>
          {isLoading ? (
            <div className="flex items-center gap-2 text-white/40 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : activeDevices.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: '#0C1A1D', border: '1px dashed #2A3F4A' }}>
              <p className="text-3xl mb-3">🛰️</p>
              <p className="text-sm text-white/50">No satellite devices registered yet.</p>
              <p className="text-xs text-white/30 mt-1">Register a device for high-risk destination patients.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDevices.map(d => (
                <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <DeviceCard device={d} onSendMessage={setSendTarget} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Register form + send message form */}
        <div className="space-y-4">
          <RegisterForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ['satellite-devices'] })} />

          {sendTarget && (
            <div className="rounded-2xl p-5" style={{ background: '#0C1A1D', border: `1px solid rgba(212,175,55,0.35)` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: GOLD }}>
                📤 Send Satellite Message
              </p>
              <p className="text-xs text-white/50 mb-3">
                To: <strong className="text-white/70">{sendTarget.patient_name}</strong> via {DEVICE_LABELS[sendTarget.device_type]?.name}
              </p>
              <textarea
                value={customMsg}
                onChange={e => setCustomMsg(e.target.value)}
                placeholder="Message (max 330 chars for Iridium SBD)…"
                maxLength={330}
                rows={3}
                className="w-full rounded-xl p-3 text-sm text-white placeholder:text-white/30 resize-none mb-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
              />
              <div className="flex gap-2">
                <Button onClick={() => sendMut.mutate(sendTarget)} disabled={sendMut.isPending}
                  className="flex-1 h-11 text-sm font-semibold" style={{ background: GOLD, color: '#060B16' }}>
                  {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sendMut.isPending ? ' Transmitting…' : ' Send via Satellite'}
                </Button>
                <Button variant="outline" onClick={() => { setSendTarget(null); setCustomMsg(''); }}
                  className="h-11 px-4 text-sm border-white/10 text-white/50">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* How to configure */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Setup Required</p>
            <div className="space-y-2 text-xs text-white/50 leading-relaxed">
              <p><strong className="text-white/70">Rock Seven:</strong> Add <code className="text-amber-400">ROCK7_USERNAME</code> + <code className="text-amber-400">ROCK7_PASSWORD</code> to Base44 secrets. In Rock Seven Online → Device → Delivery Groups → HTTP POST → set URL to your <code className="text-amber-400">/receiveSatelliteWebhook</code> endpoint.</p>
              <p><strong className="text-white/70">Garmin inReach:</strong> No extra credentials — uses existing Twilio. Add the device's assigned SMS number as <code className="text-amber-400">device_phone</code>.</p>
              <p><strong className="text-white/70">Patient replies</strong> via the device keyboard. "SAFE" halts escalation. "SOS" dispatches security.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
