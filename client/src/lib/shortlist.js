import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast.jsx';
import { api, errorMessage } from './api.js';
import { useAuth } from './auth.jsx';

const NO_IDS = new Set();

export function useShortlist() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [ids, setIds] = useState(new Set());
  const isStudent = user?.role === 'student';

  useEffect(() => {
    if (!isStudent) return;
    api
      .get('/me/shortlist')
      .then(({ data }) => setIds(new Set(data.items.map((i) => i.id))))
      .catch(() => {});
  }, [isStudent]);

  const toggle = useCallback(
    async (inst) => {
      if (!user) return navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      if (!isStudent) return toast('Shortlist is available for student accounts', 'error');
      const on = ids.has(inst.id);
      try {
        await (on ? api.delete(`/me/shortlist/${inst.id}`) : api.post(`/me/shortlist/${inst.id}`));
        setIds((prev) => {
          const next = new Set(prev);
          if (on) next.delete(inst.id);
          else next.add(inst.id);
          return next;
        });
        toast(on ? 'Removed from shortlist' : 'Saved to shortlist');
      } catch (err) {
        toast(errorMessage(err), 'error');
      }
    },
    [user, isStudent, ids, navigate, toast],
  );

  return { ids: isStudent ? ids : NO_IDS, toggle };
}
