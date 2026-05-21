import React from 'react';

export default function ConciergeShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-3xl bg-primary p-8 text-primary-foreground shadow-xl">
          <p className="text-sm uppercase tracking-[0.28em] text-primary-foreground/70">Morales Dental & Aesthetic Travel Concierge</p>
          <h1 className="mt-3 text-4xl font-normal md:text-5xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-3xl text-primary-foreground/80">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}