// @ts-nocheck
import { useState, useEffect } from 'react';
import { Shield, Smartphone, Globe, Wifi, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

const DATACENTER_KW = ['amazon', 'google', 'microsoft', 'digitalocean', 'vultr',
  'linode', 'ovh', 'hetzner', 'cloudflare', 'datacenter', 'colocation', 'hosting'];

function detectBrowser(ua) {
  const m = ua.match(/(Chrome|Firefox|Safari|Edg|Opera)[\/ ]([\d.]+)/i);
  return m ? m[1] : 'Unknown';
}

function detectOS(ua) {
  const m = ua.match(/(Windows NT|Mac OS X|Android|iPhone OS|Linux x86_64)/i);
  if (!m) return 'Unknown';
  const os = m[1];
  if (os === 'iPhone OS') return 'iOS';
  if (os === 'Mac OS X') return 'macOS';
  if (os === 'Windows NT') return 'Windows';
  return os;
}

function isHeadless(ua) {
  return /HeadlessChrome|PhantomJS|Selenium|webdriver/i.test(ua);
}

/**
 * Live Device & Network Intelligence panel.
 * Collects client-side signals in real-time and displays them so the user
 * sees the security system working as they fill out the signup form.
 * Visible during form steps (0–3); hidden once the full scan runs (step 4+).
 */
export default function LiveDeviceNetworkPanel() {
  const [signals, setSignals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const ua = navigator.userAgent;
    const collected = {
      ua_browser: detectBrowser(ua),
      ua_os: detectOS(ua),
      device_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ua_flag: isHeadless(ua) ? 'headless_browser' : 'legitimate',
      ip_label: null,
      ip_city: null,
      ip_country: null,
      ip_isp: null,
    };

    // Fire IP lookup immediately; update state as soon as it resolves
    (async () => {
      try {
        const resp = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
          const d = await resp.json();
          if (!d.error) {
            const isDatacenter = DATACENTER_KW.some(k => (d.org || '').toLowerCase().includes(k));
            collected.ip_label = isDatacenter ? 'datacenter' : 'residential';
            collected.ip_city = d.city || null;
            collected.ip_country = d.country_name || null;
            collected.ip_isp = d.org || null;
          }
        }
      } catch (_) { /* non-fatal — IP lookup is best-effort */ }
      if (!cancelled) {
        setSignals(collected);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const browserOk = signals?.ua_flag !== 'headless_browser';
  const ipOk = signals?.ip_label === 'residential';
  const ipWarn = signals?.ip_label === 'datacenter';

  return (
    <div
      className="mt-6 rounded-2xl border p-5 space-y-4"
      style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(42,63,74,0.6)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: '#D4AF37' }} />
          <span className="text-[11px] font-bold tracking-widest" style={{ color: '#D4AF37' }}>
            LIVE SECURITY SCAN
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#10b981' }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#10b981' }} />
          </span>
          <span className="text-[9px] font-semibold tracking-wider" style={{ color: '#10b981' }}>ACTIVE</span>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Device */}
        <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Smartphone className="w-3 h-3" style={{ color: '#64748b' }} />
            <span className="text-[9px] font-bold tracking-widest" style={{ color: '#64748b' }}>DEVICE</span>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#475569' }} />
              <span className="text-[10px]" style={{ color: '#475569' }}>Detecting…</span>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
                {signals?.ua_browser}{signals?.ua_os ? ` on ${signals.ua_os}` : ''}
              </p>
              {signals?.device_timezone && (
                <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>{signals.device_timezone}</p>
              )}
              <p className="text-[9px] mt-1 font-semibold flex items-center gap-1" style={{ color: browserOk ? '#10b981' : '#ef4444' }}>
                {browserOk
                  ? <><CheckCircle className="w-3 h-3" /> Legitimate browser</>
                  : <><AlertTriangle className="w-3 h-3" /> Headless bot detected</>}
              </p>
            </>
          )}
        </div>

        {/* IP Intelligence */}
        <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Globe className="w-3 h-3" style={{ color: '#64748b' }} />
            <span className="text-[9px] font-bold tracking-widest" style={{ color: '#64748b' }}>IP INTELLIGENCE</span>
          </div>
          {loading || !signals?.ip_country ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#475569' }} />
              <span className="text-[10px]" style={{ color: '#475569' }}>{loading ? 'Resolving…' : 'No IP data'}</span>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
                {signals.ip_city || signals.ip_country}
              </p>
              {signals.ip_isp && (
                <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>{signals.ip_isp}</p>
              )}
              <p className="text-[9px] mt-1 font-semibold flex items-center gap-1" style={{
                color: ipOk ? '#10b981' : ipWarn ? '#f59e0b' : '#ef4444'
              }}>
                {ipOk ? <><CheckCircle className="w-3 h-3" /> Residential ISP</>
                 : ipWarn ? <><AlertTriangle className="w-3 h-3" /> Datacenter proxy</>
                 : <><Wifi className="w-3 h-3" /> No IP data</>}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Status summary */}
      <p className="text-[10px] text-center" style={{ color: '#475569' }}>
        Security signals are being collected live and will feed into your verification scan.
      </p>
    </div>
  );
}