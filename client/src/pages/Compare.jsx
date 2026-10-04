import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EnquiryModal from '../components/EnquiryModal.jsx';
import { CoverImage } from '../components/InstitutionCard.jsx';
import { Empty, ErrorBox, Loading, Stars } from '../components/ui.jsx';
import { useCompare } from '../lib/compare.jsx';
import { feeRange, TYPE_LABEL, titleCase } from '../lib/format.js';
import { useApi } from '../lib/hooks.js';

export default function Compare() {
  const { items: selected, remove, clear } = useCompare();
  const ids = selected.map((s) => s.id).join(',');
  const { data, loading, error, reload } = useApi('/compare', { params: { ids }, skip: !ids });
  const [enquire, setEnquire] = useState(null);
  const items = useMemo(() => (data?.items || []).filter((i) => selected.some((s) => s.id === i.id)), [data, selected]);

  if (!selected.length) {
    return (
      <div className="container-x py-12">
        <Empty
          title="Nothing to compare yet"
          action={
            <Link to="/institutions" className="btn-primary">
              Browse institutions
            </Link>
          }
        >
          Tap “+ Compare” on up to 4 schools or colleges to compare fees, courses, facilities and ratings side by side.
        </Empty>
      </div>
    );
  }
  if (loading && !data) return <Loading />;

  const facilities = [...new Set(items.flatMap((i) => i.facilities || []))].sort();
  const rows = [
    ['Type', (i) => TYPE_LABEL[i.type]],
    ['City', (i) => i.address?.city],
    ['Ownership', (i) => titleCase(i.ownership)],
    ['Board / University', (i) => i.board || i.university],
    ['Established', (i) => i.establishedYear],
    ['Rating', (i) => (i.rating?.count ? <><Stars value={i.rating.avg} /> {i.rating.avg} ({i.rating.count})</> : '—')],
    ['Fees', (i) => feeRange(i.fees)],
    ['Courses', (i) => (i.courses || []).map((c) => c.name).join(', ') || '—'],
    ['Vacant seats', (i) => (i.courses || []).reduce((s, c) => s + (c.seatsVacant || 0), 0) || '—'],
    ['Hostel', (i) => (i.hostel ? '✔' : '—')],
    ['Transport', (i) => (i.transport ? '✔' : '—')],
    ['Highest package', (i) => (i.placements?.highestLpa ? `${i.placements.highestLpa} LPA` : '—')],
    ['Average package', (i) => (i.placements?.averageLpa ? `${i.placements.averageLpa} LPA` : '—')],
    ['Accreditation', (i) => (i.accreditation || []).join(', ') || '—'],
  ];

  return (
    <div className="container-x py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Compare institutions</h1>
        <div className="flex gap-2">
          {selected.length < 4 && (
            <Link to="/institutions" className="btn-outline btn-sm">
              + Add more
            </Link>
          )}
          <button type="button" className="btn-ghost btn-sm" onClick={clear}>
            Clear all
          </button>
        </div>
      </div>
      <ErrorBox message={error} onRetry={reload} />
      <div className="card overflow-x-auto">
        <table className="table-x min-w-[640px]">
          <thead>
            <tr>
              <th className="w-40" />
              {items.map((i) => (
                <th key={i.id} className="min-w-[200px] normal-case tracking-normal">
                  <CoverImage src={i.cover} name={i.name} className="mb-2 aspect-[16/9] w-full rounded-lg" />
                  <Link to={`/institutions/${i.slug}`} className="text-sm font-semibold text-slate-900 hover:text-brand-700">
                    {i.name}
                  </Link>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="btn-primary btn-sm" onClick={() => setEnquire(i)}>
                      Enquire
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => remove(i.id)}>
                      Remove
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label}>
                <th scope="row" className="bg-slate-50 text-left">
                  {label}
                </th>
                {items.map((i) => (
                  <td key={i.id}>{fn(i) ?? '—'}</td>
                ))}
              </tr>
            ))}
            {facilities.map((f) => (
              <tr key={f}>
                <th scope="row" className="bg-slate-50 text-left font-normal normal-case">
                  {f}
                </th>
                {items.map((i) => (
                  <td key={i.id}>{i.facilities?.includes(f) ? <span className="text-green-700">✔</span> : <span className="text-slate-300">✕</span>}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {enquire && <EnquiryModal inst={enquire} courses={enquire.courses} source="compare" open onClose={() => setEnquire(null)} />}
    </div>
  );
}
