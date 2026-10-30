import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAutoLocation } from '@/hooks/useAutoLocation';

/**
 * useSurroundings — the client half of "Around You".
 *
 * Deliberately thin: it fetches what the server already decided and forwards
 * the traveller's own choices. It performs no distance maths and no level
 * reasoning of its own, because a second copy of the safety rules on the client
 * is a second thing that can disagree with the one that actually enforced them.
 */
export function useSurroundings() {
  const { requestGPS } = useAutoLocation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const load = useCallback(async (position) => {
    setLoading(true);
    setError(null);
    try {
      const payload = position
        ? {
            latitude: position.latitude,
            longitude: position.longitude,
            location_source: position.source === 'approximate' ? 'approximate' : 'gps',
          }
        : {};
      const res = await base44.functions.invoke('getSurroundings', payload);
      setData(res?.data || null);
    } catch {
      setError('M-Care could not load what is happening around you right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Ask for precise GPS, store it (only if the layer is on), then reload. */
  const useMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      const result = await requestGPS(true);
      if (!result?.success || !result.location) return { success: false, errorCode: result?.errorCode || 'unknown' };

      await base44.functions
        .invoke('updateSurroundingsSettings', {
          action: 'location',
          latitude: result.location.latitude,
          longitude: result.location.longitude,
          source: 'gps',
        })
        .catch(() => {});

      await load(result.location);
      return { success: true, location: result.location };
    } finally {
      setLocating(false);
    }
  }, [requestGPS, load]);

  const saveSettings = useCallback(async (patch) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('updateSurroundingsSettings', { action: 'save', ...patch });
      await load();
      return res?.data;
    } finally {
      setBusy(false);
    }
  }, [load]);

  const addPlace = useCallback(async (payload) => {
    const res = await base44.functions.invoke('saveTravelerPlace', { action: 'create', ...payload });
    await load();
    return res?.data;
  }, [load]);

  const updatePlace = useCallback(async (placeId, patch) => {
    const res = await base44.functions.invoke('saveTravelerPlace', { action: 'update', place_id: placeId, ...patch });
    await load();
    return res?.data;
  }, [load]);

  const deletePlace = useCallback(async (placeId) => {
    const res = await base44.functions.invoke('saveTravelerPlace', { action: 'delete', place_id: placeId });
    await load();
    return res?.data;
  }, [load]);

  return {
    data,
    settings: data?.settings || null,
    places: data?.places || [],
    notices: data?.notices || [],
    feed: data?.feed || [],
    meta: data?.meta || null,
    loading,
    error,
    busy,
    locating,
    reload: load,
    useMyLocation,
    saveSettings,
    addPlace,
    updatePlace,
    deletePlace,
  };
}