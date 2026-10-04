import { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import DashboardShell from '../../components/DashboardShell.jsx';
import InstitutionCard from '../../components/InstitutionCard.jsx';
import PhoneOtp from '../../components/PhoneOtp.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Badge, Empty, ErrorBox, Input, Loading, Stat, Stars } from '../../components/ui.jsx';
import { api, errorMessage } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { date, dateTime, titleCase } from '../../lib/format.js';
import { useApi } from '../../lib/hooks.js';
import { useShortlist } from '../../lib/shortlist.js';

function Overview() {
  const shortlist = useApi('/me/shortlist');
  const enquiries = useApi('/me/enquiries');
  const apps = useApi('/me/applications');
  const notes = useApi('/me/notifications');
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Shortlisted" value={shortlist.data?.items?.length} to="shortlist" />
        <Stat label="Enquiries" value={enquiries.data?.items?.length} to="enquiries" />
        <Stat label="Applications" value={apps.data?.items?.length} to="applications" />
        <Stat label="Unread updates" value={notes.data?.unread} to="notifications" />
      </div>
      <div className="card p-5">
        <h2 className="mb-3 text-lg font-semibold">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/institutions" className="btn-primary btn-sm">
            Find institutions
          </Link>
          <Link to="/spot-admission" className="btn-outline btn-sm">
            Spot admission seats
          </Link>
          <Link to="/counselling" className="btn-outline btn-sm">
            Book counselling
          </Link>
          <Link to="/compare" className="btn-outline btn-sm">
            Compare
          </Link>
        </div>
      </div>
      <Notifications compact />
    </div>
  );
}

function Shortlist() {
  const { data, loading, error, reload } = useApi('/me/shortlist');
  const sl = useShortlist();
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const items = (data.items || []).filter((i) => sl.ids.size === 0 || sl.ids.has(i.id));
  if (!items.length) return <Empty title="No saved institutions" action={<Link to="/institutions" className="btn-primary">Browse</Link>}>Tap ♡ on any institution to save it here.</Empty>;
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((i) => (
        <InstitutionCard key={i.id} inst={i} shortlisted onShortlist={sl.toggle} />
      ))}
    </div>
  );
}

function Enquiries() {
  const { data, loading, error, reload } = useApi('/me/enquiries');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data.items.length) return <Empty title="No enquiries yet">Enquiries you send to institutions appear here.</Empty>;
  return (
    <div className="card overflow-x-auto">
      <table className="table-x">
        <thead>
          <tr>
            <th>Institution</th>
            <th>Course</th>
            <th>Type</th>
            <th>Status</th>
            <th>Last enquiry</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((l) => (
            <tr key={l.id}>
              <td>{l.institution ? <Link to={`/institutions/${l.institution.slug}`} className="font-medium text-brand-700">{l.institution.name}</Link> : '—'}</td>
              <td>{l.course || '—'}</td>
              <td>{titleCase(l.source)}</td>
              <td>
                <Badge status={l.status} />
              </td>
              <td>{dateTime(l.lastEnquiryAt || l.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Applications() {
  const { data, loading, error, reload } = useApi('/me/applications');
  const toast = useToast();
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data.items.length) return <Empty title="No applications yet" action={<Link to="/institutions" className="btn-primary">Find a course</Link>}>Use “Apply online” on any institution page.</Empty>;
  return (
    <div className="space-y-4">
      {data.items.map((a) => (
        <article key={a._id} className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{a.courseName}</h3>
              {a.institution && (
                <Link to={`/institutions/${a.institution.slug}`} className="text-sm text-brand-700">
                  {a.institution.name}
                </Link>
              )}
              <p className="text-xs text-slate-500">Applied {date(a.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge status={a.status} />
              {!['withdrawn', 'rejected', 'admitted'].includes(a.status) && (
                <button
                  type="button"
                  className="btn-ghost btn-sm text-red-600"
                  onClick={async () => {
                    if (!window.confirm('Withdraw this application?')) return;
                    try {
                      await api.post(`/me/applications/${a._id}/withdraw`);
                      toast('Application withdrawn');
                      reload();
                    } catch (err) {
                      toast(errorMessage(err), 'error');
                    }
                  }}
                >
                  Withdraw
                </button>
              )}
            </div>
          </div>
          <ol className="mt-4 border-l-2 border-slate-200 pl-4">
            {a.timeline.map((t) => (
              <li key={t._id || t.at} className="relative mb-2 text-sm">
                <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-600" />
                <b>{titleCase(t.status)}</b> <span className="text-slate-500">· {dateTime(t.at)}</span>
                {t.note && <div className="text-slate-600">{t.note}</div>}
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}

function CounsellingList() {
  const { data, loading, error, reload } = useApi('/me/counselling');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data.items.length) return <Empty title="No counselling sessions" action={<Link to="/counselling" className="btn-primary">Book a session</Link>} />;
  return (
    <div className="space-y-3">
      {data.items.map((c) => (
        <div key={c._id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="font-semibold">{titleCase(c.type)} counselling</div>
            <div className="text-sm text-slate-500">
              {titleCase(c.mode)} · {c.preferredDate ? date(c.preferredDate) : 'Date TBD'} {c.preferredSlot || ''}
            </div>
            {c.meetingLink && (
              <a href={c.meetingLink} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-700 underline">
                Join meeting
              </a>
            )}
          </div>
          <Badge status={c.status} />
        </div>
      ))}
    </div>
  );
}

function Reviews() {
  const { data, loading } = useApi('/me/reviews');
  if (loading) return <Loading />;
  if (!data?.items?.length) return <Empty title="You haven't written any reviews">Share your experience from any institution page.</Empty>;
  return (
    <div className="space-y-3">
      {data.items.map((r) => (
        <div key={r._id} className="card p-4">
          <div className="flex items-center justify-between">
            <Link to={`/institutions/${r.institution?.slug}`} className="font-semibold text-brand-700">
              {r.institution?.name}
            </Link>
            <Badge status={r.status} />
          </div>
          <Stars value={r.rating} />
          <p className="mt-1 text-sm text-slate-700">{r.body}</p>
        </div>
      ))}
    </div>
  );
}

function Alerts() {
  const { data, loading, reload } = useApi('/me/alerts');
  const toast = useToast();
  if (loading) return <Loading />;
  if (!data?.items?.length) return <Empty title="No spot-admission alerts" action={<Link to="/spot-admission" className="btn-primary">Set an alert</Link>} />;
  return (
    <div className="space-y-3">
      {data.items.map((a) => (
        <div key={a._id} className="card flex items-center justify-between p-4">
          <span>
            🔔 {a.course || 'Any course'} · {a.city || 'Any city'}
          </span>
          <button
            type="button"
            className="btn-ghost btn-sm text-red-600"
            onClick={async () => {
              await api.delete(`/me/alerts/${a._id}`);
              toast('Alert removed');
              reload();
            }}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

export function Notifications({ compact = false }) {
  const { data, loading, reload } = useApi('/me/notifications');
  if (loading) return <Loading />;
  const items = data?.items || [];
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Notifications</h2>
        {data?.unread > 0 && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={async () => {
              await api.post('/me/notifications/read');
              reload();
            }}
          >
            Mark all read
          </button>
        )}
      </div>
      {items.length ? (
        <ul className="divide-y divide-slate-100">
          {items.slice(0, compact ? 5 : 50).map((n) => (
            <li key={n._id} className={`py-2 text-sm ${n.read ? 'text-slate-500' : ''}`}>
              {!n.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent-500" />}
              {n.link ? (
                <Link to={n.link} className="font-medium">
                  {n.title}
                </Link>
              ) : (
                <span className="font-medium">{n.title}</span>
              )}
              {n.body && <span className="text-slate-500"> — {n.body}</span>}
              <span className="ml-2 text-xs text-slate-400">{dateTime(n.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">You're all caught up.</p>
      )}
    </div>
  );
}

export function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: user.name || '', email: user.email || '', profile: { city: '', currentClass: '', stream: '', marks: '', ...(user.profile || {}) } });
  const [phone, setPhone] = useState(user.phone || '');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState({ current: '', password: '' });
  const setP = (k) => (e) => setF({ ...f, profile: { ...f.profile, [k]: e.target.value } });
  const save = async (e) => {
    e.preventDefault();
    try {
      const { interests, ...profile } = f.profile;
      const { data } = await api.put('/me', { ...f, profile: { ...profile, interests: Array.isArray(interests) ? interests : undefined } });
      setUser(data.user);
      toast('Profile saved');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };
  return (
    <div className="space-y-6">
      <form onSubmit={save} className="card grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">Profile</h2>
        <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        {user.role === 'student' && (
          <>
            <Input label="City" value={f.profile.city || ''} onChange={setP('city')} />
            <Input label="Current class / qualification" value={f.profile.currentClass || ''} onChange={setP('currentClass')} />
            <Input label="Stream" value={f.profile.stream || ''} onChange={setP('stream')} />
            <Input label="Marks / percentage" value={f.profile.marks || ''} onChange={setP('marks')} />
          </>
        )}
        <div className="sm:col-span-2">
          <button type="submit" className="btn-brand">
            Save
          </button>
        </div>
      </form>
      <form
        className="card space-y-3 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const { data } = await api.post('/me/phone', { phone, code });
            setUser(data.user);
            setCode('');
            toast('Mobile verified');
          } catch (err) {
            toast(errorMessage(err), 'error');
          }
        }}
      >
        <h2 className="text-lg font-semibold">Mobile number {user.phoneVerified && <Badge status="approved">Verified</Badge>}</h2>
        <PhoneOtp phone={phone} onPhone={setPhone} code={code} onCode={setCode} purpose="login" />
        <button type="submit" className="btn-outline" disabled={code.length !== 6}>
          Verify mobile
        </button>
      </form>
      <form
        className="card grid gap-3 p-5 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.post('/auth/password', pw);
            setPw({ current: '', password: '' });
            toast('Password updated');
          } catch (err) {
            toast(errorMessage(err), 'error');
          }
        }}
      >
        <h2 className="text-lg font-semibold sm:col-span-2">Change password</h2>
        <Input label="Current password" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
        <Input label="New password" type="password" value={pw.password} minLength={8} onChange={(e) => setPw({ ...pw, password: e.target.value })} required autoComplete="new-password" />
        <div className="sm:col-span-2">
          <button type="submit" className="btn-outline">
            Update password
          </button>
        </div>
      </form>
    </div>
  );
}

export default function StudentDashboard() {
  const items = [
    { to: '', label: 'Overview', icon: '🏠' },
    { to: 'shortlist', label: 'Shortlist', icon: '♥' },
    { to: 'enquiries', label: 'Enquiries', icon: '📨' },
    { to: 'applications', label: 'Applications', icon: '📝' },
    { to: 'counselling', label: 'Counselling', icon: '🧭' },
    { to: 'alerts', label: 'Seat alerts', icon: '🔔' },
    { to: 'reviews', label: 'My reviews', icon: '★' },
    { to: 'notifications', label: 'Notifications', icon: '🔔' },
    { to: 'profile', label: 'Profile', icon: '👤' },
  ];
  return (
    <DashboardShell title="My dashboard" base="/student" items={items}>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="shortlist" element={<Shortlist />} />
        <Route path="enquiries" element={<Enquiries />} />
        <Route path="applications" element={<Applications />} />
        <Route path="counselling" element={<CounsellingList />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Routes>
    </DashboardShell>
  );
}
