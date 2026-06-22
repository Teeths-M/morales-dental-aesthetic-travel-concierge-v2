import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
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