import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_091828_e240eb17-6edc-4129-ad9d-98678e3fd238.mp4';
const POSTER_URL = 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1920&q=80';

const navItems = [
  { label: 'Start', href: '#start' },
  { label: 'Story', href: '#story' },
  { label: 'Rates', href: '#rates' },
  { label: 'Benefits', href: '#benefits' },
  { label: 'FAQ', href: '#faq' },
];

export default function PrivateJetLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Hero Section with Video Background */}
      <section className="relative h-screen overflow-hidden">
        {/* Video Background with Fallback */}
        {!videoError ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={POSTER_URL}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setVideoError(true)}
          >
            <source src={VIDEO_URL} type="video/mp4" />
          </video>
        ) : null}
        
        {/* Fallback image if video fails or loads */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${POSTER_URL})` }}
        />

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-brand-dark/50" />

        {/* Navigation Bar */}
        <nav className="relative z-10 max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <div className="text-2xl font-semibold text-white">
              SkyElite
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-white/90 hover:text-white transition-colors font-medium"
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 mt-4 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg overflow-hidden">
              <div className="flex flex-col py-4">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="px-6 py-3 text-gray-900 hover:bg-gray-50 transition-colors font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Hero Content - Centered with flexbox, no negative margins */}
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center px-4 max-w-4xl mx-auto">
            {/* Label */}
            <p className="text-sm font-semibold text-gray-300 tracking-wider mb-4 uppercase">
              PRIVATE JETS
            </p>

            {/* Two-line Heading with Overlap */}
            <div className="mb-6">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal text-gray-400 leading-none tracking-tighter">
                Premium.
              </h1>
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal leading-none tracking-tighter text-brand-dark" style={{ marginTop: '-12px' }}>
                Accessible.
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
              Your dedication deserves recognition.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button className="px-8 py-3 rounded-full bg-gray-300 text-gray-800 font-medium hover:bg-gray-400 transition-colors">
                Discover
              </button>
              <button className="px-8 py-3 rounded-full text-white font-medium bg-brand-dark hover:bg-brand-darkHover transition-colors">
                Book Now
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}