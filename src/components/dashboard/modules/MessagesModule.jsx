import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Phone, Mail, Bell, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const getMessagesLabels = (lang) => ({
  title: lang === 'es' ? 'Mensajes' : lang === 'fr' ? 'Messages' : lang === 'pt' ? 'Mensagens' : 'Messages',
  subtitle: lang === 'es' ? 'Comunicación segura con tu equipo de cuidado' : lang === 'fr' ? 'Communication sécurisée avec votre équipe de soins' : lang === 'pt' ? 'Comunicação segura com sua equipe de cuidados' : 'Secure communication with your care team',
  noConversations: lang === 'es' ? 'Sin conversaciones aún' : lang === 'fr' ? 'Pas de conversations pour le moment' : lang === 'pt' ? 'Nenhuma conversa ainda' : 'No conversations yet',
  noConversationsDesc: lang === 'es' ? 'Los mensajes del equipo de cuidado aparecerán aquí una vez que tu consulta sea confirmada.' : lang === 'fr' ? 'Les messages de votre équipe de soins apparaîtront ici une fois votre consultation confirmée.' : lang === 'pt' ? 'As mensagens da sua equipe de cuidados aparecerão aqui assim que sua consulta for confirmada.' : 'Your care team messages will appear here once your consultation is confirmed.',
  conversations: lang === 'es' ? 'Conversaciones' : lang === 'fr' ? 'Conversations' : lang === 'pt' ? 'Conversas' : 'Conversations',
  whatsapp: lang === 'es' ? 'Soporte por WhatsApp' : lang === 'fr' ? 'Support WhatsApp' : lang === 'pt' ? 'Suporte WhatsApp' : 'WhatsApp Support',
  email: lang === 'es' ? 'Soporte por Correo' : lang === 'fr' ? 'Support Email' : lang === 'pt' ? 'Suporte por Email' : 'Email Support',
  typing: lang === 'es' ? 'Escribe un mensaje…' : lang === 'fr' ? 'Tapez un message…' : lang === 'pt' ? 'Digite uma mensagem…' : 'Type a message…',
  reminders: lang === 'es' ? 'Recordatorios Automatizados' : lang === 'fr' ? 'Rappels Automatisés' : lang === 'pt' ? 'Lembretes Automatizados' : 'Automated Reminders',
  online: lang === 'es' ? '🟢 En línea' : lang === 'fr' ? '🟢 En ligne' : lang === 'pt' ? '🟢 Online' : '🟢 Online',
  offline: lang === 'es' ? '⚫ Desconectado' : lang === 'fr' ? '⚫ Hors ligne' : lang === 'pt' ? '⚫ Offline' : '⚫ Offline',
  appointmentReminders: lang === 'es' ? 'Recordatorios de Citas' : lang === 'fr' ? 'Rappels de Rendez-vous' : lang === 'pt' ? 'Lembretes de Compromissos' : 'Appointment Reminders',
  medicationReminders: lang === 'es' ? 'Recordatorios de Medicamentos' : lang === 'fr' ? 'Rappels de Médicaments' : lang === 'pt' ? 'Lembretes de Medicamentos' : 'Medication Reminders',
  recoveryInstructions: lang === 'es' ? 'Instrucciones de Recuperación' : lang === 'fr' ? 'Instructions de Récupération' : lang === 'pt' ? 'Instruções de Recuperação' : 'Recovery Instructions',
  travelUpdates: lang === 'es' ? 'Actualizaciones de Viaje' : lang === 'fr' ? 'Mises à jour de Voyage' : lang === 'pt' ? 'Atualizações de Viagem' : 'Travel Updates',
  documentAlerts: lang === 'es' ? 'Alertas de Documentos' : lang === 'fr' ? 'Alertes de Documents' : lang === 'pt' ? 'Alertas de Documentos' : 'Document Alerts',
  paymentNotifications: lang === 'es' ? 'Notificaciones de Pago' : lang === 'fr' ? 'Notifications de Paiement' : lang === 'pt' ? 'Notificações de Pagamento' : 'Payment Notifications',
});

const contacts = [];

const initialMessages = {};

export default function MessagesModule() {
  const [appLanguage, setAppLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en');
  const [activeContact, setActiveContact] = useState(1);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const labels = getMessagesLabels(appLanguage);

  const send = () => {
    if (!input.trim()) return;
    setMessages(prev => ({
      ...prev,
      [activeContact]: [...(prev[activeContact] || []), { from: 'me', text: input, time: 'Now' }]
    }));
    setInput('');
  };

  const contact = contacts.find(c => c.id === activeContact);

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setAppLanguage(event.detail.language);
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{labels.title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{labels.subtitle}</p>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-12 text-center">
          <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium mb-1">{labels.noConversations}</p>
          <p className="text-sm text-slate-400">{labels.noConversationsDesc}</p>
        </div>
      ) : (
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden" style={{ height: '600px' }}>
        <div className="flex h-full">
          {/* Contact list */}
          <div className="w-64 border-r border-slate-100 flex flex-col flex-shrink-0">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">{labels.conversations}</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {contacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveContact(c.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 ${activeContact === c.id ? 'bg-emerald-50' : ''}`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-700 to-blue-800 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">{c.avatar}</span>
                    </div>
                    {c.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${activeContact === c.id ? 'text-emerald-800' : 'text-slate-800'}`}>{c.name}</p>
                    <p className="text-[10px] text-slate-400">{c.role}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{c.last}</p>
                  </div>
                </button>
              ))}
            </div>
            {/* Channel links */}
            <div className="p-3 border-t border-slate-100 space-y-1">
              <button className="w-full flex items-center gap-2 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded-xl px-3 py-2 font-semibold">
                <Phone className="w-3.5 h-3.5" /> {labels.whatsapp}
              </button>
              <button className="w-full flex items-center gap-2 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl px-3 py-2 font-semibold">
                <Mail className="w-3.5 h-3.5" /> {labels.email}
              </button>
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-700 to-blue-800 flex items-center justify-center">
                <span className="text-white font-bold text-xs">{contact?.avatar}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{contact?.name}</p>
                <p className="text-[11px] text-slate-400">{contact?.role} · {contact?.online ? labels.online : labels.offline}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {(messages[activeContact] || []).map((msg, i) => (
                <div key={i} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                    msg.from === 'me'
                      ? 'bg-gradient-to-br from-emerald-700 to-blue-800 text-white rounded-br-sm'
                      : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm'
                  }`}>
                    <p className="leading-relaxed">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.from === 'me' ? 'text-white/60 text-right' : 'text-slate-400'}`}>{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={labels.typing}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
              />
              <Button
                size="icon"
                className="bg-emerald-700 hover:bg-emerald-800 h-10 w-10 rounded-xl flex-shrink-0"
                onClick={send}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Notification preferences */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-4 h-4 text-emerald-600" />
          <p className="text-sm font-semibold text-slate-800">{labels.reminders}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          {[
            labels.appointmentReminders,
            labels.medicationReminders,
            labels.recoveryInstructions,
            labels.travelUpdates,
            labels.documentAlerts,
            labels.paymentNotifications,
          ].map(r => (
            <div key={r} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className="text-xs text-slate-600">{r}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}