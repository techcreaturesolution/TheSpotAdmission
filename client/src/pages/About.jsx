import { Link } from 'react-router-dom';
import { useMeta } from '../lib/hooks.js';

export default function About() {
  const meta = useMeta();
  const s = meta.data?.stats;
  return (
    <div>
      <section className="bg-brand-900 text-white">
        <div className="container-x py-14">
          <h1 className="text-4xl font-bold text-white">About The Spot Admission</h1>
          <p className="mt-3 max-w-2xl text-brand-100">
            We help students and parents find, compare and secure admission at the right school or college — from pre-primary to higher education — with honest guidance and verified information.
          </p>
        </div>
      </section>
      <section className="container-x grid gap-8 py-12 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">Our mission</h2>
          <p className="mt-3 text-slate-700">
            Admissions in India are confusing: scattered information, unclear fees and last-minute vacant seats that never reach students. The Spot Admission brings every school and college onto one
            transparent platform, with OTP-verified enquiries for institutions and expert counselling for families.
          </p>
          <h2 className="mt-8 text-2xl font-bold">What we do</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
            <li>School &amp; college directory with fees, courses, facilities and reviews</li>
            <li>Spot-admission board for last-round vacant seats</li>
            <li>Pre-primary, school, college and career counselling</li>
            <li>Online admission forms and application tracking</li>
            <li>Virtual campus tours, podcasts and admission news</li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-4 self-start">
          {[
            ['Listed institutions', s?.institutions],
            ['Schools & pre-schools', s?.schools],
            ['Enquiries handled', s?.enquiries],
            ['Live spot admissions', s?.liveSpots],
          ].map(([l, v]) => (
            <div key={l} className="card p-6 text-center">
              <div className="font-display text-3xl font-bold text-brand-800">{v ?? '—'}</div>
              <div className="mt-1 text-sm text-slate-500">{l}</div>
            </div>
          ))}
          <Link to="/contact" className="btn-primary col-span-2">
            Talk to a counsellor
          </Link>
        </div>
      </section>
    </div>
  );
}
