import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { translations } from '@/lib/translations';
import { CheckCircle2, Mail } from 'lucide-react';

export default function DoctorSignupSuccess({ doctor, specialties, language = 'en', onDashboard }) {
  const t = translations[language] || translations['en'];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-600" />
        </div>
        <h2 className="text-4xl font-display font-bold text-foreground">{t.successTitle}</h2>
        <p className="text-lg text-muted-foreground">{t.successMessage}</p>
      </div>

      {/* Specialties Summary */}
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {specialties.map((spec) => (
            <Badge key={spec} className="bg-primary text-primary-foreground px-3 py-2">
              {spec}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-foreground">{t.patientWillSee}</p>
      </div>

      {/* Email Notification */}
      <div className="bg-secondary/50 border border-secondary rounded-lg p-6 flex gap-4">
        <Mail className="w-5 h-5 text-foreground flex-shrink-0 mt-1" />
        <div>
          <p className="font-medium text-foreground">{doctor.email}</p>
          <p className="text-sm text-muted-foreground mt-1">{t.emailNotification}</p>
        </div>
      </div>

      {/* Profile Completeness */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t.completenessLabel}</p>
        <div className="bg-secondary rounded-full h-2 overflow-hidden">
          <div className="bg-primary h-full" style={{ width: '80%' }}></div>
        </div>
        <p className="text-xs text-muted-foreground">Add photo, bio, and available dates to reach 100%</p>
      </div>

      {/* CTA */}
      <Button
        onClick={onDashboard}
        className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white"
      >
        Go to Doctor Dashboard →
      </Button>
    </div>
  );
}