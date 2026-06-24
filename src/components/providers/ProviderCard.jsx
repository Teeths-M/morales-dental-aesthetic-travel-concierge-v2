import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, BadgeCheck, Clock } from 'lucide-react';

export default function ProviderCard({ provider }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="p-6">
        <div className="flex gap-5">
          {/* Photo */}
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-secondary">
            {provider.photo_url ? (
              <img
                src={provider.photo_url}
                alt={provider.name}
                className="w-full h-full object-cover"
                onError={e => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-full h-full flex items-center justify-center bg-slate-100';
                  const span = document.createElement('span');
                  span.className = 'text-2xl font-semibold text-slate-400';
                  span.textContent = (provider.name || '?')[0];
                  fallback.appendChild(span);
                  e.target.parentElement.appendChild(fallback);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-display text-2xl text-muted-foreground">{provider.name?.[0]}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg text-foreground truncate">{provider.name}</h3>
              <BadgeCheck className="w-4 h-4 text-accent flex-shrink-0" />
            </div>
            <p className="text-sm text-muted-foreground">{provider.title}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{provider.years_experience || 15}+ Years</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                <span className="text-xs font-semibold">{provider.rating || 4.9}</span>
                <span className="text-xs text-muted-foreground">({provider.review_count || 128})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Credentials */}
        {provider.credentials?.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {provider.credentials.slice(0, 3).map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                <span className="text-xs text-muted-foreground">{c}</span>
              </div>
            ))}
          </div>
        )}

        {/* Expertise */}
        {provider.expertise_areas?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-foreground mb-2">Areas of Expertise</p>
            <div className="flex flex-wrap gap-1.5">
              {provider.expertise_areas.map(area => (
                <Badge key={area} variant="secondary" className="text-[11px] font-normal">{area}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <Link to={`/providers/${provider.id}`} className="flex-1">
            <Button variant="outline" className="w-full text-sm" size="sm">View Profile</Button>
          </Link>
          <Link to={`/booking?provider=${provider.id}`} className="flex-1">
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm" size="sm">
              Book Consultation
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}