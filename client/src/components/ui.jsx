import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_COLOR, titleCase } from '../lib/format.js';

export function Field({ label, error, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Input({ label, hint, error, className = '', ...props }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <input className="input" {...props} />
    </Field>
  );
}

export function Textarea({ label, hint, error, className = '', rows = 4, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <textarea className="input" rows={rows} {...props} />
    </Field>
  );
}

export function Select({ label, hint, error, className = '', options = [], placeholder, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <select className="input" {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function Checkbox({ label, className = '', ...props }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2 text-sm text-slate-700 ${className}`}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Badge({ status, children, className = '' }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[status] || 'bg-slate-100 text-slate-700'} ${className}`}>{children || titleCase(status)}</span>;
}

export function Stars({ value = 0, size = 'text-sm' }) {
  const full = Math.round(value);
  return (
    <span className={`${size} text-amber-500`} aria-label={`${value} out of 5`}>
      {'★★★★★'.slice(0, full)}
      <span className="text-slate-300">{'★★★★★'.slice(full)}</span>
    </span>
  );
}

export function Spinner({ className = '' }) {
  return <span className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} role="status" aria-label="Loading" />;
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <Spinner /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
      {message}
      {onRetry && (
        <button type="button" className="ml-3 font-semibold underline" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Empty({ title = 'Nothing here yet', children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mb-3 text-4xl" aria-hidden>
        🎓
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-md text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button type="button" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const nums = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p += 1) nums.push(p);
  return (
    <nav className="mt-6 flex items-center justify-center gap-1" aria-label="Pagination">
      <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹ Prev
      </button>
      {nums.map((p) => (
        <button key={p} type="button" className={`btn-sm btn ${p === page ? 'bg-brand-800 text-white' : 'btn-outline'}`} aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}>
          {p}
        </button>
      ))}
      <button type="button" className="btn-outline btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next ›
      </button>
    </nav>
  );
}

export function Stat({ label, value, hint, to }) {
  const body = (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-slate-900">{value ?? '—'}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
  return to ? (
    <Link to={to} className="block transition hover:-translate-y-0.5">
      {body}
    </Link>
  ) : (
    body
  );
}

export function SectionTitle({ eyebrow, title, sub, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-widest text-accent-600">{eyebrow}</div>}
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        {sub && <p className="mt-1 max-w-2xl text-slate-600">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {tabs.map((t) => {
        const v = typeof t === 'string' ? t : t.value;
        const l = typeof t === 'string' ? titleCase(t) : t.label;
        return (
          <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${value === v ? 'border-accent-500 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {l}
          </button>
        );
      })}
    </div>
  );
}
