'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, addHours, format, isSameDay, isValid, parseISO, setHours, setMinutes, startOfDay } from 'date-fns';
import { ArrowLeft, Bot, CalendarClock, FileDown, FileText, MessageSquare, PauseCircle, PlayCircle, Phone, Send, User, UserCheck, X } from 'lucide-react';
import { useLeads, useMessages, useToggleAi, useUpdateLead } from '@/lib/hooks';
import {
  CONCERNS, DECISION_MAKERS, LOST_REASONS, SERVICE_TYPES, SOURCES, STAGES, TEMPS,
  currentStatus, displayName, getActions, isPaused, money, phoneForCall, stageKey, tempKey, toDate,
} from '@/lib/crm';
import { ActionLine, Avatar, StageChip, TempDot, UrgencyChip } from '@/components/bits';
import { cn } from '@/components/ui/Button';
import type { Lead } from '@/types';

/* ---------- small editable field ---------- */
function Field({ label, value, onSave, options, type = 'text', wide }: { label: string; value?: string | number | null; onSave: (v: string) => void; options?: string[]; type?: string; wide?: boolean }) {
  const v = value == null ? '' : String(value);
  const base = 'mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]';
  return (
    <label className={cn('block', wide && 'col-span-2')}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {options ? (
        <select className={base} value={v || ''} onChange={(e) => onSave(e.target.value)}>
          <option value="">Not set</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input key={v} type={type} defaultValue={v} className={base} onBlur={(e) => { if (e.target.value !== v) onSave(e.target.value); }} />
      )}
    </label>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-white p-4">
      <h3 className="text-sm font-bold">{title}</h3>
      {hint && <p className="mb-2 text-xs text-[var(--color-muted-foreground)]">{hint}</p>}
      <div className={hint ? '' : 'mt-2'}>{children}</div>
    </section>
  );
}

/* ---------- follow-up scheduler ---------- */
function FollowUpCard({ lead, save }: { lead: Lead; save: (u: Partial<Lead>) => void }) {
  const cur = toDate(lead.follow_up_date);
  const [custom, setCustom] = useState(cur ? format(cur, "yyyy-MM-dd'T'HH:mm") : '');
  const [reason, setReason] = useState(lead.follow_up_reason || '');
  useEffect(() => { setCustom(cur ? format(cur, "yyyy-MM-dd'T'HH:mm") : ''); setReason(lead.follow_up_reason || ''); }, [lead.follow_up_date, lead.follow_up_reason]); // eslint-disable-line
  const now = new Date();
  const at = (d: Date, h: number) => setMinutes(setHours(d, h), 0);
  const presets = [
    { l: 'In 2 hours', d: addHours(now, 2) },
    { l: 'Tomorrow 10 AM', d: at(addDays(startOfDay(now), 1), 10) },
    { l: 'In 3 days', d: at(addDays(startOfDay(now), 3), 11) },
    { l: 'Next week', d: at(addDays(startOfDay(now), 7), 11) },
    { l: 'In a month', d: at(addDays(startOfDay(now), 30), 11) },
  ];
  const go = (d: Date) => save({ follow_up_date: d.toISOString(), follow_up_reason: reason || lead.follow_up_reason || 'Follow up' });
  return (
    <Card title="Follow-up" hint="The AI sends a message at this time, using the reason below.">
      {cur && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span><b>{format(cur, 'EEE d MMM, h:mm a')}</b>{lead.follow_up_reason ? ` · ${lead.follow_up_reason}` : ''}</span>
          <button onClick={() => save({ follow_up_date: null as any, follow_up_reason: '' })} className="ml-2 rounded p-1 hover:bg-amber-100" title="Clear"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why follow up? (e.g. share 3D samples)" className="mb-2 w-full rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]" />
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => <button key={p.l} onClick={() => go(p.d)} className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold hover:bg-slate-50">{p.l}</button>)}
      </div>
      <div className="mt-2 flex gap-2">
        <input type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-sm" />
        <button disabled={!custom} onClick={() => go(new Date(custom))} className="rounded-lg bg-[var(--color-brand)] px-3 text-xs font-semibold text-white disabled:opacity-40">Set</button>
      </div>
    </Card>
  );
}

/* ---------- chat ---------- */
type Lang = 'en' | 'mg' | 'ml';
const LANGS: { k: Lang; l: string }[] = [{ k: 'mg', l: 'Manglish' }, { k: 'ml', l: 'മലയാളം' }, { k: 'en', l: 'English' }];
const TEMPLATES: { l: string; en: string; mg: string; ml: string }[] = [
  { l: 'Name', en: 'May I know your name, Sir?', mg: 'Sir, name enthaanu?', ml: 'സർ, പേര് എന്താ?' },
  { l: 'Contact number', en: 'Could I have your mobile number, Sir? Our engineer will call you.', mg: 'Sir, oru contact number tharamo? Engineer vilikkan aanu.', ml: 'സർ, ഒരു കോൺടാക്ട് നമ്പർ തരാമോ? എൻജിനീയർ വിളിക്കാനാണ്.' },
  { l: 'Start time', en: 'When are you planning to start construction, Sir?', mg: 'Construction eppozha start cheyyan plan, Sir?', ml: 'പണി എപ്പോഴാ തുടങ്ങാൻ പ്ലാൻ, സർ?' },
  { l: 'Budget', en: 'What budget range do you have in mind, Sir?', mg: 'Budget ethra aanu Sir?', ml: 'ബഡ്ജറ്റ് എത്രയാ സർ?' },
  { l: 'Site visit', en: 'When would you like the site visit, Sir? Saturday or Sunday?', mg: 'Site visit eppozha venda Sir? Saturday aano Sunday aano?', ml: 'സൈറ്റ് വിസിറ്റ് എപ്പോഴാ വേണ്ടത് സർ? ശനിയാഴ്ച ആണോ ഞായറാഴ്ച ആണോ?' },
  { l: '2 options', en: 'You can visit one of our ongoing sites, or we can do a short call. Which day suits you, Sir?', mg: 'Ongoing site kaanam, allenkil oru short call. Ethu divasam sukham Sir?', ml: 'നടക്കുന്ന ഒരു സൈറ്റ് കാണാം, അല്ലെങ്കിൽ ഒരു ചെറിയ കോൾ. ഏത് ദിവസം സൗകര്യം സർ?' },
  { l: 'Share proof', en: 'I will send you a similar project we did. Have a look, Sir.', mg: 'Ningalude pole ulla oru project ayakkam Sir, onnu nokku.', ml: 'നിങ്ങളുടെ പോലത്തെ ഒരു പ്രോജക്ട് അയക്കാം സർ, ഒന്ന് നോക്കൂ.' },
  { l: 'Ok', en: 'Ok Sir \u{1F44D}', mg: 'Ok Sir \u{1F44D}', ml: 'ശരി സർ \u{1F44D}' },
];
const ALLOWED_EMOJI = ['\u{1F44D}', '\u{1F60A}'];
function cleanEmoji(t: string) {
  let kept = 0;
  return t.replace(/([\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}])[\u{1F3FB}-\u{1F3FF}\uFE0F]?/gu, (m, b) => (kept < 1 && ALLOWED_EMOJI.includes(b) ? (kept++, m) : ''));
}

function Chat({ lead, phone }: { lead: Lead; phone: string }) {
  const qc = useQueryClient();
  const { data, refetch } = useMessages(phone);
  const [text, setText] = useState('');
  const pl = (lead.preferred_language || '').toLowerCase();
  const [lang, setLang] = useState<Lang>(pl.includes('malayalam') && !pl.includes('mang') ? 'ml' : pl.includes('english') ? 'en' : 'mg');
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const msgs = useMemo(() => data?.messages || [], [data]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (near || msgs.length < 3) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  const send = useMutation({
    mutationFn: async (m: string) => {
      const res = await fetch(`/api/leads/${encodeURIComponent(phone)}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: lead.channel || 'telegram', message: cleanEmoji(m).trim() }) });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Failed to send');
    },
    onSuccess: () => { setText(''); refetch(); qc.invalidateQueries({ queryKey: ['leads'] }); },
  });

  const when = (s: string) => { const d = parseISO(s); return isValid(d) ? d : null; };
  const label = (s: string) => (s === 'customer' ? displayName(lead) : s === 'ai' ? 'Ayisha (AI)' : 'You');

  const exportMd = () => {
    let md = `# Conversation with ${displayName(lead)}\n\n`;
    msgs.forEach((m) => { const d = when(m.sent_at); md += `**${label(m.sender)}** (${d ? format(d, 'd MMM yyyy, h:mm a') : '?'}):\n${m.message}\n\n`; });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); a.download = `chat_${lead.phone}.md`; a.click();
  };
  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF(); doc.setFontSize(15); doc.text(`Conversation with ${displayName(lead)}`, 10, 15); doc.setFontSize(10);
    let y = 25;
    msgs.forEach((m) => {
      const d = when(m.sent_at);
      if (y > 275) { doc.addPage(); y = 15; }
      doc.setFont('helvetica', 'bold'); doc.text(`${label(m.sender)}  ${d ? format(d, 'd MMM, h:mm a') : ''}`, 10, y); y += 5;
      doc.setFont('helvetica', 'normal');
      doc.splitTextToSize(m.message, 185).forEach((ln: string) => { if (y > 280) { doc.addPage(); y = 15; } doc.text(ln, 10, y); y += 5; });
      y += 3;
    });
    doc.save(`chat_${lead.phone}.pdf`);
  };

  return (
    <div className="flex min-h-[480px] flex-1 flex-col overflow-hidden lg:min-h-0 rounded-xl border border-[var(--color-border)] bg-white">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-bold"><MessageSquare className="h-4 w-4" /> Conversation <span className="text-xs font-normal text-slate-400">{msgs.length} messages</span></h3>
        <div className="flex items-center gap-1">
          <button onClick={exportMd} title="Export Markdown" className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><FileText className="h-4 w-4" /></button>
          <button onClick={exportPdf} title="Export PDF" className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><FileDown className="h-4 w-4" /></button>
        </div>
      </div>

      <div ref={boxRef} className="flex-1 space-y-1 overflow-y-auto bg-[#f0efe8] px-3 py-3">
        {msgs.length === 0 && <p className="py-10 text-center text-xs text-slate-500">No messages yet.</p>}
        {msgs.map((m, i) => {
          const d = when(m.sent_at);
          const prev = i > 0 ? when(msgs[i - 1].sent_at) : null;
          const newDay = d && (!prev || !isSameDay(d, prev));
          const mine = m.sender !== 'customer';
          return (
            <div key={m.id ?? i}>
              {newDay && <div className="my-3 flex justify-center"><span className="rounded-full bg-white/80 px-3 py-0.5 text-[11px] font-semibold text-slate-500">{format(d!, 'EEE, d MMM yyyy')}</span></div>}
              <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[82%] rounded-2xl px-3 py-2 shadow-sm', m.sender === 'customer' ? 'rounded-tl-sm bg-white' : m.sender === 'ai' ? 'rounded-tr-sm bg-[#dbeafe]' : 'rounded-tr-sm bg-[#d4ecd9]')}>
                  <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide opacity-60">
                    {m.sender === 'customer' ? <User className="h-3 w-3" /> : m.sender === 'ai' ? <Bot className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                    {label(m.sender)}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
                  <p className="mt-0.5 text-right text-[10px] opacity-50">{d ? format(d, 'h:mm a') : ''}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-[var(--color-border)] p-3">
        <div className="scrollbar-none mb-2 flex gap-1.5 overflow-x-auto">
          {LANGS.map((g) => <button key={g.k} onClick={() => setLang(g.k)} className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', lang === g.k ? 'bg-[var(--color-brand)] text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200')}>{g.l}</button>)}
          {TEMPLATES.map((t) => <button key={t.l} onClick={() => setText(t[lang])} className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200">{t.l}</button>)}
          {['\u{1F44D}', '\u{1F60A}'].map((e) => <button key={e} type="button" onClick={() => setText((x) => cleanEmoji(x + e))} className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-sm hover:bg-slate-200">{e}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()); }} className="flex items-end gap-2">
          <textarea id="composer" rows={2} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim() && !send.isPending) send.mutate(text.trim()); } }} placeholder="Type your reply. Enter to send, Shift+Enter for a new line" className="min-h-[44px] flex-1 resize-none rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]" />
          <button type="submit" disabled={send.isPending || !text.trim()} className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand)] text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
        </form>
        <p className="mt-1 text-[11px] text-slate-400">{send.isError ? <span className="text-red-600">{(send.error as Error).message}</span> : 'Sending a message pauses the AI for this customer. Resume it when you are done.'}</p>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
export default function LeadDetailPage({ params }: { params: Promise<{ phone: string }> }) {
  const phone = decodeURIComponent(use(params).phone);
  const { data, isLoading } = useLeads(15000);
  const upd = useUpdateLead();
  const tog = useToggleAi();
  const [tab, setTab] = useState<'chat' | 'details'>('chat');
  const lead = data?.leads.find((l) => l.phone === phone);

  if (isLoading || !lead) return <div className="p-8 text-center text-sm text-gray-500">{isLoading ? 'Loading lead...' : 'Lead not found.'}</div>;

  const save = (u: Partial<Lead>) => upd.mutate({ lead, updates: u });
  const paused = isPaused(lead);
  const actions = getActions(lead);
  const primary = actions[0];
  const rest = actions.slice(1, 4);
  const st = currentStatus(lead);
  const tel = phoneForCall(lead);
  const sk = stageKey(lead);
  const total = Number(lead.payment_total || 0);
  const got = Number(lead.payment_received || 0);
  const toneCls: any = { red: 'bg-red-50 text-red-700', green: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-blue-700', gray: 'bg-slate-100 text-slate-600', amber: 'bg-amber-50 text-amber-800' };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-white px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/leads" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link>
          <Avatar lead={lead} size={42} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold leading-tight">{displayName(lead)}</h1>
              <TempDot lead={lead} />
              {lead.lead_score ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">Score {lead.lead_score}</span> : null}
            </div>
            <p className="truncate text-xs text-slate-500">{lead.phone} · {lead.channel}{lead.location ? ` · ${lead.location}` : ''}</p>
          </div>
          {tel && <a href={`tel:${tel}`} className="hidden h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 text-xs font-semibold hover:bg-slate-50 sm:inline-flex"><Phone className="h-3.5 w-3.5" /> Call</a>}
          <button onClick={() => tog.mutate({ phone: lead.phone, ai_paused: !paused })} className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold', paused ? 'bg-[var(--color-brand)] text-white' : 'bg-red-50 text-red-700 hover:bg-red-100')}>
            {paused ? <><PlayCircle className="h-4 w-4" /> Resume AI</> : <><PauseCircle className="h-4 w-4" /> Take over</>}
          </button>
        </div>
        {/* stage stepper */}
        <div className="scrollbar-none mt-3 flex gap-1.5 overflow-x-auto">
          {STAGES.map((s) => (
            <button key={s.key} onClick={() => save({ lead_stage: s.key })} className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition-colors', sk === s.key ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')} style={sk === s.key ? { background: s.color } : undefined}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* mobile tab switch */}
      <div className="flex border-b border-[var(--color-border)] bg-white lg:hidden">
        {(['chat', 'details'] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={cn('flex-1 py-2.5 text-sm font-semibold capitalize', tab === t ? 'border-b-2 border-[var(--color-brand)] text-[var(--color-brand-dark)]' : 'text-slate-500')}>{t}</button>)}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:overflow-visible p-3 md:p-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left: next action + chat */}
        <div className={cn('flex min-h-0 flex-col gap-3', tab !== 'chat' && 'hidden lg:flex')}>
          <section className="rounded-xl border-2 border-[var(--color-brand)]/30 bg-white p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold', toneCls[st.tone])}>NOW: {st.label}</span>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Next action <UrgencyChip u={primary.urgency} /></p>
                <ActionLine a={primary} />
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                {primary.kind === 'reply' || primary.kind === 'task' || primary.kind === 'followup' ? (
                  <button onClick={() => { setTab('chat'); document.getElementById('composer')?.focus(); }} className="rounded-lg bg-[var(--color-brand)] px-3 py-1.5 text-xs font-semibold text-white">Reply now</button>
                ) : null}
                {primary.kind === 'call' && tel ? <a href={`tel:${tel}`} className="rounded-lg bg-[var(--color-brand)] px-3 py-1.5 text-center text-xs font-semibold text-white">Call now</a> : null}
                <button onClick={() => setTab('details')} className="flex items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold lg:hidden"><CalendarClock className="h-3.5 w-3.5" /> Schedule</button>
              </div>
            </div>
            {rest.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-dashed border-[var(--color-border)] pt-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Then</p>
                {rest.map((a, i) => <ActionLine key={i} a={a} compact />)}
              </div>
            )}
          </section>
          <Chat lead={lead} phone={phone} />
        </div>

        {/* Right: details */}
        <div className={cn('min-h-0 space-y-3 overflow-y-auto pb-4', tab !== 'details' && 'hidden lg:block')}>
          <FollowUpCard lead={lead} save={save} />

          <Card title="Qualification" hint="Saved automatically from the chat. Edit anything the AI missed.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Service" value={lead.service_type} options={SERVICE_TYPES} onSave={(v) => save({ service_type: v })} />
              <Field label="Start timeline" value={lead.construction_start} onSave={(v) => save({ construction_start: v })} />
              <Field label="Decision maker" value={lead.decision_maker} options={DECISION_MAKERS} onSave={(v) => save({ decision_maker: v })} />
              <Field label="Main concern" value={lead.main_concern} options={CONCERNS} onSave={(v) => save({ main_concern: v })} />
              <Field label="Budget" value={lead.budget} onSave={(v) => save({ budget: v })} />
              <Field label="Lead source" value={lead.lead_source} options={SOURCES} onSave={(v) => save({ lead_source: v })} />
              <Field label="Temperature" value={lead.lead_temperature || (tempKey(lead) === 'unassessed' ? '' : tempKey(lead))} options={TEMPS.map((t) => t.key)} onSave={(v) => save({ lead_temperature: v })} />
              <Field label="Contact number" value={lead.contact_number} onSave={(v) => save({ contact_number: v })} />
            </div>
          </Card>

          <Card title="Project">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Location" value={lead.location} onSave={(v) => save({ location: v })} />
              <Field label="Plot status" value={lead.plot_status} onSave={(v) => save({ plot_status: v })} />
              <Field label="Plot size" value={lead.plot_size} onSave={(v) => save({ plot_size: v })} />
              <Field label="Built-up area" value={lead.built_up_area} onSave={(v) => save({ built_up_area: v })} />
              <Field label="Bedrooms" value={lead.bedrooms} onSave={(v) => save({ bedrooms: v })} />
              <Field label="House style" value={lead.house_style} onSave={(v) => save({ house_style: v })} />
              <Field label="Plan status" value={lead.plan_status} onSave={(v) => save({ plan_status: v })} />
              <Field label="Family size" value={lead.family_size} onSave={(v) => save({ family_size: v })} />
              <Field label="Background" value={lead.occupation_hint} onSave={(v) => save({ occupation_hint: v })} />
              <Field label="Requirements" value={lead.special_requirements} onSave={(v) => save({ special_requirements: v })} wide />
            </div>
          </Card>

          {(sk === 'lost' || lead.lost_reason) && (
            <Card title="Why we lost it" hint="Feeds the objection diary on Today.">
              <Field label="Lost reason" value={lead.lost_reason} options={LOST_REASONS} onSave={(v) => save({ lost_reason: v })} />
            </Card>
          )}

          <Card title="Money and work">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Agreed (₹)" type="number" value={lead.payment_total} onSave={(v) => save({ payment_total: v as any })} />
              <Field label="Received (₹)" type="number" value={lead.payment_received} onSave={(v) => save({ payment_received: v as any })} />
              <Field label="Work status" value={lead.work_status || 'not_started'} options={['not_started', 'in_progress', 'completed', 'on_hold']} onSave={(v) => save({ work_status: v })} wide />
            </div>
            {total > 0 && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs"><span>Received {money(got)}</span><span className="font-semibold text-red-600">Pending {money(Math.max(0, total - got))}</span></div>
                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[var(--color-brand)]" style={{ width: `${Math.min(100, (got / total) * 100)}%` }} /></div>
              </div>
            )}
          </Card>

          <Card title="Notes">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Team notes
              <textarea key={lead.staff_notes || ''} rows={3} defaultValue={lead.staff_notes || ''} onBlur={(e) => { if (e.target.value !== (lead.staff_notes || '')) save({ staff_notes: e.target.value }); }} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-sm font-normal normal-case tracking-normal outline-none focus:ring-2 focus:ring-[var(--color-brand)]" placeholder="Anything the team should know" />
            </label>
            {lead.style_notes && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600"><b>How to talk to them:</b> {lead.style_notes}</p>}
          </Card>

          <Card title="AI summary">
            <p className="text-sm leading-relaxed text-slate-700">{lead.conversation_summary || 'No summary yet.'}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
