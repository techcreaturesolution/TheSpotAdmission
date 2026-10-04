export const inr = (n) => (typeof n === 'number' ? `₹${n.toLocaleString('en-IN')}` : '—');

export function feeRange(fees) {
  if (!fees || (fees.min == null && fees.max == null)) return 'Fees on request';
  if (fees.min === fees.max || fees.max == null) return `${inr(fees.min)}/yr approx.`;
  if (fees.min == null) return `Up to ${inr(fees.max)}/yr`;
  return `${inr(fees.min)} – ${inr(fees.max)}/yr`;
}

export const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const dateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export function daysLeft(d) {
  const ms = new Date(d).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400_000));
}

export const titleCase = (s) => String(s || '').replace(/(^|[-\s])(\w)/g, (_m, p, c) => `${p === '-' ? ' ' : p}${c.toUpperCase()}`);

export const TYPE_LABEL = { school: 'School', preschool: 'Pre-School', college: 'College', university: 'University', coaching: 'Coaching' };

export const STATUS_COLOR = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-indigo-100 text-indigo-800',
  interested: 'bg-amber-100 text-amber-800',
  applied: 'bg-purple-100 text-purple-800',
  admitted: 'bg-green-100 text-green-800',
  'not-interested': 'bg-slate-200 text-slate-700',
  spam: 'bg-red-100 text-red-700',
  draft: 'bg-slate-200 text-slate-700',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-red-100 text-red-700',
  live: 'bg-green-100 text-green-800',
  closed: 'bg-slate-200 text-slate-700',
  submitted: 'bg-blue-100 text-blue-800',
  'under-review': 'bg-amber-100 text-amber-800',
  shortlisted: 'bg-indigo-100 text-indigo-800',
  offered: 'bg-purple-100 text-purple-800',
  withdrawn: 'bg-slate-200 text-slate-700',
  confirmed: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-slate-200 text-slate-700',
  'follow-up': 'bg-purple-100 text-purple-800',
};

export const mediaUrl = (u) => u || '';

export function embedUrl(url) {
  if (!url) return '';
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return url;
}
