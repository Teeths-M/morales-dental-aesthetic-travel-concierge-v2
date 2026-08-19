import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchClientIpGeo } from '../src/lib/clientIpGeo.js';

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

describe('clientIpGeo.fetchClientIpGeo', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ipapi.co data on success, without ever calling ipwho.is', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      country_name: 'Trinidad and Tobago',
      country_code: 'TT',
      city: 'Port of Spain',
      region: 'Port of Spain',
      timezone: 'America/Port_of_Spain',
      latitude: 10.65,
      longitude: -61.51,
      currency: 'TTD',
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchClientIpGeo();

    expect(result).toEqual({
      country: 'Trinidad and Tobago',
      country_code: 'TT',
      city: 'Port of Spain',
      region: 'Port of Spain',
      timezone: 'America/Port_of_Spain',
      latitude: 10.65,
      longitude: -61.51,
      currency: 'TTD',
      source: 'ipapi_co_client',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://ipapi.co/json/', expect.anything());
  });

  it('falls back to ipwho.is when ipapi.co fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 429))
      .mockResolvedValueOnce(jsonResponse({
        success: true,
        country: 'Trinidad and Tobago',
        country_code: 'TT',
        city: 'San Fernando',
        region: 'San Fernando',
        timezone: { id: 'America/Port_of_Spain' },
        latitude: 10.28,
        longitude: -61.47,
        currency: { code: 'TTD' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchClientIpGeo();

    expect(result).toEqual({
      country: 'Trinidad and Tobago',
      country_code: 'TT',
      city: 'San Fernando',
      region: 'San Fernando',
      timezone: 'America/Port_of_Spain',
      latitude: 10.28,
      longitude: -61.47,
      currency: 'TTD',
      source: 'ipwho_is_client',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to ipwho.is when ipapi.co returns a malformed body', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: true, reason: 'RateLimited' }))
      .mockResolvedValueOnce(jsonResponse({
        success: true, country: 'Jamaica', country_code: 'JM',
        currency: { code: 'JMD' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchClientIpGeo();
    expect(result?.country_code).toBe('JM');
    expect(result?.source).toBe('ipwho_is_client');
  });

  it('returns null (never throws) when both providers fail', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 500))
      .mockRejectedValueOnce(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchClientIpGeo()).resolves.toBeNull();
  });

  it('returns null when ipwho.is responds but success is false', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 403))
      .mockResolvedValueOnce(jsonResponse({ success: false }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchClientIpGeo()).resolves.toBeNull();
  });
});
