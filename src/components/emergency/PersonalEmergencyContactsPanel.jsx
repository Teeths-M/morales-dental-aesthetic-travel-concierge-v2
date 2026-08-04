import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Trash2, Phone, Mail, Star, StarOff, Check, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = (email) => `morales_emergency_contacts_${email}`;

function load(email) {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY(email)) || '[]'); }
  catch { return []; }
}
function save(email, contacts) {
  try { localStorage.setItem(STORAGE_KEY(email), JSON.stringify(contacts)); } catch {}
}

const BLANK = { name: '', phone: '', email: '', relationship: '' };

export default function PersonalEmergencyContactsPanel({ userEmail, caseRecord, onCaseSaved }) {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState(null); // null = closed, {} = new, {id} = editing
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    if (userEmail) setContacts(load(userEmail));
  }, [userEmail]);

  const persist = (updated) => {
    setContacts(updated);
    save(userEmail, updated);
  };

  const handleSaveForm = () => {
    if (!form.name?.trim() || !form.phone?.trim()) return;
    let updated;
    if (form.id) {
      updated = contacts.map(c => c.id === form.id ? { ...form } : c);
    } else {
      updated = [...contacts, { ...form, id: crypto.randomUUID(), isPrimary: contacts.length === 0 }];
    }
    persist(updated);
    setForm(null);
  };

  const handleDelete = (id) => {
    persist(contacts.filter(c => c.id !== id));
  };

  const handleSetPrimary = (id) => {
    persist(contacts.map(c => ({ ...c, isPrimary: c.id === id })));
  };

  const handleSyncToCase = async () => {
    if (!caseRecord) return;
    const primary = contacts.find(c => c.isPrimary) || contacts[0];
    if (!primary) return;
    setSaving(true);
    await base44.entities.CaseRecord.update(caseRecord.id, {
      emergency_contact: `${primary.name}${primary.relationship ? ` (${primary.relationship})` : ''}`,
      emergency_contact_number: primary.phone,
      emergency_contact_email: primary.email || '',
    });
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
    if (onCaseSaved) onCaseSaved();
  };

  const primaryContact = contacts.find(c => c.isPrimary) || contacts[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Personal Emergency Contacts</h3>
          <p className="text-xs text-slate-500 mt-0.5">These people are notified when an SOS is triggered.</p>
        </div>
        <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={() => setForm({ ...BLANK })}>
          <UserPlus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {/* Add / Edit form */}
      {form && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Full Name *</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Jane Doe"
                value={form.name || ''}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Relationship</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Spouse, Parent…"
                value={form.relationship || ''}
                onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Phone *</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="+1 555 000 0000"
                value={form.phone || ''}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Email</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="jane@example.com"
                value={form.email || ''}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveForm} disabled={!form.name?.trim() || !form.phone?.trim()}>
              <Check className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setForm(null)}>
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Contact list */}
      {contacts.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
          No emergency contacts yet. Add at least one so your team can reach them during an SOS.
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map(c => (
            <div key={c.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${c.isPrimary ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600 flex-shrink-0">
                {c.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                  {c.isPrimary && <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Primary</span>}
                  {c.relationship && <span className="text-[10px] text-slate-500">{c.relationship}</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                  {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                  {c.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{c.email}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button title={c.isPrimary ? 'Primary contact' : 'Set as primary'} onClick={() => handleSetPrimary(c.id)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  {c.isPrimary ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <StarOff className="w-4 h-4 text-slate-300" />}
                </button>
                <button onClick={() => setForm({ ...c })} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <Pencil className="w-4 h-4 text-slate-400" />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sync primary to case */}
      {contacts.length > 0 && caseRecord && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
          <div className="text-xs text-blue-700">
            <span className="font-semibold">SOS primary: </span>
            {primaryContact ? `${primaryContact.name} · ${primaryContact.phone}` : '—'}
          </div>
          <Button size="sm" className="text-xs h-8 bg-blue-600 hover:bg-blue-700 shrink-0" onClick={handleSyncToCase} disabled={saving}>
            {savedMsg ? <><Check className="w-3.5 h-3.5 mr-1" /> Saved!</> : saving ? 'Saving…' : 'Sync to Journey'}
          </Button>
        </div>
      )}
    </div>
  );
}