import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';
import { CONSOLE } from './consoleTheme';

/**
 * VaultBanner — the standing reassurance above the composer. Dismissible for
 * the session, and the line itself opens the real Vault rather than just
 * describing it.
 */
export default function VaultBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex-shrink-0 px-4 pb-2">
      <div
        className="flex items-center gap-2.5 rounded-xl px-3 py-2"
        style={{ background: CONSOLE.borderSoft, border: `1px solid #262c36` }}
      >
        <ShieldCheck className="w-4 h-4 flex-shrink-0" style={{ color: '#8FB8D8' }} />
        <Link to="/passport-vault" className="flex-1 min-w-0">
          <p className="truncate" style={{ color: '#c9d1d9', fontSize: 12.5, margin: 0 }}>
            Your passport is encrypted in your Vault.
          </p>
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="flex-shrink-0 rounded-full p-1 hover:bg-white/5"
          style={{ color: CONSOLE.textFaint }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}