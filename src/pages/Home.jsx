import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Hero from '../components/home/Hero';
import LuxuryTrustBar from '../components/home/LuxuryTrustBar';
import LuxuryHowItWorks from '../components/home/LuxuryHowItWorks';
import LuxuryWhyMorales from '../components/home/LuxuryWhyMorales';
import BrandSlideshow from '../components/home/BrandSlideshow';
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
    <div style={{ background: '#070F0B' }}>
      <Hero />
      <LuxuryTrustBar />
      <LuxuryHowItWorks />
      <LuxuryWhyMorales />
      <OurExpertsTeaser />
      <BrandSlideshow />
    </div>
  );
}