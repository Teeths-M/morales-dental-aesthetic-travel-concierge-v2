/**
 * Token Routes — array of Route elements for use inside <Routes>.
 * Pages accessible without login, gated by opaque tokens in the URL.
 * All paths preserved exactly as in the original App.jsx.
 */
import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';

const SurveyPage         = lazy(() => import('@/pages/SurveyPage'));
const PostSurgeryFeedback = lazy(() => import('@/pages/PostSurgeryFeedback'));
const LuggageFinderPortal = lazy(() => import('@/pages/LuggageFinderPortal'));
const GuardianView       = lazy(() => import('@/pages/GuardianView'));
const EmergencyPINAccess = lazy(() => import('@/pages/EmergencyPINAccess'));
const ResetPIN           = lazy(() => import('@/pages/ResetPIN'));
const CheckInConfirm     = lazy(() => import('@/pages/CheckInConfirm'));
const ShareLinkViewer    = lazy(() => import('@/pages/ShareLinkViewer'));
const OfflineMode        = lazy(() => import('@/pages/OfflineMode'));
const EmergencyManifest  = lazy(() => import('@/pages/EmergencyManifest'));
const OfflineVaultGuide  = lazy(() => import('@/components/vault/OfflineVaultGuide'));
const ConfirmEmail       = lazy(() => import('@/pages/ConfirmEmail'));
const DoctorOutreachOptOut = lazy(() => import('@/pages/DoctorOutreachOptOut'));
const ShareLiveLocation  = lazy(() => import('@/pages/ShareLiveLocation'));

export const tokenRoutes = (
  <>
    <Route key="survey"         path="/survey/:token"           element={<ErrorBoundary><SurveyPage /></ErrorBoundary>} />
    <Route key="feedback"       path="/feedback/:token"         element={<ErrorBoundary><PostSurgeryFeedback /></ErrorBoundary>} />
    <Route key="luggage"        path="/luggage/:token"          element={<ErrorBoundary><LuggageFinderPortal /></ErrorBoundary>} />
    <Route key="guardian"       path="/guardian/:token"         element={<ErrorBoundary><GuardianView /></ErrorBoundary>} />
    <Route key="emergency-access" path="/emergency-access"      element={<ErrorBoundary><EmergencyPINAccess /></ErrorBoundary>} />
    <Route key="reset-pin"        path="/reset-pin"             element={<ErrorBoundary><ResetPIN /></ErrorBoundary>} />
    <Route key="checkin"        path="/check-in/:check_in_id"  element={<ErrorBoundary><CheckInConfirm /></ErrorBoundary>} />
    <Route key="vault-share"    path="/vault/share/:share_token" element={<ErrorBoundary><ShareLinkViewer /></ErrorBoundary>} />
    {/* /offline is intentionally kept public so users can access it without login */}
    <Route key="offline"        path="/offline"                 element={<ErrorBoundary><OfflineMode /></ErrorBoundary>} />
    <Route key="emergency-manifest" path="/emergency-manifest"  element={<ErrorBoundary><EmergencyManifest /></ErrorBoundary>} />
    <Route key="offline-vault-guide" path="/offline-vault-guide" element={<ErrorBoundary><OfflineVaultGuide /></ErrorBoundary>} />
    <Route key="confirm-email"       path="/confirm-email"        element={<ErrorBoundary><ConfirmEmail /></ErrorBoundary>} />
    <Route key="doctor-outreach-opt-out" path="/doctor-outreach-opt-out/:token" element={<ErrorBoundary><DoctorOutreachOptOut /></ErrorBoundary>} />
    <Route key="share-location" path="/share-location/:token" element={<ErrorBoundary><ShareLiveLocation /></ErrorBoundary>} />
  </>
);