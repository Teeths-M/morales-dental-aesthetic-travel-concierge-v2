import React, { useEffect, useState } from 'react';
import { decodePortalToken } from '@/lib/portalToken';

export default function TestPortalLink() {
  const [tokenData, setTokenData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (!token) {
      setError('No token in URL');
      return;
    }

    console.log('Token from URL:', token);
    const decoded = decodePortalToken(token);
    console.log('Decoded token:', decoded);
    
    if (!decoded.valid) {
      setError(decoded.error);
    } else {
      setTokenData(decoded);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-card rounded-xl border p-8">
        <h1 className="text-2xl font-display mb-6">Portal Token Debugger</h1>
        
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {tokenData && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h2 className="font-semibold mb-2">Token Details:</h2>
              <div className="space-y-2 text-sm">
                <div><strong>Consultation ID:</strong> {tokenData.consultation_id}</div>
                <div><strong>Partner ID:</strong> {tokenData.partner_id}</div>
                <div><strong>Portal Type:</strong> {tokenData.portal_type}</div>
                <div><strong>Expires At:</strong> {new Date(tokenData.expires_at).toLocaleString()}</div>
                <div><strong>Valid:</strong> {tokenData.valid ? 'Yes' : 'No'}</div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <a 
                href={`/portal/transfer?token=${new URLSearchParams(window.location.search).get('token')}`}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90"
              >
                Go to Chauffeur Portal
              </a>
              <a 
                href={`/portal/travel?token=${new URLSearchParams(window.location.search).get('token')}`}
                className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg hover:bg-secondary/80"
              >
                Go to Travel Portal
              </a>
            </div>
          </div>
        )}
        
        {!tokenData && !error && (
          <p className="text-muted-foreground">Loading token...</p>
        )}
      </div>
    </div>
  );
}