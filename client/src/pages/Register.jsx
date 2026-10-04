import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui.jsx';
import { api, errorMessage } from '../lib/api.js';
import { dashboardPath, useAuth } from '../lib/auth.jsx';

export default function Register({ institution = false }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (user && institution && user.role === 'institution') return <Navigate to="/institution/new" replace />;

  return (
    <div className="container-x grid items-start gap-10 py-12 lg:grid-cols-2">
      <div className="hidden lg:block">
        <h1 className="text-3xl font-bold">{institution ? 'List your institution for free' : 'Create your free account'}</h1>
        <ul className="mt-6 space-y-3 text-slate-700">
          {(institution
            ? ['Get OTP-verified student enquiries', 'Manage courses, fees and seats', 'Publish spot-admission vacant seats', 'Receive online applications', 'Track views, leads and conversions']
            : ['Save and compare institutions', 'Enquire with one verified mobile', 'Apply online and track status', 'Get spot-admission alerts', 'Book counselling sessions']
          ).map((x) => (
            <li key={x}>✔ {x}</li>
          ))}
        </ul>
      </div>
      <div className="card w-full max-w-md justify-self-center p-6 sm:p-8">
        <h2 className="text-2xl font-bold">{institution ? 'Institution sign up' : 'Student / parent sign up'}</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              const { data } = await api.post('/auth/register', { ...f, phone: f.phone || undefined, role: institution ? 'institution' : 'student' });
              login(data);
              navigate(institution ? '/institution/profile' : dashboardPath(data.user.role), { replace: true });
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input label={institution ? 'Contact person name' : 'Full name'} value={f.name} onChange={set('name')} required minLength={2} autoComplete="name" />
          <Input label="Email" type="email" value={f.email} onChange={set('email')} required autoComplete="email" />
          <Input label="Mobile (optional)" type="tel" inputMode="numeric" value={f.phone} onChange={set('phone')} autoComplete="tel" />
          <Input label="Password" type="password" value={f.password} onChange={set('password')} required minLength={8} autoComplete="new-password" hint="At least 8 characters" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
          <p className="text-xs text-slate-500">
            By signing up you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-700">
            Log in
          </Link>
          {!institution && (
            <>
              {' · '}
              <Link to="/institution/register" className="font-semibold text-brand-700">
                I'm an institution
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
