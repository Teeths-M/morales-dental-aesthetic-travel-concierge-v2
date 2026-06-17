import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Stethoscope, Plane, Shield, FileText, MessageCircle, AlertTriangle,
  Mountain, Radio, Users, Calendar, MapPin, Clock, Star, Luggage,
  ArrowRight, CheckCircle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const FEATURE_CATEGORIES = [
  {
    id: 'medical',
    title: 'Medical Services',
    icon: Stethoscope,
    color: 'emerald',
    features: [
      { label: 'Book Consultation', path: '/booking', icon: Calendar, desc: 'Start your medical journey' },
      { label: 'Our Doctors', path: '/providers', icon: Users, desc: 'Verified specialists' },
      { label: 'My Consultations', path: '/dashboard/consultations', icon: FileText, desc: 'View all requests' },
      { label: 'Medical Profile', path: '/dashboard/profile', icon: FileText, desc: 'Health information' },
    ]
  },
  {
    id: 'travel',
    title: 'Travel & Concierge',
    icon: Plane,
    color: 'blue',
    features: [
      { label: 'Travel Booking', path: '/travel-concierge', icon: Plane, desc: 'Flights, hotels, transfers' },
      { label: 'Visa Assistance', path: '/visa-assist', icon: MapPin, desc: 'Requirements & guides' },
      { label: 'My Bookings', path: '/dashboard/bookings', icon: Calendar, desc: 'Trip details' },
    ]
  },
  {
    id: 'safety',
    title: 'Safety & Security',
    icon: Shield,
    color: 'violet',
    features: [
      { label: 'SAFE-T Assessment', path: '/safe-t', icon: Shield, desc: 'Risk evaluation' },
      { label: 'Adventure Safety', path: '/dashboard/adventure', icon: Mountain, desc: 'Activity checklists' },
      { label: 'Solo Check-In', path: '/dashboard/solo-checkin', icon: Radio, desc: 'Mandatory check-ins' },
      { label: 'Emergency Hub', path: '/emergency', icon: AlertTriangle, desc: 'SOS & emergency contacts' },
    ]
  },
  {
    id: 'documents',
    title: 'Documents & Vault',
    icon: FileText,
    color: 'amber',
    features: [
      { label: 'Passport Vault', path: '/passport-vault', icon: FileText, desc: 'Encrypted documents' },
      { label: 'Upload Files', path: '/dashboard/documents', icon: FileText, desc: 'Add new documents' },
      { label: 'Baggage Tracker', path: '/dashboard', icon: Luggage, desc: 'QR luggage tracking' },
    ]
  },
  {
    id: 'support',
    title: 'Support & Messages',
    icon: MessageCircle,
    color: 'pink',
    features: [
      { label: 'Messages', path: '/dashboard/messages', icon: MessageCircle, desc: 'Chat with coordinator' },
      { label: 'Support Center', path: '/dashboard/support', icon: MessageCircle, desc: 'Help & FAQs' },
      { label: 'My Journey', path: '/dashboard/journey', icon: MapPin, desc: 'Track progress' },
    ]
  },
];

const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-700', hover: 'hover:bg-emerald-100', gradient: 'from-emerald-50 to-white' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-700', hover: 'hover:bg-blue-100', gradient: 'from-blue-50 to-white' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'text-violet-700', hover: 'hover:bg-violet-100', gradient: 'from-violet-50 to-white' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-700', hover: 'hover:bg-amber-100', gradient: 'from-amber-50 to-white' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-700', hover: 'hover:bg-pink-100', gradient: 'from-pink-50 to-white' },
};

export default function FeatureHub() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        className="text-center max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h2 className="font-display text-3xl text-slate-800" style={{ letterSpacing: '-0.02em' }}>
            Explore All Features
          </h2>
        </div>
        <p className="text-slate-500 text-sm">
          Everything you need for your medical and travel journey — organized and easy to find
        </p>
      </motion.div>

      {/* Feature Categories */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURE_CATEGORIES.map((category, idx) => {
          const CategoryIcon = category.icon;
          const colors = COLOR_MAP[category.color];
          
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className={`h-full border-2 ${colors.border} bg-gradient-to-br ${colors.gradient} shadow-sm hover:shadow-md transition-shadow`}>
                <CardContent className="p-5 space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-black/5">
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                      <CategoryIcon className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{category.title}</h3>
                      <p className="text-xs text-slate-500">{category.features.length} features</p>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2">
                    {category.features.map((feature, fIdx) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <Link
                          key={fIdx}
                          to={feature.path}
                          className={`block p-3 rounded-xl ${colors.bg} ${colors.hover} transition-all group`}
                        >
                          <div className="flex items-start gap-3">
                            <FeatureIcon className={`w-4 h-4 ${colors.icon} mt-0.5 flex-shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                                {feature.label}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {feature.desc}
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions Banner */}
      <motion.div
        className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-display text-2xl mb-2" style={{ letterSpacing: '-0.02em' }}>
              Need Help Choosing?
            </h3>
            <p className="text-white/70 text-sm max-w-xl">
              Our patient care specialists are available 24/7 to guide you through every step of your journey.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/dashboard/messages">
              <Button className="bg-white text-slate-900 hover:bg-white/90 rounded-xl px-6">
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Us
              </Button>
            </Link>
            <Link to="/emergency">
              <Button className="bg-red-500 text-white hover:bg-red-600 rounded-xl px-6">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Emergency
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Most Popular Features */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <h3 className="font-bold text-slate-800 text-lg">Most Used Features</h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Book Consultation', path: '/booking', icon: Calendar, color: 'emerald' },
            { label: 'Passport Vault', path: '/passport-vault', icon: FileText, color: 'blue' },
            { label: 'Travel Booking', path: '/travel-concierge', icon: Plane, color: 'violet' },
            { label: 'SAFE-T Assessment', path: '/safe-t', icon: Shield, color: 'amber' },
          ].map((item, idx) => {
            const ItemIcon = item.icon;
            const colorClass = {
              emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
              blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
              violet: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
              amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
            }[item.color];
            
            return (
              <Link key={idx} to={item.path}>
                <div className={`flex items-center gap-3 p-3 rounded-xl ${colorClass} transition-all cursor-pointer`}>
                  <ItemIcon className="w-5 h-5" />
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}