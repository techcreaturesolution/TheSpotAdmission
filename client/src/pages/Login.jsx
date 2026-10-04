import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PhoneOtp from '../components/PhoneOtp.jsx';
import { Input, Tabs } from '../components/ui.jsx';
import { api, errorMessage } from '../lib/api.js';
import { dashboardPath, useAuth } from '../lib/auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [mode, setMode] = useState('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const done = (data) => {
    login(data);
    const next = sp.get('next');
    navigate(next && next.startsWith('/') ? next : dashboardPath(data.user.role), { replace: true });
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = mode === 'password' ? await api.post('/auth/login', { identifier, password }) : await api.post('/auth/otp/login', { phone, code });
      done(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-x flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mb-4 mt-1 text-sm text-slate-600">Log in to track enquiries, applications and your shortlist.</p>
        <Tabs
          tabs={[
            { value: 'password', label: 'Email / password' },
            { value: 'otp', label: 'Mobile OTP' },
          ]}
          value={mode}
          onChange={setMode}
        />
        <form onSubmit={submit} className="space-y-4">
          {mode === 'password' ? (
            <>
              <Input label="Email or mobile" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required />
              <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </>
          ) : (
            <PhoneOtp phone={phone} onPhone={setPhone} code={code} onCode={setCode} purpose="login" />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy || (mode === 'otp' && code.length !== 6)}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          New here?{' '}
          <Link to="/register" className="font-semibold text-brand-700">
            Create a student account
          </Link>{' '}
          ·{' '}
          <Link to="/institution/register" className="font-semibold text-brand-700">
            Register an institution
          </Link>
        </p>
      </div>
    </div>
  );
}
