import { useRef, useState } from 'react';
import { errorMessage, uploadFile } from '../lib/api.js';
import { useToast } from './Toast.jsx';
import { Spinner } from './ui.jsx';

export default function ImageUpload({ label, value, onChange, accept = 'image/*', multiple = false }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const list = multiple ? value || [] : value ? [value] : [];

  async function onFiles(files) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls = [];
      for (const f of files) urls.push(await uploadFile(f));
      onChange(multiple ? [...list, ...urls] : urls[0]);
    } catch (err) {
      toast(errorMessage(err, 'Upload failed'), 'error');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  }

  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div className="flex flex-wrap items-center gap-3">
        {list.map((u) => (
          <div key={u} className="relative">
            {/\.pdf($|\?)/i.test(u) ? (
              <a href={u} target="_blank" rel="noreferrer" className="chip">
                PDF
              </a>
            ) : (
              <img src={u} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
            )}
            <button type="button" aria-label="Remove" className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white text-xs shadow ring-1 ring-slate-200" onClick={() => onChange(multiple ? list.filter((x) => x !== u) : '')}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="btn-outline btn-sm" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : '⬆'} {multiple || !list.length ? 'Upload' : 'Replace'}
        </button>
        <input ref={ref} type="file" className="hidden" accept={accept} multiple={multiple} onChange={(e) => onFiles([...e.target.files])} />
      </div>
    </div>
  );
}
