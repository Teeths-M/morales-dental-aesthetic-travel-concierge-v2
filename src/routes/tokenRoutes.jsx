/**
 * Token Routes — array of Route elements for use inside <Routes>.
 * Pages accessible without login, gated by opaque tokens in the URL.
 * All paths preserved exactly as in the original App.jsx.
 */
import React, { lazy } from 'react';
import { Route } from 'react-router-dom';

const SurveyPage         = lazy(() => import('@/pages/SurveyPage'));
const PostSurgeryFeedback = lazy(() => import('@/pages/PostSurgeryFeedback'));
const LuggageFinderPortal = lazy(() => import('@/pages/LuggageFinderPortal'));
const GuardianView       = lazy(() => import('@/pages/GuardianView'));
const EmergencyPINAccess = lazy(() => import('@/pages/EmergencyPINAccess'));
const CheckInConfirm     = lazy(() => import('@/pages/CheckInConfirm'));
const ShareLinkViewer    = lazy(() => import('@/pages/ShareLinkViewer'));
const OfflineMode        = lazy(() => import('@/pages/OfflineMode'));
const EmergencyManifest  = lazy(() => import('@/pages/EmergencyManifest'));

export const tokenRoutes = (
  <>
    <Route key="survey"         path="/survey/:token"           element={<SurveyPage />} />
    <Route key="feedback"       path="/feedback/:token"         element={<PostSurgeryFeedback />} />
    <Route key="luggage"        path="/luggage/:token"          element={<LuggageFinderPortal />} />
    <Route key="guardian"       path="/guardian/:token"         element={<GuardianView />} />
    <Route key="emergency-access" path="/emergency-access"      element={<EmergencyPINAccess />} />
    <Route key="checkin"        path="/check-in/:check_in_id"  element={<CheckInConfirm />} />
    <Route key="vault-share"    path="/vault/share/:share_token" element={<ShareLinkViewer />} />
    {/* /offline is intentionally kept public so users can access it without login */}
    <Route key="offline"        path="/offline"                 element={<OfflineMode />} />
    <Route key="emergency-manifest" path="/emergency-manifest"  element={<EmergencyManifest />} />
  </>
);