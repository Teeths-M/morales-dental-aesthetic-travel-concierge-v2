import React from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { useMcarePreferences } from '@/hooks/useMcarePreferences';
import { openChannelConnect } from '@/lib/mcareChannels';
import { useToast } from '@/components/ui/use-toast';

/**
 * ConnectChannelsNudgeCard — tells travelers, on the dashboard, that M-Care
 * can be reached from WhatsApp and Telegram.
 *
 * It already could (the Settings page has said so for a while); a traveler who
 * never opens Settings never found out. Same two connect buttons, same links —
 * both now built by mcareChannels.js so the two cards cannot drift apart.
 *
 * Dismissing it, or saying it's already connected, saves that on the traveler's
 * own record: the card stays gone on every device, not just this browser.
 * Visitors without an account see nothing (there is nothing to connect to).
 */
export default function ConnectChannelsNudgeCard() {
  const { user } = useAuth();
  const { prefs, update, saving } = useMcarePreferences();
  const { toast } = useToast();

  const connect = (channel) => {
    try {
      openChannelConnect(channel);
    } catch {
      toast({ title: "Couldn't open that right now", description: 'Please try again in a moment.', variant: 'destructive' });
    }
  };

  // Signed-out visitors aren't offered this: there's no M-Care account for the
  // channel to connect to yet.
  if (!user) return null;
  if (prefs.channelsCardHidden || prefs.channelsConnected) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-800 text-sm">M-Care is on WhatsApp and Telegram</h3>
          <p className="text-xs text-slate-500 mt-0.5">Connect once — same assistant, same case, no app needed</p>
        </div>
        <button
          onClick={() => update({ channelsCardHidden: true })}
          disabled={saving}
          aria-label="Dismiss"
          className="ml-auto text-slate-300 hover:text-slate-500 flex-shrink-0 p-1 -mr-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        Keep talking to M-Care from your messages when you'd rather not open the app — for instance
        while you're travelling with your hands full.
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button size="sm" variant="outline" onClick={() => connect('whatsapp')} className="text-xs font-semibold">
          <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Connect WhatsApp
        </Button>
        <Button size="sm" variant="outline" onClick={() => connect('telegram')} className="text-xs font-semibold">
          <Send className="w-3.5 h-3.5 mr-1.5" /> Connect Telegram
        </Button>
        <button
          onClick={() => update({ channelsConnected: true })}
          disabled={saving}
          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
        >
          I've already connected
        </button>
      </div>
    </div>
  );
}