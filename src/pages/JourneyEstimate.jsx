import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import EstimateLine from '@/components/estimate/EstimateLine';

const GOLD = '#D4AF37';
const INK = '#F3F5F7';
const MUTED = 'rgba(243,245,247,0.55)';
const CARD = '#0E1725';
const BORDER = '#22303F';

const CATEGORY_LABELS = {
  clinic_procedure: 'Procedure',
  flight: 'Flights',
  lodging: 'Accommodation',
  transfer: 'Transfers',
  chauffeur_hourly: 'Chauffeur',
  companion_care: 'Companion support',
  recovery: 'Recovery services',
  tour: 'Experiences',
  security: 'Security',
  package: 'Packages',
};

const CATEGORY_ORDER = [
  'clinic_procedure', 'flight', 'lodging', 'transfer', 'chauffeur_hourly',
  'companion_care', 'tour', 'security', 'package',
];

/**
 * The itemized journey estimate.
 *
 * It only ever adds up prices a partner has actually published. Everything else
 * says so in words — because the one thing a medical-travel estimate must never
 * do is look complete when half of it is still a guess.
 */
export default function JourneyEstimate() {
  const [country, setCountry] = useState('Venezuela');
  const [nights, setNights] = useState(7);
  const [travellers, setTravellers] = useState(1);

  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [offersError, setOffersError] = useState(false);

  const [selected, setSelected] = useState([]);
  const [building, setBuilding] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [buildError, setBuildError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingOffers(true);
      setOffersError(false);
      try {
        const res = await base44.functions.invoke('searchPartnerOffers', {
          country: country.trim(),
          limit: 50,
        });
        const payload = res?.data ?? res;
        if (alive) setOffers(Array.isArray(payload?.offers) ? payload.offers : []);
      } catch {
        if (alive) {
          setOffers([]);
          setOffersError(true);
        }
      } finally {
        if (alive) setLoadingOffers(false);
      }
    })();
    return () => { alive = false; };
  }, [country]);

  const grouped = useMemo(() => {
    return CATEGORY_ORDER
      .map((category) => ({
        category,
        label: CATEGORY_LABELS[category] || category,
        items: offers.filter((offer) => offer.category === category),
      }))
      .filter((group) => group.items.length > 0);
  }, [offers]);

  const toggleOffer = (offer) => {
    setEstimate(null);
    setSelected((current) => {
      const exists = current.find((item) => item.service_id === offer.service_id);
      if (exists) return current.filter((item) => item.service_id !== offer.service_id);
      return [...current, offer];
    });
  };

  const build = async () => {
    setBuilding(true);
    setBuildError('');
    try {
      const res = await base44.functions.invoke('buildJourneyEstimate', {
        service_ids: selected.map((offer) => offer.service_id),
        nights: Number(nights) || 1,
        travellers: Number(travellers) || 1,
      });
      const payload = res?.data ?? res;
      if (payload?.error) {
        setBuildError(payload.error);
        setEstimate(null);
      } else {
        setEstimate(payload);
      }
    } catch {
      setBuildError('The estimate could not be built just now. Please try again.');
      setEstimate(null);
    } finally {
      setBuilding(false);
    }
  };

  const total = estimate?.total;

  return (
    <div style={{ minHeight: '100vh', background: '#060B16', color: INK, paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '22px 18px 0' }}>
        <Link
          to="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: MUTED, textDecoration: 'none' }}
        >
          <ArrowLeft size="15" /> Back
        </Link>

        <h1 style={{ margin: '18px 0 0', fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Your journey, line by line
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.6, color: MUTED }}>
          Every price here comes from a named partner. Where a partner has not published one, the line
          says so instead of estimating — and the total tells you exactly how much of the journey it covers.
        </p>

        {/* Journey shape */}
        <div style={{ marginTop: 22, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'block' }}>
              <span style={{ fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED }}>Destination</span>
              <input
                value={country}
                onChange={(event) => { setCountry(event.target.value); setEstimate(null); }}
                placeholder="Country"
                style={{
                  marginTop: 6, width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
                  background: '#0A1220', border: `1px solid ${BORDER}`, color: INK, fontSize: 14,
                }}
              />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED }}>Nights</span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={nights}
                  onChange={(event) => { setNights(event.target.value); setEstimate(null); }}
                  style={{
                    marginTop: 6, width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
                    background: '#0A1220', border: `1px solid ${BORDER}`, color: INK, fontSize: 14,
                  }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED }}>People</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={travellers}
                  onChange={(event) => { setTravellers(event.target.value); setEstimate(null); }}
                  style={{
                    marginTop: 6, width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
                    background: '#0A1220', border: `1px solid ${BORDER}`, color: INK, fontSize: 14,
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Available partner offers */}
        <div style={{ marginTop: 24 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Add what you want priced</h2>
          <p style={{ margin: '5px 0 0', fontSize: 12.5, color: MUTED }}>
            Only offers published by partners in this destination are shown.
          </p>

          {loadingOffers && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, color: MUTED, fontSize: 13 }}>
              <Loader2 size="15" className="animate-spin" /> Checking partner offers…
            </div>
          )}

          {!loadingOffers && offersError && (
            <p style={{ marginTop: 14, fontSize: 13, color: '#F87171' }}>
              Partner offers could not be loaded just now.
            </p>
          )}

          {!loadingOffers && !offersError && grouped.length === 0 && (
            <div style={{ marginTop: 14, padding: 16, borderRadius: 14, border: `1px dashed ${BORDER}`, background: 'rgba(255,255,255,0.02)' }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: MUTED }}>
                No partner has published a price for {country || 'this destination'} yet. That is not a
                problem with your request — it means this corridor is still being built, and M-Care will
                not invent a number to fill the gap.
              </p>
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.category} style={{ marginTop: 18 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: GOLD }}>
                {group.label}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.items.map((offer) => {
                  const isSelected = selected.some((item) => item.service_id === offer.service_id);
                  return (
                    <button
                      key={offer.rate_card_id}
                      type="button"
                      onClick={() => toggleOffer(offer)}
                      style={{
                        textAlign: 'left', width: '100%', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 12,
                        background: isSelected ? 'rgba(212,175,55,0.1)' : CARD,
                        border: `1px solid ${isSelected ? 'rgba(212,175,55,0.55)' : BORDER}`,
                        color: INK,
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{offer.service_name}</span>
                        <span style={{ display: 'block', fontSize: 12, color: MUTED, marginTop: 2 }}>
                          {offer.partner_display_name}
                          {offer.location_label ? ` · ${offer.location_label}` : ''}
                        </span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 650, color: offer.amount_display ? GOLD : MUTED }}>
                          {offer.amount_display || 'Quote only'}
                        </span>
                        {isSelected ? <Check size="16" color={GOLD} /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Build */}
        <button
          type="button"
          onClick={build}
          disabled={building}
          style={{
            marginTop: 24, width: '100%', padding: '14px 18px', borderRadius: 12, border: 'none',
            background: building ? 'rgba(212,175,55,0.5)' : GOLD, color: '#060B16',
            fontSize: 14, fontWeight: 700, cursor: building ? 'default' : 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {building ? <Loader2 size="16" className="animate-spin" /> : null}
          {building ? 'Building your estimate…' : 'Build itemized estimate'}
        </button>

        {buildError && (
          <p style={{ marginTop: 12, fontSize: 12.5, color: '#F87171' }}>{buildError}</p>
        )}

        {/* Result */}
        {estimate && (
          <div style={{ marginTop: 26, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 18 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 650 }}>Journey estimate</h2>
            <p style={{ margin: '5px 0 4px', fontSize: 12, color: MUTED }}>
              {estimate.inputs?.nights} nights · {estimate.inputs?.travellers} traveller{estimate.inputs?.travellers === 1 ? '' : 's'}
            </p>

            <div style={{ marginTop: 6 }}>
              {(estimate.lines || []).map((line) => (
                <EstimateLine key={line.key} line={line} />
              ))}
            </div>

            <div style={{ marginTop: 18, padding: '16px 16px', borderRadius: 14, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>
                  {total?.is_partial ? 'Confirmed subtotal' : 'Total'}
                </span>
                <span style={{ fontSize: 21, fontWeight: 700, color: GOLD }}>
                  {total?.amount_display || 'Not yet priced'}
                </span>
              </div>
              {total?.is_partial && (
                <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.55, color: MUTED }}>
                  This is only the part of the journey that has a firm partner price
                  {typeof total?.unpriced_line_count === 'number' ? ` (${total.unpriced_line_count} line${total.unpriced_line_count === 1 ? '' : 's'} still to quote)` : ''}.
                  It is not a final cost.
                </p>
              )}
            </div>

            {Array.isArray(estimate.notes) && estimate.notes.length > 0 && (
              <ul style={{ margin: '14px 0 0', paddingLeft: 18 }}>
                {estimate.notes.map((note, index) => (
                  <li key={index} style={{ fontSize: 12, lineHeight: 1.6, color: MUTED }}>{note}</li>
                ))}
              </ul>
            )}

            <p style={{ margin: '14px 0 0', fontSize: 11.5, lineHeight: 1.6, color: 'rgba(243,245,247,0.35)' }}>
              A price here is a commercial quotation, not medical advice and not a booking. Any clinical
              price is informational — suitability and final treatment cost are confirmed by the clinic.
            </p>
          </div>
        )}

        {selected.length > 0 && (
          <p style={{ marginTop: 14, fontSize: 12, color: MUTED }}>
            {selected.length} line{selected.length === 1 ? '' : 's'} selected.
          </p>
        )}
      </div>
    </div>
  );
}