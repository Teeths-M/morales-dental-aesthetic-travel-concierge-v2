import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function StatsBar() {
  const { data: consultations = [] } = useQuery({
    queryKey: ['consultationsStats'],
    queryFn: () => base44.entities.Consultation.list('-created_date', 100),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctorsStats'],
    queryFn: () => base44.entities.Doctor.filter({ status: 'active' }, '-created_date', 100),
  });

  const patientCount = consultations.length;
  const activeDocCount = doctors.length;

  const stats = [
    { value: patientCount.toString(), label: 'Active Consultations' },
    { value: activeDocCount.toString(), label: 'Verified Doctors' },
    { value: '24/7', label: 'Concierge Support' },
  ];

  return (
    <section className="border-y border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-3xl lg:text-4xl text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}