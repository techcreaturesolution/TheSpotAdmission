import { useState } from 'react';
import { Link, Route, Routes, useSearchParams } from 'react-router-dom';
import DashboardShell from '../../components/DashboardShell.jsx';
import ImageUpload from '../../components/ImageUpload.jsx';
import InstitutionForm from '../../components/InstitutionForm.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Badge, Checkbox, Empty, ErrorBox, Input, Loading, Modal, Pagination, Select, Stat, Stars, Tabs, Textarea } from '../../components/ui.jsx';
import { api, downloadCsv, errorMessage } from '../../lib/api.js';
import { date, dateTime, TYPE_LABEL, titleCase } from '../../lib/format.js';
import { useApi, useDebounced } from '../../lib/hooks.js';
import { Notifications } from '../student/StudentDashboard.jsx';

function useAction() {
  const toast = useToast();
  return async (fn, ok) => {
    try {
      const r = await fn();
      if (ok) toast(ok);
      return r;
    } catch (err) {
      toast(errorMessage(err), 'error');
      return null;
    }
  };
}

function Overview() {
  const { data, loading, error, reload } = useApi('/admin/stats');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const max = Math.max(1, ...data.daily.map((d) => d.n));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pending approvals" value={data.institutions.pending || 0} to="institutions?status=pending" />
        <Stat label="Approved listings" value={data.institutions.approved || 0} to="institutions?status=approved" />
        <Stat label="Claim requests" value={data.claims} to="institutions?claims=1" />
        <Stat label="Reviews to moderate" value={data.pendingReviews} to="reviews" />
        <Stat label="Leads (30 days)" value={data.leads30} hint={`${data.leads} total`} to="leads" />
        <Stat label="Spot seats to review" value={data.pendingSpots} hint={`${data.liveSpots} live`} to="spot" />
        <Stat label="Counselling pending" value={data.pendingCounselling} to="counselling" />
        <Stat label="Unread messages" value={data.unreadMessages} to="messages" />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {['student', 'institution', 'counsellor', 'admin'].map((r) => (
          <Stat key={r} label={`${titleCase(r)} accounts`} value={data.users[r] || 0} to={`users?role=${r}`} />
        ))}
      </div>
      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Platform leads – last 30 days</h2>
        {data.daily.length ? (
          <div className="flex h-40 items-end gap-1" role="img" aria-label="Daily leads chart">
            {data.daily.map((d) => (
              <div key={d._id} className="flex-1 rounded-t bg-accent-500" style={{ height: `${(d.n / max) * 100}%` }} title={`${d._id}: ${d.n}`} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No leads yet.</p>
        )}
      </div>
      <Notifications compact />
    </div>
  );
}

function Institutions() {
  const [sp, setSp] = useSearchParams();
  const act = useAction();
  const [q, setQ] = useState('');
  const debQ = useDebounced(q);
  const params = { status: sp.get('status') || '', claims: sp.get('claims') || '', q: debQ, page: sp.get('page') || 1 };
  const { data, loading, error, reload } = useApi('/admin/institutions', { params });
  const [edit, setEdit] = useState(null);
  const [reject, setReject] = useState(null);
  const [remarks, setRemarks] = useState('');
  const setParam = (k, v) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== 'page') n.delete('page');
    setSp(n);
  };
  const setStatus = (i, status, rem) => act(() => api.patch(`/admin/institutions/${i.id}/status`, { status, remarks: rem }), `Marked ${status}`).then((r) => r && reload());
  const tab = sp.get('claims') ? 'claims' : sp.get('status') || 'all';

  return (
    <div>
      <Tabs
        tabs={[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'draft', label: 'Draft' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'suspended', label: 'Suspended' },
          { value: 'claims', label: 'Claims' },
        ]}
        value={tab}
        onChange={(v) => setSp(v === 'claims' ? { claims: '1' } : v === 'all' ? {} : { status: v })}
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input className="w-64" label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or city" />
        <button type="button" className="btn-primary btn-sm ml-auto" onClick={() => setEdit({})}>
          + Add institution
        </button>
      </div>
      <ErrorBox message={error} onRetry={reload} />
      {loading && !data ? (
        <Loading />
      ) : data?.items?.length ? (
        <>
          <div className="card overflow-x-auto">
            <table className="table-x">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Owner</th>
                  <th>Profile</th>
                  <th>Status</th>
                  <th>Flags</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-slate-500">
                        {TYPE_LABEL[i.type]} · {i.address?.city} · updated {date(i.updatedAt)}
                      </div>
                      {i.reviewRemarks && <div className="text-xs text-red-600">Remarks: {i.reviewRemarks}</div>}
                    </td>
                    <td className="text-xs">
                      {i.owner ? (
                        <>
                          {i.owner.name}
                          <br />
                          {i.owner.email || i.owner.phone}
                        </>
                      ) : (
                        <span className="text-slate-400">Unclaimed</span>
                      )}
                      {i.claimRequest?.user && (
                        <div className="mt-1 rounded bg-amber-50 p-1">
                          Claim by {i.claimRequest.user.name} ({i.claimRequest.user.email || i.claimRequest.user.phone})
                          <div className="mt-1 flex gap-1">
                            <button type="button" className="btn-brand btn-sm" onClick={() => act(() => api.patch(`/admin/institutions/${i.id}/claim`, { approve: true }), 'Claim approved').then(reload)}>
                              Approve
                            </button>
                            <button type="button" className="btn-ghost btn-sm" onClick={() => act(() => api.patch(`/admin/institutions/${i.id}/claim`, { approve: false }), 'Claim rejected').then(reload)}>
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={i.completeness.percent >= 80 ? 'text-green-700' : 'text-amber-700'}>{i.completeness.percent}%</span>
                    </td>
                    <td>
                      <Badge status={i.status} />
                    </td>
                    <td className="space-y-1">
                      <Checkbox label="Verified" checked={i.isVerified} onChange={(e) => act(() => api.patch(`/admin/institutions/${i.id}/flags`, { isVerified: e.target.checked })).then(reload)} />
                      <Checkbox label="Featured" checked={i.isFeatured} onChange={(e) => act(() => api.patch(`/admin/institutions/${i.id}/flags`, { isFeatured: e.target.checked })).then(reload)} />
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {i.status !== 'approved' && (
                          <button type="button" className="btn-brand btn-sm" onClick={() => setStatus(i, 'approved')}>
                            Approve
                          </button>
                        )}
                        {i.status !== 'rejected' && (
                          <button
                            type="button"
                            className="btn-outline btn-sm"
                            onClick={() => {
                              setReject(i);
                              setRemarks('');
                            }}
                          >
                            Reject
                          </button>
                        )}
                        {i.status === 'approved' && (
                          <button type="button" className="btn-ghost btn-sm" onClick={() => setStatus(i, 'suspended', 'Suspended by admin')}>
                            Suspend
                          </button>
                        )}
                        <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(i)}>
                          Edit
                        </button>
                        {i.status === 'approved' && (
                          <Link to={`/institutions/${i.slug}`} className="btn-ghost btn-sm">
                            View
                          </Link>
                        )}
                        <button
                          type="button"
                          className="btn-ghost btn-sm text-red-600"
                          onClick={() => window.confirm(`Delete ${i.name}? This cannot be undone.`) && act(() => api.delete(`/admin/institutions/${i.id}`), 'Deleted').then(reload)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={(p) => setParam('page', String(p))} />
        </>
      ) : (
        <Empty title="No institutions found" />
      )}
      <Modal open={Boolean(reject)} onClose={() => setReject(null)} title={`Reject ${reject?.name || ''}`}>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await setStatus(reject, 'rejected', remarks);
            setReject(null);
          }}
        >
          <Textarea label="Remarks for the institution" value={remarks} onChange={(e) => setRemarks(e.target.value)} required />
          <button type="submit" className="btn-primary w-full">
            Reject listing
          </button>
        </form>
      </Modal>
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? `Edit ${edit.name}` : 'Add institution (published immediately)'} wide>
        {edit && (
          <InstitutionForm
            initial={edit}
            onSubmit={async (payload) => {
              const r = await act(() => (edit.id ? api.put(`/admin/institutions/${edit.id}`, payload) : api.post('/admin/institutions', payload)), 'Saved');
              if (r) {
                setEdit(null);
                reload();
              }
            }}
          />
        )}
      </Modal>
    </div>
  );
}

const LEAD_STATUS = ['new', 'contacted', 'interested', 'applied', 'admitted', 'not-interested', 'spam'];

function Leads() {
  const act = useAction();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const debQ = useDebounced(q);
  const { data, loading, reload } = useApi('/admin/leads', { params: { status, q: debQ, page } });
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input className="w-56" label="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <Select className="w-44" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All" options={LEAD_STATUS.map((s) => ({ value: s, label: titleCase(s) }))} />
        <button type="button" className="btn-outline btn-sm ml-auto" onClick={() => downloadCsv(`/admin/leads.csv?status=${status}&q=${encodeURIComponent(debQ)}`, 'leads.csv')}>
          ⬇ Export CSV
        </button>
      </div>
      {loading && !data ? (
        <Loading />
      ) : data?.items?.length ? (
        <>
          <div className="card overflow-x-auto">
            <table className="table-x">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Institution</th>
                  <th>Course</th>
                  <th>Source</th>
                  <th>Last enquiry</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((l) => (
                  <tr key={l._id}>
                    <td>
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-slate-500">
                        {l.phone} {l.email && `· ${l.email}`}
                      </div>
                    </td>
                    <td>{l.institution?.name || '—'}</td>
                    <td>{l.course || '—'}</td>
                    <td>{titleCase(l.source)}</td>
                    <td>
                      {dateTime(l.lastEnquiryAt)}
                      {l.enquiryCount > 1 && <div className="text-xs text-slate-500">×{l.enquiryCount}</div>}
                    </td>
                    <td>
                      <select aria-label="Status" className="input py-1 text-xs" value={l.status} onChange={(e) => act(() => api.patch(`/admin/leads/${l._id}`, { status: e.target.value }), 'Updated').then(reload)}>
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
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      ) : (
        <Empty title="No leads" />
      )}
    </div>
  );
}

function Reviews() {
  const act = useAction();
  const [status, setStatus] = useState('pending');
  const { data, loading, reload } = useApi('/admin/reviews', { params: { status } });
  return (
    <div>
      <Tabs tabs={['pending', 'approved', 'rejected']} value={status} onChange={setStatus} />
      {loading ? (
        <Loading />
      ) : data?.items?.length ? (
        <div className="space-y-3">
          {data.items.map((r) => (
            <div key={r._id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Stars value={r.rating} /> <b>{r.institution?.name}</b>
                  <span className="text-xs text-slate-500">
                    {' '}
                    by {r.user?.name} ({r.relation}) · {date(r.createdAt)}
                  </span>
                </div>
                <div className="flex gap-1">
                  {r.status !== 'approved' && (
                    <button type="button" className="btn-brand btn-sm" onClick={() => act(() => api.patch(`/admin/reviews/${r._id}`, { status: 'approved' }), 'Approved').then(reload)}>
                      Approve
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button type="button" className="btn-outline btn-sm" onClick={() => act(() => api.patch(`/admin/reviews/${r._id}`, { status: 'rejected' }), 'Rejected').then(reload)}>
                      Reject
                    </button>
                  )}
                </div>
              </div>
              {r.title && <h3 className="mt-1 font-semibold">{r.title}</h3>}
              <p className="text-sm text-slate-700">{r.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <Empty title={`No ${status} reviews`} />
      )}
    </div>
  );
}

function Spot() {
  const act = useAction();
  const [status, setStatus] = useState('pending');
  const { data, loading, reload } = useApi('/admin/spot-admissions', { params: { status } });
  return (
    <div>
      <Tabs tabs={['pending', 'live', 'closed', 'rejected']} value={status} onChange={setStatus} />
      {data && <p className="mb-3 text-sm text-slate-500">{data.alertSubscribers} active alert subscribers</p>}
      {loading ? (
        <Loading />
      ) : data?.items?.length ? (
        <div className="space-y-3">
          {data.items.map((s) => (
            <div key={s._id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="font-semibold">
                  {s.courseName} · {s.vacantSeats} seats <Badge status={s.status} />
                </div>
                <div className="text-sm text-slate-500">
                  {s.institution?.name} · {s.city} · closes {date(s.endDate)}
                </div>
              </div>
              <div className="flex gap-1">
                {s.status !== 'live' && (
                  <button type="button" className="btn-brand btn-sm" onClick={() => act(() => api.patch(`/admin/spot-admissions/${s._id}`, { status: 'live' })).then((r) => r && reload())}>
                    Publish
                  </button>
                )}
                {s.status === 'pending' && (
                  <button type="button" className="btn-outline btn-sm" onClick={() => act(() => api.patch(`/admin/spot-admissions/${s._id}`, { status: 'rejected' }), 'Rejected').then(reload)}>
                    Reject
                  </button>
                )}
                {s.status === 'live' && (
                  <button type="button" className="btn-ghost btn-sm" onClick={() => act(() => api.patch(`/admin/spot-admissions/${s._id}`, { status: 'closed' }), 'Closed').then(reload)}>
                    Close
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title={`No ${status} spot admissions`} />
      )}
    </div>
  );
}

const CONTENT_KINDS = ['article', 'news', 'podcast', 'virtual-tour', 'exam'];
const EMPTY_CONTENT = { kind: 'article', title: '', excerpt: '', body: '', cover: '', mediaUrl: '', category: '', tags: '', published: false };

function ContentAdmin() {
  const act = useAction();
  const [kind, setKind] = useState('');
  const { data, loading, reload } = useApi('/admin/content', { params: { kind } });
  const [edit, setEdit] = useState(null);
  const open = async (c) => {
    const r = await act(() => api.get(`/admin/content/${c._id}`));
    if (r) setEdit({ ...EMPTY_CONTENT, ...r.data.item, tags: (r.data.item.tags || []).join(', ') });
  };
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select className="w-48" label="Type" value={kind} onChange={(e) => setKind(e.target.value)} placeholder="All" options={CONTENT_KINDS.map((k) => ({ value: k, label: titleCase(k) }))} />
        <button type="button" className="btn-primary btn-sm ml-auto" onClick={() => setEdit({ ...EMPTY_CONTENT })}>
          + New post
        </button>
      </div>
      {loading ? (
        <Loading />
      ) : data?.items?.length ? (
        <div className="card overflow-x-auto">
          <table className="table-x">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Views</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c._id}>
                  <td className="font-medium">{c.title}</td>
                  <td>{titleCase(c.kind)}</td>
                  <td>{c.published ? <Badge status="live">Published</Badge> : <Badge status="draft" />}</td>
                  <td>{c.views}</td>
                  <td>{date(c.updatedAt)}</td>
                  <td className="whitespace-nowrap">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => open(c)}>
                      Edit
                    </button>
                    {c.published && (
                      <Link to={`/content/${c.slug}`} className="btn-ghost btn-sm">
                        View
                      </Link>
                    )}
                    <button type="button" className="btn-ghost btn-sm text-red-600" onClick={() => window.confirm('Delete this post?') && act(() => api.delete(`/admin/content/${c._id}`), 'Deleted').then(reload)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No content yet">Publish news, admission guides, podcasts, virtual tours and exam updates.</Empty>
      )}
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?._id ? 'Edit post' : 'New post'} wide>
        {edit && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const body = {
                kind: edit.kind,
                title: edit.title,
                excerpt: edit.excerpt || undefined,
                body: edit.body || undefined,
                cover: edit.cover || undefined,
                mediaUrl: edit.mediaUrl || undefined,
                category: edit.category || undefined,
                tags: String(edit.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
                published: Boolean(edit.published),
              };
              const r = await act(() => (edit._id ? api.put(`/admin/content/${edit._id}`, body) : api.post('/admin/content', body)), 'Saved');
              if (r) {
                setEdit(null);
                reload();
              }
            }}
          >
            <Select label="Type" value={edit.kind} onChange={set('kind')} options={CONTENT_KINDS.map((k) => ({ value: k, label: titleCase(k) }))} />
            <Input label="Category" value={edit.category} onChange={set('category')} placeholder="Admission News, Career Guide…" />
            <Input className="sm:col-span-2" label="Title" value={edit.title} onChange={set('title')} required minLength={3} />
            <Textarea className="sm:col-span-2" label="Excerpt" rows={2} value={edit.excerpt} onChange={set('excerpt')} />
            <Textarea className="sm:col-span-2" label="Body" rows={10} value={edit.body} onChange={set('body')} />
            <ImageUpload label="Cover image" value={edit.cover} onChange={(v) => setEdit({ ...edit, cover: v })} />
            <Input label="Media URL (YouTube / audio / 360° tour)" value={edit.mediaUrl} onChange={set('mediaUrl')} />
            <Input className="sm:col-span-2" label="Tags (comma separated)" value={edit.tags} onChange={set('tags')} />
            <Checkbox label="Published" checked={Boolean(edit.published)} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} />
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary w-full">
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function TestimonialsAdmin() {
  const act = useAction();
  const { data, loading, reload } = useApi('/admin/testimonials');
  const [edit, setEdit] = useState(null);
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button type="button" className="btn-primary btn-sm" onClick={() => setEdit({ name: '', role: '', quote: '', rating: 5, videoUrl: '', photo: '', published: true, order: 0 })}>
          + Add testimonial
        </button>
      </div>
      {loading ? (
        <Loading />
      ) : data?.items?.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.items.map((t) => (
            <div key={t._id} className="card p-4">
              <div className="flex justify-between">
                <b>{t.name}</b>
                {!t.published && <Badge status="draft">Hidden</Badge>}
              </div>
              <div className="text-xs text-slate-500">{t.role}</div>
              <p className="mt-1 text-sm">“{t.quote}”</p>
              <div className="mt-2 flex gap-1">
                <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit({ ...t, role: t.role || '', videoUrl: t.videoUrl || '', photo: t.photo || '' })}>
                  Edit
                </button>
                <button type="button" className="btn-ghost btn-sm text-red-600" onClick={() => window.confirm('Delete?') && act(() => api.delete(`/admin/testimonials/${t._id}`), 'Deleted').then(reload)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="No testimonials" />
      )}
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title="Testimonial">
        {edit && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const body = { name: edit.name, role: edit.role || undefined, quote: edit.quote, rating: Number(edit.rating), videoUrl: edit.videoUrl || undefined, photo: edit.photo || undefined, published: Boolean(edit.published), order: Number(edit.order || 0) };
              const r = await act(() => (edit._id ? api.put(`/admin/testimonials/${edit._id}`, body) : api.post('/admin/testimonials', body)), 'Saved');
              if (r) {
                setEdit(null);
                reload();
              }
            }}
          >
            <Input label="Name" value={edit.name} onChange={set('name')} required />
            <Input label="Role" value={edit.role} onChange={set('role')} placeholder="Parent, B.E. student…" />
            <Textarea label="Quote" value={edit.quote} onChange={set('quote')} required />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Rating" value={edit.rating} onChange={set('rating')} options={[5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} ★` }))} />
              <Input label="Order" type="number" value={edit.order} onChange={set('order')} />
            </div>
            <Input label="Video URL (optional)" value={edit.videoUrl} onChange={set('videoUrl')} />
            <ImageUpload label="Photo" value={edit.photo} onChange={(v) => setEdit({ ...edit, photo: v })} />
            <Checkbox label="Published" checked={Boolean(edit.published)} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} />
            <button type="submit" className="btn-primary w-full">
              Save
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}

const COUNSELLING_STATUS = ['pending', 'confirmed', 'completed', 'cancelled', 'follow-up'];
const COUNSELLING_TYPES = ['career', 'pre-primary', 'school', 'college-admission', 'personalized', 'abroad', 'appointment'];

function CounsellingAdmin() {
  const act = useAction();
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const { data, loading, reload } = useApi('/admin/counselling', { params: { type, status } });
  const counsellors = useApi('/admin/users', { params: { role: 'counsellor', limit: 100 } });
  const [open, setOpen] = useState(null);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select className="w-48" label="Type" value={type} onChange={(e) => setType(e.target.value)} placeholder="All" options={COUNSELLING_TYPES.map((t) => ({ value: t, label: titleCase(t) }))} />
        <Select className="w-44" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All" options={COUNSELLING_STATUS.map((t) => ({ value: t, label: titleCase(t) }))} />
        <button type="button" className="btn-outline btn-sm ml-auto" onClick={() => downloadCsv(`/admin/counselling.csv?type=${type}&status=${status}`, 'counselling.csv')}>
          ⬇ Export CSV
        </button>
      </div>
      {loading ? (
        <Loading />
      ) : data?.items?.length ? (
        <div className="card overflow-x-auto">
          <table className="table-x">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Preferred</th>
                <th>Assigned</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {c.phone} {c.city && `· ${c.city}`}
                    </div>
                  </td>
                  <td>{titleCase(c.type)}</td>
                  <td className="text-xs">
                    {titleCase(c.mode)}
                    <br />
                    {c.preferredDate ? date(c.preferredDate) : '—'} {c.preferredSlot}
                  </td>
                  <td>{c.assignedTo?.name || '—'}</td>
                  <td>
                    <Badge status={c.status} />
                  </td>
                  <td>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen({ ...c, assignedTo: c.assignedTo?._id || '', meetingLink: c.meetingLink || '', counsellorNotes: c.counsellorNotes || '' })}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No counselling requests" />
      )}
      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={`${open?.name || ''} – ${titleCase(open?.type)}`} wide>
        {open && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await act(() => api.patch(`/admin/counselling/${open._id}`, { status: open.status, assignedTo: open.assignedTo, meetingLink: open.meetingLink, counsellorNotes: open.counsellorNotes }), 'Updated');
              if (r) {
                setOpen(null);
                reload();
              }
            }}
          >
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p>
                📞 {open.phone} {open.email && `· ✉ ${open.email}`} {open.studentClass && `· ${open.studentClass}`}
              </p>
              {open.message && <p className="mt-1">{open.message}</p>}
              {open.details &&
                Object.entries(open.details).map(([k, v]) => (
                  <p key={k}>
                    <span className="text-slate-500">{titleCase(k)}:</span> {String(v)}
                  </p>
                ))}
              <p className="mt-1 text-xs text-slate-500">Received {dateTime(open.createdAt)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Status" value={open.status} onChange={(e) => setOpen({ ...open, status: e.target.value })} options={COUNSELLING_STATUS.map((s) => ({ value: s, label: titleCase(s) }))} />
              <Select label="Assign counsellor" value={open.assignedTo} onChange={(e) => setOpen({ ...open, assignedTo: e.target.value })} placeholder="Unassigned" options={(counsellors.data?.items || []).map((u) => ({ value: u.id, label: u.name }))} />
            </div>
            <Input label="Meeting link" value={open.meetingLink} onChange={(e) => setOpen({ ...open, meetingLink: e.target.value })} placeholder="Google Meet / Zoom link" />
            <Textarea label="Counsellor notes" value={open.counsellorNotes} onChange={(e) => setOpen({ ...open, counsellorNotes: e.target.value })} />
            <button type="submit" className="btn-primary w-full">
              Save
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Messages() {
  const act = useAction();
  const { data, loading, reload } = useApi('/admin/messages');
  if (loading) return <Loading />;
  if (!data?.items?.length) return <Empty title="No messages" />;
  return (
    <div className="space-y-3">
      {data.items.map((m) => (
        <div key={m._id} className={`card p-4 ${m.handled ? 'opacity-60' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <b>{m.name}</b>{' '}
              <span className="text-xs text-slate-500">
                {m.email} {m.phone} · {dateTime(m.createdAt)}
              </span>
            </div>
            <Checkbox label="Handled" checked={m.handled} onChange={(e) => act(() => api.patch(`/admin/messages/${m._id}`, { handled: e.target.checked })).then(reload)} />
          </div>
          {(m.subject || m.service) && <div className="text-sm font-semibold">{[m.service, m.subject].filter(Boolean).join(' · ')}</div>}
          <p className="text-sm text-slate-700">{m.message}</p>
        </div>
      ))}
    </div>
  );
}

function Users() {
  const act = useAction();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const debQ = useDebounced(q);
  const role = sp.get('role') || '';
  const { data, loading, reload } = useApi('/admin/users', { params: { role, q: debQ, page } });
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input className="w-56" label="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <Select className="w-44" label="Role" value={role} onChange={(e) => { setSp(e.target.value ? { role: e.target.value } : {}); setPage(1); }} placeholder="All" options={['student', 'institution', 'counsellor', 'admin']} />
      </div>
      {loading && !data ? (
        <Loading />
      ) : data?.items?.length ? (
        <>
          <div className="card overflow-x-auto">
            <table className="table-x">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Last login</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-slate-500">
                        {u.email} {u.phone && `· ${u.phone}`} {u.phoneVerified && '✔'}
                      </div>
                    </td>
                    <td>
                      <select aria-label="Role" className="input py-1 text-xs" value={u.role} onChange={(e) => act(() => api.patch(`/admin/users/${u.id}`, { role: e.target.value }), 'Role updated').then(reload)}>
                        {['student', 'institution', 'counsellor', 'admin'].map((r) => (
                          <option key={r} value={r}>
                            {titleCase(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{dateTime(u.lastLoginAt)}</td>
                    <td>
                      <Checkbox label="" checked={u.active !== false} onChange={(e) => act(() => api.patch(`/admin/users/${u.id}`, { active: e.target.checked }), 'Updated').then(reload)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      ) : (
        <Empty title="No users" />
      )}
    </div>
  );
}

function Master() {
  const act = useAction();
  const [kind, setKind] = useState('category');
  const { data, loading, reload } = useApi('/admin/master', { params: { kind } });
  const [name, setName] = useState('');
  return (
    <div>
      <Tabs tabs={data?.kinds || ['category', 'city', 'board', 'university', 'facility', 'stream']} value={kind} onChange={setKind} />
      <form
        className="mb-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await act(() => api.post('/admin/master', { kind, name }), 'Added');
          if (r) {
            setName('');
            reload();
          }
        }}
      >
        <input className="input max-w-xs" aria-label={`New ${kind}`} placeholder={`New ${kind}`} value={name} onChange={(e) => setName(e.target.value)} required />
        <button type="submit" className="btn-primary btn-sm">
          Add
        </button>
      </form>
      {loading ? (
        <Loading />
      ) : (
        <div className="flex flex-wrap gap-2">
          {(data?.items || []).map((m) => (
            <span key={m._id} className={`chip ${m.active ? '' : 'opacity-50'}`}>
              {m.name}
              <button type="button" title={m.active ? 'Hide' : 'Show'} onClick={() => act(() => api.put(`/admin/master/${m._id}`, { active: !m.active })).then(reload)}>
                {m.active ? '👁' : '🚫'}
              </button>
              <button type="button" aria-label={`Delete ${m.name}`} onClick={() => window.confirm(`Delete ${m.name}?`) && act(() => api.delete(`/admin/master/${m._id}`)).then(reload)}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationsAdmin() {
  const [status, setStatus] = useState('');
  const { data, loading } = useApi('/admin/applications', { params: { status } });
  return (
    <div>
      <Select className="mb-4 w-48" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All" options={['submitted', 'under-review', 'shortlisted', 'offered', 'admitted', 'rejected', 'withdrawn'].map((s) => ({ value: s, label: titleCase(s) }))} />
      {loading ? (
        <Loading />
      ) : data?.items?.length ? (
        <div className="card overflow-x-auto">
          <table className="table-x">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Institution</th>
                <th>Course</th>
                <th>Applied</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a._id}>
                  <td>
                    {a.personal.name}
                    <div className="text-xs text-slate-500">{a.personal.phone}</div>
                  </td>
                  <td>{a.institution?.name}</td>
                  <td>{a.courseName}</td>
                  <td>{date(a.createdAt)}</td>
                  <td>
                    <Badge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No applications" />
      )}
    </div>
  );
}

function Audit() {
  const { data, loading } = useApi('/admin/audit');
  if (loading) return <Loading />;
  if (!data?.items?.length) return <Empty title="No admin actions logged yet" />;
  return (
    <div className="card overflow-x-auto">
      <table className="table-x">
        <thead>
          <tr>
            <th>When</th>
            <th>Admin</th>
            <th>Action</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((a) => (
            <tr key={a._id}>
              <td className="whitespace-nowrap">{dateTime(a.createdAt)}</td>
              <td>{a.actor?.name}</td>
              <td>{a.action}</td>
              <td className="max-w-md truncate font-mono text-xs">{a.meta ? JSON.stringify(a.meta) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboard() {
  const stats = useApi('/admin/stats');
  const s = stats.data;
  const items = [
    { to: '', label: 'Overview', icon: '📊' },
    { to: 'institutions', label: 'Institutions', icon: '🏫', badge: s ? (s.institutions.pending || 0) + s.claims : 0 },
    { to: 'leads', label: 'Leads', icon: '📨' },
    { to: 'applications', label: 'Applications', icon: '📝' },
    { to: 'reviews', label: 'Reviews', icon: '★', badge: s?.pendingReviews },
    { to: 'spot', label: 'Spot admission', icon: '🔥', badge: s?.pendingSpots },
    { to: 'counselling', label: 'Counselling', icon: '🧭', badge: s?.pendingCounselling },
    { to: 'messages', label: 'Messages', icon: '✉', badge: s?.unreadMessages },
    { to: 'content', label: 'Content / CMS', icon: '📰' },
    { to: 'testimonials', label: 'Testimonials', icon: '💬' },
    { to: 'users', label: 'Users', icon: '👥' },
    { to: 'master', label: 'Master data', icon: '🗂' },
    { to: 'audit', label: 'Audit log', icon: '🧾' },
  ];
  return (
    <DashboardShell title="Admin panel" base="/admin" items={items}>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="institutions" element={<Institutions />} />
        <Route path="leads" element={<Leads />} />
        <Route path="applications" element={<ApplicationsAdmin />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="spot" element={<Spot />} />
        <Route path="spot-admissions" element={<Spot />} />
        <Route path="counselling" element={<CounsellingAdmin />} />
        <Route path="messages" element={<Messages />} />
        <Route path="content" element={<ContentAdmin />} />
        <Route path="testimonials" element={<TestimonialsAdmin />} />
        <Route path="users" element={<Users />} />
        <Route path="master" element={<Master />} />
        <Route path="audit" element={<Audit />} />
      </Routes>
    </DashboardShell>
  );
}
