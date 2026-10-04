import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'tsa_compare';
export const MAX_COMPARE = 4;
const CompareContext = createContext(null);

export function CompareProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(items)), [items]);

  const toggle = useCallback((inst) => {
    let added = false;
    setItems((prev) => {
      if (prev.some((p) => p.id === inst.id)) return prev.filter((p) => p.id !== inst.id);
      if (prev.length >= MAX_COMPARE) return prev;
      added = true;
      return [...prev, { id: inst.id, name: inst.name, slug: inst.slug }];
    });
    return added;
  }, []);
  const remove = useCallback((id) => setItems((prev) => prev.filter((p) => p.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const has = useCallback((id) => items.some((p) => p.id === id), [items]);

  const value = useMemo(() => ({ items, toggle, remove, clear, has, full: items.length >= MAX_COMPARE }), [items, toggle, remove, clear, has]);
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export const useCompare = () => useContext(CompareContext);
