import React from 'react';
import { ArrowUpRight, ShieldCheck, Video, Users, Medal } from 'lucide-react';

export default function HomeProceduresSection() {
  const featuredProcedures = [
    {
      title: "Advanced Aesthetic Smile Design",
      specialist: "Dr. Alana Vance, DDS",
      pillar: "Licensed Care",
      pillarIcon: <Medal className="w-3.5 h-3.5 text-[#D4AF37]" />,
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-surgeons-performing-a-delicate-operation-40576-large.mp4", 
      fallbackImg: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80"
    },
    {
      title: "Maxillofacial Contour Reconstruction",
      specialist: "Dr. Min-Jae Sung, MD, PhD",
      pillar: "Live Guidance",
      pillarIcon: <Video className="w-3.5 h-3.5 text-cyan-400" />,
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-doctor-looking-at-a-brain-scan-on-a-digital-tablet-41618-large.mp4",
      fallbackImg: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80"
    },
    {
      title: "Minimally Invasive Veneer Artistry",
      specialist: "Dr. Marcus Thorne",
      pillar: "Trusted Network",
      pillarIcon: <Users className="w-3.5 h-3.5 text-emerald-400" />,
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-dentist-examining-a-patient-with-a-mirror-41624-large.mp4",
      fallbackImg: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80"
    }
  ];

  return (
    <section id="procedures" className="w-full bg-[#020B0D] py-28 px-6 lg:px-16 relative border-t border-white/[0.03]">
      
      {/* Structural Heading Alignments */}
      <div className="max-w-7xl mx-auto mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#D4AF37] uppercase block mb-3">
            Clinical Artistry Meet Protection
          </span>
          <h2 className="font-serif text-3xl md:text-5xl text-white tracking-wide font-medium leading-tight">
            See the Excellence Before You Choose
          </h2>
        </div>
        <p className="text-white/40 max-w-sm font-sans font-light text-sm leading-relaxed">
          Explore live visual overviews of our specialists in action, fully integrated with our tier-one safety network.
        </p>
      </div>

      {/* The Dynamic Deck Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {featuredProcedures.map((proc, index) => (
          <div 
            key={index}
            className="group relative h-[500px] rounded-[24px] overflow-hidden bg-[#041214] border border-white/[0.05] shadow-2xl transition-all duration-500 hover:border-[#D4AF37]/20 hover:-translate-y-1.5 flex flex-col justify-end"
          >
            {/* Cinematic Background Loop */}
            <div className="absolute inset-0 w-full h-full z-0">
              <div className="absolute inset-0 bg-gradient-to-t from-[#020B0D] via-[#020B0D]/40 to-transparent z-10" />
              <video 
                autoPlay loop muted playsInline poster={proc.fallbackImg}
                className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700 opacity-40 group-hover:opacity-60"
              >
                <source src={proc.videoUrl} type="video/mp4" />
              </video>
            </div>

            {/* SAFE-T 4LIFE™ Dynamic Certification Tab */}
            <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#020B0D]/80 backdrop-blur-md border border-white/[0.08]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-white/90">SAFE-T 4LIFE™</span>
            </div>

            {/* Lower Glassmorphic Data Shield */}
            <div className="p-8 z-20 relative bg-gradient-to-t from-[#020B0D] via-[#020B0D]/95 to-transparent pt-16">
              <span className="text-xs font-mono tracking-wider text-[#D4AF37] block mb-1">
                {proc.specialist}
              </span>
              
              <h3 className="font-serif text-2xl text-white tracking-wide font-medium leading-snug mb-6">
                {proc.title}
              </h3>

              {/* Integrated Trust Badges From Screenshot Setup */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] w-fit mb-6 transition-colors group-hover:bg-[#D4AF37]/[0.03] group-hover:border-[#D4AF37]/10">
                {proc.pillarIcon}
                <span className="text-xs text-white/70 font-sans font-medium tracking-wide">
                  {proc.pillar}
                </span>
              </div>

              {/* Action Trigger */}
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-white/80 group-hover:text-[#D4AF37] border-t border-white/[0.06] pt-5 transition-colors">
                <span>View Procedure Metrics</span>
                <div className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:text-[#020B0D] group-hover:border-transparent transition-all duration-300">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </section>
  );
}