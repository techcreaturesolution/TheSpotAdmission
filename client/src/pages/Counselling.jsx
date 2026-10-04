import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../components/Toast.jsx';
import { Input, Select, Textarea } from '../components/ui.jsx';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

export const SERVICES = {
  career: {
    title: 'Career Guidance',
    icon: '🧭',
    text: 'Confused about which stream or career to choose after 10th or 12th? Our counsellors map your interests, aptitude and marks to the right path.',
    fields: [
      ['interests', 'Interests / hobbies'],
      ['strengths', 'Strong subjects'],
      ['goal', 'Career you are considering'],
    ],
  },
  'pre-primary': {
    title: 'Pre-Primary Counselling',
    icon: '🧸',
    text: 'Choosing a playgroup, nursery or KG? We help you shortlist pre-schools by distance, fees, teaching approach and safety.',
    fields: [
      ['childName', "Child's name"],
      ['childAge', "Child's age"],
      ['area', 'Preferred area'],
    ],
  },
  school: {
    title: 'School Admission',
    icon: '🏫',
    text: 'Board-wise school shortlisting (GSEB, CBSE, ICSE, IB) with fees and transport guidance for Class 1–12.',
    fields: [
      ['board', 'Preferred board'],
      ['budget', 'Annual fee budget'],
      ['area', 'Preferred area'],
    ],
  },
  'college-admission': {
    title: 'College Admission Counselling',
    icon: '🎓',
    text: 'ACPC / GUJCET / NEET / JEE choice filling, merit analysis and college selection for engineering, medical, pharmacy, management and more.',
    fields: [
      ['exam', 'Entrance exam & score / rank'],
      ['percentage', '12th percentage'],
      ['preferredCourse', 'Preferred course'],
    ],
  },
  personalized: {
    title: 'Personalized Counselling',
    icon: '🤝',
    text: 'One-to-one session with a senior counsellor for any admission or career question.',
    fields: [['topic', 'What would you like to discuss?']],
  },
  abroad: {
    title: 'Study Abroad',
    icon: '✈️',
    text: 'Country, university, scholarship and visa guidance for UG/PG abroad.',
    fields: [
      ['country', 'Preferred country'],
      ['level', 'UG / PG'],
      ['tests', 'IELTS / TOEFL / GRE scores'],
    ],
  },
};

export function CounsellingForm({ type, onDone }) {
  const { user } = useAuth();
  const toast = useToast();
  const svc = SERVICES[type] || SERVICES.personalized;
  const empty = () => ({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '', studentClass: '', city: '', mode: 'online', preferredDate: '', preferredSlot: '', message: '', details: {} });
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          const details = Object.fromEntries(Object.entries(f.details).filter(([, v]) => v));
          await api.post('/counselling', { ...f, type, details, preferredDate: f.preferredDate || undefined, preferredSlot: f.preferredSlot || undefined });
          toast('Request received! A counsellor will call you shortly.');
          setF(empty());
          onDone?.();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Student / parent name" value={f.name} onChange={set('name')} required minLength={2} />
        <Input label="Mobile" type="tel" inputMode="numeric" value={f.phone} onChange={set('phone')} required />
        <Input label="Email" type="email" value={f.email} onChange={set('email')} />
        <Input label="City" value={f.city} onChange={set('city')} />
        <Input label="Current class / qualification" value={f.studentClass} onChange={set('studentClass')} />
        <Select
          label="Session mode"
          value={f.mode}
          onChange={set('mode')}
          options={[
            { value: 'online', label: 'Online (video)' },
            { value: 'phone', label: 'Phone call' },
            { value: 'in-person', label: 'In-person' },
          ]}
        />
        {svc.fields.map(([k, l]) => (
          <Input key={k} label={l} value={f.details[k] || ''} onChange={(e) => setF({ ...f, details: { ...f.details, [k]: e.target.value } })} />
        ))}
        <Input label="Preferred date" type="date" value={f.preferredDate} min={new Date().toISOString().slice(0, 10)} onChange={set('preferredDate')} />
        <Select label="Preferred time" value={f.preferredSlot} onChange={set('preferredSlot')} placeholder="Any time" options={['10:00 – 12:00', '12:00 – 14:00', '14:00 – 16:00', '16:00 – 18:00', '18:00 – 20:00']} />
      </div>
      <Textarea label="Anything else?" rows={3} value={f.message} onChange={set('message')} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? 'Submitting…' : 'Book counselling'}
      </button>
    </form>
  );
}

export default function Counselling({ preset }) {
  const [sp, setSp] = useSearchParams();
  const urlType = sp.get('type');
  const [type, setType] = useState(preset || (SERVICES[urlType] ? urlType : 'career'));
  const [lastUrlType, setLastUrlType] = useState(urlType);
  if (lastUrlType !== urlType) {
    setLastUrlType(urlType);
    if (SERVICES[urlType]) setType(urlType);
  }
  const svc = SERVICES[type] || SERVICES.career;

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-900 to-brand-700 text-white">
        <div className="container-x py-12">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Counselling &amp; career guidance</h1>
          <p className="mt-2 max-w-2xl text-brand-100">Expert counsellors for every stage — pre-primary, school, college admissions, careers and study abroad.</p>
        </div>
      </section>
      <div className="container-x grid gap-8 py-8 lg:grid-cols-[320px_1fr]">
        <nav className="space-y-2" aria-label="Counselling services">
          {Object.entries(SERVICES).map(([k, s]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setType(k);
                if (!preset) setSp({ type: k }, { replace: true });
              }}
              aria-pressed={k === type}
              className={`card flex w-full items-center gap-3 p-4 text-left transition ${k === type ? 'border-accent-500 ring-2 ring-accent-100' : 'hover:border-brand-200'}`}
            >
              <span className="text-2xl" aria-hidden>
                {s.icon}
              </span>
              <span className="font-semibold">{s.title}</span>
            </button>
          ))}
        </nav>
        <div className="card p-6">
          <h2 className="text-2xl font-bold">
            {svc.icon} {svc.title}
          </h2>
          <p className="mb-6 mt-2 text-slate-600">{svc.text}</p>
          <CounsellingForm key={type} type={type} />
        </div>
      </div>
    </div>
  );
}
