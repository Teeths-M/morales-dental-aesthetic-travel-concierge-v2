/**
 * Partner Service
 * TravelAgency, TaxiService, Companion, SecurityAgency data access.
 * Components import from here — never call base44.entities directly for partner ops.
 */
import { base44 } from '@/api/base44Client';
import { PAGINATION } from '@/lib/constants';

const TravelAgencies  = () => base44.entities.TravelAgency;
const TaxiServices    = () => base44.entities.TaxiService;
const Companions      = () => base44.entities.Companion;

export const partnerService = {
  // ── Travel Agencies ─────────────────────────────────────────────────────────

  listActiveTravelAgencies: (limit = PAGINATION.ADMIN_LIMIT) =>
    TravelAgencies().filter({ status: 'active' }, '-created_date', limit),

  getTravelAgencyById: (id) => TravelAgencies().get(id),

  updateTravelAgency: (id, data) => TravelAgencies().update(id, data),

  // ── Taxi Services ───────────────────────────────────────────────────────────

  listActiveTaxiServices: (limit = PAGINATION.ADMIN_LIMIT) =>
    TaxiServices().filter({ status: 'active' }, '-created_date', limit),

  getTaxiServiceById: (id) => TaxiServices().get(id),

  updateTaxiService: (id, data) => TaxiServices().update(id, data),

  // ── Companions ──────────────────────────────────────────────────────────────

  listActiveCompanions: (limit = PAGINATION.ADMIN_LIMIT) =>
    Companions().filter({ status: 'active' }, '-created_date', limit),

  getCompanionById: (id) => Companions().get(id),

  updateCompanion: (id, data) => Companions().update(id, data),

  // ── Portal Link Generation (admin only) ─────────────────────────────────────

  generateDoctorPortalLink: (consultationId, doctorId) =>
    base44.functions.invoke('generateDoctorPortalLink', {
      consultation_id: consultationId,
      doctor_id: doctorId,
    }),

  generateTravelAgencyPortalLink: (consultationId, travelAgencyId) =>
    base44.functions.invoke('generateTravelAgencyPortalLink', {
      consultation_id: consultationId,
      travel_agency_id: travelAgencyId,
    }),

  generateChauffeurPortalLink: (consultationId, taxiServiceId) =>
    base44.functions.invoke('generateChauffeurPortalLink', {
      consultation_id: consultationId,
      taxi_service_id: taxiServiceId,
    }),

  // ── Verification ────────────────────────────────────────────────────────────

  initiateVerification: (partnerId, partnerType) =>
    base44.functions.invoke('initiatePartnerVerification', {
      partner_id: partnerId,
      partner_type: partnerType,
    }),
};