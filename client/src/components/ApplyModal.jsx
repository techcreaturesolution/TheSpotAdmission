import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import ImageUpload from './ImageUpload.jsx';
import { useToast } from './Toast.jsx';
import { Checkbox, Input, Modal, Select } from './ui.jsx';

const DOCS = ['Last marksheet', 'Leaving certificate', 'Aadhaar card', 'Photo'];

export default function ApplyModal(props) {
  return props.open ? <ApplyForm {...props} /> : null;
}

function ApplyForm({ inst, open, onClose, initialCourse = '' }) {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(() => ({
      courseName: initialCourse || inst.courses?.[0]?.name || '',
      personal: { name: user?.name || '', phone: user?.phone || '', email: user?.email || '', dob: '', gender: '', address: '', category: '' },
      academic: { lastExam: user?.profile?.currentClass || '', board: '', percentage: '', entranceExam: '', entranceScore: '' },
      parent: { fatherName: '', motherName: '', guardianPhone: '' },
      declaration: false,
    }));
  const [docs, setDocs] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);


  if (!open || !form) return null;
  const set = (group, k) => (e) => setForm((f) => ({ ...f, [group]: { ...f[group], [k]: e.target.value } }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const academic = { ...form.academic, percentage: form.academic.percentage === '' ? undefined : Number(form.academic.percentage) };
      const documents = Object.entries(docs)
        .filter(([, url]) => url)
        .map(([label, url]) => ({ label, url }));
      await api.post('/me/applications', { ...form, academic, documents, institutionId: inst.id });
      setDone(true);
      toast('Application submitted');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'student') {
    return (
      <Modal open onClose={onClose} title="Apply online">
        <p className="text-slate-700">Please log in with a student account to apply online and track your application.</p>
        <div className="mt-4 flex gap-2">
          <Link className="btn-primary" to={`/login?next=${encodeURIComponent(`/institutions/${inst.slug}?apply=1`)}`}>
            Log in
          </Link>
          <Link className="btn-outline" to="/register">
            Create account
          </Link>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title={`Apply to ${inst.name}`} wide>
      {done ? (
        <div className="text-center">
          <div className="text-5xl">📨</div>
          <p className="mt-3">Your application has been submitted. Track its status in your dashboard.</p>
          <Link to="/student/applications" className="btn-brand mt-4">
            Go to my applications
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {inst.courses?.length ? (
            <Select label="Course" value={form.courseName} onChange={(e) => setForm((f) => ({ ...f, courseName: e.target.value }))} options={inst.courses.map((c) => c.name)} required />
          ) : (
            <Input label="Course / class" value={form.courseName} onChange={(e) => setForm((f) => ({ ...f, courseName: e.target.value }))} required />
          )}
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">Student details</legend>
            <Input label="Full name" value={form.personal.name} onChange={set('personal', 'name')} required />
            <Input label="Mobile" value={form.personal.phone} onChange={set('personal', 'phone')} required inputMode="numeric" />
            <Input label="Email" type="email" value={form.personal.email} onChange={set('personal', 'email')} />
            <Input label="Date of birth" type="date" value={form.personal.dob} onChange={set('personal', 'dob')} />
            <Select label="Gender" value={form.personal.gender} onChange={set('personal', 'gender')} placeholder="Select" options={['Female', 'Male', 'Other']} />
            <Select label="Category" value={form.personal.category} onChange={set('personal', 'category')} placeholder="Select" options={['General', 'OBC / SEBC', 'SC', 'ST', 'EWS']} />
            <Input className="sm:col-span-2" label="Address" value={form.personal.address} onChange={set('personal', 'address')} />
          </fieldset>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">Academic details</legend>
            <Input label="Last exam passed" value={form.academic.lastExam} onChange={set('academic', 'lastExam')} placeholder="e.g. 12th Science" />
            <Input label="Board / university" value={form.academic.board} onChange={set('academic', 'board')} />
            <Input label="Percentage" type="number" min="0" max="100" step="0.01" value={form.academic.percentage} onChange={set('academic', 'percentage')} />
            <Input label="Entrance exam (if any)" value={form.academic.entranceExam} onChange={set('academic', 'entranceExam')} placeholder="GUJCET / JEE / NEET" />
            <Input label="Entrance score / rank" value={form.academic.entranceScore} onChange={set('academic', 'entranceScore')} />
          </fieldset>
          <fieldset className="grid gap-3 sm:grid-cols-3">
            <legend className="mb-2 font-semibold">Parent / guardian</legend>
            <Input label="Father's name" value={form.parent.fatherName} onChange={set('parent', 'fatherName')} />
            <Input label="Mother's name" value={form.parent.motherName} onChange={set('parent', 'motherName')} />
            <Input label="Guardian mobile" value={form.parent.guardianPhone} onChange={set('parent', 'guardianPhone')} />
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-semibold">Documents (optional, JPG/PNG/PDF)</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {DOCS.map((d) => (
                <ImageUpload key={d} label={d} accept="image/*,application/pdf" value={docs[d] || ''} onChange={(url) => setDocs((x) => ({ ...x, [d]: url }))} />
              ))}
            </div>
          </fieldset>
          <Checkbox label="I declare that the information given above is true and correct to the best of my knowledge." checked={form.declaration} onChange={(e) => setForm((f) => ({ ...f, declaration: e.target.checked }))} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy || !form.declaration}>
            {busy ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      )}
    </Modal>
  );
}
