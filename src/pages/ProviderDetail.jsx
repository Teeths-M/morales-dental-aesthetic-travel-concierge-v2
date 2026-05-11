import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, BadgeCheck, Clock, ArrowLeft, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProviderDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const providerId = window.location.pathname.split('/providers/')[1];

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['provider', providerId],
    queryFn: () => base44.entities.Provider.filter({ id: providerId }),
    enabled: !!providerId,
  });

  const provider = providers[0];

  if (isLoading) {
    return (
      <div className="py-12 max-w-4xl mx-auto px-4">
        <Skeleton className="h-8 w-40 mb-8" />
        <div className="flex gap-8">
          <Skeleton className="w-48 h-48 rounded-xl" />
          <div className="space-y-4 flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Provider not found.</p>
        <Link to="/providers">
          <Button variant="outline" className="mt-4">Back to Providers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/providers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Providers
        </Link>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-6 lg:p-10">
            <div className="flex flex-col sm:flex-row gap-6 mb-8">
              {/* Photo */}
              <div className="w-32 h-32 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                {provider.photo_url ? (
                  <img src={provider.photo_url} alt={provider.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-display text-4xl text-muted-foreground">{provider.name?.[0]}</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display text-2xl lg:text-3xl text-foreground">{provider.name}</h1>
                  <BadgeCheck className="w-5 h-5 text-accent" />
                </div>
                <p className="text-muted-foreground">{provider.title}</p>

                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{provider.years_experience || 15}+ Years Experience</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-accent fill-accent" />
                    <span className="text-sm font-semibold">{provider.rating || 4.9}</span>
                    <span className="text-sm text-muted-foreground">({provider.review_count || 128} reviews)</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-5">
                  <Link to={`/booking?provider=${provider.id}`}>
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                      Book Consultation
                    </Button>
                  </Link>
                  <Button variant="outline">
                    <MessageCircle className="w-4 h-4 mr-2" /> Contact
                  </Button>
                </div>
              </div>
            </div>

            {/* Bio */}
            {provider.bio && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-foreground mb-2">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{provider.bio}</p>
              </div>
            )}

            {/* Credentials */}
            {provider.credentials?.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-foreground mb-3">Credentials</h3>
                <div className="space-y-2">
                  {provider.credentials.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expertise */}
            {provider.expertise_areas?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Areas of Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {provider.expertise_areas.map(area => (
                    <Badge key={area} variant="secondary" className="text-sm">{area}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}