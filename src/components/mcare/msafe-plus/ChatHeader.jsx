import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Volume2, VolumeX, Moon, Sun, Maximize2, Minimize2, X } from 'lucide-react';
import RobotAvatarImage from '@/components/mcare/RobotAvatarImage';
import LiveSessionBadge from './LiveSessionBadge';
import { useMSafeTheme } from './MSafeWorkspace';

const MUTE_KEY = 'msafe_muted';

/**
 * ChatHeader — the session bar. Every control here is wired to something
 * real: the phone reads the current message aloud, the speaker mutes that
 * audio (remembered next visit), the moon switches the whole workspace
 * between its light and dark surface, expand goes true fullscreen, and the X
 * leaves the session.
 */
export default function ChatHeader({ lastMessage, onClose }) {
  const navigate = useNavigate();
  const { dark, toggle } = useMSafeTheme();
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
  });
  const [speaking, setSpeaking] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stopSpeaking = () => {
    if (canSpeak) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  // Leaving the workspace must not leave the agent talking to an empty room.
  useEffect(() => () => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const handleSpeak = () => {
    if (!canSpeak || muted) return;
    if (speaking) { stopSpeaking(); return; }
    const text = (lastMessage || '').replace(/[#*_`>]/g, '').trim();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const handleMute = () => {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
    if (next) stopSpeaking();
  };

  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* the browser refused — the button simply does nothing, no broken state */
    }
  };

  const handleClose = () => {
    stopSpeaking();
    if (onClose) onClose();
    else navigate('/dashboard');
  };

  return (
    <div
      className="flex items-center gap-2 px-4 md:px-5 py-2.5 flex-shrink-0"
      style={{ borderBottom: '1px solid var(--ms-border)', background: 'var(--ms-main)' }}
    >
      <div className="flex-shrink-0 rounded-full overflow-hidden" style={{ width: 28, height: 28 }}>
        <RobotAvatarImage size={28} animated={false} />
      </div>

      <p className="flex-1 min-w-0 truncate text-[12.5px] font-semibold" style={{ color: 'var(--ms-ink)' }}>
        M-Safe
        <span style={{ color: 'var(--ms-ink-faint)', fontWeight: 400 }}> · </span>
        <span style={{ color: 'var(--ms-ink-soft)', fontWeight: 500 }}>Morales Super Agent</span>
      </p>

      <div className="hidden sm:block flex-shrink-0">
        <LiveSessionBadge />
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          type="button"
          className="msafe-icon-btn"
          aria-label={speaking ? 'Stop reading aloud' : 'Read this message aloud'}
          title={speaking ? 'Stop reading aloud' : 'Read aloud'}
          onClick={handleSpeak}
          disabled={muted}
          style={{ opacity: muted ? 0.4 : 1 }}
        >
          <Phone className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className="msafe-icon-btn"
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          title={muted ? 'Unmute' : 'Mute'}
          onClick={handleMute}
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          className="msafe-icon-btn"
          aria-label={dark ? 'Switch to light' : 'Switch to dark'}
          title={dark ? 'Light mode' : 'Dark mode'}
          onClick={toggle}
        >
          {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          className="msafe-icon-btn hidden sm:flex"
          aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          onClick={handleFullscreen}
        >
          {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
        <button type="button" className="msafe-icon-btn" aria-label="Leave session" title="Leave session" onClick={handleClose}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <style>{`
        .msafe-icon-btn {
          width: 28px; height: 28px; border-radius: 9999px;
          display: flex; align-items: center; justify-content: center;
          color: var(--ms-ink-faint); transition: background .15s, color .15s;
          border: none; background: transparent;
        }
        .msafe-icon-btn:hover:not(:disabled) { background: var(--ms-chip); color: var(--ms-gold); }
        .msafe-icon-btn:active:not(:disabled) { transform: scale(0.92); }
      `}</style>
    </div>
  );
}