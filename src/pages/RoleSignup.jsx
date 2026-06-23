import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Stethoscope, User, Plane, Car, ArrowRight } from 'lucide-react';

const roles = [
  {
    key: 'client',
    title: 'Client',
    description: 'Start a consultation and manage your medical travel journey.',
    icon: User,
    path: '/booking',
  },
  {
    key: 'doctor',
    title: 'Doctor',
    description: 'Create your doctor profile, specialties, pricing, and portfolio.',
    icon: Stethoscope,
    path: '/doctor-signup',
  },
  {
    key: 'travel_agency',
    title: 'Travel Agency',
    description: 'Register your agency to support flights, hotels, and coordination.',
    icon: Plane,
    path: '/partner-signup/travel-agency',
  },
  {
    key: 'taxi_service',
    title: 'Taxi Service',
    description: 'Register transport services for patients and recovery trips.',
    icon: Car,
    path: '/partner-signup/taxi-service',
  },
];

export default function RoleSignup() {
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then((authenticated) => {
      if (!authenticated) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      setIsChecking(false);
    });
  }, []);

  const chooseRole = async (role) => {
    setLoadingRole(role.key);
    await base44.auth.updateMe({
      role: role.key,
      tenant_type: role.key,
    });
    navigate(role.path);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary mb-3">Account setup</p>
          <h1 className="font-display text-4xl lg:text-5xl text-foreground mb-3">Choose your role</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Select the account type that fits you. Platform Admin is protected and cannot be selected during signup.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card key={role.key} className="p-6 bg-card border-border hover:border-primary/40 hover:shadow-lg transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">{role.title}</h2>
                <p className="text-sm text-muted-foreground min-h-[72px]">{role.description}</p>
                <Button
                  className="w-full mt-6 bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={() => chooseRole(role)}
                  disabled={!!loadingRole}
                >
                  {loadingRole === role.key ? 'Opening...' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}