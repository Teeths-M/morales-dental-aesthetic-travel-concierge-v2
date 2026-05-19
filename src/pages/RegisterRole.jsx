import React, { useEffect } from 'react';

import { Car, HeartPulse, Plane, UserRound } from 'lucide-react';
import SignupRoleCard from '@/components/signup/SignupRoleCard.jsx';
import { saveUserOnboardingProfile } from '@/lib/onboardingProfile';
import { useAuth } from '@/lib/AuthContext';

const roles = [
  {
    role: 'client',
    title: 'Patient / Client',
    description: 'Start your medical travel journey and request a consultation.',
    path: '/booking',
    icon: UserRound,
    accentClass: 'bg-primary/10 text-primary'
  },
  {
    role: 'doctor',
    title: 'Doctor',
    description: 'Join the platform as a verified medical provider.',
    path: '/doctor-signup',
    icon: HeartPulse,
    accentClass: 'bg-emerald-100 text-emerald-700'
  },
  {
    role: 'travel_agency',
    title: 'Travel Agency',
    description: 'Help patients with flights, hotels, and medical travel logistics.',
    path: '/partner-signup/travel-agency',
    icon: Plane,
    accentClass: 'bg-sky-100 text-sky-700'
  },
  {
    role: 'taxi_service',
    title: 'Taxi Service',
    description: 'Provide safe transportation for medical travel patients.',
    path: '/partner-signup/taxi-service',
    icon: Car,
    accentClass: 'bg-blue-100 text-blue-700'
  }
];

export default function RegisterRole() {
  const { isAuthenticated, authChecked, navigateToLogin } = useAuth();

  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      navigateToLogin(`${window.location.origin}/register-role`);
    }
  }, [authChecked, isAuthenticated, navigateToLogin]);

  const handleRoleSelect = async (role) => {
    localStorage.setItem('signupRole', role.role);
    await saveUserOnboardingProfile({
      role: role.role,
      status: 'started',
      profileData: { selected_role: role.role, selected_role_title: role.title }
    });
    window.location.href = role.path;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background px-4 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary mb-3">Choose your role</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">Register for SAFE-T 4LIFE™</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Select the role that matches you. Platform admin access is not available through registration.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {roles.map((role) => (
            <SignupRoleCard
              key={role.role}
              icon={role.icon}
              title={role.title}
              description={role.description}
              accentClass={role.accentClass}
              onClick={() => handleRoleSelect(role)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}