import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi, MessageSquare, Bluetooth, Satellite, QrCode,
  Share2, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ChevronUp, Copy
} from 'lucide-react';
import { useEmergencyComms } from '@/offline/sos/useEmergencyComms';

const GOLD = '#D4AF37';

const CHANNEL_CONFIG = {
  internet:  { icon: Wifi,          label: 'Internet API',       sub: 'triggerSOS → Morales backend', color: '#22c55e' },
  share:     { icon: Share2,        label: 'Web Share',           sub: 'SMS · WhatsApp · Signal · Email', color: '#60a5fa' },
  sms:       { icon: MessageSquare, label: 'SMS Deeplink',        sub: 'Opens native SMS app', color: '#f59e0b' },
  bluetooth: { icon: Bluetooth,     label: 'Bluetooth BLE',       sub: 'goTenna · inReach · Zoleo', color: '#a855f7' },
  satellite: { icon: Satellite,     label: 'Satellite SOS',       sub: 'iOS 16+ · Android 14+', color: '#06b6d4' },
  qr:        { icon: QrCode,        label: 'QR Emergency Code',   sub: 'Scan to relay your location', color: '#ec4899' },
};

const STATUS_BADGE = {
  idle:    { label: 'Ready',    color: '#475569', bg: 'rgba(71,85,105,0.15)'  },
  sending: { label: 'Sending…', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  sent:    { label: 'Sent ✓',   color: '#22c55e', bg: 'rgba(34,197,94,0.15)'  },
  failed:  { label: 'Failed',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)'  },
};

function ChannelRow({ id, status, action = null, extra = null }) {
  const cfg = CHANNEL_CONFIG[id];
  const Icon = cfg.icon;
  const badge = STATUS_BADGE[status] || STATUS_BADGE.idle;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${status === 'sent' ? cfg.color + '60' : '#2A3F4A'}`, background: status === 'sent' ? `${cfg.color}08` : '#0a1420' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}>
          {status === 'sending'
            ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: cfg.color }} />
            : status === 'sent'
            ? <CheckCircle2 className="w-4 h-4" style={{ color: cfg.color }} />
            : <Icon className="w-4 h-4" style={{ color: cfg.color }} />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{cfg.label}</p>
          <p className="text-[10px]" style={{ color: '#475569' }}>{cfg.sub}</p>
        </div>

        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: badge.bg, color: badge.color }}>
          {badge.label}
        </span>

        {action && (
          <button
            onClick={action.onPress}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0 transition-all active:scale-95"
            style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}40`, color: cfg.color }}
          >
            {action.label}
          </button>
        )}

        {extra && (
          <button onClick={() => setExpanded(e => !e)} className="p-1" style={{ color: '#475569' }}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && extra && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ borderTop: '1px solid #1e2d35' }}
          >
            {extra}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * EmergencyCommsCascade
 *
 * Full 6-channel emergency communication UI.
 *
 * Props:
 *   caseId, userId, userEmail, activitySessionId, activityType, medicalCode
 */
export default function EmergencyCommsCascade({ caseId, userId, userEmail, activitySessionId, activityType, medicalCode }) {
  const comms = useEmergencyComms({ caseId, userId, userEmail, activitySessionId, activityType, medicalCode });
  const { channelStatus: cs, satellite, bluetooth, qrDataUrl, smsLink, smsPayload, cascadeActive, gpsState, triggerCascade, openSmsLink, tryBluetooth } = comms;

  const anySent = Object.values(cs).some(s => s === 'sent');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">Emergency Comms Cascade</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>
            6 channels · fires simultaneously · no internet required for most
          </p>
        </div>
        {gpsState === 'capturing' && (
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#f59e0b' }}>
            <Loader2 className="w-3 h-3 animate-spin" /> Acquiring GPS…
          </div>
        )}
        {gpsState === 'captured' && (
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#22c55e' }}>
            <CheckCircle2 className="w-3 h-3" /> GPS locked
          </div>
        )}
      </div>

      {/* Big SOS button */}
      {!cascadeActive && (
        <motion.button
          onClick={triggerCascade}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5"
          style={{
            background: 'linear-gradient(135deg, #991b1b, #dc2626)',
            color: '#fff',
            boxShadow: '0 4px 24px rgba(239,68,68,0.45)',
          }}
        >
          <AlertTriangle className="w-5 h-5" />
          SEND SOS — ALL CHANNELS
        </motion.button>
      )}

      {cascadeActive && (
        <div className="space-y-2">
          {/* Channel 1 — Internet */}
          <ChannelRow id="internet" status={cs.internet} />

          {/* Channel 2 — Web Share */}
          <ChannelRow id="share" status={cs.share} />

          {/* Channel 3 — SMS */}
          <ChannelRow
            id="sms"
            status={cs.sms}
            action={smsLink ? { label: 'Open SMS', onPress: () => openSmsLink(smsLink) } : null}
            extra={smsPayload ? (
              <div className="px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Pre-filled message</p>
                <code className="block text-[10px] text-white bg-black/30 rounded-lg p-3 break-all leading-relaxed">{smsPayload}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(smsPayload).catch(() => {})}
                  className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold"
                  style={{ color: GOLD }}
                >
                  <Copy className="w-3 h-3" /> Copy to clipboard
                </button>
              </div>
            ) : null}
          />

          {/* Channel 4 — Bluetooth BLE */}
          <ChannelRow
            id="bluetooth"
            status={bluetooth.status === 'sent' ? 'sent' : bluetooth.status === 'connecting' || bluetooth.status === 'sending' ? 'sending' : bluetooth.status === 'error' ? 'failed' : cs.bluetooth}
            action={!bluetooth.isSupported ? null : bluetooth.status === 'connected'
              ? { label: 'Send via BLE', onPress: () => tryBluetooth(smsPayload) }
              : { label: 'Pair Device', onPress: () => bluetooth.connect() }}
            extra={!bluetooth.isSupported ? (
              <div className="px-4 py-3">
                <p className="text-[10px]" style={{ color: '#64748b' }}>Web Bluetooth requires Chrome or Edge on Android. Not supported on iOS Safari or Firefox.</p>
              </div>
            ) : bluetooth.error ? (
              <div className="px-4 py-3">
                <p className="text-[10px] text-red-400">{bluetooth.error}</p>
              </div>
            ) : bluetooth.deviceName ? (
              <div className="px-4 py-3">
                <p className="text-[10px]" style={{ color: '#22c55e' }}>Connected to: <strong>{bluetooth.deviceName}</strong></p>
              </div>
            ) : (
              <div className="px-4 py-3">
                <p className="text-[10px]" style={{ color: '#64748b' }}>Pairs with goTenna Mesh, Garmin inReach Mini, Zoleo, Somewear — any device using Nordic UART BLE profile.</p>
              </div>
            )}
          />

          {/* Channel 5 — Satellite */}
          <ChannelRow
            id="satellite"
            status={cs.satellite}
            extra={(
              <div className="px-4 py-3 space-y-3">
                {satellite.isSupported ? (
                  <>
                    <p className="text-[10px] font-semibold" style={{ color: '#06b6d4' }}>
                      {satellite.platform === 'ios' ? 'iOS Satellite SOS Detected' : 'Android Satellite SOS Detected'}
                    </p>
                    <ol className="space-y-1.5">
                      {satellite.instructions.map((step, i) => (
                        <li key={i} className="flex gap-2 text-[10px] text-white">
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                            style={{ background: 'rgba(6,182,212,0.2)', color: '#06b6d4' }}>{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                    {satellite.satelliteMessage && (
                      <>
                        <p className="text-[10px] font-semibold uppercase tracking-widest mt-2" style={{ color: '#64748b' }}>Paste this message</p>
                        <code className="block text-[10px] text-white bg-black/30 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">{satellite.satelliteMessage}</code>
                        <button
                          onClick={() => navigator.clipboard.writeText(satellite.satelliteMessage).catch(() => {})}
                          className="flex items-center gap-1.5 text-[10px] font-semibold"
                          style={{ color: GOLD }}
                        >
                          <Copy className="w-3 h-3" /> Copy satellite message
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-[10px]" style={{ color: '#64748b' }}>
                    Satellite SOS not detected on this device. Requires iPhone 14+ (iOS 16+) or Android 14+ with Satellite Manager. If you have a Garmin inReach or Spot device, use their dedicated app.
                  </p>
                )}
              </div>
            )}
          />

          {/* Channel 6 — QR Code */}
          <ChannelRow
            id="qr"
            status={cs.qr}
            extra={qrDataUrl ? (
              <div className="px-4 py-4 flex flex-col items-center gap-3">
                <p className="text-[10px]" style={{ color: '#64748b' }}>
                  Show this to anyone with connectivity — they scan it to relay your emergency.
                </p>
                <img src={qrDataUrl} alt="Emergency SOS QR Code" className="w-48 h-48 rounded-xl" />
                <p className="text-[9px] font-mono" style={{ color: '#475569' }}>{comms.packet?.packet_id}</p>
              </div>
            ) : null}
          />
        </div>
      )}

      {anySent && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-xl px-4 py-3 flex items-center gap-2"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-300">At least one channel confirmed delivery. Help is being dispatched.</p>
        </motion.div>
      )}
    </div>
  );
}
