import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api.js';

export function useApi(url, { params, skip = false } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!skip);
  const key = JSON.stringify(params || {});
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (skip || !url) return;
    const id = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(url, { params: JSON.parse(key) });
      if (id === seq.current) setData(res.data);
    } catch (err) {
      if (id === seq.current) setError(errorMessage(err));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [url, key, skip]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching sets loading state
    load();
  }, [load]);

  return { data, setData, error, loading, reload: load };
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useMeta() {
  return useApi('/meta');
}
