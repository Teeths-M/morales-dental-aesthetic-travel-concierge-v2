import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  { value: '500+', label: 'Happy Patients' },
  { value: '40+', label: 'Top Specialists' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '24/7', label: 'Concierge Support' },
  { value: '5★', label: 'Patient Rated' },
];

export default function StatsBar() {
  return (
    <section className="border-y border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8"
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