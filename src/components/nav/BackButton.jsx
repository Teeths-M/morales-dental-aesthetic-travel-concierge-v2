import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function BackButton({ fallback = '/dashboard', label = 'Back', className = '' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium group ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      <span>{label}</span>
    </button>
  );
}

export function BackButtonLight({ fallback = '/dashboard', label = 'Back', className = '' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium group ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      <span>{label}</span>
    </button>
  );
}