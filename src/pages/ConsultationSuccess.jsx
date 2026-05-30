import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ConsultationSuccess() {
  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <Card className="border-border">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl font-display">Consultation Request Submitted</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Thank you for your consultation request. Our SAFE-T4LIFE™ system is now reviewing your medical profile.
            </p>
            <p className="text-muted-foreground">
              You will receive an email shortly with the next steps.
            </p>
            <Link to="/">
              <Button className="mt-4">Return to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}