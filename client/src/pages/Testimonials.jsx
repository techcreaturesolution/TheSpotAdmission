import { Empty, Loading, Stars } from '../components/ui.jsx';
import { embedUrl } from '../lib/format.js';
import { useApi } from '../lib/hooks.js';

export default function Testimonials() {
  const { data, loading } = useApi('/testimonials');
  return (
    <div className="container-x py-8">
      <h1 className="text-3xl font-bold">Success stories &amp; testimonials</h1>
      <p className="mt-1 text-slate-600">Students and parents we've helped through counselling and admissions.</p>
      {loading ? (
        <Loading />
      ) : data?.items?.length ? (
        <div className="mt-6 columns-1 gap-5 sm:columns-2 lg:columns-3">
          {data.items.map((t) => (
            <figure key={t._id} className="card mb-5 break-inside-avoid p-5">
              {t.videoUrl && (
                <div className="mb-3 aspect-video overflow-hidden rounded-lg">
                  <iframe src={embedUrl(t.videoUrl)} title={t.name} className="h-full w-full" loading="lazy" allowFullScreen />
                </div>
              )}
              <Stars value={t.rating || 5} />
              <blockquote className="mt-2 text-slate-700">“{t.quote}”</blockquote>
              <figcaption className="mt-3 flex items-center gap-3">
                {t.photo && <img src={t.photo} alt="" className="h-10 w-10 rounded-full object-cover" />}
                <span className="text-sm font-semibold">
                  {t.name}
                  <span className="block font-normal text-slate-500">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <Empty title="No testimonials yet" />
        </div>
      )}
    </div>
  );
}
