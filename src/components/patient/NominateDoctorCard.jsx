import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ChevronRight } from 'lucide-react';

const GOLD = '#D4AF37';

/**
 * NominateDoctorCard — Dashboard entry point for the doctor-nomination flow.
 * Purely a link out to /nominate-doctor; no data fetching here.
 */
export default function NominateDoctorCard() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/nominate-doctor')}
      className="w-full text-left rounded-2xl transition-colors"
      style={{ background: '#0C1A1D', border: `1px solid ${GOLD}40`, padding: '18px 20px' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ width: 36, height: 36, background: `${GOLD}1A` }}
          >
            <UserPlus className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Had a great doctor who isn't on M?</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Tell us about them — we'll reach out and invite them to join.
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
      </div>
    </button>
  );
}
