import { useState } from 'react';
import { Link } from 'react-router-dom';
import EnquiryModal from '../components/EnquiryModal.jsx';
import PhoneOtp from '../components/PhoneOtp.jsx';
import { useToast } from '../components/Toast.jsx';
import { Empty, ErrorBox, Input, Loading, Modal, Select } from '../components/ui.jsx';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { date, daysLeft } from '../lib/format.js';
import { useApi, useDebounced, useMeta } from '../lib/hooks.js';

function AlertModal({ open, onClose, defaults }) {
  const { user } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: user?.name || '', phone: user?.phone || '', city: defaults.city || '', course: defaults.course || '' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const verified = user?.phoneVerified && user.phone === f.phone;
  return (
    <Modal open={open} onClose={onClose} title="Get spot-admission alerts">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api.post('/spot-alerts', { ...f, code: code || undefined });
            toast('Alert saved – we will notify you when matching seats open');
            onClose();
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        {verified ? <Input label="Mobile" value={f.phone} disabled /> : <PhoneOtp phone={f.phone} onPhone={(v) => setF({ ...f, phone: v })} code={code} onCode={setCode} purpose="spot-alert" />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="City (optional)" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
          <Input label="Course (optional)" value={f.course} onChange={(e) => setF({ ...f, course: e.target.value })} placeholder="e.g. B.E." />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy || (!verified && code.length !== 6)}>
          Notify me
        </button>
      </form>
    </Modal>
  );
}

export default function SpotAdmission() {
  const meta = useMeta();
  const [city, setCity] = useState('');
  const [course, setCourse] = useState('');
  const [closing, setClosing] = useState('');
  const debCourse = useDebounced(course);
  const [before, setBefore] = useState();
  const { data, loading, error, reload } = useApi('/spot-admissions', { params: { city, course: debCourse, before } });
  const [claim, setClaim] = useState(null);
  const [alert, setAlert] = useState(false);

  return (
    <div>
      <section className="bg-gradient-to-r from-accent-500 to-accent-600 text-white">
        <div className="container-x py-10">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest">● Live</span>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Spot admission – vacant seats</h1>
          <p className="mt-2 max-w-2xl text-accent-50">Last-round vacant seats posted directly by institutions. Seats update in real time as they are confirmed.</p>
          <button type="button" className="btn mt-5 bg-white text-accent-600 hover:bg-accent-50" onClick={() => setAlert(true)}>
            🔔 Get alerts for new seats
          </button>
        </div>
      </section>
      <div className="container-x py-8">
        <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-3">
          <Select label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="All cities" options={meta.data?.cities || []} />
          <Input label="Course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. B.E., B.Pharm, Class 11" />
          <Select
            label="Closing within"
            value={closing}
            onChange={(e) => {
              setClosing(e.target.value);
              setBefore(e.target.value ? new Date(Date.now() + Number(e.target.value) * 86400_000).toISOString() : undefined);
            }}
            placeholder="Any time"
            options={[
              { value: '1', label: '24 hours' },
              { value: '3', label: '3 days' },
              { value: '7', label: '7 days' },
            ]}
          />
        </div>
        <ErrorBox message={error} onRetry={reload} />
        {loading && !data ? (
          <Loading />
        ) : data?.items?.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((s) => {
              const left = daysLeft(s.endDate);
              return (
                <article key={s._id} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{s.courseName}</h2>
                      <Link to={`/institutions/${s.institution.slug}`} className="text-sm text-brand-700 hover:underline">
                        {s.institution.name} {s.institution.isVerified && '✔'}
                      </Link>
                      <p className="text-xs text-slate-500">📍 {s.city || s.institution.address?.city}</p>
                    </div>
                    <div className="rounded-lg bg-accent-50 px-3 py-2 text-center">
                      <div className="font-display text-2xl font-bold text-accent-600">{s.vacantSeats}</div>
                      <div className="text-[10px] uppercase text-slate-500">seats</div>
                    </div>
                  </div>
                  <p className={`mt-3 text-sm font-semibold ${left <= 1 ? 'text-red-600' : 'text-slate-700'}`}>
                    ⏳ Closes {date(s.endDate)} · {left <= 1 ? 'last day!' : `${left} days left`}
                  </p>
                  {s.round && <p className="text-xs text-slate-500">{s.round}</p>}
                  {s.documentsRequired?.length > 0 && <p className="mt-2 text-xs text-slate-600">Documents: {s.documentsRequired.join(', ')}</p>}
                  {s.notice && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{s.notice}</p>}
                  <button type="button" className="btn-primary mt-auto w-full pt-2.5" style={{ marginTop: '1rem' }} onClick={() => setClaim(s)}>
                    Claim this seat
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <Empty title="No live spot-admission seats right now" action={<button type="button" className="btn-primary" onClick={() => setAlert(true)}>Get notified</button>}>
            Set an alert and we'll SMS you as soon as matching seats open.
          </Empty>
        )}
      </div>
      {claim && <EnquiryModal inst={{ id: claim.institution._id, name: claim.institution.name }} spot={claim} source="spot-admission" open onClose={() => setClaim(null)} />}
      {alert && <AlertModal open onClose={() => setAlert(false)} defaults={{ city, course }} />}
    </div>
  );
}
