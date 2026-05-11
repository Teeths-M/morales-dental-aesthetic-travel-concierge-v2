import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Shield, Upload, MessageCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import JourneyProgress from '../components/dashboard/JourneyProgress';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: consultations = [] } = useQuery({
    queryKey: ['my-consultations'],
    queryFn: () => base44.entities.Consultation.filter(
      user?.email ? { email: user.email } : {},
      '-created_date',
      5
    ),
    enabled: !!user,
  });

  const latestConsultation = consultations[0];
  const displayName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="flex">
      <DashboardSidebar />

      <div className="flex-1 p-6 lg:p-10 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl text-foreground">
              Welcome, {displayName} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Let's start your transformation journey.</p>
          </div>
          <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Your Patient Coordinator</p>
              <p className="text-xs text-muted-foreground">Mariana G. — Patient Care Specialist</p>
            </div>
            <Button size="sm" variant="outline" className="ml-2 text-xs">Message Now</Button>
          </div>
        </div>

        {/* Journey Progress */}
        <JourneyProgress currentStage={latestConsultation?.journey_stage || 'consultation'} />

        {/* Dashboard Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          {/* Upcoming Consultation */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming Consultation</h3>
            {latestConsultation ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Video Consultation</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {latestConsultation.preferred_date || 'Date TBD'}
                </p>
                <Button size="sm" variant="outline" className="w-full text-xs">View Details</Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-3">No consultations yet</p>
                <Link to="/booking">
                  <Button size="sm" className="w-full text-xs bg-accent hover:bg-accent/90 text-accent-foreground">
                    Book Now
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* SAFE-T Risk */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">SAFE-T 4LIFE™ Risk Overview</h3>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary" />
              <Badge className="bg-primary/10 text-primary border-0 text-xs">
                {latestConsultation?.risk_level === 'medium' ? 'Medium Risk' :
                 latestConsultation?.risk_level === 'high' ? 'High Risk' : 'Low Risk'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              All good! Your risk profile is within recommended limits.
            </p>
            <Link to="/safe-t">
              <Button size="sm" variant="outline" className="w-full text-xs">View Full Assessment</Button>
            </Link>
          </div>

          {/* Next Step */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Next Step</h3>
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Upload Documents</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Upload your medical documents to continue your personalized plan.
            </p>
            <Button size="sm" className="w-full text-xs bg-accent hover:bg-accent/90 text-accent-foreground">
              Upload Documents
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}