import { useState } from 'react';
import { TYPE_LABEL, titleCase } from '../lib/format.js';
import { useMeta } from '../lib/hooks.js';
import ImageUpload from './ImageUpload.jsx';
import { Checkbox, Input, Select, Textarea } from './ui.jsx';

const list = (s) =>
  String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const toForm = (i = {}) => ({
  name: i.name || '',
  type: i.type || 'college',
  category: i.category || '',
  ownership: i.ownership || 'private',
  board: i.board || '',
  university: i.university || '',
  about: i.about || '',
  logo: i.logo || '',
  cover: i.cover || '',
  gallery: i.gallery || [],
  brochure: i.brochure || '',
  virtualTourUrl: i.virtualTourUrl || '',
  contact: { phone: i.contact?.phone || '', email: i.contact?.email || '', website: i.contact?.website || '' },
  address: { line: i.address?.line || '', city: i.address?.city || '', district: i.address?.district || '', state: i.address?.state || 'Gujarat', pincode: i.address?.pincode || '' },
  facilities: i.facilities || [],
  accreditation: (i.accreditation || []).join(', '),
  establishedYear: i.establishedYear || '',
  placements: { highestLpa: i.placements?.highestLpa ?? '', averageLpa: i.placements?.averageLpa ?? '', recruiters: (i.placements?.recruiters || []).join(', ') },
  hostel: Boolean(i.hostel),
  transport: Boolean(i.transport),
  scholarships: i.scholarships || '',
  faqs: i.faqs || [],
});

const num = (v) => (v === '' || v == null ? undefined : Number(v));

function toPayload(f) {
  return {
    ...f,
    accreditation: list(f.accreditation),
    establishedYear: num(f.establishedYear),
    placements: { highestLpa: num(f.placements.highestLpa), averageLpa: num(f.placements.averageLpa), recruiters: list(f.placements.recruiters) },
    faqs: f.faqs.filter((x) => x.q && x.a).map(({ q, a }) => ({ q, a })),
  };
}

export default function InstitutionForm({ initial, onSubmit, submitLabel = 'Save', busy }) {
  const meta = useMeta();
  const [f, setF] = useState(() => toForm(initial));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setIn = (g, k) => (e) => setF({ ...f, [g]: { ...f[g], [k]: e.target.value } });
  const m = meta.data;
  const toggleFacility = (name) => setF({ ...f, facilities: f.facilities.includes(name) ? f.facilities.filter((x) => x !== name) : [...f.facilities, name] });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(toPayload(f));
      }}
    >
      <section className="card grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">Basic information</h2>
        <Input className="sm:col-span-2" label="Institution name" value={f.name} onChange={set('name')} required minLength={3} />
        <Select label="Type" value={f.type} onChange={set('type')} options={(m?.types || ['school', 'college']).map((t) => ({ value: t, label: TYPE_LABEL[t] || t }))} />
        <Select label="Category" value={f.category} onChange={set('category')} placeholder="Select" options={(m?.categories || []).map((c) => c.name)} />
        <Select label="Ownership" value={f.ownership} onChange={set('ownership')} options={(m?.ownership || []).map((o) => ({ value: o, label: titleCase(o) }))} />
        <Input label="Established year" type="number" value={f.establishedYear} onChange={set('establishedYear')} />
        <Input label="Board (schools)" list="boards" value={f.board} onChange={set('board')} />
        <Input label="Affiliated university (colleges)" list="universities" value={f.university} onChange={set('university')} />
        <datalist id="boards">{(m?.boards || []).map((b) => <option key={b.slug} value={b.name} />)}</datalist>
        <datalist id="universities">{(m?.universities || []).map((b) => <option key={b.slug} value={b.name} />)}</datalist>
        <Input className="sm:col-span-2" label="Accreditation (comma separated)" value={f.accreditation} onChange={set('accreditation')} placeholder="NAAC A+, NBA, AICTE" />
        <Textarea className="sm:col-span-2" label="About" rows={6} value={f.about} onChange={set('about')} hint="At least 80 characters for a complete profile." />
      </section>

      <section className="card grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">Contact &amp; address</h2>
        <Input label="Admission phone" value={f.contact.phone} onChange={setIn('contact', 'phone')} />
        <Input label="Admission email" type="email" value={f.contact.email} onChange={setIn('contact', 'email')} />
        <Input className="sm:col-span-2" label="Website" value={f.contact.website} onChange={setIn('contact', 'website')} placeholder="https://" />
        <Input className="sm:col-span-2" label="Address line" value={f.address.line} onChange={setIn('address', 'line')} />
        <Input label="City" list="cities" value={f.address.city} onChange={setIn('address', 'city')} required />
        <datalist id="cities">{(m?.cities || []).map((c) => <option key={c} value={c} />)}</datalist>
        <Input label="District" value={f.address.district} onChange={setIn('address', 'district')} />
        <Input label="State" value={f.address.state} onChange={setIn('address', 'state')} />
        <Input label="Pincode" value={f.address.pincode} onChange={setIn('address', 'pincode')} />
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Media</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUpload label="Logo" value={f.logo} onChange={(v) => setF({ ...f, logo: v })} />
          <ImageUpload label="Cover image" value={f.cover} onChange={(v) => setF({ ...f, cover: v })} />
        </div>
        <ImageUpload label="Gallery (3+ photos)" multiple value={f.gallery} onChange={(v) => setF({ ...f, gallery: v })} />
        <ImageUpload label="Brochure (PDF)" accept="application/pdf" value={f.brochure} onChange={(v) => setF({ ...f, brochure: v })} />
        <Input label="Virtual tour / campus video URL" value={f.virtualTourUrl} onChange={set('virtualTourUrl')} placeholder="YouTube or 360° tour link" />
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Facilities</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(m?.facilities || []).map((x) => (
            <Checkbox key={x.slug} label={x.name} checked={f.facilities.includes(x.name)} onChange={() => toggleFacility(x.name)} />
          ))}
        </div>
        <div className="flex gap-6">
          <Checkbox label="Hostel available" checked={f.hostel} onChange={(e) => setF({ ...f, hostel: e.target.checked })} />
          <Checkbox label="Transport available" checked={f.transport} onChange={(e) => setF({ ...f, transport: e.target.checked })} />
        </div>
        <Textarea label="Scholarships" rows={2} value={f.scholarships} onChange={set('scholarships')} />
      </section>

      <section className="card grid gap-3 p-5 sm:grid-cols-3">
        <h2 className="text-lg font-semibold sm:col-span-3">Placements (colleges)</h2>
        <Input label="Highest package (LPA)" type="number" step="0.1" value={f.placements.highestLpa} onChange={setIn('placements', 'highestLpa')} />
        <Input label="Average package (LPA)" type="number" step="0.1" value={f.placements.averageLpa} onChange={setIn('placements', 'averageLpa')} />
        <Input label="Top recruiters (comma separated)" value={f.placements.recruiters} onChange={setIn('placements', 'recruiters')} />
      </section>

      <section className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">FAQs</h2>
          <button type="button" className="btn-outline btn-sm" onClick={() => setF({ ...f, faqs: [...f.faqs, { q: '', a: '' }] })}>
            + Add FAQ
          </button>
        </div>
        {f.faqs.map((x, i) => (
          <div key={i} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_2fr_auto]">
            <Input aria-label="Question" placeholder="Question" value={x.q} onChange={(e) => setF({ ...f, faqs: f.faqs.map((y, j) => (j === i ? { ...y, q: e.target.value } : y)) })} />
            <Input aria-label="Answer" placeholder="Answer" value={x.a} onChange={(e) => setF({ ...f, faqs: f.faqs.map((y, j) => (j === i ? { ...y, a: e.target.value } : y)) })} />
            <button type="button" className="btn-ghost btn-sm" onClick={() => setF({ ...f, faqs: f.faqs.filter((_, j) => j !== i) })}>
              ✕
            </button>
          </div>
        ))}
      </section>

      <div className="sticky bottom-0 z-10 -mx-1 flex justify-end border-t border-slate-200 bg-slate-50/95 px-1 py-3">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
