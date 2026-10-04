import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function DashboardShell({ title, base, items, children, header }) {
  const { user } = useAuth();
  return (
    <div className="container-x py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-slate-500">
            Signed in as {user?.name} · {user?.email || user?.phone}
          </p>
        </div>
        {header}
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:sticky lg:top-24 lg:flex-col lg:self-start" aria-label="Dashboard">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to ? `${base}/${i.to}` : base}
              end={!i.to}
              className={({ isActive }) => `flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-800 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <span>
                {i.icon} {i.label}
              </span>
              {i.badge ? <span className="rounded-full bg-accent-500 px-1.5 text-[10px] font-bold text-white">{i.badge}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
