import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Home } from 'lucide-react';

export default function PageNotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#060B16' }}>
      <div className="max-w-md w-full text-center space-y-8">
        {/* M mark */}
        <div className="flex justify-center">
          <div className="relative">
            <img
              src="/morales-m-mark.png"
              alt="Morales"
              className="w-16 h-16 object-contain opacity-60"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 32px rgba(212,175,55,0.25)' }} />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <p className="text-6xl font-light" style={{ color: 'rgba(212,175,55,0.35)' }}>404</p>
          <h1 className="text-2xl font-semibold text-white">Page not found</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            This page doesn't exist or you may not have permission to view it.
            <br />Your journey data is safe.
          </p>
        </div>

        {/* Protected badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold"
          style={{ background: 'rgba(212,175,55,0.06)', borderColor: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}>
          <Shield className="w-3.5 h-3.5" />
          Protected by Morales Security Stack
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:opacity-80"
            style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
