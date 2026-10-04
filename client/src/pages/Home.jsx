import { useState } from 'react';
import { Link } from 'react-router-dom';
import EnquiryModal from '../components/EnquiryModal.jsx';
import InstitutionCard from '../components/InstitutionCard.jsx';
import SearchBox from '../components/SearchBox.jsx';
import { Loading, SectionTitle, Stars } from '../components/ui.jsx';
import { daysLeft } from '../lib/format.js';
import { useApi, useMeta } from '../lib/hooks.js';
import { useI18n } from '../lib/i18n.jsx';

const ICONS = { baby: '🧸', school: '🏫', wrench: '🔧', cpu: '💻', 'book-open': '📚', stethoscope: '🩺', pill: '💊', 'heart-pulse': '❤️', briefcase: '💼', scale: '⚖️', laptop: '🖥️', 'graduation-cap': '🎓' };

const SERVICES = [
  { type: 'pre-primary', title: 'Pre-Primary Counselling', text: 'Choose the right pre-school & Nursery/KG for your child.', icon: '🧸' },
  { type: 'school', title: 'School Admission', text: 'Board, fees & distance-wise school shortlisting, from Class 1 to 12.', icon: '🏫' },
  { type: 'college-admission', title: 'College Admission Counselling', text: 'ACPC/GUJCET/NEET choice filling and college selection.', icon: '🎓' },
  { type: 'career', title: 'Career Guidance', text: 'Aptitude-based stream and career planning after 10th & 12th.', icon: '🧭' },
  { type: 'personalized', title: 'Personalized Counselling', text: 'One-to-one sessions with an expert counsellor.', icon: '🤝' },
  { type: 'abroad', title: 'Study Abroad', text: 'Country, university and visa guidance.', icon: '✈️' },
];

export default function Home() {
  const { t } = useI18n();
  const meta = useMeta();
  const featured = useApi('/institutions/featured');
  const spots = useApi('/spot-admissions');
  const testimonials = useApi('/testimonials');
  const news = useApi('/content', { params: { kind: 'news', limit: 3 } });
  const articles = useApi('/content', { params: { kind: 'article', limit: 3 } });
  const [enquire, setEnquire] = useState(null);
  const stats = meta.data?.stats;
  const posts = [...(news.data?.items || []), ...(articles.data?.items || [])].slice(0, 3);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" aria-hidden />
        <div className="container-x relative py-16 sm:py-24">
          <p className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest">Schools &amp; Colleges · Counselling &amp; Admission</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">{t('heroTitle')}</h1>
          <p className="mt-4 max-w-2xl text-lg text-brand-100">{t('heroSub')}</p>
          <SearchBox big className="mt-8 max-w-2xl" />
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {['Engineering', 'CBSE School', 'MBA', 'Pharmacy', 'Nursery'].map((s) => (
              <Link key={s} to={`/institutions?q=${encodeURIComponent(s.replace(' School', ''))}`} className="rounded-full bg-white/10 px-3 py-1 hover:bg-white/20">
                {s}
              </Link>
            ))}
          </div>
          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              ['Listed institutions', stats?.institutions],
              ['Schools & pre-schools', stats?.schools],
              ['Live spot admissions', stats?.liveSpots],
              ['Enquiries handled', stats?.enquiries],
            ].map(([l, v]) => (
              <div key={l}>
                <dt className="text-xs uppercase tracking-wide text-brand-200">{l}</dt>
                <dd className="font-display text-3xl font-bold">{v ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="container-x py-12">
        <SectionTitle eyebrow="Browse" title="Explore by category" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(meta.data?.categories || []).map((c) => (
            <Link key={c.slug} to={`/institutions?category=${encodeURIComponent(c.name)}`} className="card flex flex-col items-center gap-2 p-4 text-center transition hover:-translate-y-0.5 hover:border-brand-200">
              <span className="text-3xl" aria-hidden>
                {ICONS[c.meta?.icon] || '🎓'}
              </span>
              <span className="text-sm font-semibold">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {spots.data?.items?.length > 0 && (
        <section className="bg-accent-50 py-12">
          <div className="container-x">
            <SectionTitle
              eyebrow="Live now"
              title="Spot admission – seats open"
              sub="Last-minute vacant seats verified with institutions. Act fast — seats close on the deadline."
              action={
                <Link to="/spot-admission" className="btn-primary">
                  View all seats
                </Link>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {spots.data.items.slice(0, 6).map((s) => (
                <Link key={s._id} to="/spot-admission" className="card flex items-center justify-between gap-3 p-4 hover:border-accent-500">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{s.courseName}</div>
                    <div className="truncate text-sm text-slate-500">
                      {s.institution.name} · {s.city || s.institution.address?.city}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-bold text-accent-600">{s.vacantSeats}</div>
                    <div className="text-xs text-slate-500">{daysLeft(s.endDate)}d left</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container-x py-12">
        <SectionTitle
          eyebrow="Top picks"
          title="Featured schools & colleges"
          action={
            <Link to="/institutions" className="btn-outline">
              View all
            </Link>
          }
        />
        {featured.loading ? (
          <Loading />
        ) : featured.data?.items?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.data.items.map((i) => (
              <InstitutionCard key={i.id} inst={i} onEnquire={setEnquire} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500">Institutions will appear here once they are approved.</p>
        )}
      </section>

      <section className="bg-white py-12">
        <div className="container-x">
          <SectionTitle eyebrow="Our services" title="Counselling & admission support" sub="From pre-primary to higher education — expert guidance at every step." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <Link key={s.type} to={`/counselling?type=${s.type}`} className="card flex gap-4 p-5 transition hover:border-brand-200 hover:shadow-lg">
                <span className="text-3xl" aria-hidden>
                  {s.icon}
                </span>
                <span>
                  <span className="block font-semibold text-slate-900">{s.title}</span>
                  <span className="mt-1 block text-sm text-slate-600">{s.text}</span>
                  <span className="mt-2 inline-block text-sm font-semibold text-accent-600">Book a session →</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x grid gap-6 py-12 lg:grid-cols-3">
        {[
          ['🔎', 'Search & compare', 'Filter by city, course, fees, board and facilities. Compare up to 4 side by side.'],
          ['📲', 'Verified enquiries', 'Your mobile is OTP-verified so institutions call back genuine students only.'],
          ['📝', 'Apply & track', 'Apply online and track application status from your dashboard.'],
        ].map(([i, h, p]) => (
          <div key={h} className="card p-6">
            <div className="text-3xl" aria-hidden>
              {i}
            </div>
            <h3 className="mt-3 text-lg font-semibold">{h}</h3>
            <p className="mt-1 text-sm text-slate-600">{p}</p>
          </div>
        ))}
      </section>

      {testimonials.data?.items?.length > 0 && (
        <section className="bg-brand-50 py-12">
          <div className="container-x">
            <SectionTitle
              eyebrow="Success stories"
              title="What students & parents say"
              action={
                <Link to="/testimonials" className="btn-outline">
                  All testimonials
                </Link>
              }
            />
            <div className="grid gap-4 md:grid-cols-3">
              {testimonials.data.items.slice(0, 3).map((x) => (
                <figure key={x._id} className="card p-5">
                  <Stars value={x.rating || 5} />
                  <blockquote className="mt-2 text-slate-700">“{x.quote}”</blockquote>
                  <figcaption className="mt-3 text-sm font-semibold">
                    {x.name} <span className="font-normal text-slate-500">· {x.role}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section className="container-x py-12">
          <SectionTitle
            eyebrow="Stay updated"
            title="Admission news & guides"
            action={
              <Link to="/news" className="btn-outline">
                All articles
              </Link>
            }
          />
          <div className="grid gap-5 md:grid-cols-3">
            {posts.map((p) => (
              <Link key={p._id} to={`/content/${p.slug}`} className="card overflow-hidden hover:shadow-lg">
                {p.cover && <img src={p.cover} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />}
                <div className="p-4">
                  <span className="chip">{p.category || p.kind}</span>
                  <h3 className="mt-2 line-clamp-2 font-semibold">{p.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-x pb-4">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 p-8 text-white sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Are you a school or college?</h2>
            <p className="mt-1 text-accent-50">List your institution for free, receive verified student enquiries and publish spot-admission seats.</p>
          </div>
          <Link to="/institution/register" className="btn bg-white text-accent-600 hover:bg-accent-50">
            List your institution
          </Link>
        </div>
      </section>

      {enquire && <EnquiryModal inst={enquire} open onClose={() => setEnquire(null)} />}
    </>
  );
}
