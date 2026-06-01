import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Hero from '../components/home/Hero';
import StatsBar from '../components/home/StatsBar';
import WhyChooseUs from '../components/home/WhyChooseUs';
import HowItWorks from '../components/home/HowItWorks';
import HeroSlideshow from '../components/home/HeroSlideshow';
import BrandSlideshow from '../components/home/BrandSlideshow';
import SlotCounter from '../components/home/SlotCounter';
import OurExpertsTeaser from '../components/home/OurExpertsTeaser';


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
      {/* Dev Test Links */}
      <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg p-3 shadow-lg">
        <h4 className="text-sm font-semibold mb-2">Test Portals</h4>
        <div className="space-y-1 text-xs">
          <button 
            onClick={() => window.open('/portal/doctor/test_token_dr_portal', '_blank')}
            className="block w-full text-left px-2 py-1 hover:bg-muted rounded"
          >
            🏥 Doctor Portal
          </button>
          <button 
            onClick={() => window.open('/portal/travel', '_blank')}
            className="block w-full text-left px-2 py-1 hover:bg-muted rounded"
          >
            ✈️ Travel Agency Portal
          </button>
          <button 
            onClick={() => window.open('/portal/transfer', '_blank')}
            className="block w-full text-left px-2 py-1 hover:bg-muted rounded"
          >
            🚗 Chauffeur Portal
          </button>
          <button 
            onClick={() => window.open('/admin', '_blank')}
            className="block w-full text-left px-2 py-1 hover:bg-muted rounded"
          >
            ⚙️ Admin Dashboard
          </button>
        </div>
      </div>
      
      <Hero />
      <StatsBar />
      <SlotCounter className="mx-auto mt-6" />
      <HeroSlideshow />
      <OurExpertsTeaser />
      <WhyChooseUs />
      <BrandSlideshow />
      <HowItWorks />
    </div>
  );
}