import { Link } from 'react-router-dom';
import { useCompare } from '../lib/compare.jsx';
import { feeRange, TYPE_LABEL } from '../lib/format.js';
import { useToast } from './Toast.jsx';
import { Stars } from './ui.jsx';

export function CoverImage({ src, name, className = '' }) {
  if (src) return <img src={src} alt="" loading="lazy" className={`object-cover ${className}`} />;
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600 font-display text-3xl font-bold text-white/80 ${className}`} aria-hidden>
      {String(name || '?').slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function InstitutionCard({ inst, onEnquire, shortlisted, onShortlist }) {
  const compare = useCompare();
  const toast = useToast();
  const inCompare = compare.has(inst.id);

  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/institutions/${inst.slug}`} className="relative block">
        <CoverImage src={inst.cover} name={inst.name} className="aspect-[16/9] w-full" />
        <div className="absolute left-2 top-2 flex gap-1">
          {inst.isFeatured && <span className="rounded bg-accent-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Featured</span>}
          {inst.vacantSeats > 0 && <span className="rounded bg-green-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">{inst.vacantSeats} seats open</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          {inst.logo && <img src={inst.logo} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />}
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug">
              <Link to={`/institutions/${inst.slug}`} className="hover:text-brand-800">
                {inst.name}
              </Link>
              {inst.isVerified && (
                <span className="ml-1 align-middle text-xs font-semibold text-brand-700" title="Verified by The Spot Admission">
                  ✔ Verified
                </span>
              )}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              📍 {inst.city || '—'} · {TYPE_LABEL[inst.type] || inst.type}
              {inst.ownership ? ` · ${inst.ownership}` : ''}
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          {inst.rating?.count ? (
            <>
              <Stars value={inst.rating.avg} /> {inst.rating.avg} ({inst.rating.count})
            </>
          ) : (
            <span className="text-slate-400">No reviews yet</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(inst.board || inst.university) && <span className="chip">{inst.board || inst.university}</span>}
          {inst.category && <span className="chip">{inst.category}</span>}
        </div>
        {inst.topCourses?.length > 0 && <p className="mt-2 line-clamp-1 text-xs text-slate-500">{inst.topCourses.join(' · ')}</p>}
        <p className="mt-2 text-sm font-semibold text-slate-800">{feeRange(inst.fees)}</p>
        <div className="mt-auto flex items-center gap-2 pt-4">
          {onEnquire && (
            <button type="button" className="btn-primary btn-sm flex-1" onClick={() => onEnquire(inst)}>
              Enquire
            </button>
          )}
          <button
            type="button"
            className={`btn-sm btn ${inCompare ? 'bg-brand-100 text-brand-800' : 'btn-outline'}`}
            aria-pressed={inCompare}
            onClick={() => {
              if (!inCompare && compare.full) return toast('You can compare up to 4 institutions', 'error');
              compare.toggle(inst);
            }}
          >
            {inCompare ? '✓ Compare' : '+ Compare'}
          </button>
          {onShortlist && (
            <button type="button" className="btn-outline btn-sm" aria-pressed={shortlisted} aria-label={shortlisted ? 'Remove from shortlist' : 'Save to shortlist'} onClick={() => onShortlist(inst)}>
              {shortlisted ? '♥' : '♡'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
