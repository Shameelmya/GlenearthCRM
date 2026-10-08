'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useLeads } from '@/lib/hooks';
import { STAGES, TEMPS, getActions, isPaused, priorityScore, stageKey, tempKey, toDate, displayName } from '@/lib/crm';
import { LeadActionRow } from '@/components/bits';
import { cn } from '@/components/ui/Button';
import { isToday } from 'date-fns';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'action', label: 'Needs action' },
  { key: 'needs', label: 'AI paused' },
  { key: 'due', label: 'Follow-up due' },
  { key: 'new', label: 'New today' },
  { key: 'live', label: 'Live' },
];

function LeadsInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { data, isLoading } = useLeads();
  const [q, setQ] = useState('');
  const f = sp.get('f') || 'all';
  const stage = sp.get('stage') || '';
  const temp = sp.get('temp') || '';
  const [sort, setSort] = useState<'priority' | 'recent' | 'score'>('priority');

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v); else p.delete(k);
    router.replace(`/leads?${p.toString()}`);
  };

  const list = useMemo(() => {
    const now = new Date();
    let r = [...(data?.leads || [])];
    const s = q.trim().toLowerCase();
    if (s) r = r.filter((l) => [l.name, l.phone, l.location, l.contact_number].some((x) => (x || '').toLowerCase().includes(s)));
    if (stage) r = r.filter((l) => stageKey(l) === stage);
    if (temp) r = r.filter((l) => tempKey(l) === temp);
    if (f === 'action') r = r.filter((l) => getActions(l, now)[0].urgency !== 'none' && !['won', 'lost'].includes(stageKey(l)));
    if (f === 'needs') r = r.filter(isPaused);
    if (f === 'due') r = r.filter((l) => getActions(l, now).some((a) => a.kind === 'followup' && (a.urgency === 'now' || a.urgency === 'today')));
    if (f === 'new') r = r.filter((l) => { const d = toDate(l.createdAt); return d && isToday(d); });
    if (f === 'live') r = r.filter((l) => { const d = toDate(l.last_message_at); return d && now.getTime() - d.getTime() < 15 * 60000; });
    r.sort((a, b) =>
      sort === 'priority' ? priorityScore(b, now) - priorityScore(a, now)
      : sort === 'score' ? Number(b.lead_score || 0) - Number(a.lead_score || 0)
      : (toDate(b.last_message_at)?.getTime() || 0) - (toDate(a.last_message_at)?.getTime() || 0));
    return r;
  }, [data, q, f, stage, temp, sort]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="text-xs text-[var(--color-muted-foreground)]">{list.length} shown. Each row shows what to do next.</p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or place" className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]" />
        </div>
        <select value={stage} onChange={(e) => set('stage', e.target.value)} className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-2 text-sm">
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={temp} onChange={(e) => set('temp', e.target.value)} className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-2 text-sm">
          <option value="">Any temperature</option>
          {TEMPS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-2 text-sm">
          <option value="priority">Sort: Priority</option>
          <option value="recent">Sort: Recent chat</option>
          <option value="score">Sort: Lead score</option>
        </select>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {FILTERS.map((x) => (
          <button key={x.key} onClick={() => set('f', x.key === 'all' ? '' : x.key)} className={cn('shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors', f === x.key ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-white' : 'border-[var(--color-border)] bg-white text-slate-600 hover:bg-slate-50')}>{x.label}</button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
        {isLoading ? <p className="p-8 text-center text-sm text-gray-500">Loading...</p>
          : list.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">No leads match.</p>
          : list.map((l) => <LeadActionRow key={l.phone} lead={l} />)}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  return <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading...</div>}><LeadsInner /></Suspense>;
}
