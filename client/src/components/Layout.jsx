import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { dashboardPath, useAuth } from '../lib/auth.jsx';
import { useCompare } from '../lib/compare.jsx';
import { LANGS, useI18n } from '../lib/i18n.jsx';

const PHONE = '+91 8780596840';
const EMAIL = 'info@thespotadmission.co.in';

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="The Spot Admission home">
      <img src="/favicon.svg" alt="" className="h-9 w-9" />
      <span className="leading-tight">
        <span className="block font-display text-lg font-bold text-brand-800">The Spot Admission</span>
        <span className="block text-[10px] font-semibold uppercase tracking-widest text-accent-600">Counselling &amp; Admission</span>
      </span>
    </Link>
  );
}

function CompareBar() {
  const { items, remove, clear } = useCompare();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (!items.length || pathname === '/compare') return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-4px_12px_rgba(0,0,0,.06)] backdrop-blur">
      <div className="container-x flex flex-wrap items-center gap-2 py-3">
        <span className="text-sm font-semibold">Compare ({items.length}/4):</span>
        {items.map((i) => (
          <span key={i.id} className="chip">
            {i.name}
            <button type="button" aria-label={`Remove ${i.name}`} onClick={() => remove(i.id)}>
              ✕
            </button>
          </span>
        ))}
        <div className="ml-auto flex gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={clear}>
            Clear
          </button>
          <button type="button" className="btn-primary btn-sm" disabled={items.length < 2} onClick={() => navigate('/compare')}>
            Compare now
          </button>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navKey = location.pathname + location.search;
  const [lastKey, setLastKey] = useState(navKey);
  if (lastKey !== navKey) {
    setLastKey(navKey);
    setOpen(false);
  }

  const nav = [
    { to: '/institutions?type=school', label: t('schools') },
    { to: '/institutions?type=college', label: t('colleges') },
    { to: '/spot-admission', label: t('spot'), hot: true },
    { to: '/counselling', label: t('counselling') },
    { to: '/news', label: t('news') },
    { to: '/compare', label: t('compare') },
  ];
  const more = [
    { to: '/admission-form', label: 'Admission Form' },
    { to: '/virtual-tours', label: 'Virtual Tours' },
    { to: '/podcasts', label: 'Podcasts' },
    { to: '/testimonials', label: 'Testimonials' },
    { to: '/about', label: 'About Us' },
    { to: '/contact', label: 'Contact' },
  ];
  const linkCls = ({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'text-brand-800' : 'text-slate-700 hover:text-brand-800'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="hidden bg-brand-900 text-xs text-brand-100 sm:block">
        <div className="container-x flex items-center justify-between py-1.5">
          <span>
            📞 <a href={`tel:${PHONE.replace(/\s/g, '')}`}>{PHONE}</a> · ✉ <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </span>
          <span className="flex items-center gap-3">
            <Link to="/institution/register" className="hover:text-white">
              List your institution
            </Link>
            <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value)} className="rounded bg-brand-800 px-1 py-0.5 text-xs text-white">
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </span>
        </div>
      </div>
      <div className="container-x flex h-16 items-center gap-4">
        <Logo />
        <nav className="ml-6 hidden items-center lg:flex" aria-label="Main">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkCls}>
              {n.label}
              {n.hot && <span className="ml-1 rounded bg-accent-500 px-1 text-[10px] font-bold text-white">LIVE</span>}
            </NavLink>
          ))}
          <div className="group relative">
            <button type="button" className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-800" aria-haspopup="true">
              {t('more')} ▾
            </button>
            <div className="invisible absolute left-0 top-full w-52 rounded-lg border border-slate-200 bg-white py-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              {more.map((m) => (
                <Link key={m.to} to={m.to} className="block px-4 py-2 text-sm hover:bg-slate-50">
                  {m.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Link to={dashboardPath(user.role)} className="btn-outline btn-sm">
                {t('dashboard')}
              </Link>
              <button type="button" className="btn-ghost btn-sm" onClick={logout}>
                {t('logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm">
                {t('login')}
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                {t('register')}
              </Link>
            </>
          )}
        </div>
        <button type="button" className="ml-auto rounded-md p-2 lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="block h-0.5 w-6 bg-slate-800" />
          <span className="mt-1.5 block h-0.5 w-6 bg-slate-800" />
          <span className="mt-1.5 block h-0.5 w-6 bg-slate-800" />
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <nav className="container-x flex flex-col py-3" aria-label="Mobile">
            {[...nav, ...more].map((n) => (
              <NavLink key={n.to} to={n.to} className={linkCls}>
                {n.label}
              </NavLink>
            ))}
            <Link to="/institution/register" className="rounded-md px-3 py-2 text-sm font-medium text-accent-600">
              List your institution
            </Link>
            <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">
              {user ? (
                <>
                  <Link to={dashboardPath(user.role)} className="btn-outline flex-1">
                    {t('dashboard')}
                  </Link>
                  <button type="button" className="btn-ghost flex-1" onClick={logout}>
                    {t('logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-outline flex-1">
                    {t('login')}
                  </Link>
                  <Link to="/register" className="btn-primary flex-1">
                    {t('register')}
                  </Link>
                </>
              )}
            </div>
            <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value)} className="input mt-3">
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const cols = [
    {
      title: 'Explore',
      links: [
        ['/institutions?type=school', 'Schools'],
        ['/institutions?type=college', 'Colleges'],
        ['/institutions?type=preschool', 'Pre-Schools'],
        ['/spot-admission', 'Spot Admission'],
        ['/compare', 'Compare'],
      ],
    },
    {
      title: 'Services',
      links: [
        ['/counselling?type=career', 'Career Guidance'],
        ['/counselling?type=college-admission', 'College Admission Counselling'],
        ['/counselling?type=pre-primary', 'Pre-Primary Counselling'],
        ['/counselling?type=personalized', 'Personalized Counselling'],
        ['/admission-form', 'Admission Form'],
      ],
    },
    {
      title: 'Resources',
      links: [
        ['/news', 'News & Articles'],
        ['/podcasts', 'Podcasts'],
        ['/virtual-tours', 'Virtual Tours'],
        ['/testimonials', 'Testimonials'],
        ['/faq', 'FAQ'],
      ],
    },
    {
      title: 'Company',
      links: [
        ['/about', 'About Us'],
        ['/contact', 'Contact'],
        ['/institution/register', 'List your institution'],
        ['/privacy', 'Privacy Policy'],
        ['/terms', 'Terms of Use'],
      ],
    },
  ];
  return (
    <footer className="mt-16 bg-slate-900 text-slate-300">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <div className="font-display text-xl font-bold text-white">The Spot Admission</div>
          <p className="mt-2 text-sm text-slate-400">Counselling &amp; admission support for students and parents — from pre-primary to higher education.</p>
          <p className="mt-4 text-sm">
            📞 <a href={`tel:${PHONE.replace(/\s/g, '')}`}>{PHONE}</a>
            <br />✉ <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">{c.title}</div>
            <ul className="space-y-2 text-sm">
              {c.links.map(([to, l]) => (
                <li key={to}>
                  <Link to={to} className="hover:text-white">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} The Spot Admission. All rights reserved.</div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <a href={`https://wa.me/91${PHONE.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-2xl text-white shadow-lg hover:bg-green-600">
        ✆
      </a>
      <CompareBar />
    </div>
  );
}
