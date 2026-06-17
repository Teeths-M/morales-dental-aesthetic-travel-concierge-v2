/**
 * Case Service
 * Centralises all CaseRecord data access.
 * Prevents scattered filter/sort args being re-invented in every component.
 */
import { base44 } from '@/api/base44Client';

export const caseService = {
  /** Active cases for the current user (client view) */
  getMyCases: (userEmail) =>
    base44.entities.CaseRecord.filter({ client_email: userEmail }, '-created_date', 20),

  /** Single case by ID */
  getById: (id) => base44.entities.CaseRecord.get ? base44.entities.CaseRecord.get(id) : base44.entities.CaseRecord.filter({ id }, '-created_date', 1).then(r => r[0]),

  /** All cases for admin dashboards — paginated */
  list: (limit = 50, sortField = '-created_date') =>
    base44.entities.CaseRecord.list(sortField, limit),

  /** Filter cases by status */
  getByStatus: (status, limit = 50) =>
    base44.entities.CaseRecord.filter({ status }, '-created_date', limit),

  /** Update a case */
  update: (id, data) => base44.entities.CaseRecord.update(id, data),
};