import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SignupRoleCard({ icon: Icon, title, description, accentClass, onClick, isLoading = false }) {
  return (
    <Card onClick={onClick} className="group cursor-pointer p-6 border-border bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className={`w-12 h-12 rounded-2xl ${accentClass} flex items-center justify-center mb-5`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-display font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">{description}</p>
      <Button type="button" disabled={isLoading} className="w-full gap-2">
        {isLoading ? 'Opening...' : 'Continue'} <ArrowRight className="w-4 h-4" />
      </Button>
    </Card>
  );
}