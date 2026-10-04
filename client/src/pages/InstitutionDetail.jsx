import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ApplyModal from '../components/ApplyModal.jsx';
import EnquiryModal from '../components/EnquiryModal.jsx';
import InstitutionCard, { CoverImage } from '../components/InstitutionCard.jsx';
import { useToast } from '../components/Toast.jsx';
import { Empty, ErrorBox, Loading, Select, Stars, Textarea, Input } from '../components/ui.jsx';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useCompare } from '../lib/compare.jsx';
import { date, daysLeft, embedUrl, feeRange, inr, TYPE_LABEL, titleCase } from '../lib/format.js';
import { useApi } from '../lib/hooks.js';
import { useShortlist } from '../lib/shortlist.js';

const SECTIONS = ['overview', 'courses', 'admission', 'facilities', 'placements', 'gallery', 'reviews', 'faqs'];

function ReviewForm({ inst, onDone }) {
  const { user } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ rating: 5, title: '', body: '', relation: 'student' });
  const [busy, setBusy] = useState(false);
  if (!user) {
    return (
      <p className="text-sm text-slate-600">
        <Link to={`/login?next=/institutions/${inst.slug}`} className="font-semibold text-brand-700 underline">
          Log in
        </Link>{' '}
        to write a review.
      </p>
    );
  }
  if (user.role !== 'student') return null;
  return (
    <form
      className="card space-y-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const { data } = await api.post('/reviews', { ...f, rating: Number(f.rating), institutionId: inst.id });
          toast(data.message);
          onDone();
        } catch (err) {
          toast(errorMessage(err), 'error');
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-semibold">Write a review</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Rating" value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })} options={[5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} ★` }))} />
        <Select label="I am a" value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })} options={['student', 'alumni', 'parent'].map((v) => ({ value: v, label: titleCase(v) }))} />
        <Input label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </div>
      <Textarea label="Your experience" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} minLength={20} required hint="At least 20 characters. Reviews are moderated before publishing." />
      <button type="submit" className="btn-brand" disabled={busy}>
        Submit review
      </button>
    </form>
  );
}

export default function InstitutionDetail() {
  const { slug } = useParams();
  const [sp, setSp] = useSearchParams();
  const { data, loading, error, reload } = useApi(`/institutions/${slug}`);
  const [enquire, setEnquire] = useState(null);
  const [apply, setApply] = useState(sp.get('apply') === '1');
  const [applyCourse, setApplyCourse] = useState('');
  const [writeReview, setWriteReview] = useState(false);
  const [lightbox, setLightbox] = useState('');
  const compare = useCompare();
  const shortlist = useShortlist();
  const toast = useToast();

  useEffect(() => {
    if (data?.institution) document.title = `${data.institution.name} – Admission, Fees, Courses | The Spot Admission`;
  }, [data]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="container-x py-12">
        <ErrorBox message={error} onRetry={reload} />
        <Link to="/institutions" className="btn-outline mt-4">
          Back to search
        </Link>
      </div>
    );
  }
  const inst = data.institution;
  const card = { id: inst.id, name: inst.name, slug: inst.slug };
  const tour = embedUrl(inst.virtualTourUrl);
  const vacant = (inst.courses || []).reduce((s, c) => s + (c.seatsVacant || 0), 0);

  return (
    <div>
      <section className="relative">
        <CoverImage src={inst.cover} name={inst.name} className="h-56 w-full sm:h-72" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20" />
        <div className="container-x absolute inset-x-0 bottom-0 pb-6 text-white">
          <nav className="mb-2 text-xs text-slate-200" aria-label="Breadcrumb">
            <Link to="/">Home</Link> › <Link to={`/institutions?type=${inst.type}`}>{TYPE_LABEL[inst.type]}s</Link> › <Link to={`/institutions?city=${inst.address?.city || ''}`}>{inst.address?.city}</Link>
          </nav>
          <div className="flex items-end gap-4">
            {inst.logo && <img src={inst.logo} alt="" className="h-16 w-16 rounded-xl bg-white object-cover ring-4 ring-white sm:h-20 sm:w-20" />}
            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                {inst.name} {inst.isVerified && <span className="ml-1 rounded-full bg-brand-600 px-2 py-0.5 align-middle text-xs">✔ Verified</span>}
              </h1>
              <p className="mt-1 text-sm text-slate-200">
                📍 {[inst.address?.city, inst.address?.state].filter(Boolean).join(', ')} · {TYPE_LABEL[inst.type]} · {titleCase(inst.ownership)}
                {inst.establishedYear ? ` · Est. ${inst.establishedYear}` : ''}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                {inst.rating?.count ? (
                  <>
                    <Stars value={inst.rating.avg} /> {inst.rating.avg} ({inst.rating.count} reviews)
                  </>
                ) : (
                  'No reviews yet'
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-30 border-b border-slate-200 bg-white">
        <div className="container-x flex gap-1 overflow-x-auto py-2">
          {SECTIONS.map((s) => (
            <a key={s} href={`#${s}`} className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
              {titleCase(s)}
            </a>
          ))}
        </div>
      </div>

      <div className="container-x grid gap-8 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {data.spotAdmissions?.length > 0 && (
            <div className="rounded-xl border border-accent-500 bg-accent-50 p-4">
              <h2 className="text-lg font-semibold text-accent-600">🔥 Spot admission open</h2>
              {data.spotAdmissions.map((s) => (
                <div key={s._id} className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <b>{s.courseName}</b> – {s.vacantSeats} seats · closes {date(s.endDate)} ({daysLeft(s.endDate)} days)
                  </span>
                  <button type="button" className="btn-primary btn-sm" onClick={() => setEnquire({ spot: s })}>
                    Claim seat
                  </button>
                </div>
              ))}
            </div>
          )}

          <section id="overview" className="scroll-mt-32">
            <h2 className="mb-3 text-xl font-semibold">Overview</h2>
            <p className="whitespace-pre-line text-slate-700">{inst.about || 'The institution has not added a description yet.'}</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['Board / University', inst.board || inst.university],
                ['Category', inst.category],
                ['Fees', feeRange(inst.fees)],
                ['Accreditation', (inst.accreditation || []).join(', ')],
                ['Hostel', inst.hostel ? 'Available' : inst.hostel === false ? 'Not available' : null],
                ['Transport', inst.transport ? 'Available' : inst.transport === false ? 'Not available' : null],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-slate-100 p-3">
                    <dt className="text-xs text-slate-500">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>

          <section id="courses" className="scroll-mt-32">
            <h2 className="mb-3 text-xl font-semibold">Courses &amp; fees</h2>
            {inst.courses?.length ? (
              <div className="card overflow-x-auto">
                <table className="table-x">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Duration</th>
                      <th>Fees / year</th>
                      <th>Seats</th>
                      <th>Eligibility</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {inst.courses.map((c) => (
                      <tr key={c._id}>
                        <td className="font-medium">
                          {c.name}
                          <div className="text-xs text-slate-500">{[c.level, c.stream, c.mode].filter(Boolean).join(' · ')}</div>
                        </td>
                        <td>{c.duration || '—'}</td>
                        <td>{inr(c.feesPerYear)}</td>
                        <td>
                          {c.seatsTotal || '—'}
                          {c.seatsVacant > 0 && <div className="text-xs font-semibold text-green-700">{c.seatsVacant} vacant</div>}
                        </td>
                        <td className="max-w-xs text-xs text-slate-600">{c.eligibility || '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-outline btn-sm"
                            onClick={() => {
                              setApplyCourse(c.name);
                              setApply(true);
                            }}
                          >
                            Apply
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500">Course details not added yet. Send an enquiry to know more.</p>
            )}
          </section>

          <section id="admission" className="scroll-mt-32">
            <h2 className="mb-3 text-xl font-semibold">Admission process</h2>
            {inst.courses?.some((c) => c.admissionProcess) ? (
              inst.courses
                .filter((c) => c.admissionProcess)
                .map((c) => (
                  <div key={c._id} className="mb-3">
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="whitespace-pre-line text-sm text-slate-700">{c.admissionProcess}</p>
                  </div>
                ))
            ) : (
              <ol className="list-decimal space-y-1 pl-5 text-slate-700">
                <li>Send an enquiry or apply online on The Spot Admission.</li>
                <li>The admission office contacts you to confirm eligibility and documents.</li>
                <li>Visit campus / complete merit or entrance process.</li>
                <li>Pay fees and confirm your seat.</li>
              </ol>
            )}
            {inst.scholarships && (
              <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-900">
                <b>Scholarships:</b> {inst.scholarships}
              </div>
            )}
          </section>

          <section id="facilities" className="scroll-mt-32">
            <h2 className="mb-3 text-xl font-semibold">Facilities</h2>
            {inst.facilities?.length ? (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {inst.facilities.map((f) => (
                  <li key={f} className="flex items-center gap-2 rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
                    ✔ {f}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">Not listed.</p>
            )}
          </section>

          {(inst.placements?.highestLpa || inst.placements?.averageLpa || inst.placements?.recruiters?.length) && (
            <section id="placements" className="scroll-mt-32">
              <h2 className="mb-3 text-xl font-semibold">Placements</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {inst.placements.highestLpa && (
                  <div className="card p-4">
                    <div className="text-xs text-slate-500">Highest package</div>
                    <div className="font-display text-2xl font-bold">{inst.placements.highestLpa} LPA</div>
                  </div>
                )}
                {inst.placements.averageLpa && (
                  <div className="card p-4">
                    <div className="text-xs text-slate-500">Average package</div>
                    <div className="font-display text-2xl font-bold">{inst.placements.averageLpa} LPA</div>
                  </div>
                )}
                {inst.placements.recruiters?.length > 0 && (
                  <div className="card p-4">
                    <div className="text-xs text-slate-500">Top recruiters</div>
                    <div className="text-sm font-semibold">{inst.placements.recruiters.join(', ')}</div>
                  </div>
                )}
              </div>
            </section>
          )}

          <section id="gallery" className="scroll-mt-32">
            <h2 className="mb-3 text-xl font-semibold">Gallery &amp; virtual tour</h2>
            {tour && (
              <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-slate-200">
                <iframe src={tour} title={`${inst.name} virtual tour`} className="h-full w-full" allowFullScreen loading="lazy" />
              </div>
            )}
            {inst.gallery?.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {inst.gallery.map((g) => (
                  <button key={g} type="button" onClick={() => setLightbox(g)} className="overflow-hidden rounded-lg">
                    <img src={g} alt={`${inst.name} campus`} loading="lazy" className="aspect-[4/3] w-full object-cover transition hover:scale-105" />
                  </button>
                ))}
              </div>
            ) : (
              !tour && <p className="text-slate-500">No photos yet.</p>
            )}
          </section>

          <section id="reviews" className="scroll-mt-32">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Reviews</h2>
              <button type="button" className="btn-outline btn-sm" onClick={() => setWriteReview((w) => !w)}>
                Write a review
              </button>
            </div>
            {writeReview && (
              <div className="mb-4">
                <ReviewForm inst={inst} onDone={() => setWriteReview(false)} />
              </div>
            )}
            {data.reviews.length ? (
              <div className="space-y-3">
                {data.reviews.map((r) => (
                  <article key={r.id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <Stars value={r.rating} />
                      <span className="text-xs text-slate-500">{date(r.createdAt)}</span>
                    </div>
                    {r.title && <h3 className="mt-1 font-semibold">{r.title}</h3>}
                    <p className="mt-1 text-sm text-slate-700">{r.body}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      — {r.user}, {r.relation}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="No reviews yet">Be the first to share your experience.</Empty>
            )}
          </section>

          {inst.faqs?.length > 0 && (
            <section id="faqs" className="scroll-mt-32">
              <h2 className="mb-3 text-xl font-semibold">FAQs</h2>
              <div className="space-y-2">
                {inst.faqs.map((f) => (
                  <details key={f._id || f.q} className="card p-4">
                    <summary className="cursor-pointer font-semibold">{f.q}</summary>
                    <p className="mt-2 text-sm text-slate-700">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card sticky top-32 space-y-3 p-5">
            <div className="text-sm text-slate-500">Fees</div>
            <div className="font-display text-xl font-bold">{feeRange(inst.fees)}</div>
            {vacant > 0 && <div className="text-sm font-semibold text-green-700">{vacant} seats currently vacant</div>}
            <button type="button" className="btn-primary w-full" onClick={() => setEnquire({})}>
              Enquire now
            </button>
            <button type="button" className="btn-brand w-full" onClick={() => setApply(true)}>
              Apply online
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-outline btn-sm" onClick={() => shortlist.toggle(card)}>
                {shortlist.ids.has(inst.id) ? '♥ Saved' : '♡ Save'}
              </button>
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => {
                  if (!compare.has(inst.id) && compare.full) return toast('You can compare up to 4', 'error');
                  compare.toggle(card);
                }}
              >
                {compare.has(inst.id) ? '✓ Comparing' : '+ Compare'}
              </button>
            </div>
            {inst.brochure && (
              <a href={inst.brochure} target="_blank" rel="noreferrer" className="btn-outline btn-sm w-full">
                ⬇ Download brochure
              </a>
            )}
            <button
              type="button"
              className="btn-ghost btn-sm w-full"
              onClick={async () => {
                const url = window.location.href;
                if (navigator.share) navigator.share({ title: inst.name, url }).catch(() => {});
                else {
                  await navigator.clipboard?.writeText(url);
                  toast('Link copied');
                }
              }}
            >
              ↗ Share
            </button>
            <hr />
            <div className="space-y-1 text-sm text-slate-700">
              {inst.address?.line && <p>📍 {[inst.address.line, inst.address.city, inst.address.pincode].filter(Boolean).join(', ')}</p>}
              {inst.contact?.website && (
                <p>
                  🌐{' '}
                  <a href={inst.contact.website} target="_blank" rel="noreferrer" className="text-brand-700 underline">
                    Website
                  </a>
                </p>
              )}
              <p className="text-xs text-slate-500">Phone numbers are shared after you enquire, to protect institutions from spam.</p>
            </div>
            {inst.address?.city && (
              <iframe
                title="Map"
                className="h-40 w-full rounded-lg"
                loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(inst.address.lat && inst.address.lng ? `${inst.address.lat},${inst.address.lng}` : [inst.name, inst.address.line, inst.address.city].filter(Boolean).join(', '))}&output=embed`}
              />
            )}
            {!inst.claimed && (
              <p className="text-xs text-slate-500">
                Own this institution?{' '}
                <Link to="/institution/register" className="font-semibold text-brand-700 underline">
                  Claim this listing
                </Link>
              </p>
            )}
          </div>
        </aside>
      </div>

      {data.similar?.length > 0 && (
        <section className="container-x pb-8">
          <h2 className="mb-4 text-xl font-semibold">Similar institutions nearby</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.similar.map((i) => (
              <InstitutionCard key={i.id} inst={i} />
            ))}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-slate-200 bg-white p-3 lg:hidden">
        <button type="button" className="btn-primary flex-1" onClick={() => setEnquire({})}>
          Enquire
        </button>
        <button type="button" className="btn-brand flex-1" onClick={() => setApply(true)}>
          Apply
        </button>
      </div>

      {enquire && <EnquiryModal inst={inst} courses={inst.courses} open onClose={() => setEnquire(null)} spot={enquire.spot} source={enquire.spot ? 'spot-admission' : 'enquiry'} />}
      {apply && (
        <ApplyModal
          inst={inst}
          open
          initialCourse={applyCourse}
          onClose={() => {
            setApply(false);
            setApplyCourse('');
            if (sp.get('apply')) setSp({}, { replace: true });
          }}
        />
      )}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox('')} role="dialog" aria-label="Photo">
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
