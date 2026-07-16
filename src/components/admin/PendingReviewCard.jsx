import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Ban, AlertTriangle, MapPin, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const RISK_CFG = {
  high:   { cls: 'bg-red-100 text-red-700',     border: 'border-red-300',     bg: 'bg-red-50' },
  medium: { cls: 'bg-amber-100 text-amber-700', border: 'border-amber-300',   bg: 'bg-amber-50' },
  low:    { cls: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-300', bg: 'bg-emerald-50' },
};

const TYPE_LABEL = { doctor: 'Doctor', travel_agency: 'Travel Agency', taxi: 'Taxi Service', security: 'Security Agency' };

export default function PendingReviewCard({ partner, onApprove, onBlacklist, actionLoading }) {
  const [expanded, setExpanded] = useState(false);
  const [showBlacklistForm, setShowBlacklistForm] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');

  const risk = partner.internet_risk_level || 'medium';
  const cfg = RISK_CFG[risk] || RISK_CFG.medium;
  const name = partner.full_name || partner.agency_name || partner.company_name || partner.contact_person || 'Unknown';
  const city = partner.clinic_city || partner.city || partner.operating_city || '';
  const country = partner.clinic_country || partner.country || partner.operating_country || partner.headquarters_country || '';
  const flags = partner.internet_signals?.xai_flags || [];
  const positives = partner.internet_signals?.xai_positives || [];
  const approveLoading = actionLoading === `${partner.id}-approve`;
  const blacklistLoading = actionLoading === `${partner.id}-blacklist`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`border-2 ${cfg.border} ${cfg.bg} rounded-2xl`}>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-slate-900 line-clamp-1">{name}</h3>
                <Badge className={cfg.cls}>{risk.toUpperCase()} RISK</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <Badge variant="outline">{TYPE_LABEL[partner._partnerType]}</Badge>
                {city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{city}{country ? `, ${country}` : ''}</span>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-slate-900">{partner.internet_risk_score ?? '—'}<span className="text-sm text-slate-400">/100</span></p>
            </div>
          </div>

          {partner.internet_summary && (
            <div className="mb-3 p-3 bg-white/60 rounded-lg border border-slate-200">
              <p className="text-[10px] font-bold tracking-widest text-slate-400 mb-1">AI INTELLIGENCE SUMMARY</p>
              <p className="text-sm text-slate-700 leading-relaxed">{partner.internet_summary}</p>
            </div>
          )}

          {flags.length > 0 && (
            <div className="mb-3 space-y-1">
              {flags.slice(0, expanded ? undefined : 3).map((flag, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{flag}</p>
                </div>
              ))}
              {flags.length > 3 && (
                <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 underline flex items-center gap-1">
                  {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />+{flags.length - 3} more flags</>}
                </button>
              )}
            </div>
          )}

          {expanded && positives.length > 0 && (
            <div className="mb-3 space-y-1">
              {positives.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700">{p}</p>
                </div>
              ))}
            </div>
          )}

          {showBlacklistForm ? (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-800 mb-2">Reason for blacklisting:</p>
              <textarea
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                placeholder="e.g. Fraud factory — device fingerprint matches suspended applications"
                className="w-full text-xs p-2 border border-red-200 rounded-md mb-2 resize-none bg-white"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => onBlacklist(blacklistReason)} disabled={blacklistLoading} className="flex-1">
                  {blacklistLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  Confirm Blacklist
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowBlacklistForm(false); setBlacklistReason(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 pt-3 border-t border-slate-200">
              <Button size="sm" onClick={onApprove} disabled={approveLoading || blacklistLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {approveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowBlacklistForm(true)} disabled={approveLoading || blacklistLoading} className="flex-1">
                <Ban className="w-3.5 h-3.5" />
                Blacklist
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}