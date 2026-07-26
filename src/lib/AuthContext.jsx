// @ts-nocheck — pre-existing type gaps in src/lib utility
import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { ROLES } from '@/lib/constants';

const AuthContext = createContext();

// Single source of truth — never duplicate elsewhere
const PREVIEW_USER = { 
  role: ROLES.ADMIN, 
  email: 'preview-admin@base44.app', 
  full_name: 'Base44 Preview Admin', 
  isPreviewAdmin: true 
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  // Use module-level PREVIEW_USER — single source of truth
  // Production guard: preview bypass is only permitted on localhost or *.preview.* hostnames
  const isProduction = !window.location.hostname.includes('preview') &&
                       !window.location.hostname.includes('localhost') &&
                       !window.location.hostname.includes('127.0.0.1');
  const isPreviewAdmin = !isProduction && (appParams.isPreview || Boolean(appParams.previewToken));

  useEffect(() => {
    // Listen for online/offline events globally
    const handleOnline = () => {
      setIsOffline(false);
      // Re-run auth check when back online to refresh session
      if (!user?.isPreviewAdmin) {
        checkAppState();
      }
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    checkAppState();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkAppState = async () => {
    // If offline, skip network calls entirely — restore last known identity so
    // offline-capable features (Vault, Emergency Manifest) can still render.
    if (!navigator.onLine) {
      try {
        const cachedUserRaw = localStorage.getItem('morales_last_known_user');
        if (cachedUserRaw) {
          const cachedUser = JSON.parse(cachedUserRaw);
          setUser({ ...cachedUser, isOfflineUser: true });
          setIsAuthenticated(true);
        }
      } catch (_) { /* no cached identity — proceed with user: null */ }
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (isPreviewAdmin) {
          setUser(PREVIEW_USER);
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
          setAuthChecked(true);
          setIsLoadingPublicSettings(false);
          return;
        }
        
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (isPreviewAdmin) {
          setUser(PREVIEW_USER);
          setIsAuthenticated(true);
          setAuthChecked(true);
          setAuthError(null);
        } else if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      // Network error (offline mid-request) — fail gracefully, don't crash
      if (!navigator.onLine || error.message === 'Network Error' || error.name === 'TypeError') {
        console.warn('[AuthContext] Offline during auth check — skipping.');
      } else {
        console.error('Unexpected error:', error);
        setAuthError({
          type: 'unknown',
          message: error.message || 'An unexpected error occurred'
        });
      }
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();

      // Account was deleted (self-service or admin GDPR erasure) — no server-side
      // session-revocation primitive exists in the SDK, so this is how a still-logged-in
      // device (or a second tab/device) discovers it, next time it checks in.
      if (currentUser?.account_deletion_requested_at) {
        await logout(false);
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'account_deleted', message: 'This account has been deleted.' });
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);

      // Cache minimal identity for offline restoration (no sensitive tokens — just enough
      // to key the local cache lookups in useVault, EmergencyManifest, etc.)
      try {
        if (currentUser?.email) {
          localStorage.setItem('morales_last_known_user', JSON.stringify({
            email: currentUser.email,
            id: currentUser.id,
            full_name: currentUser.full_name,
            role: currentUser.role,
          }));
        }
      } catch (_) { /* storage unavailable — non-fatal */ }
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = async (shouldRedirect = true) => {
    try {
      if (shouldRedirect) {
        // Use the SDK's logout method which handles token cleanup and redirect
        await base44.auth.logout(window.location.href);
      } else {
        // Just remove the token without redirect
        await base44.auth.logout();
      }
    } catch (_) {}

    // Explicitly clear sensitive auth data from localStorage
    try {
      localStorage.removeItem('morales_last_known_user');
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
      // Clear any session-specific location caches
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('morales_loc_cache_') || key.startsWith('morales_trail_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (_) {}

    setUser(null);
    setIsAuthenticated(false);
  };

  // Auto-logout after 2 hours of inactivity
  const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
  const inactivityTimerRef = useRef(null);

  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      if (isAuthenticated) {
        logout();
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [isAuthenticated, logout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Reset timer on user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer, { passive: true }));
    resetInactivityTimer(); // Start timer on mount

    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      clearTimeout(inactivityTimerRef.current);
    };
  }, [isAuthenticated, resetInactivityTimer]);

  const navigateToLogin = (nextUrl = `${window.location.origin}/dashboard`) => {
    const safeNextUrl = typeof nextUrl === 'string' ? nextUrl : `${window.location.origin}/dashboard`;
    base44.auth.redirectToLogin(safeNextUrl);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      isOffline,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};