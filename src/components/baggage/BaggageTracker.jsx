import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Luggage, QrCode, Plus, AlertTriangle, CheckCircle2, Clock, RefreshCw, MapPin, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import QRCodeDisplay from './QRCodeDisplay';
import LostBaggageModal from './LostBaggageModal';

const STATUS_CONFIG = {
  registered:  { label: 'Registered',  color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',    icon: '🏷️' },
  checked_in:  { label: 'Checked In',  color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500',    icon: '✅' },
  loaded:      { label: 'Loaded',      color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500',  icon: '✈️' },
  in_transit:  { label: 'In Transit',  color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500',  icon: '🔄' },
  transferred: { label: 'Transferred', color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500',   icon: '🔀' },
  arrived:     { label: 'Arrived',     color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: '📍' },
  claimed:     { label: 'Claimed',     color: 'bg-green-100 text-green-700',   dot: 'bg-green-500',   icon: '🧳' },
  lost:        { label: 'Lost',        color: 'bg-red-100 text-red-700',       dot: 'bg-red-500',     icon: '❌' },
  found:       { label: 'Found',       color: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-500',    icon: '🎉' },
  returned:    { label: 'Returned',    color: 'bg-green-100 text-green-700',   dot: 'bg-green-600',   icon: '🏠' },
};

export default function BaggageTracker({ caseId }) {
  const [bags, setBags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showQR, setShowQR] = useState(null);
  const [showLost, setShowLost] = useState(null);
  const [form, setForm] = useState({ bag_label: '', bag_number: 1, airline_pnr: '', airline_code: '', flight_number: '', origin_airport: '', destination_airport: '' });
  const [registering, setRegistering] = useState(false);

  useEffect(() => { loadBags(); }, [caseId]);

  const loadBags = async () => {
    setLoading(true);
    const data = await base44.entities.LuggageToken.filter({ case_id: caseId });
    setBags(data);
    setLoading(false);
  };

  const handleRegister = async () => {
    setRegistering(true);
    await base44.functions.invoke('registerLuggageToken', { case_id: caseId, ...form });
    setShowRegister(false);
    setForm({ bag_label: '', bag_number: bags.length + 1, airline_pnr: '', airline_code: '', flight_number: '', origin_airport: '', destination_airport: '' });
    loadBags();
    setRegistering(false);
  };

  const updateStatus = async (bag, newStatus) => {
    const history = [...(bag.status_history || []), { status: newStatus, location: bag.last_seen_location || '', timestamp: new Date().toISOString(), source: 'manual' }];
    await base44.entities.LuggageToken.update(bag.id, { current_status: newStatus, status_history: history, last_updated_at: new Date().toISOString() });
    loadBags();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Luggage className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Baggage Tracking</h3>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{bags.length} bag{bags.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={loadBags} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Button onClick={() => setShowRegister(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl gap-1.5">
            <Plus className="w-3 h-3" /> Add Bag
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-6 text-slate-400 text-xs">Loading bags...</div>
      ) : bags.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
          <Luggage className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">No bags registered yet</p>
          <p className="text-xs text-slate-400 mt-1">Register your luggage to get smart QR tracking</p>
          <Button onClick={() => setShowRegister(true)} size="sm" className="mt-3 bg-blue-600 text-white rounded-xl">
            Register First Bag
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {bags.map(bag => {
            const cfg = STATUS_CONFIG[bag.current_status] || STATUS_CONFIG.registered;
            return (
              <motion.div key={bag.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`bg-white border rounded-2xl p-4 shadow-sm ${bag.current_status === 'lost' ? 'border-red-200' : 'border-slate-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xl mt-0.5">{cfg.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 text-sm">{bag.bag_label || `Bag ${bag.bag_number}`}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{bag.token_code}</p>
                      {bag.flight_number && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Plane className="w-3 h-3" />
                          {bag.airline_code}{bag.flight_number} · {bag.origin_airport} → {bag.destination_airport}
                        </p>
                      )}
                      {bag.last_seen_location && (
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {bag.last_seen_location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => setShowQR(bag)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors" title="View QR">
                      <QrCode className="w-4 h-4" />
                    </button>
                    {!['lost', 'returned', 'claimed'].includes(bag.current_status) && (
                      <button onClick={() => setShowLost(bag)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Report Lost">
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    )}
                    {bag.current_status === 'arrived' && (
                      <button onClick={() => updateStatus(bag, 'claimed')}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors" title="Mark Claimed">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status timeline mini */}
                {bag.status_history?.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-slate-50 flex gap-1 overflow-x-auto">
                    {bag.status_history.slice(-5).map((h, i) => {
                      const hcfg = STATUS_CONFIG[h.status] || STATUS_CONFIG.registered;
                      return (
                        <div key={i} className="flex items-center gap-1 flex-shrink-0">
                          {i > 0 && <div className="w-3 h-px bg-slate-200" />}
                          <span className={`w-2 h-2 rounded-full ${hcfg.dot}`} title={h.status} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Register Modal */}
      <AnimatePresence>
        {showRegister && (
          <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <Luggage className="w-5 h-5 text-blue-600" /> Register Luggage
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Bag Description', key: 'bag_label', placeholder: 'e.g. Black rolling suitcase' },
                  { label: 'Airline PNR / Booking Ref', key: 'airline_pnr', placeholder: 'e.g. ABCDEF' },
                  { label: 'Airline Code', key: 'airline_code', placeholder: 'e.g. AA, BA, LH' },
                  { label: 'Flight Number', key: 'flight_number', placeholder: 'e.g. 1234' },
                  { label: 'Origin Airport (IATA)', key: 'origin_airport', placeholder: 'e.g. MIA' },
                  { label: 'Destination Airport (IATA)', key: 'destination_airport', placeholder: 'e.g. CCS' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{f.label}</label>
                    <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <Button onClick={handleRegister} disabled={!form.bag_label || registering}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                  {registering ? 'Registering...' : 'Register & Generate QR'}
                </Button>
                <Button variant="outline" onClick={() => setShowRegister(false)} className="flex-1 rounded-xl">Cancel</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Modal */}
      {showQR && <QRCodeDisplay bag={showQR} onClose={() => setShowQR(null)} />}

      {/* Lost Modal */}
      {showLost && <LostBaggageModal bag={showLost} onClose={() => { setShowLost(null); loadBags(); }} />}
    </div>
  );
}