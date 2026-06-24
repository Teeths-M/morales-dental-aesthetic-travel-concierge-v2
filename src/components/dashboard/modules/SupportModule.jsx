import React, { useState } from 'react';
import { Phone, MessageCircle, HelpCircle, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const faqs = [
  { q: 'How do I reschedule my consultation?', a: 'Contact your assigned coordinator via the Messages section or call our concierge line. Rescheduling is free up to 48 hours before your appointment.' },
  { q: 'What documents do I need for my procedure?', a: 'You need: valid passport, travel insurance, medical clearance form, any relevant lab results or imaging, and a list of current medications.' },
  { q: 'What happens if I need emergency care during my stay?', a: 'Your coordinator and SAFE-T 4LIFE™ emergency line are available 24/7. Local hospitals and emergency contacts are pre-arranged as part of your care package.' },
  { q: 'Can I bring a companion on my trip?', a: 'Absolutely. Our companion travel package includes coordinated accommodation, transportation, and support throughout your stay.' },
  { q: 'Is my medical information kept private?', a: 'Yes. All data is encrypted and managed in compliance with privacy best practices. Only your assigned care team has access to your health records.' },
];

export default function SupportModule() {
  const { user } = useAuth();
  const [activeTicket, setActiveTicket] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [ticketMsg, setTicketMsg] = useState('');
  const [ticketCategory, setTicketCategory] = useState('General Inquiry');
  const [ticketSent, setTicketSent] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);

  const handleTicketSubmit = async () => {
    if (!ticketMsg.trim()) return;
    setTicketLoading(true);
    try {
      await base44.functions.invoke('sendSupportTicket', {
        message: ticketMsg,
        category: ticketCategory,
        submitted_at: new Date().toISOString(),
      });
      setTicketSent(true);
    } catch (e) {
      alert('Failed to send ticket. Please try WhatsApp or email directly.');
    } finally {
      setTicketLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Support Center</h2>
        <p className="text-xs text-slate-400 mt-0.5">24/7 concierge assistance for your healthcare journey</p>
      </div>

      {/* Contact channels */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            icon: MessageCircle, label: 'Live Chat', sub: 'Available 24/7', color: 'emerald', action: 'Start Chat',
            onClick: () => document.querySelector('[data-chat-trigger]')?.click(),
          },
          {
            icon: Phone, label: 'WhatsApp Support', sub: '+1 (800) MRL-CARE', color: 'green', action: 'Open WhatsApp',
            onClick: () => window.open('https://wa.me/18001MRLCARE?text=Hi, I need support with my case', '_blank'),
          },
          {
            icon: AlertTriangle, label: 'Emergency Hotline', sub: 'Critical situations only', color: 'red', action: 'Call Now',
            onClick: () => { window.location.href = 'tel:+18001MRLCARE'; },
          },
        ].map(({ icon: Icon, label, sub, color, action, onClick }) => (
          <div key={label} className={`bg-white border rounded-2xl shadow-sm p-5 text-center
            ${color === 'red' ? 'border-red-100' : color === 'green' ? 'border-green-100' : 'border-slate-100'}`}>
            <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center
              ${color === 'red' ? 'bg-red-50' : color === 'green' ? 'bg-green-50' : 'bg-emerald-50'}`}>
              <Icon className={`w-5 h-5 ${color === 'red' ? 'text-red-600' : color === 'green' ? 'text-green-600' : 'text-emerald-700'}`} />
            </div>
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5 mb-3">{sub}</p>
            <button
              onClick={onClick}
              className={`w-full text-xs font-semibold py-2 rounded-xl transition-all
              ${color === 'red' ? 'bg-red-600 hover:bg-red-700 text-white' :
                color === 'green' ? 'bg-green-600 hover:bg-green-700 text-white' :
                'bg-emerald-700 hover:bg-emerald-800 text-white'}`}>
              {action}
            </button>
          </div>
        ))}
      </div>

      {/* Submit a ticket */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Send className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Submit a Support Ticket</h3>
            <p className="text-xs text-slate-400">For non-urgent inquiries and dispute resolution</p>
          </div>
        </div>
        {!ticketSent ? (
          <div className="space-y-3">
            <select
              value={ticketCategory}
              onChange={e => setTicketCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option>General Inquiry</option>
              <option>Booking Issue</option>
              <option>Document Problem</option>
              <option>Medical Concern</option>
              <option>Payment Dispute</option>
              <option>Complaint / Feedback</option>
            </select>
            <textarea
              value={ticketMsg}
              onChange={e => setTicketMsg(e.target.value)}
              rows={4}
              placeholder="Describe your issue or question in detail…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
            />
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              onClick={handleTicketSubmit}
              disabled={ticketLoading || !ticketMsg.trim()}
            >
              {ticketLoading ? 'Sending…' : 'Submit Ticket'}
            </Button>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Ticket Submitted</p>
              <p className="text-xs text-emerald-700">Your coordinator will respond within 24 hours.</p>
            </div>
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-violet-700" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Frequently Asked Questions</h3>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-50 hover:bg-slate-100 transition-colors"
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              >
                <p className="text-xs font-semibold text-slate-700">{faq.q}</p>
                <span className="text-slate-400 text-sm ml-3">{expandedFaq === i ? '−' : '+'}</span>
              </button>
              {expandedFaq === i && (
                <div className="px-4 py-3 bg-white">
                  <p className="text-xs text-slate-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}