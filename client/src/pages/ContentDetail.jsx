import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorBox, Loading } from '../components/ui.jsx';
import { date, embedUrl } from '../lib/format.js';
import { useApi } from '../lib/hooks.js';

export default function ContentDetail() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useApi(`/content/${slug}`);
  useEffect(() => {
    if (data?.item) document.title = `${data.item.title} | The Spot Admission`;
  }, [data]);
  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="container-x py-12">
        <ErrorBox message={error} onRetry={reload} />
      </div>
    );
  }
  const { item, related } = data;
  return (
    <article className="container-x max-w-3xl py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">{item.category || item.kind}</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{item.title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        {date(item.publishedAt)}
        {item.institution && (
          <>
            {' · '}
            <Link to={`/institutions/${item.institution.slug}`} className="text-brand-700 underline">
              {item.institution.name}
            </Link>
          </>
        )}
      </p>
      {item.mediaUrl ? (
        <div className="mt-6 aspect-video overflow-hidden rounded-xl bg-slate-200">
          <iframe src={embedUrl(item.mediaUrl)} title={item.title} className="h-full w-full" allowFullScreen />
        </div>
      ) : (
        item.cover && <img src={item.cover} alt="" className="mt-6 aspect-[16/9] w-full rounded-xl object-cover" />
      )}
      {item.excerpt && <p className="mt-6 text-lg text-slate-700">{item.excerpt}</p>}
      <div className="mt-4 space-y-4 whitespace-pre-line leading-relaxed text-slate-800">{item.body}</div>
      {item.tags?.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {item.tags.map((t) => (
            <span key={t} className="chip">
              #{t}
            </span>
          ))}
        </div>
      )}
      {related?.length > 0 && (
        <div className="mt-12 border-t border-slate-200 pt-6">
          <h2 className="mb-3 text-xl font-semibold">Related</h2>
          <ul className="space-y-2">
            {related.map((r) => (
              <li key={r._id}>
                <Link to={`/content/${r.slug}`} className="text-brand-700 hover:underline">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
