import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Hero from '../components/home/Hero';
import StatsBar from '../components/home/StatsBar';
import WhyChooseUs from '../components/home/WhyChooseUs';
import HowItWorks from '../components/home/HowItWorks';
import HeroSlideshow from '../components/home/HeroSlideshow';
import BrandSlideshow from '../components/home/BrandSlideshow';
import PriceCarousel from '../components/social-proof/PriceCarousel';
import ClickToConsultModal from '../components/social-proof/ClickToConsultModal';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const navigate = useNavigate();

  const handleCardClick = (card) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleProceedToEstimate = async (formData) => {
    try {
      const res = await base44.functions.invoke('priceBroadcastEngine', {
        action: 'create_price_estimate',
        data: {
          user_email: formData.email,
          user_name: formData.name,
          user_phone: formData.phone,
          procedure: formData.procedure,
          destination: formData.destination,
          preferred_month: formData.preferred_month,
          health_conditions: formData.health_conditions
        }
      });

      setIsModalOpen(false);
      navigate(`/estimate/${res.data.estimate_id}`);
    } catch (error) {
      alert('Error creating estimate. Please try again.');
      console.error(error);
    }
  };

  return (
    <div>
      <Hero />
      <StatsBar />
      <HeroSlideshow />
      
      {/* Social Proof Price Carousel */}
      <div className="bg-background py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Real Patient Data</p>
            <h2 className="font-display text-3xl lg:text-4xl text-foreground mb-4">See What Patients Are Paying</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Real pricing examples from real patients who booked their procedures. No hidden fees – this is exactly what you'll pay.</p>
          </div>
          <PriceCarousel onCardClick={handleCardClick} />
        </div>
      </div>

      <WhyChooseUs />
      <BrandSlideshow />
      <HowItWorks />

      {/* Click-to-Consult Modal */}
      {selectedCard && (
        <ClickToConsultModal
          card={selectedCard}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onProceed={handleProceedToEstimate}
        />
      )}
    </div>
  );
}