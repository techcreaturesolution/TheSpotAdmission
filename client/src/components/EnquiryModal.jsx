import { useState } from 'react';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import PhoneOtp from './PhoneOtp.jsx';
import { useToast } from './Toast.jsx';
import { Checkbox, Input, Modal, Select, Textarea } from './ui.jsx';

export default function EnquiryModal(props) {
  return props.open ? <EnquiryForm {...props} /> : null;
}

function EnquiryForm({ inst, courses = [], open, onClose, source = 'enquiry', spot }) {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(() => ({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '', city: '', course: spot?.courseName || '', message: '', consent: true }));
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');


  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const verified = user?.phoneVerified && user.phone === form.phone.replace(/\D/g, '').slice(-10);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/leads', { ...form, institutionId: inst.id, code: code || undefined, source, spotAdmissionId: spot?._id });
      setDone(data.message);
      toast(data.merged ? 'Enquiry updated' : 'Enquiry sent');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Enquire at ${inst?.name || ''}`}>
      {done ? (
        <div className="text-center">
          <div className="text-5xl" aria-hidden>
            ✅
          </div>
          <p className="mt-3 text-slate-700">{done}</p>
          <button type="button" className="btn-brand mt-5" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Input label="Student / parent name" value={form.name} onChange={set('name')} required minLength={2} autoComplete="name" />
          {verified ? (
            <Input label="Mobile number" value={form.phone} disabled hint="Verified mobile" />
          ) : (
            <PhoneOtp phone={form.phone} onPhone={(v) => setForm((f) => ({ ...f, phone: v }))} code={code} onCode={setCode} purpose="lead" />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Email (optional)" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
            <Input label="Your city" value={form.city} onChange={set('city')} />
          </div>
          {courses.length ? <Select label="Course interested in" value={form.course} onChange={set('course')} placeholder="Select course" options={courses.map((c) => c.name)} /> : <Input label="Course / class interested in" value={form.course} onChange={set('course')} />}
          <Textarea label="Message (optional)" rows={3} value={form.message} onChange={set('message')} />
          <Checkbox label="I agree to share my details with this institution and The Spot Admission to receive a call back." checked={form.consent} onChange={set('consent')} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy || !form.consent || (!verified && code.length !== 6)}>
            {busy ? 'Sending…' : 'Send enquiry'}
          </button>
        </form>
      )}
    </Modal>
  );
}
