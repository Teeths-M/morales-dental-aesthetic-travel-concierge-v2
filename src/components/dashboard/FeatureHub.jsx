import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Stethoscope, Plane, Shield, FileText, MessageCircle, AlertTriangle,
  Mountain, Radio, Users, Calendar, MapPin, Clock, Star, Luggage,
  ArrowRight, CheckCircle, Sparkles, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const FEATURE_CATEGORIES = [
  {
    id: 'medical',
    title: 'Medical Services',
    icon: Stethoscope,
    theme: 'medical',
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
    theme: 'travel',
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
    theme: 'safety',
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
    theme: 'vault',
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
    theme: 'support',
    features: [
      { label: 'Messages', path: '/dashboard/messages', icon: MessageCircle, desc: 'Chat with coordinator' },
      { label: 'Support Center', path: '/dashboard/support', icon: MessageCircle, desc: 'Help & FAQs' },
      { label: 'My Journey', path: '/dashboard/journey', icon: MapPin, desc: 'Track progress' },
    ]
  },
];

const THEME_STYLES = {
  medical: {
    gradient: 'from-emerald-50 via-white to-white',
    border: 'border-emerald-200/60',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    iconText: 'text-white',
    accent: 'text-emerald-700',
    hoverBg: 'hover:bg-emerald-50/80',
    shadow: 'shadow-emerald-100/50',
  },
  travel: {
    gradient: 'from-blue-50 via-white to-white',
    border: 'border-blue-200/60',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    iconText: 'text-white',
    accent: 'text-blue-700',
    hoverBg: 'hover:bg-blue-50/80',
    shadow: 'shadow-blue-100/50',
  },
  safety: {
    gradient: 'from-violet-50 via-white to-white',
    border: 'border-violet-200/60',
    iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
    iconText: 'text-white',
    accent: 'text-violet-700',
    hoverBg: 'hover:bg-violet-50/80',
    shadow: 'shadow-violet-100/50',
  },
  vault: {
    gradient: 'from-amber-50 via-white to-white',
    border: 'border-amber-200/60',
    iconBg: 'bg-gradient-to-br from-amber-400 to-amber-500',
    iconText: 'text-white',
    accent: 'text-amber-700',
    hoverBg: 'hover:bg-amber-50/80',
    shadow: 'shadow-amber-100/50',
  },
  support: {
    gradient: 'from-rose-50 via-white to-white',
    border: 'border-rose-200/60',
    iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600',
    iconText: 'text-white',
    accent: 'text-rose-700',
    hoverBg: 'hover:bg-rose-50/80',
    shadow: 'shadow-rose-100/50',
  },
};

export default function FeatureHub() {
  return (
    <div className="space-y-10 py-6">
      {/* Premium Header */}
      <motion.div
        className="text-center max-w-3xl mx-auto px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-amber-50 px-4 py-2 rounded-full border border-amber-200/60 mb-5">
          <Crown className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-semibold text-amber-800 tracking-wide">PREMIUM ACCESS</span>
        </div>
        <h2 className="font-display text-4xl md:text-5xl text-slate-800 mb-4" style={{ letterSpacing: '-0.03em' }}>
          Explore All Features
        </h2>
        <p className="text-slate-600 text-base leading-relaxed max-w-2xl mx-auto">
          Everything you need for your medical and travel journey — curated with excellence
        </p>
      </motion.div>

      {/* Feature Categories */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
        {FEATURE_CATEGORIES.map((category, idx) => {
          const CategoryIcon = category.icon;
          const theme = THEME_STYLES[category.theme];
          
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.5 }}
            >
              <Card className={`h-full border-2 ${theme.border} bg-gradient-to-br ${theme.gradient} ${theme.shadow} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden`}>
                <CardContent className="p-0">
                  {/* Premium Category Header */}
                  <div className="p-5 pb-4 border-b border-slate-100/60">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-11 h-11 rounded-2xl ${theme.iconBg} flex items-center justify-center shadow-md`}>
                        <CategoryIcon className={`w-5 h-5 ${theme.iconText}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-lg tracking-tight">{category.title}</h3>
                        <p className="text-xs text-slate-500 font-medium">{category.features.length} curated features</p>
                      </div>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="p-4 space-y-1.5">
                    {category.features.map((feature, fIdx) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <Link
                          key={fIdx}
                          to={feature.path}
                          className={`group flex items-start gap-3 p-3 rounded-xl transition-all duration-200 ${theme.hoverBg}`}
                        >
                          <div className={`w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center flex-shrink-0`}>
                            <FeatureIcon className={`w-4 h-4 ${theme.accent}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                              {feature.label}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                              {feature.desc}
                            </p>
                          </div>
                          <ArrowRight className={`w-4 h-4 ${theme.accent} opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5 flex-shrink-0 mt-0.5`} />
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

      {/* Premium Concierge Banner */}
      <motion.div
        className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-400/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative flex items-center justify-between flex-wrap gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300 tracking-wider">CONCIERGE SERVICE</span>
            </div>
            <h3 className="font-display text-3xl mb-3" style={{ letterSpacing: '-0.02em' }}>
              Need Personalized Assistance?
            </h3>
            <p className="text-white/70 text-sm leading-relaxed max-w-xl">
              Our dedicated patient care specialists are available 24/7 to guide you through every step of your journey with white-glove service.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/dashboard/messages">
              <Button className="bg-white text-slate-900 hover:bg-white/90 rounded-xl px-6 py-3 font-semibold shadow-lg shadow-white/20 transition-all hover:scale-105">
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Us
              </Button>
            </Link>
            <Link to="/emergency">
              <Button className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 rounded-xl px-6 py-3 font-semibold shadow-lg shadow-red-500/30 transition-all hover:scale-105">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Emergency
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Most Popular Features */}
      <motion.div
        className="bg-white border border-slate-200/80 rounded-3xl p-8 mx-4 shadow-xl shadow-slate-200/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md">
            <Star className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-xl tracking-tight">Most Used Features</h3>
            <p className="text-xs text-slate-500 font-medium">Quick access to popular services</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Book Consultation', path: '/booking', icon: Calendar, theme: 'medical' },
            { label: 'Passport Vault', path: '/passport-vault', icon: FileText, theme: 'vault' },
            { label: 'Travel Booking', path: '/travel-concierge', icon: Plane, theme: 'travel' },
            { label: 'SAFE-T Assessment', path: '/safe-t', icon: Shield, theme: 'safety' },
          ].map((item, idx) => {
            const ItemIcon = item.icon;
            const theme = THEME_STYLES[item.theme];
            
            return (
              <Link key={idx} to={item.path}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br ${theme.gradient} ${theme.border} border-2 ${theme.hoverBg} transition-all cursor-pointer shadow-sm hover:shadow-md`}
                >
                  <div className={`w-9 h-9 rounded-xl ${theme.iconBg} flex items-center justify-center shadow-sm`}>
                    <ItemIcon className={`w-5 h-5 ${theme.iconText}`} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}