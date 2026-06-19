/**
 * Case Service
 * All CaseRecord data access goes through here.
 * Components never call base44.entities.CaseRecord directly.
 */
import { base44 } from '@/api/base44Client';
import { PAGINATION } from '@/lib/constants';

const Cases = () => base44.entities.CaseRecord;

export const caseService = {
  /** Fetch cases for the current user's email */
  getByEmail: (email, limit = PAGINATION.DEFAULT_LIMIT) =>
    Cases().filter({ client_email: email }, '-created_date', limit),

  /** Fetch a single case by primary key */
  getById: (id) => Cases().get(id),

  /** Fetch cases by doctor email */
  getByDoctorEmail: (email, limit = PAGINATION.DEFAULT_LIMIT) =>
    Cases().filter({ doctor_email: email }, '-created_date', limit),

  /** Admin: fetch recent cases */
  listRecent: (limit = PAGINATION.ADMIN_LIMIT) =>
    Cases().list('-created_date', limit),

  /** Admin: fetch cases by status */
  getByStatus: (status, limit = PAGINATION.ADMIN_LIMIT) =>
    Cases().filter({ status }, '-created_date', limit),

  /** Update a case record */
  update: (id, data) => Cases().update(id, data),

  /** Append a timeline event to a case */
  appendTimeline: async (id, event) => {
    const rec = await Cases().get(id);
    if (!rec) throw new Error(`CaseRecord ${id} not found`);
    const timeline_log = [
      ...(Array.isArray(rec.timeline_log) ? rec.timeline_log : []),
      { timestamp: new Date().toISOString(), ...event },
    ];
    return Cases().update(id, { timeline_log });
  },

  /** Subscribe to real-time case changes */
  subscribe: (callback) => Cases().subscribe(callback),
};