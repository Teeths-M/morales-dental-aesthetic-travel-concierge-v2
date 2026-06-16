import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_091828_e240eb17-6edc-4129-ad9d-98678e3fd238.mp4';

const NAV_LINKS = ['Start', 'Story', 'Rates', 'Benefits', 'FAQ'];

export default function SkyEliteLanding() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

      {/* ── Hero Section ── */}
      <section className="relative h-screen overflow-hidden">

        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>

        {/* Light overlay so text stays readable */}
        <div className="absolute inset-0 bg-white/30" />

        {/* Content wrapper */}
        <div className="relative h-full flex flex-col">

          {/* ── Navbar ── */}
          <nav className="w-full px-8 py-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              {/* Brand */}
              <span className="text-2xl font-semibold text-gray-900">SkyElite</span>

              {/* Desktop links */}
              <div className="hidden md:flex items-center gap-8">
                {NAV_LINKS.map(link => (
                  <a
                    key={link}
                    href="#"
                    className="text-gray-900 hover:text-gray-700 transition-colors text-sm font-medium"
                  >
                    {link}
                  </a>
                ))}
              </div>

              {/* Mobile hamburger */}
              <button
                className="md:hidden text-gray-900 p-1"
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            {/* Mobile dropdown */}
            {mobileOpen && (
              <div className="md:hidden mt-3 mx-auto max-w-7xl">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg px-6 py-4 flex flex-col gap-4">
                  {NAV_LINKS.map(link => (
                    <a
                      key={link}
                      href="#"
                      className="text-gray-900 hover:text-gray-700 transition-colors text-sm font-medium"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* ── Hero Content ── */}
          <main className="flex-1 flex items-center justify-center -mt-80">
            <div className="text-center px-6 max-w-4xl mx-auto">

              {/* Label */}
              <p className="text-sm font-semibold text-gray-600 tracking-wider uppercase mb-4">
                Private Jets
              </p>

              {/* Heading */}
              <div className="mb-6">
                <h1 className="text-6xl md:text-7xl lg:text-8xl font-normal text-gray-500 leading-none tracking-tighter">
                  Premium.
                </h1>
                <h1
                  className="text-6xl md:text-7xl lg:text-8xl font-normal leading-none tracking-tighter"
                  style={{ color: '#202A36', marginTop: '-12px' }}
                >
                  Accessible.
                </h1>
              </div>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-gray-600 mb-6 max-w-2xl mx-auto">
                Your dedication deserves recognition.
              </p>

              {/* CTAs */}
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <a
                  href="#"
                  className="px-6 py-2 rounded-full bg-gray-300 text-gray-800 font-medium hover:bg-gray-400 transition-colors"
                >
                  Discover
                </a>
                <a
                  href="#"
                  className="px-6 py-2 rounded-full text-white font-medium transition-colors"
                  style={{ backgroundColor: '#202A36' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a2229'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#202A36'}
                >
                  Book Now
                </a>
              </div>
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}