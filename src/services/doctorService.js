/**
 * Doctor Service
 * All Doctor/DoctorVerification data access.
 */
import { base44 } from '@/api/base44Client';
import { PAGINATION } from '@/lib/constants';

const Doctors = () => base44.entities.Doctor;
const Verifications = () => base44.entities.DoctorVerification;

export const doctorService = {
  /** Fetch all active doctors */
  listActive: (limit = PAGINATION.ADMIN_LIMIT) =>
    Doctors().filter({ status: 'active' }, '-created_date', limit),

  /** Get a single doctor by primary key */
  getById: (id) => Doctors().get(id),

  /** Get the current user's doctor profile */
  getMyProfile: () =>
    base44.functions.invoke('getMyDoctorProfile', {}),

  /** Get verification record for a doctor */
  getVerification: (doctorId) =>
    Verifications().filter({ doctor_id: doctorId }, '-created_date', 1)
      .then(r => r[0] || null),

  /** Admin: list pending verifications */
  listPendingVerifications: (limit = PAGINATION.ADMIN_LIMIT) =>
    Verifications().filter({ verification_status: 'pending' }, '-created_date', limit),

  /** Admin: match doctors for a procedure */
  matchForProcedure: (procedureInterest, clientEmail, clientId) =>
    base44.functions.invoke('matchDoctorsForProcedure', {
      procedure_interest: procedureInterest,
      client_email: clientEmail,
      client_id: clientId,
    }),

  /** Subscribe to doctor changes */
  subscribe: (callback) => Doctors().subscribe(callback),
};