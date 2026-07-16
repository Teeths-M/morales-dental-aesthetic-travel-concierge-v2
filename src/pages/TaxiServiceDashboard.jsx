import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BackButton } from '@/components/nav/BackButton';
import TaxiServiceDashboardView from '@/components/partner-dashboard/TaxiServiceDashboard';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { IdentityUpload } from '@/components/ThisIsMe';

const GOLD = '#D4AF37';

export default function TaxiServiceDashboard() {
  const [taxi,         setTaxi]         = useState(null);
  const [user,         setUser]          = useState(null);
  const [language,     setLanguage]      = useState(() => localStorage.getItem('appLanguage') || 'en');
  const [loading,      setLoading]       = useState(true);
  const [uploading,    setUploading]     = useState(null); // 'driver' | 'vehicle' | null
  const [uploadError,  setUploadError]   = useState(null);
  const [loadError,    setLoadError]     = useState(null);
  const { user: authUser } = useAuth();

  const uploadPhoto = async (file, field) => {
    if (!taxi?.id) return;
    setUploading(field);
    setUploadError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const key = field === 'driver' ? 'driver_identity_photo_url' : 'vehicle_photo_url';
      await base44.entities.TaxiService.update(taxi.id, { [key]: file_url });
      setTaxi(prev => ({ ...prev, [key]: file_url }));
    } catch (_) {
      setUploadError('Photo upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  useEffect(() => {
    const loadTaxi = async () => {
      try {
        const currentUser = authUser?.isPreviewAdmin ? authUser : await base44.auth.me();
        setUser(currentUser);
        const taxis = currentUser?.isPreviewAdmin
          ? await base44.entities.TaxiService.list('-updated_date', 1)
          : await base44.entities.TaxiService.filter({ email: currentUser.email });
        setTaxi(taxis[0] || null);
      } catch (_e) {
        setLoadError('Could not load your profile. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    const handleLanguageChange = (event) => setLanguage(event.detail.language);
    window.addEventListener('languageChange', handleLanguageChange);
    loadTaxi();
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, [authUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background py-12 px-6">
        <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-foreground mb-2">Could Not Load Profile</h1>
          <p className="text-muted-foreground mb-6">{loadError}</p>
          <button onClick={() => window.location.reload()} className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (!taxi) {
    return (
      <div className="min-h-screen bg-background py-12 px-6">
        <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-foreground mb-2">No Taxi Service Profile Found</h1>
          <p className="text-muted-foreground mb-6">Your account ({user?.email}) is not linked to a taxi service profile yet.</p>
          <a href="/partner-signup/taxi-service" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90">
            Create Taxi Service Profile
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6" style={{ background: '#060B16' }}>
      <div className="max-w-2xl mx-auto">
        <BackButton fallback="/" className="mb-4" />
        {uploadError && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {uploadError}
            <button onClick={() => setUploadError(null)} className="ml-auto text-xs underline">Dismiss</button>
          </div>
        )}

        {/* This Is Me™ — driver submits their identity photos once */}
        <div style={{ marginBottom: 20, background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 20, padding: '20px 18px' }}>
          <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>
            This Is Me™
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Upload your photo and vehicle photo. Patients see these before every pickup.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <IdentityUpload
              label="My Photo"
              hint="Patients see this before they get in."
              photoUrl={taxi?.driver_identity_photo_url}
              onUpload={file => uploadPhoto(file, 'driver')}
              uploading={uploading === 'driver'}
              capture="user"
            />
            <IdentityUpload
              label="My Vehicle"
              hint="Show licence plate, make & colour."
              photoUrl={taxi?.vehicle_photo_url}
              onUpload={file => uploadPhoto(file, 'vehicle')}
              uploading={uploading === 'vehicle'}
              capture="environment"
            />
          </div>
        </div>

        <TaxiServiceDashboardView taxi={taxi} language={language} />
      </div>
    </div>
  );
}