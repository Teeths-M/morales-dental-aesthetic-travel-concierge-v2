import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, User, Building2, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PartnerSignupTeaser() {
  return (
    <section className="py-16 lg:py-20 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Join Our Network</p>
          <h2 className="font-display text-3xl lg:text-5xl text-foreground mb-4">
            Become a Trusted Partner
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Join our elite network of healthcare and travel professionals. We're always looking for verified specialists to serve our patients.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {/* Travel Agency Card */}
          <Link to="/partner-signup/travel-agency" className="group">
            <div className="bg-white rounded-2xl border-2 border-border hover:border-primary/50 transition-all p-6 h-full hover:shadow-lg">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Building2 className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">Travel Agency</h3>
              <p className="text-sm text-muted-foreground">
                Provide comprehensive travel coordination and support for medical tourists.
              </p>
            </div>
          </Link>

          {/* Taxi Service Card */}
          <Link to="/partner-signup/taxi-service" className="group">
            <div className="bg-white rounded-2xl border-2 border-border hover:border-primary/50 transition-all p-6 h-full hover:shadow-lg">
              <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Car className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">Chauffeur Service</h3>
              <p className="text-sm text-muted-foreground">
                Offer safe, reliable transportation for patients throughout their journey.
              </p>
            </div>
          </Link>

          {/* Companion Card */}
          <Link to="/companion-signup" className="group">
            <div className="bg-white rounded-2xl border-2 border-border hover:border-primary/50 transition-all p-6 h-full hover:shadow-lg">
              <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <User className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">Travel Companion</h3>
              <p className="text-sm text-muted-foreground">
                Guide patients through their medical journey with personal and cultural support.
              </p>
            </div>
          </Link>
        </div>

        <div className="text-center">
          <Link to="/partner-signup">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-base px-8 py-6 rounded-xl">
              View All Partner Opportunities <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}