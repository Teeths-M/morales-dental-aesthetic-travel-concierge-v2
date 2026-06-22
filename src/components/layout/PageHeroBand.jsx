import React from 'react';

/**
 * Slim dark hero band for the top of secondary pages, matching the
 * homepage's palette (#060B16 / gold accent) so the global Header can
 * blend into it transparently instead of showing a hard line.
 *
 * Sits *above* a page's existing content — doesn't replace or restyle
 * anything below it. Height is intentionally shorter than the homepage's
 * full hero (this isn't trying to be a second hero, just enough dark
 * surface for the nav to sit on before the page's real content begins).
 */
export default function PageHeroBand({ eyebrow, title, subtitle }) {
  const hasContent = eyebrow || title || subtitle;
  return (
    <div
      className="relative overflow-hidden"
      style={{
        marginTop: '-72px',
        paddingTop: '72px',
        background: 'linear-gradient(180deg, #060B16 0%, #0C1A1D 100%)',
      }}
    >
      {/* faint signature texture, consistent with the homepage's shimmer accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 80% 0%, rgba(212,175,55,0.07) 0%, transparent 55%)' }}
      />
      {hasContent ? (
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 lg:pt-20 lg:pb-14">
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] mb-4" style={{ color: '#D4AF37' }}>
              {eyebrow}
            </p>
          )}
          {title && (
            <h1
              className="font-serif text-3xl lg:text-4xl text-white"
              style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-[15px] text-white/55 max-w-xl mt-4 leading-relaxed" style={{ fontWeight: 300 }}>
              {subtitle}
            </p>
          )}
        </div>
      ) : (
        // No content — just a slim dark strip so the page's own existing
        // hero (with its own title) can keep that title, while still
        // giving the transparent nav something dark to sit on above it.
        <div className="relative h-10" />
      )}
    </div>
  );
}
