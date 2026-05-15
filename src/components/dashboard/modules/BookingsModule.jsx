import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plane, Hotel, Car, Calendar, CreditCard, CheckCircle2,
  Clock, AlertTriangle, Users, ArrowRight, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const bookingItems = [
  {
    type: 'flight', icon: Plane, color: 'blue',
    label: 'Return Flight', detail: 'Miami → Margarita Island → Miami',
    date: 'Jun 12 – Jun 19, 2026', status: 'confirmed',
  },
  {
    type: 'hotel', icon: Hotel, color: 'violet',
    label: 'Recovery Hotel', detail: 'Margarita Luxury Suites — Deluxe Suite (5 nights)',
    date: 'Jun 12 – Jun 17, 2026', status: 'confirmed',
  },
  {
    type: 'transfer', icon: Car, color: 'emerald',
    label: 'Airport Transfer', detail: 'Private car — Arrival & Departure',
    date: 'Jun 12 & Jun 19', status: 'pending',
  },
  {
    type: 'procedure', icon: Calendar, color: 'sky',
    label: 'Procedure Appointment', detail: 'Porcelain Veneers — Dr. Ramirez',
    date: 'Jun 14, 2026 — 9:00 AM', status: 'pending',
  },
];

const statusCfg = {
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
};

const colorCfg = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
  sky: { bg: 'bg-sky-50', icon: 'text-sky-600' },
};

const payments = [
  { label: 'Consultation Deposit', amount: '$150', status: 'paid', date: 'Apr 20, 2026' },
  { label: 'Hotel Pre-Authorization', amount: '$500', status: 'paid', date: 'Apr 22, 2026' },
  { label: 'Procedure Balance', amount: '$2,800', status: 'due', date: 'Jun 1, 2026' },
  { label: 'Companion Package', amount: '$650', status: 'optional', date: '—' },
];

export default function BookingsModule() {
  const [companion, setCompanion] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">My Bookings</h2>
          <p className="text-xs text-slate-400 mt-0.5">Healthcare travel coordination hub</p>
        </div>
        <Link to="/booking">
          <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-9">
            + Add Booking
          </Button>
        </Link>
      </div>

      {/* Booking cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {bookingItems.map((item) => {
          const Icon = item.icon;
          const cc = colorCfg[item.color];
          const sc = statusCfg[item.status];
          return (
            <motion.div
              key={item.type}
              className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${cc.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${cc.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-600 font-medium">{item.date}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Companion package */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Companion Travel Package</h3>
            <p className="text-xs text-slate-400">Add a companion to your journey</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Our companion package includes extra hotel accommodation, coordination meals, transportation, and dedicated support throughout your stay.
        </p>
        <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-bold text-slate-800">Add Companion Package</p>
            <p className="text-xs text-slate-500">+$650 — includes all logistics</p>
          </div>
          <button
            onClick={() => setCompanion(!companion)}
            className={`w-12 h-6 rounded-full transition-all ${companion ? 'bg-emerald-600' : 'bg-slate-300'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${companion ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {companion && (
          <motion.div
            className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <p className="text-xs text-emerald-800 font-semibold">✓ Companion package added — your coordinator will contact you to finalize details.</p>
          </motion.div>
        )}
      </div>

      {/* Payments */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Payment & Deposit Tracker</h3>
            <p className="text-xs text-slate-400">Your payment schedule</p>
          </div>
        </div>
        <div className="space-y-2">
          {payments.map(p => (
            <div key={p.label} className="flex items-center gap-4 bg-slate-50 rounded-xl px-4 py-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-700">{p.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Due: {p.date}</p>
              </div>
              <p className="text-sm font-bold text-slate-800">{p.amount}</p>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                p.status === 'due' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {p.status === 'paid' ? 'Paid' : p.status === 'due' ? 'Due' : 'Optional'}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-xs text-blue-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            Automated workflow: Payment confirmation triggers hotel, flight, and transport coordination automatically.
          </p>
        </div>
      </div>
    </div>
  );
}