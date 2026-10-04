import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useDebounced } from '../lib/hooks.js';
import { useI18n } from '../lib/i18n.jsx';

const NO_SUGG = { institutions: [], courses: [], cities: [] };

export default function SearchBox({ initial = '', className = '', big = false, extraParams = {} }) {
  const { t } = useI18n();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [rawSugg, setSugg] = useState(NO_SUGG);
  const debounced = useDebounced(q, 250);
  const navigate = useNavigate();
  const box = useRef(null);

  const [lastInitial, setLastInitial] = useState(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    setQ(initial);
  }
  useEffect(() => {
    if (debounced.trim().length < 2) return undefined;
    let live = true;
    api.get('/search/suggest', { params: { q: debounced } }).then(({ data }) => live && setSugg(data)).catch(() => {});
    return () => {
      live = false;
    };
  }, [debounced]);
  useEffect(() => {
    const onDoc = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const go = (params) => {
    setOpen(false);
    const sp = new URLSearchParams({ ...extraParams, ...params });
    for (const [k, v] of [...sp.entries()]) if (!v) sp.delete(k);
    navigate(`/institutions?${sp}`);
  };
  const sugg = debounced.trim().length < 2 ? NO_SUGG : rawSugg;
  const has = sugg.institutions.length + sugg.courses.length + sugg.cities.length > 0;

  return (
    <div ref={box} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: q.trim() });
        }}
        className={`flex overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200 ${big ? 'p-1.5' : ''}`}
      >
        <input
          className="min-w-0 flex-1 border-0 px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <button type="submit" className="btn-primary rounded-lg px-6">
          {t('search')}
        </button>
      </form>
      {open && has && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl bg-white text-left shadow-xl ring-1 ring-slate-200">
          {sugg.institutions.map((i) => (
            <button key={i.slug} type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50" onClick={() => navigate(`/institutions/${i.slug}`)}>
              🏫 <span className="font-medium">{i.name}</span> <span className="text-slate-400">· {i.city}</span>
            </button>
          ))}
          {sugg.courses.map((c) => (
            <button key={c} type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50" onClick={() => go({ course: c })}>
              📘 Course: <span className="font-medium">{c}</span>
            </button>
          ))}
          {sugg.cities.map((c) => (
            <button key={c} type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50" onClick={() => go({ city: c })}>
              📍 City: <span className="font-medium">{c}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
