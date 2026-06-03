import React, { useEffect } from 'react';
import { ArrowRight, Car, HeartPulse, Plane, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { saveUserOnboardingProfile } from '@/lib/onboardingProfile';

const roles = [
  {
    role: 'client',
    title: 'Patient / Client',
    description: 'Start your medical travel journey and request a consultation.',
    path: '/client-signup',
    icon: UserRound,
    iconColor: 'text-amber-200'
  },
  {
    role: 'doctor',
    title: 'Doctor',
    description: 'Join the platform as a verified medical provider.',
    path: '/doctor-signup',
    icon: HeartPulse,
    iconColor: 'text-emerald-400'
  },
  {
    role: 'travel_agency',
    title: 'Travel Agency',
    description: 'Help patients with flights, hotels, and medical travel logistics.',
    path: '/partner-signup/travel-agency',
    icon: Plane,
    iconColor: 'text-cyan-400'
  },
  {
    role: 'taxi_service',
    title: 'Taxi Service',
    description: 'Provide safe transportation for medical travel patients.',
    path: '/partner-signup/taxi-service',
    icon: Car,
    iconColor: 'text-blue-400'
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
      profileData: {
        selected_role: role.role,
        selected_from: 'register_role'
      }
    });
    window.location.href = role.path;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-[#020B0D] text-white pt-32 pb-16 px-6 relative overflow-hidden">
      
      {/* Cinematic Ambient Background Glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#D4AF37]/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-950/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Header Info Cluster */}
      <div className="text-center max-w-2xl mx-auto mb-16 z-10 animate-fade-in">
        <span className="text-xs font-mono font-bold tracking-[0.3em] text-[#D4AF37] uppercase">
          Choose Your Role
        </span>
        <h1 className="font-display text-3xl md:text-4xl mt-3 mb-4 tracking-wide font-medium text-white">
          Register for SAFE-T 4LIFE™
        </h1>
        <p className="text-sm text-white/50 leading-relaxed font-sans font-light">
          Select the role that matches you. Platform admin access is not available through registration.
        </p>
      </div>

      {/* Grid Layout of Translucent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full z-10 px-4">
        {roles.map((role, idx) => {
          const Icon = role.icon;
          return (
            <div 
              key={role.role}
              onClick={() => handleRoleSelect(role)}
              className="group relative flex flex-col justify-between p-8 rounded-2xl bg-[#041214]/40 border border-white/[0.05] backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-[#D4AF37]/30 hover:-translate-y-1 hover:bg-[#05181b]/60 cursor-pointer"
            >
              {/* Visual Header Inside Card */}
              <div>
                <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:bg-[#D4AF37]/10 group-hover:border-[#D4AF37]/20 transition-all duration-300">
                  <Icon className={`w-5 h-5 ${role.iconColor}`} />
                </div>
                <h3 className="font-display text-xl font-medium text-white mb-3 tracking-wide">
                  {role.title}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed font-sans font-light min-h-[72px]">
                  {role.description}
                </p>
              </div>

              {/* Micro-Elevated Interactive Trigger */}
              <button className="w-full mt-8 py-3 px-4 text-xs font-semibold uppercase tracking-wider rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 flex items-center justify-center gap-2 transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-[#D4AF37] group-hover:to-[#F3E5AB] group-hover:text-[#020B0D] group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-[#D4AF37]/10">
                Continue
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}