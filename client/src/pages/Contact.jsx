import { useState } from 'react';
import { useToast } from '../components/Toast.jsx';
import { Input, Select, Textarea } from '../components/ui.jsx';
import { api, errorMessage } from '../lib/api.js';

const EMPTY = { name: '', email: '', phone: '', service: '', subject: '', message: '' };

export default function Contact() {
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="container-x grid gap-10 py-10 lg:grid-cols-2">
      <div>
        <h1 className="text-3xl font-bold">Contact us</h1>
        <p className="mt-2 text-slate-600">Questions about admissions, counselling or listing your institution? We're here to help.</p>
        <div className="mt-6 space-y-3 text-slate-700">
          <p>
            📞 <a href="tel:+918780596840" className="font-semibold">+91 8780596840</a>
          </p>
          <p>
            ✉ <a href="mailto:info@thespotadmission.co.in" className="font-semibold">info@thespotadmission.co.in</a>
          </p>
          <p>
            💬{' '}
            <a href="https://wa.me/918780596840" target="_blank" rel="noreferrer" className="font-semibold text-green-700">
              Chat on WhatsApp
            </a>
          </p>
          <p>🕘 Mon–Sat, 10:00 AM – 7:00 PM</p>
        </div>
      </div>
      <form
        className="card space-y-3 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api.post('/contact', f);
            toast('Thanks! We will get back to you shortly.');
            setF(EMPTY);
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input label="Name" value={f.name} onChange={set('name')} required minLength={2} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Email" type="email" value={f.email} onChange={set('email')} />
          <Input label="Phone" type="tel" value={f.phone} onChange={set('phone')} />
        </div>
        <Select label="Service" value={f.service} onChange={set('service')} placeholder="Select" options={['School admission', 'College admission', 'Career guidance', 'Pre-primary counselling', 'List my institution', 'Other']} />
        <Input label="Subject" value={f.subject} onChange={set('subject')} />
        <Textarea label="Message" value={f.message} onChange={set('message')} required minLength={5} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </div>
  );
}
