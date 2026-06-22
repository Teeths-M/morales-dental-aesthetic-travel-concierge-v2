import { useState, useEffect } from 'react';

export function useIpGeolocation() {
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        if (data?.country_name) setCountry(data.country_name);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { country, loading };
}