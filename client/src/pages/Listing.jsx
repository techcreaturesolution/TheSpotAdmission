import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EnquiryModal from '../components/EnquiryModal.jsx';
import InstitutionCard from '../components/InstitutionCard.jsx';
import SearchBox from '../components/SearchBox.jsx';
import { Checkbox, Empty, ErrorBox, Pagination, Select } from '../components/ui.jsx';
import { TYPE_LABEL, titleCase } from '../lib/format.js';
import { useApi, useMeta } from '../lib/hooks.js';
import { useShortlist } from '../lib/shortlist.js';

const FEE_OPTIONS = [
  { value: '25000', label: 'Up to ₹25,000' },
  { value: '50000', label: 'Up to ₹50,000' },
  { value: '100000', label: 'Up to ₹1 lakh' },
  { value: '200000', label: 'Up to ₹2 lakh' },
  { value: '500000', label: 'Up to ₹5 lakh' },
];
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'fees-asc', label: 'Fees: low to high' },
  { value: 'fees-desc', label: 'Fees: high to low' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A–Z' },
];
const FILTER_KEYS = ['q', 'type', 'category', 'city', 'board', 'ownership', 'course', 'maxFee', 'minRating', 'facility', 'hostel', 'verified'];

export default function Listing({ preset = {} }) {
  const [sp, setSp] = useSearchParams();
  const meta = useMeta();
  const [showFilters, setShowFilters] = useState(false);
  const [enquire, setEnquire] = useState(null);
  const shortlist = useShortlist();

  const params = useMemo(() => ({ ...preset, ...Object.fromEntries(sp.entries()), limit: 12 }), [sp, preset]);
  const { data, loading, error, reload } = useApi('/institutions', { params });

  const set = (k, v) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setSp(next);
  };
  const toggleList = (k, v) => {
    const cur = new Set((sp.get(k) || '').split(',').filter(Boolean));
    if (cur.has(v)) cur.delete(v);
    else cur.add(v);
    set(k, [...cur].join(','));
  };
  const active = FILTER_KEYS.filter((k) => sp.get(k));
  const m = meta.data;
  const type = params.type;
  const heading = type ? `${TYPE_LABEL[type] || titleCase(type)}s` : 'Schools & Colleges';

  const filters = (
    <div className="space-y-5">
      <Select label="Institution type" value={sp.get('type') || preset.type || ''} onChange={(e) => set('type', e.target.value)} placeholder="All types" options={(m?.types || []).map((t) => ({ value: t, label: TYPE_LABEL[t] || t }))} />
      <Select label="Category / stream" value={sp.get('category') || ''} onChange={(e) => set('category', e.target.value)} placeholder="All categories" options={(m?.categories || []).map((c) => c.name)} />
      <Select label="City" value={sp.get('city') || ''} onChange={(e) => set('city', e.target.value)} placeholder="All cities" options={m?.cities || []} />
      <Select label="Board / university" value={sp.get('board') || ''} onChange={(e) => set('board', e.target.value)} placeholder="Any" options={[...(m?.boards || []), ...(m?.universities || [])].map((b) => b.name)} />
      <Select label="Max fees per year" value={sp.get('maxFee') || ''} onChange={(e) => set('maxFee', e.target.value)} placeholder="Any budget" options={FEE_OPTIONS} />
      <Select
        label="Minimum rating"
        value={sp.get('minRating') || ''}
        onChange={(e) => set('minRating', e.target.value)}
        placeholder="Any rating"
        options={[
          { value: '4', label: '4★ & above' },
          { value: '3', label: '3★ & above' },
        ]}
      />
      <fieldset>
        <legend className="label">Ownership</legend>
        <div className="space-y-1.5">
          {(m?.ownership || []).map((o) => (
            <Checkbox key={o} label={titleCase(o)} checked={(sp.get('ownership') || '').split(',').includes(o)} onChange={() => toggleList('ownership', o)} />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Facilities</legend>
        <div className="grid grid-cols-1 gap-1.5">
          {(m?.facilities || []).slice(0, 10).map((f) => (
            <Checkbox key={f.slug} label={f.name} checked={(sp.get('facility') || '').split(',').includes(f.name)} onChange={() => toggleList('facility', f.name)} />
          ))}
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <Checkbox label="Hostel available" checked={sp.get('hostel') === 'true'} onChange={(e) => set('hostel', e.target.checked ? 'true' : '')} />
        <Checkbox label="Verified only" checked={sp.get('verified') === 'true'} onChange={(e) => set('verified', e.target.checked ? 'true' : '')} />
      </div>
    </div>
  );

  return (
    <div className="container-x py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{heading}</h1>
        <p className="mt-1 text-slate-600">Search and filter verified institutions. Compare up to 4 and enquire with one OTP.</p>
        <SearchBox initial={sp.get('q') || ''} className="mt-4 max-w-2xl" extraParams={Object.fromEntries([...sp.entries()].filter(([k]) => k !== 'q' && k !== 'page'))} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-4">{filters}</div>
        </aside>
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-outline btn-sm lg:hidden" onClick={() => setShowFilters(true)}>
              ⚙ Filters {active.length ? `(${active.length})` : ''}
            </button>
            <span className="text-sm text-slate-600">{loading ? 'Searching…' : `${data?.total ?? 0} results`}</span>
            {active.map((k) => (
              <span key={k} className="chip">
                {titleCase(k)}: {sp.get(k)}
                <button type="button" aria-label={`Clear ${k}`} onClick={() => set(k, '')}>
                  ✕
                </button>
              </span>
            ))}
            {active.length > 0 && (
              <button type="button" className="text-xs font-semibold text-brand-700 underline" onClick={() => setSp(new URLSearchParams())}>
                Clear all
              </button>
            )}
            <div className="ml-auto w-48">
              <Select aria-label="Sort" value={sp.get('sort') || 'relevance'} onChange={(e) => set('sort', e.target.value)} options={SORT_OPTIONS} />
            </div>
          </div>
          <ErrorBox message={error} onRetry={reload} />
          {loading && !data ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="skeleton aspect-[16/9] rounded-none" />
                  <div className="space-y-2 p-4">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                    <div className="skeleton h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.items?.length ? (
            <>
              <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
                {data.items.map((i) => (
                  <InstitutionCard key={i.id} inst={i} onEnquire={setEnquire} shortlisted={shortlist.ids.has(i.id)} onShortlist={shortlist.toggle} />
                ))}
              </div>
              <Pagination page={data.page} pages={data.pages} onChange={(p) => set('page', String(p))} />
            </>
          ) : (
            !error && (
              <Empty title="No institutions match your filters" action={active.length ? <button type="button" className="btn-outline" onClick={() => setSp(new URLSearchParams())}>Clear filters</button> : null}>
                Try removing a filter or searching a nearby city. Need help? Book a free counselling call.
              </Empty>
            )
          )}
        </div>
      </div>
      {showFilters && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setShowFilters(false)}>
          <div className="h-full w-80 max-w-full overflow-y-auto bg-white p-5" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setShowFilters(false)}>
                Done
              </button>
            </div>
            {filters}
          </div>
        </div>
      )}
      {enquire && <EnquiryModal inst={enquire} open onClose={() => setEnquire(null)} />}
    </div>
  );
}
