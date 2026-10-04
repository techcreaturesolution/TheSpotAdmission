import { useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import DashboardShell from '../../components/DashboardShell.jsx';
import InstitutionForm from '../../components/InstitutionForm.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Badge, Empty, ErrorBox, Input, Loading, Modal, Select, Stat, Stars, Textarea } from '../../components/ui.jsx';
import { api, downloadCsv, errorMessage } from '../../lib/api.js';
import { date, dateTime, inr, titleCase } from '../../lib/format.js';
import { useApi, useDebounced } from '../../lib/hooks.js';
import { Notifications, Profile as AccountProfile } from '../student/StudentDashboard.jsx';

const LEAD_STATUS = ['new', 'contacted', 'interested', 'applied', 'admitted', 'not-interested', 'spam'];
const APP_STATUS = ['submitted', 'under-review', 'shortlisted', 'offered', 'admitted', 'rejected'];

function StatusBanner({ inst, onSubmit }) {
  const c = inst.completeness;
  const msg = {
    draft: 'Your listing is a draft and not visible to students. Complete your profile and submit it for approval.',
    pending: 'Your listing is under review by our team. You will be notified once it is approved.',
    rejected: `Your listing was not approved${inst.reviewRemarks ? `: ${inst.reviewRemarks}` : '.'} Please update and resubmit.`,
    suspended: 'Your listing is suspended. Please contact support.',
    approved: 'Your listing is live.',
  }[inst.status];
  return (
    <div className={`card mb-6 p-4 ${inst.status === 'approved' ? 'border-green-200 bg-green-50' : inst.status === 'rejected' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            {inst.name} <Badge status={inst.status} /> {inst.isVerified && <Badge status="approved">✔ Verified</Badge>}
          </div>
          <p className="text-sm text-slate-700">{msg}</p>
        </div>
        <div className="flex items-center gap-2">
          {inst.status === 'approved' && (
            <Link to={`/institutions/${inst.slug}`} className="btn-outline btn-sm">
              View public page
            </Link>
          )}
          {['draft', 'rejected'].includes(inst.status) && (
            <button type="button" className="btn-primary btn-sm" onClick={onSubmit}>
              Submit for approval
            </button>
          )}
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-600">
          <span>Profile completeness</span>
          <span>{c.percent}%</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-white">
          <div className="h-2 rounded-full bg-accent-500" style={{ width: `${c.percent}%` }} />
        </div>
        {c.missing.length > 0 && <p className="mt-1 text-xs text-slate-500">Missing: {c.missing.join(', ')}</p>}
      </div>
    </div>
  );
}

function Overview({ inst }) {
  const { data, loading } = useApi(`/institution/${inst.id}/analytics`);
  if (loading) return <Loading />;
  const max = Math.max(1, ...(data?.daily || []).map((d) => d.n));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Profile views" value={data.views} />
        <Stat label="Total leads" value={data.leads} to="leads" />
        <Stat label="Applications" value={data.applications} to="applications" />
        <Stat label="Conversion (admitted)" value={`${data.conversion}%`} hint={`${data.rating?.avg || 0}★ from ${data.reviews} reviews`} />
      </div>
      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Leads – last 30 days</h2>
        {data.daily.length ? (
          <div className="flex h-40 items-end gap-1" role="img" aria-label="Daily leads chart">
            {data.daily.map((d) => (
              <div key={d._id} className="flex-1 rounded-t bg-brand-600" style={{ height: `${(d.n / max) * 100}%` }} title={`${d._id}: ${d.n}`} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No leads yet in the last 30 days.</p>
        )}
      </div>
      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Lead pipeline</h2>
        <div className="flex flex-wrap gap-2">
          {LEAD_STATUS.map((s) => (
            <span key={s} className="chip">
              <Badge status={s} /> {data.leadsByStatus[s] || 0}
            </span>
          ))}
        </div>
      </div>
      <Notifications compact />
    </div>
  );
}

function ProfileEdit({ inst, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <InstitutionForm
      key={inst.id + inst.updatedAt}
      initial={inst}
      busy={busy}
      onSubmit={async (payload) => {
        setBusy(true);
        try {
          const { data } = await api.put(`/institution/${inst.id}`, payload);
          toast(data.sentForReview ? 'Saved. Key details changed, so the listing was sent for re-approval.' : 'Profile saved');
          onSaved();
        } catch (err) {
          toast(errorMessage(err), 'error');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

const EMPTY_COURSE = { name: '', level: '', stream: '', duration: '', eligibility: '', feesPerYear: '', seatsTotal: 0, seatsVacant: 0, mode: 'full-time', admissionProcess: '' };

function Courses({ inst, onSaved }) {
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const save = async (e) => {
    e.preventDefault();
    const body = { ...edit, feesPerYear: edit.feesPerYear === '' ? undefined : Number(edit.feesPerYear), seatsTotal: Number(edit.seatsTotal || 0), seatsVacant: Number(edit.seatsVacant || 0) };
    delete body._id;
    try {
      if (edit._id) await api.put(`/institution/${inst.id}/courses/${edit._id}`, body);
      else await api.post(`/institution/${inst.id}/courses`, body);
      toast('Course saved');
      setEdit(null);
      onSaved();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  return (
    <div>
      <div className="mb-4 flex justify-between">
        <p className="text-sm text-slate-600">Fee range on your listing is calculated from course fees.</p>
        <button type="button" className="btn-primary btn-sm" onClick={() => setEdit(EMPTY_COURSE)}>
          + Add course
        </button>
      </div>
      {inst.courses.length ? (
        <div className="card overflow-x-auto">
          <table className="table-x">
            <thead>
              <tr>
                <th>Course</th>
                <th>Fees / yr</th>
                <th>Seats</th>
                <th>Vacant</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {inst.courses.map((c) => (
                <tr key={c._id}>
                  <td className="font-medium">
                    {c.name}
                    <div className="text-xs text-slate-500">{[c.level, c.stream, c.duration].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td>{inr(c.feesPerYear)}</td>
                  <td>{c.seatsTotal}</td>
                  <td>{c.seatsVacant}</td>
                  <td className="whitespace-nowrap">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit({ ...EMPTY_COURSE, ...c, feesPerYear: c.feesPerYear ?? '' })}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm text-red-600"
                      onClick={async () => {
                        if (!window.confirm(`Delete ${c.name}?`)) return;
                        await api.delete(`/institution/${inst.id}/courses/${c._id}`);
                        onSaved();
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No courses yet">Add the courses / classes you offer with fees and seats.</Empty>
      )}
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?._id ? 'Edit course' : 'Add course'} wide>
        {edit && (
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Input className="sm:col-span-2" label="Course / class name" value={edit.name} onChange={set('name')} required />
            <Input label="Level" value={edit.level} onChange={set('level')} placeholder="UG, PG, Diploma, School…" />
            <Input label="Stream" value={edit.stream} onChange={set('stream')} />
            <Input label="Duration" value={edit.duration} onChange={set('duration')} />
            <Select label="Mode" value={edit.mode} onChange={set('mode')} options={['full-time', 'part-time', 'online', 'distance']} />
            <Input label="Fees per year (₹)" type="number" min="0" value={edit.feesPerYear} onChange={set('feesPerYear')} />
            <Input label="Total seats" type="number" min="0" value={edit.seatsTotal} onChange={set('seatsTotal')} />
            <Input label="Vacant seats" type="number" min="0" value={edit.seatsVacant} onChange={set('seatsVacant')} />
            <Textarea className="sm:col-span-2" label="Eligibility" rows={2} value={edit.eligibility} onChange={set('eligibility')} />
            <Textarea className="sm:col-span-2" label="Admission process" rows={3} value={edit.admissionProcess} onChange={set('admissionProcess')} />
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary w-full">
                Save course
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Leads({ inst }) {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const debQ = useDebounced(q);
  const { data, loading, error, reload, setData } = useApi(`/institution/${inst.id}/leads`, { params: { status, q: debQ } });
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const update = async (lead, body) => {
    try {
      const res = await api.patch(`/institution/leads/${lead._id}`, body);
      setData((d) => ({ ...d, items: d.items.map((x) => (x._id === lead._id ? res.data.lead : x)) }));
      if (open?._id === lead._id) setOpen(res.data.lead);
      toast('Lead updated');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input className="w-56" label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, course" />
        <Select className="w-44" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All" options={LEAD_STATUS.map((s) => ({ value: s, label: titleCase(s) }))} />
        <button type="button" className="btn-outline btn-sm ml-auto" onClick={() => downloadCsv(`/institution/${inst.id}/leads.csv?status=${status}`, `${inst.slug}-leads.csv`)}>
          ⬇ Export CSV
        </button>
      </div>
      <ErrorBox message={error} onRetry={reload} />
      {loading && !data ? (
        <Loading />
      ) : data?.items?.length ? (
        <div className="card overflow-x-auto">
          <table className="table-x">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Course</th>
                <th>Source</th>
                <th>Enquiries</th>
                <th>Last enquiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((l) => (
                <tr key={l._id}>
                  <td>
                    <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => setOpen(l)}>
                      {l.name}
                    </button>
                    {l.otpVerified && <span className="ml-1 text-xs text-green-700">✔ OTP</span>}
                  </td>
                  <td>
                    <a href={`tel:${l.phone}`}>{l.phone}</a>
                  </td>
                  <td>{l.course || '—'}</td>
                  <td>{titleCase(l.source)}</td>
                  <td>{l.enquiryCount}</td>
                  <td>{dateTime(l.lastEnquiryAt)}</td>
                  <td>
                    <select aria-label="Lead status" className="input py-1 text-xs" value={l.status} onChange={(e) => update(l, { status: e.target.value })}>
                      {LEAD_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {titleCase(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No leads yet">Verified student enquiries will appear here.</Empty>
      )}
      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.name}>
        {open && (
          <div className="space-y-3 text-sm">
            <p>
              📞 <a href={`tel:${open.phone}`}>{open.phone}</a> {open.email && <>· ✉ {open.email}</>}
            </p>
            <p>
              {open.course && <>Course: {open.course} · </>}
              {open.city && <>City: {open.city}</>}
            </p>
            {open.message && <p className="rounded bg-slate-50 p-3">{open.message}</p>}
            <a className="btn-outline btn-sm" href={`https://wa.me/91${open.phone}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <h3 className="font-semibold">Notes</h3>
            <ul className="space-y-1">
              {(open.notes || []).map((n) => (
                <li key={n._id} className="rounded bg-slate-50 p-2">
                  {n.text} <span className="text-xs text-slate-400">— {n.by}, {dateTime(n.at)}</span>
                </li>
              ))}
            </ul>
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!note.trim()) return;
                await update(open, { note });
                setNote('');
              }}
            >
              <input className="input" aria-label="Add note" placeholder="Add a follow-up note" value={note} onChange={(e) => setNote(e.target.value)} />
              <button type="submit" className="btn-brand btn-sm">
                Add
              </button>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Spot({ inst }) {
  const toast = useToast();
  const { data, loading, reload } = useApi(`/institution/${inst.id}/spot-admissions`);
  const [f, setF] = useState(null);
  if (loading) return <Loading />;
  const live = inst.status === 'approved';
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{inst.isVerified ? 'Verified institutions go live instantly.' : 'Posts are reviewed by our team before going live.'} Subscribers get SMS/in-app alerts.</p>
        <button type="button" className="btn-primary btn-sm" disabled={!live} title={live ? '' : 'Listing must be approved first'} onClick={() => setF({ courseName: inst.courses[0]?.name || '', vacantSeats: 1, round: '', endDate: '', notice: '', documentsRequired: 'Marksheet, Leaving Certificate, Aadhaar Card' })}>
          + Post vacant seats
        </button>
      </div>
      {data.items.length ? (
        <div className="space-y-3">
          {data.items.map((s) => (
            <div key={s._id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="font-semibold">
                  {s.courseName} <Badge status={s.status} />
                </div>
                <div className="text-sm text-slate-500">
                  {s.vacantSeats} seats left · {s.confirmedSeats || 0} confirmed · closes {date(s.endDate)}
                </div>
              </div>
              {s.status === 'live' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-brand btn-sm"
                    onClick={async () => {
                      try {
                        await api.post(`/institution/spot/${s._id}/confirm`);
                        toast('Seat confirmed');
                        reload();
                      } catch (err) {
                        toast(errorMessage(err), 'error');
                      }
                    }}
                  >
                    ✓ Confirm 1 seat
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={async () => {
                      await api.patch(`/institution/spot/${s._id}`, { close: true });
                      reload();
                    }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty title="No spot admissions posted">Post last-round vacant seats to reach students instantly.</Empty>
      )}
      <Modal open={Boolean(f)} onClose={() => setF(null)} title="Post spot admission">
        {f && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const { data: res } = await api.post(`/institution/${inst.id}/spot-admissions`, { ...f, vacantSeats: Number(f.vacantSeats), documentsRequired: f.documentsRequired.split(',').map((x) => x.trim()).filter(Boolean) });
                toast(res.autoPublished ? 'Published – seats are live' : 'Submitted for review');
                setF(null);
                reload();
              } catch (err) {
                toast(errorMessage(err), 'error');
              }
            }}
          >
            {inst.courses.length ? <Select label="Course" value={f.courseName} onChange={(e) => setF({ ...f, courseName: e.target.value })} options={inst.courses.map((c) => c.name)} /> : <Input label="Course" value={f.courseName} onChange={(e) => setF({ ...f, courseName: e.target.value })} required />}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Vacant seats" type="number" min="1" value={f.vacantSeats} onChange={(e) => setF({ ...f, vacantSeats: e.target.value })} required />
              <Input label="Last date" type="date" min={new Date().toISOString().slice(0, 10)} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} required />
            </div>
            <Input label="Round" value={f.round} onChange={(e) => setF({ ...f, round: e.target.value })} placeholder="e.g. ACPC spot round" />
            <Input label="Documents required (comma separated)" value={f.documentsRequired} onChange={(e) => setF({ ...f, documentsRequired: e.target.value })} />
            <Textarea label="Notice" rows={3} value={f.notice} onChange={(e) => setF({ ...f, notice: e.target.value })} />
            <button type="submit" className="btn-primary w-full">
              Publish
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Applications({ inst }) {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const { data, loading, reload } = useApi(`/institution/${inst.id}/applications`, { params: { status } });
  const [open, setOpen] = useState(null);
  return (
    <div>
      <Select className="mb-4 w-48" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All" options={[...APP_STATUS, 'withdrawn'].map((s) => ({ value: s, label: titleCase(s) }))} />
      {loading ? (
        <Loading />
      ) : data?.items?.length ? (
        <div className="card overflow-x-auto">
          <table className="table-x">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Course</th>
                <th>Academic</th>
                <th>Applied</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a._id}>
                  <td>
                    <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => setOpen(a)}>
                      {a.personal.name}
                    </button>
                    <div className="text-xs text-slate-500">{a.personal.phone}</div>
                  </td>
                  <td>{a.courseName}</td>
                  <td className="text-xs">
                    {a.academic?.lastExam} {a.academic?.percentage != null && `· ${a.academic.percentage}%`}
                  </td>
                  <td>{date(a.createdAt)}</td>
                  <td>
                    <select
                      aria-label="Application status"
                      className="input py-1 text-xs"
                      value={a.status}
                      disabled={a.status === 'withdrawn'}
                      onChange={async (e) => {
                        try {
                          await api.patch(`/institution/applications/${a._id}`, { status: e.target.value });
                          toast('Status updated – student notified');
                          reload();
                        } catch (err) {
                          toast(errorMessage(err), 'error');
                        }
                      }}
                    >
                      {[...APP_STATUS, ...(a.status === 'withdrawn' ? ['withdrawn'] : [])].map((s) => (
                        <option key={s} value={s}>
                          {titleCase(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No applications yet" />
      )}
      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.personal?.name} wide>
        {open && (
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            {[
              ['Personal', open.personal],
              ['Academic', open.academic],
              ['Parent', open.parent],
            ].map(([h, o]) => (
              <div key={h}>
                <h3 className="mb-1 font-semibold">{h}</h3>
                <dl>
                  {Object.entries(o || {})
                    .filter(([, v]) => v !== '' && v != null)
                    .map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="text-slate-500">{titleCase(k)}:</dt>
                        <dd>{String(v)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            ))}
            <div>
              <h3 className="mb-1 font-semibold">Documents</h3>
              {open.documents?.length ? (
                open.documents.map((d) => (
                  <a key={d.url} href={d.url} target="_blank" rel="noreferrer" className="block text-brand-700 underline">
                    {d.label}
                  </a>
                ))
              ) : (
                <p className="text-slate-500">None uploaded</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Reviews({ inst }) {
  const { data, loading } = useApi(`/institution/${inst.id}/reviews`);
  if (loading) return <Loading />;
  if (!data?.items?.length) return <Empty title="No published reviews yet" />;
  return (
    <div className="space-y-3">
      {data.items.map((r) => (
        <div key={r._id} className="card p-4">
          <Stars value={r.rating} /> <span className="text-xs text-slate-500">{r.user?.name} · {date(r.createdAt)}</span>
          {r.title && <h3 className="font-semibold">{r.title}</h3>}
          <p className="text-sm text-slate-700">{r.body}</p>
        </div>
      ))}
    </div>
  );
}

function Setup({ onCreated }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const debQ = useDebounced(q);
  const claimable = useApi('/institution/claimable', { params: { q: debQ }, skip: debQ.length < 3 });
  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-semibold">Is your institution already listed?</h2>
        <p className="text-sm text-slate-600">Search and claim it instead of creating a duplicate.</p>
        <Input className="mt-3" aria-label="Search listing" placeholder="Type at least 3 letters of your institution name" value={q} onChange={(e) => setQ(e.target.value)} />
        {claimable.data?.items?.map((i) => (
          <div key={i._id} className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
            <span>
              {i.name} · {i.address?.city}
            </span>
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={async () => {
                try {
                  const { data } = await api.post(`/institution/claim/${i._id}`, {});
                  toast(data.message);
                } catch (err) {
                  toast(errorMessage(err), 'error');
                }
              }}
            >
              Claim
            </button>
          </div>
        ))}
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Create a new listing</h2>
        <InstitutionForm
          busy={busy}
          submitLabel="Create listing"
          onSubmit={async (payload) => {
            setBusy(true);
            try {
              const { data } = await api.post('/institution', payload);
              toast('Listing created as draft');
              onCreated(data.institution.id);
            } catch (err) {
              toast(errorMessage(err), 'error');
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </div>
  );
}

export default function InstitutionDashboard() {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi('/institution');
  const [selected, setSelected] = useState(() => localStorage.getItem('tsa_inst') || '');
  const items = data?.items || [];
  const inst = items.find((i) => i.id === selected) || items[0];
  useEffect(() => {
    if (inst) localStorage.setItem('tsa_inst', inst.id);
  }, [inst]);

  const nav = [
    { to: '', label: 'Overview', icon: '📊' },
    { to: 'profile', label: 'Profile', icon: '🏫' },
    { to: 'courses', label: 'Courses & seats', icon: '📘' },
    { to: 'leads', label: 'Leads', icon: '📨' },
    { to: 'applications', label: 'Applications', icon: '📝' },
    { to: 'spot', label: 'Spot admission', icon: '🔥' },
    { to: 'reviews', label: 'Reviews', icon: '★' },
    { to: 'new', label: 'Add / claim listing', icon: '➕' },
    { to: 'account', label: 'Account', icon: '👤' },
  ];

  const submit = async () => {
    try {
      await api.post(`/institution/${inst.id}/submit`);
      toast('Submitted for approval');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const header =
    items.length > 1 ? (
      <Select aria-label="Institution" value={inst?.id} onChange={(e) => setSelected(e.target.value)} options={items.map((i) => ({ value: i.id, label: i.name }))} />
    ) : null;

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const onCreated = async (id) => {
    setSelected(id);
    await reload();
    navigate('/institution/profile');
  };

  return (
    <DashboardShell title="Institution dashboard" base="/institution" items={inst ? nav : nav.slice(-2)} header={header}>
      {inst && <StatusBanner inst={inst} onSubmit={submit} />}
      <Routes>
        <Route path="new" element={<Setup onCreated={onCreated} />} />
        <Route path="account" element={<AccountProfile />} />
        {inst ? (
          <>
            <Route index element={<Overview inst={inst} />} />
            <Route path="profile" element={<ProfileEdit inst={inst} onSaved={reload} />} />
            <Route path="courses" element={<Courses inst={inst} onSaved={reload} />} />
            <Route path="leads" element={<Leads inst={inst} />} />
            <Route path="applications" element={<Applications inst={inst} />} />
            <Route path="spot" element={<Spot inst={inst} />} />
            <Route path="reviews" element={<Reviews inst={inst} />} />
          </>
        ) : (
          <Route path="*" element={<Setup onCreated={onCreated} />} />
        )}
      </Routes>
    </DashboardShell>
  );
}
