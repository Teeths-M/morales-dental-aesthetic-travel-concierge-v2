import React from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, Plane, Car } from 'lucide-react';
import { Link } from 'react-router-dom';

const GOLD = '#D4AF37';

const providerCards = [
  {
    icon: Stethoscope,
    title: 'Doctor',
    description: 'Join our verified specialist network',
    link: '/doctor-signup',
    color: '#0ea5e9'
  },
  {
    icon: Plane,
    title: 'Travel Agency',
    description: 'Coordinate medical travel packages',
    link: '/partner-signup/travel-agency',
    color: '#8b5cf6'
  },
  {
    icon: Car,
    title: 'Taxi Service',
    description: 'Provide patient transportation',
    link: '/partner-signup/taxi-service',
    color: '#22c55e'
  }
];

export default function ProviderNetworkCTA() {
  return (
    <section className="py-16 bg-gradient-to-b from-slate-50 to-white border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-semibold mb-2" style={{ color: GOLD }}>
            JOIN OUR NETWORK
          </h2>
          <p className="text-slate-600 text-sm">
            Sign up as a provider and become part of our trusted care ecosystem
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {providerCards.map(({ icon: Icon, title, description, link, color }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ 
                scale: 1.03, 
                y: -4,
                boxShadow: "0px 12px 35px rgba(0,0,0,0.12)"
              }}
              className="group cursor-pointer"
            >
              <Link to={link} className="block h-full">
                <div className="h-full bg-white rounded-2xl p-8 border border-slate-200 hover:border-slate-300 transition-all duration-300 shadow-sm hover:shadow-lg">
                  {/* Icon */}
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:shadow-lg"
                    style={{ 
                      background: `${color}15`,
                      boxShadow: `0 0 0 2px ${color}20`
                    }}
                  >
                    <Icon className="w-8 h-8" style={{ color }} />
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-lg text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                    {title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    {description}
                  </p>

                  {/* CTA Link */}
                  <div className="flex items-center gap-2 text-sm font-semibold transition-colors duration-200" style={{ color: GOLD }}>
                    <span>Apply Now</span>
                    <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}