import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, MapPin, Calendar, Shield, Check, Award, Loader2, Stethoscope, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import CaseThread from '@/components/quotes/CaseThread';

// Design tokens (project standard).
const PAGE = '#060B16', CARD = '#0C1A1D', BORDER = '#2A3F4A', GOLD = '#D4AF37';

const SORTS = [
  { id: 'value', label: 'Best value' },
  { id: 'price', label: 'Lowest price' },
  { id: 'rating', label: 'Highest rated' },
  { id: 'soonest', label: 'Soonest' },
];

// Always-visible, plain-words protection status (12-year-old test).
function ProtectionShield() {
  const items = ['Safety-checked', 'Money held safely', '24/7 support watching'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      background: 'rgba(212,175,55,0.08)', border: `1px solid rgba(212,175,55,0.3)`,
      borderRadius: 14, padding: '12px 16px' }}>
      <Shield size={18} color={GOLD} />
      <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>You're protected</span>
      {items.map((t) => (
        <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
          color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
          <Check size={13} color="#34d399" /> {t}
        </span>
      ))}
    </div>
  );
}

function Stars({ rating = 0 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} color={GOLD} fill={i <= Math.round(rating) ? GOLD : 'none'} />
      ))}
    </span>
  );
}

const money = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;

export default function MyQuotes() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const requestId = params.get('request');
  const [sort, setSort] = useState('value');
  const [picked, setPicked] = useState(null);

  // The patient's active quote request (deep-linked or most recent).
  const { data: request, isLoading: reqLoading } = useQuery({
    queryKey: ['my-quote-request', user?.email, requestId],
    enabled: !!user?.email,
    queryFn: async () => {
      if (requestId) return base44.entities.DoctorQuoteRequest.get(requestId).catch(() => null);
      const rows = await base44.entities.DoctorQuoteRequest
        .filter({ patient_email: user.email }, '-created_date', 1).catch(() => []);
      return rows[0] || null;
    },
  });

  // Submitted quotes for this request, enriched with the doctor's trust signals.
  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ['quotes-for-request', request?.id],
    enabled: !!request?.id,
    queryFn: async () => {
      const all = await base44.entities.DoctorQuote
        .filter({ request_id: request.id }, '-created_date', 60).catch(() => []);
      const dq = all.filter((q) => q.status === 'submitted' || q.status === 'needs_more_info');
      const today = new Date().toISOString().slice(0, 10);
      return Promise.all(dq.map(async (q) => {
        const doc = q.doctor_id ? await base44.entities.Doctor.get(q.doctor_id).catch(() => null) : null;
        let soonest = null;
        try {
          const slots = await base44.entities.DoctorAvailability
            .filter({ doctor_id: q.doctor_id, is_available: true }, '-date', 30);
          soonest = (slots || []).map((s) => s.date).filter((d) => d && d >= today).sort()[0] || null;
        } catch { /* availability optional */ }
        return { ...q, doctor: doc, soonest };
      }));
    },
  });

  const select = useMutation({
    mutationFn: (quoteId) => base44.functions.invoke('selectDoctorQuote', { quote_id: quoteId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['quotes-for-request'] });
      qc.invalidateQueries({ queryKey: ['my-quote-request'] });
      const caseId = res?.data?.case_id ?? res?.case_id;
      // Straight to booking — the doctor confirms the date in parallel.
      navigate(caseId ? `/portal-hub/checkout/${caseId}` : '/dashboard/bookings');
    },
  });

  // Priced quotes are compared and chosen; "needs_more_info" quotes are doctors
  // waiting on an answer — surfaced as questions, not prices.
  const priced = useMemo(() => quotes.filter((q) => q.status === 'submitted'), [quotes]);
  const questions = useMemo(() => quotes.filter((q) => q.status === 'needs_more_info'), [quotes]);

  const minPrice = useMemo(
    () => priced.reduce((m, q) => Math.min(m, Number(q.total_usd) || Infinity), Infinity),
    [priced],
  );

  const sorted = useMemo(() => {
    const withScore = priced.map((q) => {
      const price = Number(q.total_usd) || 0;
      const rating = Number(q.doctor?.rating) || 0;
      const years = Number(q.doctor?.years_experience) || 0;
      const success = Number(q.doctor?.successful_procedures_count) || 0;
      const priceScore = price > 0 && minPrice !== Infinity ? minPrice / price : 0;
      const value = 0.4 * priceScore + 0.3 * (rating / 5) + 0.15 * Math.min(success / 200, 1) + 0.15 * Math.min(years / 20, 1);
      return { ...q, _value: value };
    });
    const by = {
      value: (a, b) => b._value - a._value,
      price: (a, b) => (Number(a.total_usd) || 0) - (Number(b.total_usd) || 0),
      rating: (a, b) => (Number(b.doctor?.rating) || 0) - (Number(a.doctor?.rating) || 0),
      soonest: (a, b) => String(a.soonest || '9999').localeCompare(String(b.soonest || '9999')),
    };
    return withScore.sort(by[sort] || by.value);
  }, [priced, sort, minPrice]);

  const wrap = { minHeight: '100vh', background: PAGE, padding: '24px 16px',
    fontFamily: '"SF Pro Display", system-ui, sans-serif' };
  const inner = { maxWidth: 720, margin: '0 auto' };

  if (reqLoading) {
    return <div style={wrap}><div style={inner}><Center><Loader2 className="animate-spin" color={GOLD} /></Center></div></div>;
  }

  if (!request) {
    return (
      <div style={wrap}><div style={inner}>
        <ProtectionShield />
        <Center>
          <Stethoscope size={40} color={GOLD} />
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '16px 0 8px' }}>No active quote requests</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 20 }}>
            Start a consultation and we'll invite specialist doctors to quote for you.
          </p>
          <button onClick={() => navigate('/intake')} style={primaryBtn}>Start a consultation</button>
        </Center>
      </div></div>
    );
  }

  const procedures = (request.procedures || []).join(', ') || 'your procedure';

  return (
    <div style={wrap}>
      <div style={inner}>
        <ProtectionShield />

        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '20px 0 4px' }}>Your doctor options</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 18 }}>
          Compare verified specialists for <strong style={{ color: GOLD }}>{procedures}</strong> and choose the one that's right for you. You have the final say.
        </p>

        {/* Doctors waiting on your answer — surfaced as questions, not prices */}
        {questions.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            {questions.map((q) => (
              <div key={q.id} style={{ ...cardStyle, borderColor: GOLD, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: GOLD, fontWeight: 700, fontSize: 14 }}>
                  <HelpCircle size={16} /> {q.doctor?.full_name || 'A doctor'} has a question for you
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '6px 0 0' }}>
                  Answer to receive your quote from {[q.doctor?.clinic_city, q.doctor?.clinic_country].filter(Boolean).join(', ') || 'this specialist'}.
                </p>
                <CaseThread caseId={request.case_id} quoteId={q.id} viewer="patient" theme="dark" />
              </div>
            ))}
          </div>
        )}

        {/* Sort toggles */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {SORTS.map((s) => (
            <button key={s.id} onClick={() => setSort(s.id)} style={{
              padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${sort === s.id ? GOLD : BORDER}`,
              background: sort === s.id ? 'rgba(212,175,55,0.15)' : 'transparent',
              color: sort === s.id ? GOLD : 'rgba(255,255,255,0.55)',
            }}>{s.label}</button>
          ))}
        </div>

        {/* Gathering state — never blank */}
        {quotesLoading && <Center><Loader2 className="animate-spin" color={GOLD} /></Center>}

        {!quotesLoading && sorted.length === 0 && (
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <Loader2 className="animate-spin" color={GOLD} style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>We're gathering quotes from specialists.</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 6 }}>
              You don't need to wait here — we'll message you the moment quotes arrive.
            </p>
          </div>
        )}

        {/* Quote cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map((q, idx) => {
            const d = q.doctor || {};
            const isPicked = picked === q.id;
            const isBest = sort === 'value' && idx === 0;
            return (
              <div key={q.id} style={{ ...cardStyle, borderColor: isPicked ? GOLD : BORDER,
                boxShadow: isPicked ? `0 0 0 1px ${GOLD}` : 'none' }}>
                {isBest && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: GOLD,
                    color: PAGE, fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99, marginBottom: 12 }}>
                    <Award size={12} /> Best value
                  </div>
                )}
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {d.photo_url
                      ? <img src={d.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Stethoscope size={22} color={GOLD} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{d.full_name || 'Verified specialist'}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 3 }}>
                      <MapPin size={12} /> {[d.clinic_city, d.clinic_country].filter(Boolean).join(', ') || q.doctor_country || '—'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                      <Stars rating={d.rating} />
                      {d.review_count ? <Tag>{d.review_count} reviews</Tag> : null}
                      {d.successful_procedures_count ? <Tag>{d.successful_procedures_count} procedures</Tag> : null}
                      {d.years_experience ? <Tag>{d.years_experience} yrs exp</Tag> : null}
                    </div>
                    {q.soonest && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, color: '#34d399', fontSize: 12 }}>
                        <Calendar size={12} /> Soonest: {format(new Date(q.soonest), 'MMM d')}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: GOLD, fontWeight: 800, fontSize: 20, margin: 0 }}>{money(q.total_usd)}</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '2px 0 0' }}>firm quote</p>
                  </div>
                </div>

                {q.patient_facing_summary && (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '12px 0 0', lineHeight: 1.5 }}>
                    {q.patient_facing_summary}
                  </p>
                )}

                <button
                  onClick={() => setPicked(isPicked ? null : q.id)}
                  style={{ ...(isPicked ? primaryBtn : outlineBtn), width: '100%', marginTop: 14 }}
                >
                  {isPicked ? 'Selected — tap Confirm below' : 'Choose this doctor'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Single confirm — one commitment */}
        {picked && (
          <div style={{ position: 'sticky', bottom: 12, marginTop: 16 }}>
            <button
              disabled={select.isPending}
              onClick={() => select.mutate(picked)}
              style={{ ...primaryBtn, width: '100%', opacity: select.isPending ? 0.7 : 1 }}
            >
              {select.isPending ? 'Securing…' : 'Confirm & continue to booking'}
            </button>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
              You can cancel free until your flights are booked. Your money is held safely in escrow.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Center({ children }) {
  return <div style={{ textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{children}</div>;
}
function Tag({ children }) {
  return <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 99 }}>{children}</span>;
}

const cardStyle = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 };
const primaryBtn = { background: `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`, color: PAGE,
  border: 'none', borderRadius: 99, padding: '13px 24px', fontSize: 14, fontWeight: 800, cursor: 'pointer' };
const outlineBtn = { background: 'transparent', color: '#fff', border: `1px solid ${BORDER}`,
  borderRadius: 99, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
