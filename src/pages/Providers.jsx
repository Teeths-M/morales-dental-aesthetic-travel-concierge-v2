import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import ProviderCard from '../components/providers/ProviderCard';

export default function Providers() {
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: () => base44.entities.Provider.list(),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Our Experts</p>
          <h1 className="font-display text-3xl lg:text-5xl text-foreground mb-4">World-Class Specialists</h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Every provider is rigorously vetted, verified, and committed to delivering the highest standard of care.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Our specialist profiles are being updated. Check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {providers.map(provider => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}