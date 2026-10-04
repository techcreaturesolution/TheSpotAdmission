import { useState } from 'react';
import { useToast } from '../components/Toast.jsx';
import { Input, Select, Tabs, Textarea } from '../components/ui.jsx';
import { api, errorMessage } from '../lib/api.js';

// General admission-assistance forms carried over from the original site (pre-primary, school & college admission tables).
const FORMS = {
  'pre-primary': { label: 'Pre-Primary (Nursery–KG)', fields: [['childName', "Child's name", true], ['dob', 'Date of birth', false, 'date'], ['parentName', 'Parent name', true], ['grade', 'Admission for', false, 'select', ['Playgroup', 'Nursery', 'Jr. KG', 'Sr. KG']], ['area', 'Preferred area']] },
  school: { label: 'School (Class 1–12)', fields: [['studentName', 'Student name', true], ['parentName', 'Parent name', true], ['grade', 'Admission for class', false, 'select', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11 Science', '11 Commerce', '11 Arts', '12']], ['board', 'Preferred board', false, 'select', ['GSEB', 'CBSE', 'ICSE', 'IB', 'Any']], ['currentSchool', 'Current school']] },
  'college-admission': { label: 'College / University', fields: [['studentName', 'Student name', true], ['course', 'Course interested in', true], ['percentage', '12th / graduation %'], ['exam', 'Entrance exam & score'], ['category', 'Category', false, 'select', ['General', 'OBC / SEBC', 'SC', 'ST', 'EWS']]] },
};

export default function AdmissionForm() {
  const toast = useToast();
  const [type, setType] = useState('school');
  const [f, setF] = useState({});
  const [base, setBase] = useState({ phone: '', email: '', city: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const form = FORMS[type];

  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Admission form</h1>
      <p className="mt-2 text-slate-600">Tell us what you're looking for — our admission team will shortlist suitable institutions and help you complete the admission.</p>
      <div className="card mt-6 p-6">
        <Tabs tabs={Object.entries(FORMS).map(([value, x]) => ({ value, label: x.label }))} value={type} onChange={(v) => { setType(v); setF({}); }} />
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              const name = f.studentName || f.childName || f.parentName;
              await api.post('/counselling', { type, name, phone: base.phone, email: base.email, city: base.city, studentClass: f.grade || f.course, message: base.message, details: f });
              toast('Admission request submitted. Our team will call you.');
              setF({});
              setBase({ phone: '', email: '', city: '', message: '' });
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {form.fields.map(([k, l, req, kind, opts]) =>
              kind === 'select' ? (
                <Select key={k} label={l} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder="Select" options={opts} required={req} />
              ) : (
                <Input key={k} label={l} type={kind || 'text'} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} required={req} />
              ),
            )}
            <Input label="Mobile" type="tel" inputMode="numeric" value={base.phone} onChange={(e) => setBase({ ...base, phone: e.target.value })} required />
            <Input label="Email" type="email" value={base.email} onChange={(e) => setBase({ ...base, email: e.target.value })} />
            <Input label="City" value={base.city} onChange={(e) => setBase({ ...base, city: e.target.value })} />
          </div>
          <Textarea label="Additional requirements" rows={3} value={base.message} onChange={(e) => setBase({ ...base, message: e.target.value })} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit admission request'}
          </button>
        </form>
      </div>
    </div>
  );
}
