/**
 * Platform Constants — Single Source of Truth
 * 
 * Centralizes all magic strings, enums, and configuration values.
 * Import and use these instead of hardcoded strings throughout the codebase.
 * 
 * @example
 * import { ROLES, CASE_STATUS } from '@/lib/constants';
 * if (user.role === ROLES.ADMIN) { ... }
 */

// ── User Roles ────────────────────────────────────────────────────────────────
export const ROLES = {
  CLIENT: 'client',
  DOCTOR: 'doctor',
  LOCAL_DOCTOR: 'local_doctor',
  TRAVEL_AGENCY: 'travel_agency',
  TAXI_SERVICE: 'taxi_service',
  COMPANION: 'companion',
  SECURITY_AGENCY: 'security_agency',
  CLINICAL_REVIEWER: 'clinical_reviewer',
  ADMIN: 'admin',
  PLATFORM_ADMIN: 'platform_admin',
  USER: 'user',
};

export const ALL_ROLES = Object.values(ROLES);

// ── Case Status ───────────────────────────────────────────────────────────────
export const CASE_STATUS = {
  SUBMITTED: 'Submitted',
  SAFE_T_REVIEWED: 'Safe-T-Reviewed',
  // Competitive-quote marketplace: after Safe-T clears, the request is fanned out to
  // matched specialist doctors and collects firm quotes until the patient chooses.
  AWAITING_QUOTES: 'Awaiting-Quotes',
  QUOTES_IN: 'Quotes-In',
  DOCTOR_PENDING: 'Doctor-Pending',
  VENDOR_PENDING: 'Vendor-Pending',
  ADMIN_REVIEW: 'Admin-Review',
  PROPOSAL_SENT: 'Proposal-Sent',
  PMP_25: 'PMP-25',
  PMP_50: 'PMP-50',
  DEPOSIT_PAID: 'Deposit-Paid',
  TRAVEL_COORDINATION: 'Travel-Coordination',
  READY_FOR_TRAVEL: 'Ready-For-Travel',
  PROCEDURE_IN_PROGRESS: 'Procedure-In-Progress',
  SURGICAL_EXECUTION: 'SURGICAL_EXECUTION_WINDOW',
  RECOVERY_PHASE_7: 'RECOVERY_PHASE_7_DAY',
  RECOVERY: 'Recovery',
  COMPLETED: 'Completed',
  WAIVER_REFUSED: 'waiver_refused',
  COMPANION_REQUIRED_PENDING: 'companion_required_pending',
  COMPANION_REQUIRED_WAIVED: 'companion_required_waived',
};

// ── Payment Status ───────────────────────────────────────────────────────────
export const PAYMENT_STATUS = {
  PENDING: 'Pending',
  P25_PAID: '25% Paid',
  P50_PAID: '50% Paid',
  PAID_IN_FULL: 'Paid In Full',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

// ── SAFE-T Risk Levels ───────────────────────────────────────────────────────
export const RISK_LEVELS = {
  LOW: 'Low',
  MEDIUM: 'Moderate',
  HIGH: 'High',
};

export const SAFE_T_RESULT = {
  PENDING: 'PENDING',
  PASSED: 'PASSED',
  BLOCKED: 'BLOCKED',
};

// ── Doctor Verification Status ───────────────────────────────────────────────
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  AUTO_VERIFIED: 'auto_verified',
  MANUAL_REVIEW: 'manual_review',
  VERIFIED: 'verified',
  DENIED: 'denied',
  EXPIRED: 'expired',
};

// ── Partner Types ────────────────────────────────────────────────────────────
export const PARTNER_TYPES = {
  DOCTOR: 'doctor',
  TRAVEL_AGENCY: 'travel_agency',
  TAXI_SERVICE: 'taxi_service',
  COMPANION_AGENCY: 'companion_agency',
  SECURITY_AGENCY: 'security_agency',
};

// ── Document Types (PassportVault) ───────────────────────────────────────────
export const DOCUMENT_TYPES = {
  PASSPORT: 'passport',
  VISA: 'visa',
  NATIONAL_ID: 'national_id',
  FLIGHT_TICKET: 'flight_ticket',
  HOTEL_BOOKING: 'hotel_booking',
  MEDICAL_RECORD: 'medical_record',
  INSURANCE: 'insurance',
  OTHER: 'other',
};

// ── Vault Document Status ────────────────────────────────────────────────────
export const VAULT_STATUS = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
  ARCHIVED: 'archived',
};

// ── Companion Assignment Status ──────────────────────────────────────────────
export const COMPANION_STATUS = {
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  CHECKOUT_PENDING: 'checkout_pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// ── Solo Check-In Status ─────────────────────────────────────────────────────
export const CHECKIN_STATUS = {
  PENDING: 'pending',
  ACKNOWLEDGED: 'acknowledged',
  ESCALATED_2H: 'escalated_2h',
  ESCALATED_3H: 'escalated_3h',
  RESOLVED: 'resolved',
};

export const ESCALATION_LEVEL = {
  NONE: 'none',
  CONTACT_NOTIFIED: 'contact_notified',
  SECURITY_DISPATCHED: 'security_dispatched',
};

// ── Recovery Surgery Complexity ──────────────────────────────────────────────
export const SURGERY_COMPLEXITY = {
  MINOR: 'minor',       // 12h check-in interval
  MODERATE: 'moderate', // 8h check-in interval
  MAJOR: 'major',       // 4h check-in interval
};

// ── Deposit Options ──────────────────────────────────────────────────────────
export const DEPOSIT_OPTIONS = {
  FULL: 'Full',
  P50: '50%',
  P25: '25%',
};

// ── Platform Modes ───────────────────────────────────────────────────────────
export const PLATFORM_MODE = {
  MEDICAL: 'medical',
  TRAVEL: 'travel',
};

// ── Route Constants ──────────────────────────────────────────────────────────
export const ROUTES = {
  // Public
  HOME: '/',
  DISCOVER: '/discover',
  PROVIDERS: '/providers',
  PROCEDURES: '/procedures',
  PARTNERS: '/partners',
  HOW_IT_WORKS: '/how-it-works',
  ABOUT: '/about',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  DELETE_ACCOUNT: '/request-account-deletion',
  
  // Authenticated
  DASHBOARD: '/dashboard',
  SAFE_T: '/safe-t',
  BOOKING: '/booking',
  CONCIERGE_INTAKE: '/intake',
  TRAVEL_INTAKE: '/travel-intake',
  BRING_YOUR_OWN_JOURNEY: '/protect',
  PASSPORT_VAULT: '/passport-vault',
  EMERGENCY: '/emergency',
  TRAVEL_SERVICES: '/travel-services',
  INSURANCE: '/insurance',
  
  // Partner Portals
  DOCTOR_DASHBOARD: '/doctor-dashboard',
  LOCAL_DOCTOR_SIGNUP: '/local-doctor-signup',
  LOCAL_DOCTOR_DASHBOARD: '/local-doctor-dashboard',
  TRAVEL_AGENCY_DASHBOARD: '/travel-agency-dashboard',
  TAXI_SERVICE_DASHBOARD: '/taxi-service-dashboard',
  COMPANION_DASHBOARD: '/companion-dashboard',
  PARTNER_PORTAL: '/partner-portal',
  
  // Admin
  ADMIN: '/admin',
  ADMIN_PARTNERS: '/admin/partners',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_PRICING: '/admin/pricing',
  ADMIN_VERIFICATION: '/admin/provider-verification',
  ADMIN_AUDIT_LOG: '/admin/audit-log',
  ADMIN_CONFIG: '/admin/config-approvals',
  
  // Public Token-Gated
  PROPOSAL: '/portal/proposal',
  GUARDIAN: '/guardian',
  SURVEY: '/survey',
  FEEDBACK: '/feedback',
  LUGGAGE: '/luggage',
};

// ── Error Messages (User-Friendly) ───────────────────────────────────────────
export const ERROR_MESSAGES = {
  NETWORK: 'Unable to connect. Please check your internet connection.',
  UNAUTHORIZED: 'Please log in to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  VALIDATION: 'Please check your input and try again.',
  TIMEOUT: 'The request took too long. Please try again.',
};

// ── Time Constants (milliseconds) ────────────────────────────────────────────
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
};

// ── Pagination Defaults ──────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  ADMIN_LIMIT: 50,
};

// ── File Upload Limits ───────────────────────────────────────────────────────
export const FILE_LIMITS = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
};

// ── Session Timeouts ─────────────────────────────────────────────────────────
export const SESSION = {
  PIN_SESSION_HOURS: 24,
  GUARDIAN_LINK_HOURS: 72,
  SHARE_LINK_HOURS: 24,
  CHECKIN_TOKEN_HOURS: 24,
};

// ── Notification Channels ────────────────────────────────────────────────────
export const NOTIFICATION_CHANNEL = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  WHATSAPP: 'whatsapp',
};

// ── Audit Event Types (subset — see AuditLog entity for full list) ─────────
export const AUDIT_EVENTS = {
  SENSITIVE_VIEWED: 'sensitive_profile_viewed',
  PASSPORT_VIEWED: 'passport_token_viewed',
  PASSPORT_ACCESS_REQUESTED: 'passport_access_requested',
  PASSPORT_ACCESS_APPROVED: 'passport_access_approved',
  PASSPORT_ACCESS_DENIED: 'passport_access_denied',
  WAIVER_SIGNED: 'waiver_signed',
  WAIVER_REFUSED: 'waiver_refused',
  COMPANION_ASSIGNED: 'companion_assigned',
  SAFE_T_BLOCK: 'safe_t_critical_block',
  SAFE_T_WAIVER: 'safe_t_high_risk_waiver_signed',
};

// ── Public Bypass Paths (render without waiting for auth) ─────────────────────
// Keep in sync with the auth check in App.jsx's AuthenticatedApp component.
export const PUBLIC_BYPASS_PATHS = [
  '/offline', '/offline-guide', '/emergency-manifest', '/emergency-access',
  '/emergency', '/guardian', '/survey', '/feedback', '/luggage',
  '/check-in', '/vault/share', '/passport-vault',
  // Partner signup forms are public registration pages — render immediately
  // without waiting for auth, so unauthenticated visitors (and the Testing
  // Agent) can access them without hitting the PageLoader or auth gate.
  '/doctor-signup', '/partner-signup', '/companion-signup',
  '/security-signup', '/local-doctor-signup',
];

// ── Feature Flags ────────────────────────────────────────────────────────────
export const FEATURES = {
  SOLO_CHECKIN_ENABLED: true,
  RECOVERY_MODE_ENABLED: true,
  COMPANION_MARKETPLACE_ENABLED: true,
  ADVENTURE_SAFETY_ENABLED: true,
  OFFLINE_MODE_ENABLED: true,
};

// ── Currency Constants ───────────────────────────────────────────────────────
export const CURRENCY = {
  USD: 'USD',
  DEFAULT_LOCALE: 'en-US',
};

// ── Date Formats ─────────────────────────────────────────────────────────────
export const DATE_FORMATS = {
  DISPLAY: 'MMM D, YYYY',
  DISPLAY_SHORT: 'MM/DD/YYYY',
  ISO: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
};

// ── Consultation Fee ─────────────────────────────────────────────────────────
export const CONSULTATION_FEE = {
  AMOUNT_USD: 49,         // refundable deposit — returned to patient on booking confirmation
  CURRENCY: 'USD',
};

// ── Platform Pricing ─────────────────────────────────────────────────────────
export const PLATFORM_PRICING = {
  // ── Medical users (procedure booking) ──
  // Commission taken from procedure value on confirmed booking
  COMMISSION_FULL_PAYMENT: 0.20,        // 20% — patient pays procedure cost in full
  COMMISSION_INSTALLMENT_PLAN: 0.25,    // 25% — patient pays 50% down + remainder before travel date

  // ── Safety-only users (no procedure booking) ──
  // Platform fee on safety subscription cost
  SAFETY_TEAM_RATE: 0.20,              // 20% — group / corporate / team plan
  SAFETY_INDIVIDUAL_RATE: 0.25,        // 25% — individual safety-only subscription

  // Doctor trust badge — monthly subscription to carry the Morales M
  DOCTOR_BADGE_MONTHLY_USD: 9.99,

  // M Local — home-country doctor network monthly subscription
  LOCAL_DOCTOR_SUBSCRIPTION_USD: 9.99,
  // Referral fee paid to M Local doctor per accepted referral case
  LOCAL_DOCTOR_REFERRAL_FEE_USD: 0,

  // Partner network fee — taken from each partner transaction (escort, companion, accommodation, security)
  PARTNER_NETWORK_FEE: 0.05,
};

// ── Default Values ───────────────────────────────────────────────────────────
export const DEFAULTS = {
  MARKUP_PERCENTAGE: 35,
  RECOVERY_DAYS: 7,
  CHECKIN_INTERVAL_HOURS: 12,
};

// ── Validation Patterns ──────────────────────────────────────────────────────
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s-()]+$/,
  TOKEN: /^[a-zA-Z0-9_-]+$/,
};

// ── API Rate Limits (client-side enforcement) ────────────────────────────────
export const RATE_LIMITS = {
  ENTITY_FETCH_PER_MINUTE: 60,
  FUNCTION_INVOCATION_PER_MINUTE: 30,
  FILE_UPLOAD_PER_HOUR: 10,
};

// ── Cache Durations (React Query) ────────────────────────────────────────────
export const CACHE = {
  INSTANT: 0,
  SHORT: 30 * 1000,      // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000,  // 30 minutes
  INFINITY: Infinity,
};

// Journey phases where the patient is physically traveling.
// Single source of truth — import this everywhere instead of duplicating the array.
// MedGuard, Guardian Mode, and isActiveJourney checks all derive from this set.
export const ACTIVE_TRAVEL_PHASES = new Set([
  'transit_out',
  'arrived',
  'recovery',
  'transit_return',
]);

// Export everything as a single namespace for convenience
export const CONSTANTS = {
  ROLES,
  CASE_STATUS,
  PAYMENT_STATUS,
  RISK_LEVELS,
  SAFE_T_RESULT,
  VERIFICATION_STATUS,
  PARTNER_TYPES,
  DOCUMENT_TYPES,
  VAULT_STATUS,
  COMPANION_STATUS,
  CHECKIN_STATUS,
  ESCALATION_LEVEL,
  SURGERY_COMPLEXITY,
  DEPOSIT_OPTIONS,
  PLATFORM_MODE,
  ROUTES,
  ERROR_MESSAGES,
  TIME,
  PAGINATION,
  FILE_LIMITS,
  SESSION,
  NOTIFICATION_CHANNEL,
  AUDIT_EVENTS,
  FEATURES,
  CURRENCY,
  DATE_FORMATS,
  CONSULTATION_FEE,
  PLATFORM_PRICING,
  DEFAULTS,
  PATTERNS,
  RATE_LIMITS,
  CACHE,
};