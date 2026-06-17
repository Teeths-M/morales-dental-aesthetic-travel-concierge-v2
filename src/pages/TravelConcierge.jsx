import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plane, Hotel, Car, Users, Heart, MapPin, Star, Shield, Headphones, ArrowRight } from 'lucide-react';

const GOLD = '#D4AF37';

const services = [
  {
    icon: Plane,
    title: 'Flight Booking',
    description: 'Business and economy flights to 190+ countries, hand-curated for comfort and value.',
    tag: 'Most Popular',
    cta: 'Explore Flights',
    path: '/travel-services',
    color: 'from-blue-900/40 to-blue-800/20',
  },
  {
    icon: Hotel,
    title: 'Hotel & Resort',
    description: 'Luxury hotels, boutique resorts, and serviced apartments in every destination.',
    tag: 'Premium',
    cta: 'Browse Hotels',
    path: '/travel-services',
    color: 'from-purple-900/40 to-purple-800/20',
  },
  {
    icon: Car,
    title: 'Private Transfers',
    description: 'Airport pickups, inter-city transfers, and chauffeur services — always on time.',
    tag: 'Reliable',
    cta: 'Book Transfer',
    path: '/travel-services',
    color: 'from-emerald-900/40 to-emerald-800/20',
  },
  {
    icon: Users,
    title: 'Personal Companions',
    description: 'Vetted local guides and travel companions for solo travelers, families, and seniors.',
    tag: 'Exclusive',
    cta: 'Find Companion',
    path: '/partners',
    color: 'from-amber-900/40 to-amber-800/20',
  },
  {
    icon: Heart,
    title: "Mother's Touch",
    description: 'In-home caregiver and meal service — perfect for recovery or extended stays.',
    tag: 'Comfort',
    cta: 'Learn More',
    path: '/travel-services',
    color: 'from-rose-900/40 to-rose-800/20',
  },
  {
    icon: Shield,
    title: 'Travel Safety',
    description: 'Real-time safety alerts, emergency contacts, and 24/7 SOS response worldwide.',
    tag: 'Always On',
    cta: 'Stay Safe',
    path: '/emergency',
    color: 'from-slate-800/60 to-slate-700/30',
  },
];

const stats = [
  { value: '190+', label: 'Countries covered' },
  { value: '24/7', label: 'Concierge support' },
  { value: '50K+', label: 'Happy travelers' },
  { value: '4.9★', label: 'Average rating' },
];

export default function TravelConcierge() {
  return (
    <div className="min-h-screen" style={{ background: '#060B16' }}>

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-10"
            style={{ background: `radial-gradient(ellipse, ${GOLD}, transparent 70%)` }} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <p className="text-[11px] font-bold tracking-[0.28em] uppercase mb-6" style={{ color: GOLD }}>
            Morales Travel Concierge
          </p>
          <h1 className="font-display text-white leading-tight mb-6" style={{ fontSize: 'clamp(2.4rem, 4vw, 3.6rem)' }}>
            The World. Curated.{' '}
            <span style={{ color: GOLD }}>Delivered.</span>
          </h1>
          <p className="text-white/55 text-[15px] leading-relaxed max-w-2xl mx-auto mb-10">
            From business trips to family vacations, Morales handles every detail — flights, hotels,
            transfers, companions, and safety — so you can simply enjoy the journey.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/travel-services"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[14px] transition-all hover:opacity-90"
              style={{ background: GOLD, color: '#060B16' }}>
              Plan My Trip <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/partners"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[14px] text-white border border-white/20 hover:border-white/40 transition-all">
              Browse Partners
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 relative z-10">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold font-display" style={{ color: GOLD }}>{value}</p>
              <p className="text-xs text-white/45 mt-1 tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services grid */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map(({ icon: Icon, title, description, tag, cta, path, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              className={`relative rounded-2xl p-6 bg-gradient-to-br ${color} flex flex-col gap-4 group`}
              style={{ border: '1px solid rgba(212,175,55,0.12)' }}
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}30` }}>
                  <Icon className="w-5 h-5" style={{ color: GOLD }} strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                  style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}25` }}>
                  {tag}
                </span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-[15px] mb-1.5">{title}</h3>
                <p className="text-white/50 text-[13px] leading-relaxed">{description}</p>
              </div>
              <Link to={path}
                className="mt-auto inline-flex items-center gap-1.5 text-[12px] font-semibold transition-all group-hover:gap-2.5"
                style={{ color: GOLD }}>
                {cta} <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Safety bar */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto rounded-2xl px-8 py-6 flex flex-col sm:flex-row items-center gap-6"
          style={{ background: 'rgba(212,175,55,0.06)', border: `1px solid ${GOLD}22` }}>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 flex-shrink-0" style={{ color: GOLD }} />
            <div>
              <p className="text-white font-semibold text-sm">Morales SafeT™ — Always Included</p>
              <p className="text-white/45 text-xs mt-0.5">Real-time safety monitoring, emergency SOS, and solo traveler check-ins on every trip.</p>
            </div>
          </div>
          <Link to="/emergency" className="flex-shrink-0 text-xs font-semibold px-5 py-2.5 rounded-xl border transition-all"
            style={{ borderColor: `${GOLD}40`, color: GOLD }}>
            Learn More
          </Link>
        </div>
      </section>
    </div>
  );
}