import { describe, it, expect } from 'vitest';
import { buildIntakeStages, deriveFromBio } from '../src/lib/msafeIntake';

// The fixture mirrors the real Doctor row the workspace reads at runtime, so
// these assertions fail if the walkthrough ever drifts from the record it is
// supposed to be quoting.
const DOCTOR = {
  full_name: 'Dr Rossanna',
  clinic_name: 'Dental Spa Margarita ',
  clinic_country: 'Venezuela',
  clinic_city: 'Venezuela',
  years_experience: 20,
  rating: 5,
  review_count: 200,
  successful_procedures_count: 1500,
  bio: 'graduated from Carabobo University, from Valencia, Venezuela, more than 20 years of experience \nSpecialized in cosmetic dentistry\nBiomimetic Restorative Dentistry',
  portfolio: [
    { type: 'video' },
    { type: 'image' },
    { type: 'image' },
    { type: 'image' },
  ],
  verification_status: 'verified',
  license_verification_status: 'pending',
  identity_verification_status: 'pending',
  background_check_status: 'pending',
};

const CLINIC = { name: 'Dental Spa Margarita', country: 'Venezuela', address: null };

const rowValue = (stage, label) => stage.card.rows.find((r) => r.label === label)?.value;

describe('buildIntakeStages', () => {
  it('returns the full nine-stage intake', () => {
    const stages = buildIntakeStages({ doctor: DOCTOR, clinic: CLINIC });
    expect(stages).toHaveLength(9);
    expect(stages[0].id).toBe('provider');
    expect(stages[8].id).toBe('recovery');
  });

  it('quotes the live provider record rather than hardcoded copy', () => {
    const [provider] = buildIntakeStages({ doctor: DOCTOR, clinic: CLINIC });
    expect(rowValue(provider, 'Experience')).toBe('20+ years');
    expect(rowValue(provider, 'Rating')).toContain('5.0');
    expect(rowValue(provider, 'Rating')).toContain('200 reviews');
    expect(rowValue(provider, 'Specialty')).toMatch(/cosmetic dentistry/i);
    expect(rowValue(provider, 'Education')).toContain('Carabobo University');
    expect(rowValue(provider, 'Portfolio')).toBe('3 photos · 1 video shared');
  });

  it('never claims a licence check it has not earned', () => {
    const [provider, safety] = buildIntakeStages({ doctor: DOCTOR, clinic: CLINIC });
    expect(provider.card.badge.label).toBe('Profile verified');
    expect(safety.card.badge).toEqual({ label: 'Not bookable yet', tone: 'amber' });
    expect(rowValue(safety, 'Medical licence')).toBe('Pending');
    expect(rowValue(safety, 'Booking')).toBe('Held until all three clear');
  });

  it('shows the verified badge once the licence is actually verified', () => {
    const verified = { ...DOCTOR, license_verification_status: 'verified' };
    const [provider, safety] = buildIntakeStages({ doctor: verified, clinic: CLINIC });
    expect(provider.card.badge.label).toBe('Verified by M-Care');
    expect(safety.card.badge.label).toBe('Cleared to book');
    expect(rowValue(safety, 'Booking')).toBe('Open');
  });

  it('builds a map destination a driver can actually resolve', () => {
    const [provider] = buildIntakeStages({ doctor: DOCTOR, clinic: CLINIC });
    expect(provider.card.footer).toBe('location');
    expect(provider.card.location.destination).toContain('Dental Spa Margarita');
    expect(provider.card.location.destination).toContain('Venezuela');
  });

  it('returns nothing when there is no provider to stand on', () => {
    expect(buildIntakeStages({ doctor: null, clinic: null })).toEqual([]);
  });
});

describe('deriveFromBio', () => {
  it('splits specialty and education out of free text', () => {
    const { specialty, education } = deriveFromBio(DOCTOR.bio);
    expect(specialty).toBe('Cosmetic dentistry & Biomimetic Restorative Dentistry');
    expect(education).toBe('Graduated from Carabobo University, Valencia, Venezuela');
  });

  it('leaves the fields empty rather than guessing', () => {
    expect(deriveFromBio('')).toEqual({});
    const { specialty, education } = deriveFromBio('A dentist in Porlamar.');
    expect(specialty).toBe('');
    expect(education).toBe('');
  });
});