import { describe, it, expect } from 'vitest';
import { buildConsultationPayload } from '@/lib/intakeFlow/fieldMap';

/**
 * The intake asks "You can choose more than one", the safety engine scores the
 * whole set, and the RED block exists precisely because stacking procedures can
 * kill someone. A record that names one procedure when three were requested
 * misrepresents the case to the doctor who reviews it.
 */
describe('every procedure the patient chose reaches the record', () => {
  it('persists all selected procedures, not just the first', () => {
    const payload = buildConsultationPayload({
      procedure_interest: 'dental_implants',
      selected_procedures: ['dental_implants', 'rhinoplasty', 'tummy_tuck'],
    });
    expect(payload.selected_procedures).toEqual([
      'dental_implants', 'rhinoplasty', 'tummy_tuck',
    ]);
  });

  it('keeps procedure_interest as the first choice so existing consumers are unaffected', () => {
    const payload = buildConsultationPayload({
      procedure_interest: 'dental_implants',
      selected_procedures: ['dental_implants', 'rhinoplasty'],
    });
    expect(payload.procedure_interest).toBe('dental_implants');
  });

  it('falls back to the single choice when only one was made', () => {
    const payload = buildConsultationPayload({ procedure_interest: 'facelift' });
    expect(payload.selected_procedures).toEqual(['facelift']);
  });

  it('never emits a bare procedure_interest with an empty procedure list', () => {
    // The failure this guards: selected_procedures present but blanked, which
    // is exactly what the cart-seeding path used to do.
    const payload = buildConsultationPayload({
      procedure_interest: 'liposuction',
      selected_procedures: [],
    });
    expect(payload.selected_procedures).toEqual(['liposuction']);
  });

  it('produces an empty list rather than [undefined] when nothing was chosen', () => {
    const payload = buildConsultationPayload({});
    expect(payload.selected_procedures).toEqual([]);
    expect(payload.procedure_interest).toBe('other');
  });
});
