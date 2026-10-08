'use client';
import Link from 'next/link';
import { Phone, MessageSquare, Bot, UserCheck, Clock } from 'lucide-react';
import { format, formatDistanceToNowStrict, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/components/ui/Button';
import type { Lead } from '@/types';
import { displayName, getActions, phoneForCall, stageInfo, stageKey, tempInfo, tempKey, type Action, type Urgency } from '@/lib/crm';

const AV = ['#1f7a4a', '#2563eb', '#c2410c', '#7c3aed', '#be123c', '#0e7490', '#a16207'];
export function Avatar({ lead, size = 40 }: { lead: Lead; size?: number }) {
  const n = displayName(lead);
  let h = 0;
  for (const c of n) h = c.charCodeAt(0) + ((h << 5) - h);
  const ini = /^\+?\d/.test(n) ? '#' : n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: AV[Math.abs(h) % AV.length], fontSize: size * 0.38 }}>
      {ini || '?'}
    </div>
  );
}

export function TempDot({ lead }: { lead: Lead }) {
  const t = tempInfo(tempKey(lead));
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: t.color }}>
      <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
      {t.label}
    </span>
  );
}

export function StageChip({ lead }: { lead: Lead }) {
  const s = stageInfo(stageKey(lead));
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: s.color + '1f', color: s.color }}>
      {s.label}
    </span>
  );
}

const URG: Record<Urgency, string> = {
  now: 'bg-red-50 text-red-700 ring-red-200',
  today: 'bg-amber-50 text-amber-800 ring-amber-200',
  soon: 'bg-blue-50 text-blue-700 ring-blue-200',
  later: 'bg-slate-100 text-slate-600 ring-slate-200',
  none: 'bg-slate-50 text-slate-500 ring-slate-200',
};
export const URG_LABEL: Record<Urgency, string> = { now: 'Do now', today: 'Today', soon: 'Soon', later: 'Later', none: 'Done' };

export function UrgencyChip({ u }: { u: Urgency }) {
  return <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1', URG[u])}>{URG_LABEL[u]}</span>;
}

export function whenLabel(d?: Date | null) {
  if (!d) return '';
  const diff = d.getTime() - Date.now();
  if (diff < 0 && diff > -3600000 * 24 * 30) return `${formatDistanceToNowStrict(d)} ago`;
  if (diff >= 0 && diff < 3600000) return `in ${formatDistanceToNowStrict(d)}`;
  if (isToday(d)) return `Today ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow ${format(d, 'h:mm a')}`;
  return format(d, 'EEE d MMM, h:mm a');
}

export function ActionLine({ a, compact }: { a: Action; compact?: boolean }) {
  const Icon = a.kind === 'auto' ? Bot : a.kind === 'reply' ? MessageSquare : a.kind === 'call' ? Phone : a.kind === 'followup' ? Clock : UserCheck;
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]" />
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug text-[var(--color-foreground)]">
          {a.title}
          {a.at && <span className="ml-2 text-xs font-medium text-[var(--color-muted-foreground)]">{whenLabel(a.at)}</span>}
        </p>
        {!compact && a.detail && <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{a.detail}</p>}
      </div>
    </div>
  );
}

export function QuickButtons({ lead, className }: { lead: Lead; className?: string }) {
  const tel = phoneForCall(lead);
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Link href={`/leads/${encodeURIComponent(lead.phone)}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--color-brand-dark)]">
        <MessageSquare className="h-3.5 w-3.5" /> Open
      </Link>
      {tel && (
        <a href={`tel:${tel}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 text-xs font-semibold hover:bg-gray-50">
          <Phone className="h-3.5 w-3.5" /> Call
        </a>
      )}
    </div>
  );
}

/** One lead as a "next action" row: used on Today and Leads. */
export function LeadActionRow({ lead }: { lead: Lead }) {
  const a = getActions(lead)[0];
  return (
    <div className="flex items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-0">
      <Avatar lead={lead} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link href={`/leads/${encodeURIComponent(lead.phone)}`} className="truncate text-sm font-semibold hover:underline">{displayName(lead)}</Link>
          <TempDot lead={lead} />
          <StageChip lead={lead} />
        </div>
        <div className="mt-1.5 flex items-start gap-2">
          <UrgencyChip u={a.urgency} />
          <div className="min-w-0"><ActionLine a={a} /></div>
        </div>
      </div>
      <QuickButtons lead={lead} className="hidden shrink-0 sm:flex" />
    </div>
  );
}
