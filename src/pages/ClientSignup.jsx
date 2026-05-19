import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { saveUserOnboardingProfile } from '@/lib/onboardingProfile';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ClientSignup() {
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    nationality: '',
    preferred_language: 'en',
    emergency_contact_name: '',
    emergency_contact_number: ''
  });

  useEffect(() => {
    base44.auth.me().then((user) => {
      setForm((prev) => ({
        ...prev,
        full_name: user.full_name || prev.full_name,
        email: user.email || prev.email
      }));
    });
  }, []);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit = form.full_name && form.email && form.phone && form.emergency_contact_name && form.emergency_contact_number;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    const profile = await saveUserOnboardingProfile({
      role: 'client',
      status: 'completed',
      profileData: {
        ...form,
        selected_role: 'client',
        completed_from: 'client_signup'
      }
    });

    await base44.functions.invoke('syncTenantRole', {
      tenant_id: profile.id,
      tenant_type: 'client',
      tenant_name: form.full_name,
      user_email: form.email,
      user_role: 'client',
      linked_entity_name: 'UserOnboardingProfile',
      linked_entity_id: profile.id
    });

    localStorage.setItem('signupRole', 'client');
    await checkUserAuth();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background px-4 py-14">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UserRound className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary mb-3">Client profile</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">Tell us about you</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Complete your client profile first. You can book a consultation anytime from your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-3xl shadow-xl p-6 md:p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground">Full name</label>
              <Input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} className="mt-2" required />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Email</label>
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="mt-2" required />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Phone number</label>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="mt-2" required />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Nationality</label>
              <Input value={form.nationality} onChange={(e) => update('nationality', e.target.value)} className="mt-2" placeholder="Optional" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Preferred language</label>
              <Select value={form.preferred_language} onValueChange={(value) => update('preferred_language', value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-2xl bg-secondary/60 border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-foreground">Emergency contact</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-foreground">Contact name</label>
                <Input value={form.emergency_contact_name} onChange={(e) => update('emergency_contact_name', e.target.value)} className="mt-2" required />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground">Contact number</label>
                <Input value={form.emergency_contact_number} onChange={(e) => update('emergency_contact_number', e.target.value)} className="mt-2" required />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/register-role')}>Back</Button>
            <Button type="submit" disabled={!canSubmit || isSaving} className="bg-primary hover:bg-primary/90">
              {isSaving ? 'Saving...' : 'Go to my dashboard'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}