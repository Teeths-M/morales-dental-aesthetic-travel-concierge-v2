import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Plane, Hotel, Users, Utensils, Car, Globe, Shield, CheckCircle2, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const ADDON_CATALOG = [
  { id: 'origin_transfer', label: 'Origin Airport Pickup', desc: 'Chauffeur from your home city', price: 75, icon: Plane, category: 'transport', transport_scope: 'origin_only' },
  { id: 'destination_transfer', label: 'Destination Transfer', desc: 'Airport → Hotel → Clinic', price: 60, icon: Car, category: 'transport', transport_scope: 'destination_only' },
  { id: 'round_trip_transfer', label: 'Round-Trip Transfers', desc: 'Full origin + destination logistics', price: 120, icon: Plane, category: 'transport', transport_scope: 'round_trip' },
  { id: 'hotel_3star', label: '3-Star Hotel (per night)', desc: 'Comfortable recovery accommodation', price: 80, icon: Hotel, category: 'accommodation' },
  { id: 'hotel_4star', label: '4-Star Hotel (per night)', desc: 'Premium recovery suite', price: 140, icon: Hotel, category: 'accommodation' },
  { id: 'hotel_5star', label: '5-Star Luxury Hotel (per night)', desc: 'Elite all-inclusive recovery', price: 280, icon: Hotel, category: 'accommodation' },
  { id: 'companion_basic', label: 'Companion — Support', desc: 'Personal travel companion', price: 120, icon: Users, category: 'companion' },
  { id: 'companion_medical', label: 'Companion — Medical-Trained', desc: 'Clinically trained travel companion', price: 250, icon: Users, category: 'companion' },
  { id: 'nutrition_standard', label: 'Nutritional Meals — Standard', desc: 'Daily meal delivery', price: 35, icon: Utensils, category: 'nutrition' },
  { id: 'nutrition_medical', label: 'Nutritional Meals — Medical Diet', desc: 'Post-op medically prescribed meals', price: 60, icon: Utensils, category: 'nutrition' },
  { id: 'chauffeur_hourly', label: 'Exploration Chauffeur (per hour)', desc: 'Personal driver for leisure', price: 45, icon: Car, category: 'transport' },
  { id: 'interpreter', label: 'In-Person Interpreter (per day)', desc: 'Medical + general translation', price: 95, icon: Globe, category: 'services' },
  { id: 'sim_card', label: 'Local SIM & Data Plan', desc: 'Stay connected on arrival', price: 25, icon: Globe, category: 'services' },
  { id: 'travel_insurance', label: 'Travel Insurance', desc: 'Full journey coverage', price: 85, icon: Shield, category: 'insurance' },
];

const CATEGORY_LABELS = { transport: '✈️ Transport', accommodation: '🏨 Accommodation', companion: '🤝 Companion', nutrition: '🥗 Nutrition', services: '🌐 Services', insurance: '🛡️ Insurance' };
const PEACE_OF_MIND_PRICE = 100;

const TRANSPORT_SCOPE_LABELS = {
  origin_only: 'Origin Only',
  destination_only: 'Destination Only',
  round_trip: 'Full Round-Trip',
  none: 'No Transfer'
};

export default function TravelAddOnBuilder({ caseId, onSaved }) {
  const [selected, setSelected] = useState(new Set());
  const [peaceOfMind, setPeaceOfMind] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const toggleAddon = (id) => {
    // Only one hotel tier at a time, one companion tier, one transport scope
    const addon = ADDON_CATALOG.find(a => a.id === id);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // Remove conflicting items in same exclusive category
        if (addon.category === 'accommodation') ADDON_CATALOG.filter(a => a.category === 'accommodation').forEach(a => next.delete(a.id));
        if (addon.category === 'companion') ADDON_CATALOG.filter(a => a.category === 'companion').forEach(a => next.delete(a.id));
        if (addon.transport_scope) ADDON_CATALOG.filter(a => a.transport_scope).forEach(a => next.delete(a.id));
        next.add(id);
      }
      return next;
    });
  };

  const selectedAddons = ADDON_CATALOG.filter(a => selected.has(a.id));
  const addonsTotal = selectedAddons.reduce((s, a) => s + a.price, 0);
  const grandTotal = addonsTotal + (peaceOfMind ? PEACE_OF_MIND_PRICE : 0);

  const transportScope = selectedAddons.find(a => a.transport_scope)?.transport_scope || 'none';

  const handleSave = async () => {
    setSaving(true);
    const res = await base44.functions.invoke('saveTravelAddOns', {
      case_id: caseId || 'pending',
      selected_addon_ids: Array.from(selected),
      peace_of_mind_bundle: peaceOfMind,
      transport_scope: transportScope
    });
    if (res.data?.record) {
      setSaved(true);
      toast({ title: '✅ Travel add-ons confirmed', description: `Total: $${grandTotal} USD` });
      if (onSaved) onSaved(res.data.record);
    }
    setSaving(false);
  };

  const grouped = ADDON_CATALOG.reduce((acc, addon) => {
    if (!acc[addon.category]) acc[addon.category] = [];
    acc[addon.category].push(addon);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Peace of Mind Bundle */}
      <button onClick={() => { setPeaceOfMind(!peaceOfMind); if (!peaceOfMind) setSelected(new Set(ADDON_CATALOG.map(a => a.id).filter(id => !['hotel_4star','hotel_5star','companion_medical','nutrition_medical'].includes(id)))); }}
        className={`w-full rounded-2xl border-2 p-5 text-left transition-all ${peaceOfMind ? 'border-amber-400 bg-amber-50' : 'border-dashed border-amber-300 bg-white hover:border-amber-400'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-bold text-slate-800 text-sm">☮️ Peace of Mind Bundle</p>
              <p className="text-xs text-slate-500 mt-0.5">Full-tier coverage: transfers + companion + nutrition + insurance + Safe-T baseline</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-amber-600">$100</p>
            <p className="text-[10px] text-slate-400">per journey</p>
          </div>
        </div>
        {peaceOfMind && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-800 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Bundle selected — all essentials included
          </div>
        )}
      </button>

      {/* Safe-T Baseline Injected Notice */}
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <p className="text-xs text-emerald-800 font-semibold">Safe-T4Life baseline protocols automatically injected into all medical bookings</p>
      </div>

      {/* A La Carte Grid */}
      {!peaceOfMind && (
        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, addons]) => (
            <div key={cat}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">{CATEGORY_LABELS[cat] || cat}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {addons.map(addon => {
                  const isSelected = selected.has(addon.id);
                  const Icon = addon.icon;
                  return (
                    <button key={addon.id} onClick={() => toggleAddon(addon.id)}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${isSelected ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-100' : 'bg-slate-100'}`}>
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold ${isSelected ? 'text-blue-800' : 'text-slate-800'}`}>{addon.label}</p>
                        <p className="text-[10px] text-slate-500">{addon.desc}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-black ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>${addon.price}</p>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 ml-auto mt-0.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary + Save */}
      {(selected.size > 0 || peaceOfMind) && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-2xl p-5 sticky bottom-0 shadow-lg">
          <div className="space-y-1.5 mb-4">
            {selectedAddons.slice(0, 4).map(a => (
              <div key={a.id} className="flex justify-between text-xs text-slate-600">
                <span>{a.label}</span><span className="font-semibold">${a.price}</span>
              </div>
            ))}
            {selectedAddons.length > 4 && <p className="text-xs text-slate-400">+ {selectedAddons.length - 4} more items</p>}
            {peaceOfMind && <div className="flex justify-between text-xs text-amber-700"><span>Peace of Mind Bundle</span><span className="font-semibold">$100</span></div>}
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-800">
              <span>Total Add-ons</span><span>${grandTotal} USD</span>
            </div>
          </div>
          {saved ? (
            <div className="flex items-center justify-center gap-2 text-emerald-700 font-semibold text-sm py-2">
              <CheckCircle2 className="w-4 h-4" /> Add-ons confirmed!
            </div>
          ) : (
            <Button onClick={handleSave} disabled={saving}
              className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:opacity-90 text-white rounded-xl font-semibold">
              {saving ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Saving...</span> : `Confirm Add-ons — $${grandTotal} USD`}
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}