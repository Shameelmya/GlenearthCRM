'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { format, isToday, isTomorrow, startOfDay, addDays } from 'date-fns';
import { Flame, Siren, CalendarClock, Sparkles, Wallet, Activity, RefreshCw, Bot } from 'lucide-react';
import { useLeads } from '@/lib/hooks';
import { ACTIVE_STAGES, STAGES, TEMPS, getActions, isPaused, money, priorityScore, stageKey, tempKey, toDate, displayName, currentStatus } from '@/lib/crm';
import { Avatar, LeadActionRow, whenLabel } from '@/components/bits';
import { cn } from '@/components/ui/Button';
import type { Lead } from '@/types';

function Kpi({ icon: Icon, label, value, tone, href }: any) {
  const tones: any = { red: 'text-red-600 bg-red-50', amber: 'text-amber-700 bg-amber-50', green: 'text-emerald-700 bg-emerald-50', blue: 'text-blue-700 bg-blue-50', slate: 'text-slate-700 bg-slate-100' };
  return (
    <Link href={href || '/leads'} className="rounded-xl border border-[var(--color-border)] bg-white p-3.5 transition-shadow hover:shadow-soft">
      <span className={cn('mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg', tones[tone])}><Icon className="h-4 w-4" /></span>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{label}</p>
    </Link>
  );
}

function Bars({ title, rows, hint }: { title: string; hint?: string; rows: { label: string; value: number; color: string; href?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-white p-4">
      <h3 className="text-sm font-bold">{title}</h3>
      {hint && <p className="mb-3 text-xs text-[var(--color-muted-foreground)]">{hint}</p>}
      <div className="mt-2 space-y-2">
        {rows.length === 0 && <p className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">No data yet</p>}
        {rows.map((r) => {
          const inner = (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 truncate text-[var(--color-muted-foreground)]">{r.label}</span>
              <div className="h-5 flex-1 rounded bg-slate-100"><div className="h-5 rounded" style={{ width: `${(r.value / max) * 100}%`, background: r.color, minWidth: r.value ? 6 : 0 }} /></div>
              <span className="w-6 text-right font-semibold">{r.value}</span>
            </div>
          );
          return r.href ? <Link key={r.label} href={r.href} className="block hover:opacity-80">{inner}</Link> : <div key={r.label}>{inner}</div>;
        })}
      </div>
    </section>
  );
}

function tally(leads: Lead[], pick: (l: Lead) => string | null | undefined) {
  const m: Record<string, number> = {};
  leads.forEach((l) => { const k = (pick(l) || '').trim().toLowerCase(); if (k && k !== 'unknown') m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

export default function TodayPage() {
  const { data, isLoading, error, refetch, isFetching } = useLeads();
  const leads = data?.leads || [];
  const now = new Date();

  const m = useMemo(() => {
    const live = leads.filter((l) => !['won', 'lost'].includes(stageKey(l)));
    const queue = live
      .map((l) => ({ l, a: getActions(l)[0] }))
      .filter((x) => x.a.urgency !== 'none')
      .sort((x, y) => priorityScore(y.l) - priorityScore(x.l));
    const needsYou = leads.filter(isPaused);
    const dueNow = live.filter((l) => getActions(l).some((a) => a.kind === 'followup' && a.urgency === 'now'));
    const hot = live.filter((l) => tempKey(l) === 'hot');
    const newToday = leads.filter((l) => { const d = toDate(l.createdAt); return d && isToday(d); });
    const pipeline = live.filter((l) => ['proposal_submitted', 'negotiation', 'site_visit'].includes(stageKey(l))).reduce((s, l) => s + Number(l.payment_total || 0), 0);
    const liveChats = leads.filter((l) => { const d = toDate(l.last_message_at); return d && now.getTime() - d.getTime() < 15 * 60000; });

    // agenda: next 7 days of scheduled follow-ups and auto nudges
    const horizon = addDays(startOfDay(now), 8).getTime();
    const agenda: { lead: Lead; at: Date; title: string; auto: boolean; reason?: string | null }[] = [];
    live.forEach((l) => getActions(l, now).forEach((a) => {
      if ((a.kind === 'followup' || a.kind === 'auto') && a.at && a.at.getTime() < horizon) agenda.push({ lead: l, at: a.at, title: a.title, auto: a.kind === 'auto', reason: a.detail });
    }));
    agenda.sort((x, y) => x.at.getTime() - y.at.getTime());
    return { queue, needsYou, dueNow, hot, newToday, pipeline, liveChats, agenda, live };
  }, [leads]); // eslint-disable-line

  if (isLoading) return <div className="p-8 text-center text-sm text-gray-500">Loading your day...</div>;
  if (error) return <div className="p-8 text-center text-sm text-red-600">Could not load data. Check the connection and refresh.</div>;

  const groups: Record<string, typeof m.agenda> = {};
  m.agenda.forEach((x) => {
    const k = x.at.getTime() < now.getTime() ? 'Overdue' : isToday(x.at) ? 'Today' : isTomorrow(x.at) ? 'Tomorrow' : format(x.at, 'EEE d MMM');
    (groups[k] ||= []).push(x);
  });

  const stageRows = STAGES.filter((s) => ACTIVE_STAGES.includes(s.key)).map((s) => ({ label: s.label, color: s.color, value: m.live.filter((l) => stageKey(l) === s.key).length, href: `/leads?stage=${s.key}` }));
  const tempRows = TEMPS.map((t) => ({ label: t.label, color: t.color, value: m.live.filter((l) => tempKey(l) === t.key).length, href: `/leads?temp=${t.key}` }));
  const lost = tally(leads.filter((l) => stageKey(l) === 'lost'), (l) => l.lost_reason).map(([label, value]) => ({ label, value, color: '#94a3b8' }));
  const concerns = tally(m.live, (l) => l.main_concern).map(([label, value]) => ({ label, value, color: '#1f7a4a' }));
  const sources = tally(leads, (l) => l.lead_source).map(([label, value]) => ({ label, value, color: '#6366f1' }));

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)]">{format(now, 'EEEE, d MMMM')}</p>
          <h1 className="text-2xl font-bold tracking-tight">Today</h1>
        </div>
        <button onClick={() => refetch()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 text-xs font-semibold hover:bg-gray-50">
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} /> Refresh
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Siren} label="Need you now" value={m.needsYou.length} tone="red" href="/leads?f=needs" />
        <Kpi icon={CalendarClock} label="Follow-ups due" value={m.dueNow.length} tone="amber" href="/leads?f=due" />
        <Kpi icon={Flame} label="Hot leads" value={m.hot.length} tone="red" href="/leads?temp=hot" />
        <Kpi icon={Sparkles} label="New today" value={m.newToday.length} tone="blue" href="/leads?f=new" />
        <Kpi icon={Activity} label="Live chats" value={m.liveChats.length} tone="green" href="/leads?f=live" />
        <Kpi icon={Wallet} label="Pipeline value" value={money(m.pipeline)} tone="slate" href="/pipeline" />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white lg:col-span-3">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <div>
              <h2 className="text-sm font-bold">Do next</h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">Most important first. Top one is your next move.</p>
            </div>
            <Link href="/leads" className="text-xs font-semibold text-[var(--color-brand)]">All leads</Link>
          </div>
          {m.queue.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--color-muted-foreground)]">Nothing waiting on you. AI is handling everything.</p>
          ) : (
            m.queue.slice(0, 10).map(({ l }) => <LeadActionRow key={l.phone} lead={l} />)
          )}
          {m.queue.length > 10 && <Link href="/leads?f=action" className="block border-t border-[var(--color-border)] p-3 text-center text-xs font-semibold text-[var(--color-brand)]">See all {m.queue.length} actions</Link>}
        </section>

        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-xl border border-[var(--color-border)] bg-white">
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <h2 className="text-sm font-bold">Coming up (7 days)</h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">Follow-ups you scheduled and AI nudges lined up.</p>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {Object.keys(groups).length === 0 && <p className="p-6 text-center text-xs text-[var(--color-muted-foreground)]">Nothing scheduled.</p>}
              {Object.entries(groups).map(([day, items]) => (
                <div key={day}>
                  <p className={cn('sticky top-0 bg-slate-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide', day === 'Overdue' ? 'text-red-600' : 'text-slate-500')}>{day}</p>
                  {items.map((x, i) => (
                    <Link key={x.lead.phone + i} href={`/leads/${encodeURIComponent(x.lead.phone)}`} className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-2.5 last:border-0 hover:bg-slate-50">
                      <Avatar lead={x.lead} size={30} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{displayName(x.lead)}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-[var(--color-muted-foreground)]">{x.auto && <Bot className="h-3 w-3" />}{x.auto ? x.title : x.reason || x.title}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-slate-600">{x.at.getTime() < now.getTime() ? whenLabel(x.at) : format(x.at, 'h:mm a')}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {m.liveChats.length > 0 && (
            <section className="rounded-xl border border-[var(--color-border)] bg-white p-4">
              <h2 className="mb-2 text-sm font-bold">Live right now</h2>
              <div className="space-y-2">
                {m.liveChats.slice(0, 5).map((l) => (
                  <Link key={l.phone} href={`/leads/${encodeURIComponent(l.phone)}`} className="flex items-center gap-2 text-sm hover:underline">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span className="font-medium">{displayName(l)}</span>
                    <span className="truncate text-xs text-[var(--color-muted-foreground)]">{currentStatus(l).label}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Bars title="Pipeline" hint="Active leads by stage" rows={stageRows} />
        <Bars title="Lead temperature" hint="From start timeline and score" rows={tempRows} />
        <Bars title="Main concerns" hint="What customers worry about" rows={concerns} />
        <Bars title="Lost reasons" hint="Objection diary" rows={lost} />
      </div>
      {sources.length > 0 && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Bars title="Lead sources" rows={sources} /></div>}
    </div>
  );
}
