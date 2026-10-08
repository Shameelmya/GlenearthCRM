'use client';

import Link from 'next/link';
import { useLeads, useUpdateLead } from '@/lib/hooks';
import { STAGES, displayName, getActions, money, stageKey, tempKey, tempInfo } from '@/lib/crm';
import { Avatar, UrgencyChip } from '@/components/bits';
import { useState } from 'react';
import type { Lead } from '@/types';

export default function PipelinePage() {
  const { data, isLoading } = useLeads();
  const upd = useUpdateLead();
  const [drag, setDrag] = useState<Lead | null>(null);
  const leads = data?.leads || [];

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-xs text-[var(--color-muted-foreground)]">Drag a card to another stage to move it. Tap a card to open the chat.</p>
      </header>
      {isLoading ? <p className="text-sm text-gray-500">Loading...</p> : (
        <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
          {STAGES.map((s) => {
            const col = leads.filter((l) => stageKey(l) === s.key);
            const total = col.reduce((t, l) => t + Number(l.payment_total || 0), 0);
            return (
              <div key={s.key} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag && stageKey(drag) !== s.key) upd.mutate({ lead: drag, updates: { lead_stage: s.key } }); setDrag(null); }} className="flex w-64 shrink-0 flex-col rounded-xl bg-black/[0.04] p-2">
                <div className="mb-2 flex items-center justify-between px-1.5 pt-1">
                  <span className="flex items-center gap-2 text-xs font-bold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>
                  <span className="text-xs font-semibold text-slate-500">{col.length}{total ? ` · ${money(total)}` : ''}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {col.map((l) => {
                    const a = getActions(l)[0];
                    const t = tempInfo(tempKey(l));
                    return (
                      <Link key={l.phone} href={`/leads/${encodeURIComponent(l.phone)}`} draggable onDragStart={() => setDrag(l)} className="block rounded-lg border border-[var(--color-border)] bg-white p-2.5 shadow-sm hover:shadow-soft">
                        <div className="flex items-center gap-2">
                          <Avatar lead={l} size={26} />
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{displayName(l)}</p>
                          <span className="h-2 w-2 rounded-full" style={{ background: t.color }} title={t.label} />
                        </div>
                        {l.location && <p className="mt-1 truncate text-[11px] text-slate-500">{l.location}</p>}
                        <div className="mt-2 flex items-start gap-1.5"><UrgencyChip u={a.urgency} /><p className="text-[11px] font-medium leading-snug text-slate-700">{a.title}</p></div>
                      </Link>
                    );
                  })}
                  {col.length === 0 && <p className="px-2 py-6 text-center text-[11px] text-slate-400">Empty</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
