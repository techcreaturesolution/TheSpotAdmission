import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Input, Loading, Pagination } from '../components/ui.jsx';
import { date, embedUrl } from '../lib/format.js';
import { useApi, useDebounced } from '../lib/hooks.js';

export default function ContentList({ kinds, title }) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const debQ = useDebounced(q);
  const { data, loading, error, reload } = useApi('/content', { params: { kind: kinds, page, q: debQ } });
  const isMedia = kinds === 'podcast' || kinds === 'virtual-tour';

  return (
    <div className="container-x py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-slate-600">
            {kinds === 'podcast' && 'Conversations with educators, counsellors and students about admissions and careers.'}
            {kinds === 'virtual-tour' && 'Explore campuses from home before you visit.'}
            {kinds === 'article,news' && 'Admission updates, exam notices and practical guides for students and parents.'}
            {kinds === 'exam' && 'Entrance exam dates, results and preparation guides.'}
          </p>
        </div>
        <Input className="w-full sm:w-64" aria-label="Search" placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      <ErrorBox message={error} onRetry={reload} />
      {loading && !data ? (
        <Loading />
      ) : data?.items?.length ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((p) => (
              <article key={p._id} className="card flex flex-col overflow-hidden">
                {isMedia && p.mediaUrl ? (
                  <div className="aspect-video bg-slate-200">
                    <iframe src={embedUrl(p.mediaUrl)} title={p.title} className="h-full w-full" loading="lazy" allowFullScreen />
                  </div>
                ) : (
                  p.cover && <img src={p.cover} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
                )}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="chip">{p.category || p.kind}</span>
                    {date(p.publishedAt)}
                  </div>
                  <h2 className="mt-2 text-lg font-semibold">
                    <Link to={`/content/${p.slug}`} className="hover:text-brand-700">
                      {p.title}
                    </Link>
                  </h2>
                  <p className="mt-1 line-clamp-3 text-sm text-slate-600">{p.excerpt}</p>
                  <Link to={`/content/${p.slug}`} className="mt-auto pt-3 text-sm font-semibold text-accent-600">
                    {isMedia ? 'Details →' : 'Read more →'}
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      ) : (
        <Empty title="Nothing published yet">Check back soon.</Empty>
      )}
    </div>
  );
}
