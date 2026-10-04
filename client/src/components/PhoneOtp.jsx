import { useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api.js';
import { Input, Spinner } from './ui.jsx';

// Phone + OTP capture. Calls onCode(code) as the user types the OTP; parent submits it with its own form.
export default function PhoneOtp({ phone, onPhone, code, onCode, purpose = 'lead', disabled }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/otp/send', { phone, purpose });
      setSent(true);
      setDevCode(data.devCode || '');
      setWait(data.resendSeconds || 30);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <Input
          className="flex-1"
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10-digit mobile"
          value={phone}
          onChange={(e) => {
            onPhone(e.target.value);
            setSent(false);
          }}
          required
          disabled={disabled}
        />
        <button type="button" className="btn-outline mb-0" onClick={send} disabled={busy || disabled || wait > 0 || !/^\d{10}$/.test(String(phone).replace(/\D/g, '').slice(-10))}>
          {busy ? <Spinner className="h-4 w-4" /> : wait > 0 ? `Resend ${wait}s` : sent ? 'Resend OTP' : 'Send OTP'}
        </button>
      </div>
      {sent && (
        <Input label="Enter 6-digit OTP" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => onCode(e.target.value.replace(/\D/g, ''))} hint={devCode ? `Dev mode (no SMS provider configured): your OTP is ${devCode}` : 'OTP sent by SMS'} required />
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
