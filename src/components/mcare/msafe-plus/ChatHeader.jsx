import React from 'react';
import { Phone, Volume2, Maximize2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RobotAvatarImage from '@/components/mcare/RobotAvatarImage';
import LiveSessionBadge from './LiveSessionBadge';

// ChatHeader — the right-column header: small robot avatar, "M-Safe" title
// with subtitle, a mint LIVE SESSION badge, and utility icons. The close (X)
// returns to the dashboard; phone/audio/fullscreen are visual controls.
export default function ChatHeader() {
  const navigate = useNavigate();
  return (
    <div
      className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(210,169,61,0.18)', background: '#FBFAF6' }}
    >
      <div className="flex-shrink-0 rounded-full overflow-hidden" style={{ width: 34, height: 34 }}>
        <RobotAvatarImage size={34} animated={false} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight" style={{ color: '#1D1D1C' }}>M-Safe</p>
        <p className="text-[11px] leading-tight" style={{ color: '#777' }}>Morales Super Agent</p>
      </div>
      <div className="hidden sm:block">
        <LiveSessionBadge />
      </div>
      <div className="flex items-center gap-0.5 ml-1">
        <button type="button" className="msafe-icon-btn" aria-label="Call"><Phone className="w-3.5 h-3.5" /></button>
        <button type="button" className="msafe-icon-btn" aria-label="Audio"><Volume2 className="w-3.5 h-3.5" /></button>
        <button type="button" className="msafe-icon-btn" aria-label="Fullscreen"><Maximize2 className="w-3.5 h-3.5" /></button>
        <button type="button" className="msafe-icon-btn" aria-label="Close" onClick={() => navigate('/dashboard')}><X className="w-3.5 h-3.5" /></button>
      </div>
      <style>{`
        .msafe-icon-btn {
          width: 28px; height: 28px; border-radius: 9999px;
          display: flex; align-items: center; justify-content: center;
          color: #999; transition: all .15s; border: none; background: transparent;
        }
        .msafe-icon-btn:hover { background: rgba(210,169,61,0.1); color: #C9A43B; }
        .msafe-icon-btn:active { transform: scale(0.92); }
      `}</style>
    </div>
  );
}