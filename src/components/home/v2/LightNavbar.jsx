import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Globe } from 'lucide-react';

const navLinks = [
  { label: 'Home',        to: '/' },
  { label: 'Treatments',  to: '/procedures' },
  { label: 'How It Works',to: '/how-it-works' },
  { label: 'Safety',      to: '/safe-t' },
  { label: 'Concierge',   to: '/discover' },
  { label: 'About Us',    to: '/about' },
];

export default function LightNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-white/80 backdrop-blur-sm'
      }`}
      style={{ height: '68px' }}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="font-serif font-bold text-2xl text-[#1a2e3b] tracking-tight hover:text-[#2a7d8c] transition-colors">
          MORALES
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className="text-[13px] font-medium text-gray-600 hover:text-[#1a3a4a] transition-colors duration-150 relative group"
            >
              {label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-[2px] bg-[#2a7d8c] group-hover:w-full transition-all duration-200" />
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="hidden lg:flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-[#1a3a4a] transition-colors px-2 py-1">
            <Globe className="w-3.5 h-3.5" />
            EN
          </button>
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-lg text-[13px] font-semibold border-2 border-[#1a3a4a] text-[#1a3a4a] hover:bg-[#1a3a4a] hover:text-white transition-all duration-200"
          >
            Client Login
          </Link>
          <Link
            to="/booking"
            className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#1a3a4a] text-white hover:bg-[#2a7d8c] transition-colors duration-200 shadow-sm"
          >
            Book Consultation
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-2 text-[#1a3a4a]"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden absolute top-[68px] left-0 right-0 bg-white border-b border-gray-100 shadow-lg px-6 py-6 flex flex-col gap-4">
          {navLinks.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              onClick={() => setMenuOpen(false)}
              className="text-[15px] font-medium text-gray-700 hover:text-[#2a7d8c] transition-colors"
            >
              {label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
            <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="text-center px-4 py-2.5 rounded-lg border-2 border-[#1a3a4a] text-[#1a3a4a] font-semibold text-[14px]">
              Client Login
            </Link>
            <Link to="/booking" onClick={() => setMenuOpen(false)} className="text-center px-4 py-2.5 rounded-lg bg-[#1a3a4a] text-white font-semibold text-[14px]">
              Book Consultation
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}