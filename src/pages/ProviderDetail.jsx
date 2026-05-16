import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, BadgeCheck, Clock, ArrowLeft, MessageCircle, Play, Image as ImageIcon, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProviderDetail() {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const providerId = window.location.pathname.split('/providers/')[1];

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['provider', providerId],
    queryFn: () => base44.entities.Doctor.filter({ id: providerId }),
    enabled: !!providerId,
  });

  const provider = doctors[0];

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
                  <img src={provider.photo_url} alt={provider.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-display text-4xl text-muted-foreground">{provider.full_name?.[0]}</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display text-2xl lg:text-3xl text-foreground">{provider.full_name}</h1>
                  <BadgeCheck className="w-5 h-5 text-accent" />
                </div>
                <p className="text-muted-foreground">{provider.clinic_name}</p>

                <div className="flex items-center gap-4 mt-3">
                  {provider.years_experience && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{provider.years_experience}+ Years Experience</span>
                    </div>
                  )}
                  {provider.rating && (
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-accent fill-accent" />
                      <span className="text-sm font-semibold">{provider.rating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">({provider.review_count || 0} reviews)</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-5">
                  <Link to={`/booking?provider=${provider.id}`}>
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                      Book Consultation
                    </Button>
                  </Link>
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
            {provider.professional_background && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-foreground mb-3">Professional Background</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{provider.professional_background}</p>
              </div>
            )}

            {/* Portfolio */}
             {provider.portfolio && provider.portfolio.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-foreground mb-4">Portfolio</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {provider.portfolio.map(item => (
                    <div key={item.id} className="bg-secondary/50 border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => setSelectedMedia(item)}>
                      {/* Thumbnail */}
                      <div className="relative w-full h-48 bg-secondary/50 flex items-center justify-center overflow-hidden">
                        {item.type === 'image' ? (
                          <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <>
                            <video src={item.url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                              <Play className="w-12 h-12 text-white fill-white" />
                            </div>
                          </>
                        )}
                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full flex items-center gap-1">
                          {item.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          {item.type === 'image' ? 'Photo' : 'Video'}
                        </div>
                      </div>
                      {/* Title */}
                      <div className="p-3">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(item.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lightbox Modal */}
            {selectedMedia && (
              <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedMedia(null)}>
                <div className="relative w-full max-w-4xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => setSelectedMedia(null)}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                  {selectedMedia.type === 'image' ? (
                    <img src={selectedMedia.url} alt={selectedMedia.title} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
                  ) : (
                    <video src={selectedMedia.url} controls autoPlay className="max-w-full max-h-[85vh] object-contain rounded-lg" />
                  )}
                  <p className="absolute bottom-4 left-4 text-white text-sm font-medium">{selectedMedia.title}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}