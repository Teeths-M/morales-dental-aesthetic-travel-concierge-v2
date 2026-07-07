import { QueryClient, MutationCache } from '@tanstack/react-query';
import { isSystemPaused } from '@/lib/systemPause';
import { reportIncident } from '@/lib/incidentReporting';

// Read pause state at module load time so the QueryClient starts correctly
// even after a page reload while paused. This is the only file that needs
// to import isSystemPaused — no circular dependency since systemPause.js
// does not import from query-client.js.
const _startPaused = isSystemPaused();

export const queryClientInstance = new QueryClient({
  // MutationCache.onError always fires, regardless of whether an individual
  // useMutation() call defines its own onError — a QueryClient-level
  // defaultOptions.mutations.onError would instead be silently overridden by
  // any local handler (most mutations here already have one, e.g. toasts),
  // which would miss most real failures. Query failures are deliberately not
  // captured here — background/polling retries would be too noisy.
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      reportIncident({
        severity: 'medium',
        source: 'api',
        feature: mutation?.options?.mutationKey ? String(mutation.options.mutationKey) : undefined,
        errorMessage: error?.message || String(error),
        stackTrace: error?.stack,
      });
    },
  }),
  defaultOptions: {
    queries: {
      // Honour the saved pause state on startup — prevents any query from
      // running on page load when the system is paused
      enabled:              !_startPaused,
      refetchInterval:      _startPaused ? false : undefined,
      refetchOnWindowFocus: false,
      // Default networkMode is 'online', which PAUSES queries indefinitely
      // when navigator.onLine is false — isLoading never resolves to true/false,
      // it just stays pending forever (the infinite-spinner bug). 'offlineFirst'
      // lets the fetch actually run and fail fast, so retry/error states kick in
      // normally instead of hanging.
      networkMode: 'offlineFirst',
      retry: (failureCount, error) => {
        // Never retry auth errors — redirect immediately
        if (error?.status === 401 || error?.status === 403) return false;
        // Never retry not-found errors
        if (error?.status === 404) return false;
        // Retry up to 3 times for network/server errors (500, 503, timeouts)
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 30000,
    },
    mutations: {
      retry: 0, // Never auto-retry mutations — side effects must be intentional
    },
  },
});