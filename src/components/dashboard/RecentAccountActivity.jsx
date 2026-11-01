import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ACCOUNT_EVENT_TYPES, recentAccountActivity } from '@/lib/accountActivity';

/**
 * RecentAccountActivity — the last few changes to this account (profile,
 * contact phone, account type, sharing with family, Private Mode), read from
 * the owner's own audit-log entries. The audit log's rules only ever return
 * entries the signed-in user made themselves. Shown in Settings so someone
 * can notice a change they didn't make.
 */

const COPY = {
  en: {
    title: 'Recent account activity',
    loading: 'Loading…',
    empty: 'Nothing yet.',
    notYou: "If something here wasn't you, ask M-Care to connect you with our care team.",
  },
  es: {
    title: 'Actividad reciente de la cuenta',
    loading: 'Cargando…',
    empty: 'Nada todavía.',
    notYou: 'Si algo de esto no lo hiciste tú, pide a M-Care que te ponga en contacto con nuestro equipo de atención.',
  },
  fr: {
    title: 'Activité récente du compte',
    loading: 'Chargement…',
    empty: 'Rien pour le moment.',
    notYou: "Si l'une de ces actions ne vient pas de vous, demandez à M-Care de vous mettre en relation avec notre équipe de soins.",
  },
  pt: {
    title: 'Atividade recente da conta',
    loading: 'Carregando…',
    empty: 'Nada ainda.',
    notYou: 'Se algo aqui não foi você, peça à M-Care que coloque você em contato com nossa equipe de atendimento.',
  },
};

function formatWhen(at, lang) {
  const when = new Date(at);
  if (Number.isNaN(when.getTime())) return '';
  try {
    return when.toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return when.toISOString().slice(0, 16).replace('T', ' ');
  }
}

export default function RecentAccountActivity({ lang = 'en', refreshKey = 0 }) {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const copy = COPY[lang] || COPY.en;

  useEffect(() => {
    if (!user?.id) return undefined;
    let alive = true;
    base44.entities.AuditLog
      .filter({ actor_id: user.id, event_type: { $in: ACCOUNT_EVENT_TYPES } }, '-timestamp', 20)
      .then((rows) => { if (alive) setItems(recentAccountActivity(rows, { lang })); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [user?.id, lang, refreshKey]);

  if (!user?.id) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <History className="w-5 h-5 text-slate-600" />
        </div>
        <h3 className="font-semibold text-slate-800 text-sm">{copy.title}</h3>
      </div>
      {items === null ? (
        <p className="text-xs text-slate-400">{copy.loading}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-500">{copy.empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id || `${item.at}-${item.text}`} className="flex items-start justify-between gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
              <span className="text-xs text-slate-700">{item.text}</span>
              <span className="text-[11px] text-slate-400 whitespace-nowrap">{formatWhen(item.at, lang)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-slate-400 mt-3">{copy.notYou}</p>
    </div>
  );
}
