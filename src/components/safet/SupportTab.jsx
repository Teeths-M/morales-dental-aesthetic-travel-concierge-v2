import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageCircle, Mail, Shield, Clock, ChevronRight, AlertCircle, HeartHandshake, Stethoscope, Plane, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const STATIC_SUPPORT_CHANNELS = [
  {
    id: 'concierge',
    title: 'Personal Concierge',
    desc: 'Your dedicated care coordinator available for all journey questions',
    icon: HeartHandshake,
    color: 'from-emerald-600 to-teal-600',
    availability: 'Mon–Sat, 8am–8pm',
    responseTime: '< 1 hour',
    action: 'Chat Now',
    whatsapp: 'https://wa.me/18687481100',
  },
  {
    id: 'medical',
    title: 'Medical Team',
    desc: 'Reach your assigned healthcare provider for clinical questions',
    icon: Stethoscope,
    color: 'from-blue-700 to-indigo-700',
    availability: 'Mon–Fri, 9am–5pm',
    responseTime: '< 4 hours',
    action: 'Message Doctor',
    whatsapp: 'https://wa.me/18687481100',
  },
];

const FAQS = [
  { q: 'What should I bring on procedure day?', a: 'Bring your passport, all medical documents, your pre-procedure instructions, comfortable clothing, any prescribed medications, and a companion if possible. Avoid eating or drinking if fasting was required.' },
  { q: 'How long does recovery typically take?', a: 'Recovery varies by procedure. Your assigned doctor will provide a personalized recovery timeline. SAFE-T 4LIFE™ will send you daily check-in reminders throughout recovery.' },
  { q: 'Who do I contact if I feel unwell after my procedure?', a: 'Contact your care coordinator via WhatsApp immediately, or use the Emergency Support channel above. For life-threatening emergencies, call local emergency services.' },
  { q: 'Can my companion stay with me during recovery?', a: 'Yes. We encourage companion support during recovery. Your coordinator can arrange accommodation and support for your travel companion.' },
  { q: 'How are my documents stored?', a: 'All your documents are securely stored in your private SAFE-T 4LIFE™ profile. Only your care team has access with your permission.' },
];

export default function SupportTab() {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.email) {
          setUserEmail(user.email);
        }
      } catch (e) {
        console.error("Failed to fetch user email:", e);
      }
    };
    getUser();
  }, []);

  const { data: consultation } = useQuery({
    queryKey: ['latestConsultation', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      const consultations = await base44.entities.Consultation.filter({ email: userEmail }, '-created_date', 1);
      return consultations.length > 0 ? consultations[0] : null;
    },
    enabled: !!userEmail,
  });

  const { data: travelAgency } = useQuery({
    queryKey: ['assignedTravelAgency', consultation?.travel_agency_id],
    queryFn: async () => {
      if (!consultation?.travel_agency_id) return null;
      try {
        return await base44.entities.TravelAgency.get(consultation.travel_agency_id);
      } catch (e) {
        console.error("Failed to fetch travel agency:", e);
        return null;
      }
    },
    enabled: !!consultation?.travel_agency_id,
  });

  const travelCoordinatorWhatsapp = travelAgency?.whatsapp_number || 'https://wa.me/18687481100';

  const { data: emergencyContact } = useQuery({
    queryKey: ['emergencyContact', consultation?.client_country],
    queryFn: async () => {
      if (!consultation?.client_country) return null;
      try {
        const contacts = await base44.entities.EmergencyContacts.filter({ country_name: consultation.client_country });
        return contacts.length > 0 ? contacts[0] : null;
      } catch (e) {
        console.error("Failed to fetch emergency contact:", e);
        return null;
      }
    },
    enabled: !!consultation?.client_country,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Support & Escalation</h2>
            <p className="text-white/60 text-sm">Real people are always available when you need them</p>
          </div>
        </div>
        <p className="text-white/70 text-sm leading-relaxed">
          You are never alone during your healthcare journey. Our team is available across multiple channels — choose the right level of support for your needs.
        </p>
      </div>

      {/* Support Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...STATIC_SUPPORT_CHANNELS, {
          id: 'travel',
          title: 'Travel Coordinator',
          desc: 'Logistics, transfers, accommodation, and travel support',
          icon: Plane,
          color: 'from-violet-600 to-purple-700',
          availability: 'Mon–Fri, 9am–6pm',
          responseTime: '< 2 hours',
          action: 'Get Travel Help',
          whatsapp: travelCoordinatorWhatsapp,
        }, {
          id: 'emergency',
          title: 'Emergency Support',
          desc: emergencyContact 
            ? `Local emergency number for ${consultation?.client_country || 'your country'}`
            : 'For urgent medical or safety concerns during your journey',
          icon: AlertCircle,
          color: 'from-red-600 to-rose-700',
          availability: '24/7 Available',
          responseTime: 'Immediate',
          action: emergencyContact?.emergency_number || 'Call Emergency',
          phone: emergencyContact?.emergency_number || '911',
          country: consultation?.client_country || 'Your Country',
          urgent: true,
        }].map((ch, idx) => {
          const Icon = ch.icon;
          const isEmergency = ch.urgent;
          const href = isEmergency && ch.phone ? `tel:${ch.phone}` : ch.whatsapp;
          
          return (
            <motion.a
              key={ch.id}
              href={href}
              target={isEmergency ? '_self' : '_blank'}
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              className={`block bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${
                isEmergency ? 'border-red-200 hover:border-red-300' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className={`h-1.5 bg-gradient-to-r ${ch.color}`} />
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ch.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm">{ch.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{ch.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{ch.availability}</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold">Response: {ch.responseTime}</div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r ${ch.color} text-white`}>
                    {ch.action} {isEmergency && ch.phone && `(${ch.phone})`} <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </motion.a>
          );
        })}
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 text-sm mb-4">Direct Contact</h3>
        <div className="space-y-3">
          {[
            { icon: MessageCircle, label: 'WhatsApp', value: '+1 868-748-1100', href: 'https://wa.me/18687481100', color: 'text-emerald-600' },
            { icon: Phone, label: 'Phone', value: '+1 868-748-1100', href: 'tel:+18687481100', color: 'text-blue-600' },
            { icon: Mail, label: 'Email', value: 'concierge@moralesdental.com', href: 'mailto:concierge@moralesdental.com', color: 'text-violet-600' },
            { icon: MapPin, label: 'Location', value: 'Margarita Island, Venezuela', href: null, color: 'text-amber-600' },
          ].map(({ icon: Icon, label, value, href, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                {href
                  ? <a href={href} className={`text-sm font-semibold ${color} hover:underline`}>{value}</a>
                  : <p className="text-sm font-semibold text-slate-700">{value}</p>
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">Frequently Asked Questions</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {FAQS.map((faq, i) => (
            <div key={i} className="overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-700 pr-4">{faq.q}</span>
                <ChevronRight className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${expandedFaq === i ? 'rotate-90' : ''}`} />
              </button>
              {expandedFaq === i && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>SAFE-T 4LIFE™</strong> is an educational and coordination support system and does not replace professional medical advice, diagnosis, or treatment from licensed healthcare providers.
        </p>
      </div>
    </div>
  );
}