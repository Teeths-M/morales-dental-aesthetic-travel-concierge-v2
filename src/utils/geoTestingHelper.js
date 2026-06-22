const LOCAL_IPS = ['127.0.0.1', '::1', 'localhost'];
const MOCK_US_IP = '104.24.123.10';

/**
 * Intercepts loopback/local IPs during development and swaps them
 * for a mock public US IP so geolocation-dependent backend functions
 * return real regional data arrays during local test cycles.
 *
 * Safe for production — non-local IPs pass through unchanged.
 */
export function resolveGeoIp(requestIp) {
  if (!requestIp || LOCAL_IPS.includes(requestIp)) {
    return MOCK_US_IP;
  }
  return requestIp;
}