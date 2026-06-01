import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, CheckCircle } from 'lucide-react';

export default function PortalTestHub() {
  const [loading, setLoading] = useState(true);
  const [portalLinks, setPortalLinks] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    generateTestLinks();
  }, []);

  const generateTestLinks = async () => {
    try {
      // Test consultation we set up
      const consultationId = '6a1cc4685a599ee5c06fec2d';
      const taxiServiceId = '6a1cbb66f379e616337f22f4';

      // Generate chauffeur portal link
      const response = await base44.functions.invoke('generateChauffeurPortalLink', {
        consultation_id: consultationId,
        taxi_service_id: taxiServiceId,
      });

      console.log('Portal link response:', response.data);
      console.log('Raw token:', response.data.token);
      console.log('Portal URL:', response.data.portal_url);

      if (response.data.success) {
        // Convert relative URL to absolute if needed
        const portalUrl = response.data.portal_url.startsWith('/') 
          ? `${window.location.origin}${response.data.portal_url}`
          : response.data.portal_url;
        
        setPortalLinks([
          {
            name: 'Chauffeur Portal (Test Case)',
            url: portalUrl,
            patient: 'Test Patient Two',
            service: 'San José Medical Transport',
            type: 'chauffeur',
          },
        ]);
      }
    } catch (err) {
      console.error('Error generating link:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-display">Vendor Portal Test Hub</CardTitle>
            <p className="text-muted-foreground">
              Click any link below to access vendor portals directly
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {portalLinks.map((link, idx) => (
              <div key={idx} className="border rounded-lg p-6 bg-muted/50">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{link.name}</h3>
                    <p className="text-sm text-muted-foreground">Patient: {link.patient}</p>
                    <p className="text-sm text-muted-foreground">Vendor: {link.service}</p>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                </div>
                <Button 
                  asChild
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    Open Portal <ExternalLink className="ml-2 w-4 h-4" />
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Link expires: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              </div>
            ))}

            {portalLinks.length === 0 && !error && (
              <p className="text-muted-foreground text-center py-8">
                No portal links generated. Check console for errors.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2 text-sm">How to Test:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Click "Open Portal" button above</li>
            <li>Enter pricing for the transfer legs</li>
            <li>Submit the quote</li>
            <li>Check if the Consultation entity updates with the leg costs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}