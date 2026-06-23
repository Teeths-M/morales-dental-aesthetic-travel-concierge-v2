import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Zap, TrendingUp } from 'lucide-react';

export default function PriceCarousel({ onCardClick }) {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCards();
    const interval = setInterval(fetchCards, 30000); // Poll every 30s
    const autoSlide = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.max(cards.length, 1));
    }, 5000);
    
    return () => {
      clearInterval(interval);
      clearInterval(autoSlide);
    };
  }, [cards.length]);

  const fetchCards = async () => {
    try {
      const [cardsRes, trendingRes] = await Promise.all([
        base44.functions.invoke('priceBroadcastEngine', {
          action: 'get_carousel_cards'
        }),
        base44.functions.invoke('priceBroadcastEngine', {
          action: 'get_trending_procedures'
        })
      ]);

      setCards(cardsRes.data.cards || []);
      setTrending(trendingRes.data.trending || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
      setLoading(false);
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Trending Banner */}
      {trending.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/30 rounded-xl p-4 flex items-center gap-3"
        >
          <Zap className="w-5 h-5 text-accent flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              🔥 {trending[0].count} people estimated <span className="text-accent">{trending[0].procedure}</span> in{' '}
              <span className="text-accent">{trending[0].destination}</span> today
            </p>
            <p className="text-xs text-muted-foreground mt-1">Most popular procedure right now</p>
          </div>
          <TrendingUp className="w-5 h-5 text-accent" />
        </motion.div>
      )}

      {/* Carousel */}
      <div className="relative">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentIndex(prev => (prev - 1 + cards.length) % cards.length)}
            className="flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {cards[currentIndex] && (
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => onCardClick(cards[currentIndex])}
                  className="cursor-pointer"
                >
                  <Card className="p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-primary/5 to-accent/5 border-primary/30">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-display text-xl text-foreground">
                          {cards[currentIndex].procedure}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {cards[currentIndex].destination}
                        </p>
                      </div>
                      <Badge className={
                        cards[currentIndex].type === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }>
                        {cards[currentIndex].type === 'confirmed' ? 'Just Booked' : 'Recent Estimate'}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          Package Cost
                        </p>
                        <p className="text-3xl font-semibold text-foreground">
                          ${cards[currentIndex].cost.toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          Includes
                        </p>
                        <p className="text-sm text-foreground">
                          {cards[currentIndex].inclusions.slice(0, 3).join(' + ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">
                          🕒 {getTimeAgo(cards[currentIndex].timestamp)}
                        </span>
                        <span className="text-xs text-primary font-semibold">
                          Click to estimate yours →
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentIndex(prev => (prev + 1) % cards.length)}
            className="flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Card Counter */}
        <div className="flex gap-1 justify-center mt-4">
          {cards.slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-border'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Trust Badge */}
      <div className="text-center text-xs text-muted-foreground">
        ✓ Based on {cards.length} real patient estimates
      </div>
    </div>
  );
}