import { parseISO, isValid, addMinutes, addHours, differenceInMinutes } from 'date-fns';
import type { Lead } from '@/types';

export function toDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = parseISO(String(v));
  return isValid(d) ? d : null;
}

/* ---------- Stages (Sales SOP pipeline) ---------- */
export const STAGES = [
  { key: 'new', label: 'New lead', color: '#64748b' },
  { key: 'contacted', label: 'Contacted', color: '#3b82f6' },
  { key: 'qualified', label: 'Qualified', color: '#6366f1' },
  { key: 'meeting_fixed', label: 'Meeting fixed', color: '#8b5cf6' },
  { key: 'site_visit', label: 'Site visit', color: '#d946ef' },
  { key: 'proposal_submitted', label: 'Proposal sent', color: '#f59e0b' },
  { key: 'negotiation', label: 'Negotiation', color: '#ea580c' },
  { key: 'won', label: 'Won', color: '#16a34a' },
  { key: 'lost', label: 'Lost', color: '#94a3b8' },
  { key: 'nurture', label: 'Nurture', color: '#0891b2' },
] as const;

const LEGACY: Record<string, string> = {
  new_lead: 'new',
  requirement_gathering: 'contacted',
  quoting: 'proposal_submitted',
  objection_handling: 'negotiation',
};

export function stageKey(l: Pick<Lead, 'lead_stage'>): string {
  const s = (l.lead_stage || 'new').toLowerCase();
  const k = LEGACY[s] || s;
  return STAGES.some((x) => x.key === k) ? k : 'new';
}
export const stageInfo = (key: string) => STAGES.find((s) => s.key === key) || STAGES[0];
export const ACTIVE_STAGES = ['new', 'contacted', 'qualified', 'meeting_fixed', 'site_visit', 'proposal_submitted', 'negotiation'];

/* ---------- Temperature ---------- */
export const TEMPS = [
  { key: 'hot', label: 'Hot', color: '#dc2626', hint: 'Starting in 0 to 3 months' },
  { key: 'warm', label: 'Warm', color: '#f59e0b', hint: 'Starting in 3 to 6 months' },
  { key: 'nurture', label: 'Nurture', color: '#0891b2', hint: '6 to 12+ months' },
  { key: 'unqualified', label: 'Unqualified', color: '#94a3b8', hint: 'No real project' },
] as const;

export function tempKey(l: Lead): string {
  const t = (l.lead_temperature || '').toLowerCase();
  if (TEMPS.some((x) => x.key === t)) return t;
  const sc = Number(l.lead_score || 0);
  if (sc >= 70) return 'hot';
  if (sc >= 40) return 'warm';
  return 'unassessed';
}
export const tempInfo = (k: string) => TEMPS.find((t) => t.key === k) || { key: 'unassessed', label: 'Unrated', color: '#cbd5e1', hint: '' };

/* ---------- Option lists ---------- */
export const SERVICE_TYPES = ['design', 'construction', 'turnkey', 'unknown'];
export const DECISION_MAKERS = ['self', 'family', 'architect', 'mixed', 'unknown'];
export const CONCERNS = ['quality', 'budget control', 'completion time', 'transparency', 'design', 'other'];
export const SOURCES = ['Instagram', 'Meta ads', 'Referral', 'Architect', 'Website', 'Walk-in', 'Other'];
export const LOST_REASONS = ['price', 'trust', 'design', 'timeline', 'location', 'competitor', 'family decision', 'no urgency', 'financing', 'other'];

/* ---------- Helpers ---------- */
export const isPaused = (l: Lead) => (l.ai_paused as unknown) === true || (l.ai_paused as unknown) === 'true';
export const displayName = (l: Lead) => (l.name && l.name !== 'unknown' ? l.name : l.phone);
export const hasFollowUp = (l: Lead) => !!toDate(l.follow_up_date);
export const phoneForCall = (l: Lead) => (l.contact_number && /\d{6,}/.test(l.contact_number) ? l.contact_number : /^\+?\d{8,}$/.test(l.phone) ? l.phone : null);

export type Urgency = 'now' | 'today' | 'soon' | 'later' | 'none';
export type ActionKind = 'reply' | 'followup' | 'call' | 'auto' | 'task' | 'money' | 'none';
export interface Action {
  kind: ActionKind;
  urgency: Urgency;
  title: string;
  detail?: string;
  at?: Date | null;
}
const RANK: Record<Urgency, number> = { now: 0, today: 1, soon: 2, later: 3, none: 4 };

/* What is happening right now with this lead */
export function currentStatus(l: Lead, now = new Date()): { label: string; tone: 'red' | 'green' | 'blue' | 'gray' | 'amber' } {
  if (isPaused(l)) return { label: 'You are handling this chat (AI paused)', tone: 'red' };
  const stage = stageKey(l);
  if (stage === 'lost') return { label: 'Lead closed as lost', tone: 'gray' };
  if (stage === 'won') return { label: 'Won, project in progress', tone: 'green' };
  const lastAi = toDate(l.last_ai_reply_at);
  const lastMsg = toDate(l.last_message_at);
  if (lastAi && lastMsg && lastMsg.getTime() > lastAi.getTime() + 1000) {
    return { label: 'Customer replied, AI is handling', tone: 'green' };
  }
  if (lastAi) {
    const m = differenceInMinutes(now, lastAi);
    const tier = l.last_nudge_tier || '';
    if (tier === 'nextday_sent') return { label: 'Waiting for customer, auto nudges finished', tone: 'amber' };
    if (tier === '10min' || tier === '15min') return { label: 'Waiting for customer, nudge 2 of 3 sent', tone: 'blue' };
    if (tier === '3min') return { label: 'Waiting for customer, nudge 1 of 3 sent', tone: 'blue' };
    return { label: m < 3 ? 'AI just replied, waiting for customer' : 'Waiting for customer reply', tone: 'blue' };
  }
  return { label: 'AI active', tone: 'green' };
}

/* Next steps, ordered by urgency. First item = the one thing to do next. */
export function getActions(l: Lead, now = new Date()): Action[] {
  const out: Action[] = [];
  const stage = stageKey(l);
  const temp = tempKey(l);
  const lastMsg = toDate(l.last_message_at);
  const idleDays = lastMsg ? Math.floor(differenceInMinutes(now, lastMsg) / 1440) : 0;

  if (stage === 'lost') {
    if (!l.lost_reason) out.push({ kind: 'task', urgency: 'today', title: 'Record the lost reason', detail: 'Add it to the objection diary so the team can learn from it.' });
    return out.length ? out : [{ kind: 'none', urgency: 'none', title: 'Closed, no action needed' }];
  }

  if (isPaused(l)) {
    out.push({ kind: 'reply', urgency: 'now', title: 'Reply to the customer', detail: 'AI is paused. Send your reply, then hand the chat back to AI.' });
  }

  const fu = toDate(l.follow_up_date);
  if (fu) {
    const overdue = fu.getTime() <= now.getTime();
    const sameDay = fu.toDateString() === now.toDateString();
    out.push({
      kind: 'followup',
      urgency: overdue ? 'now' : sameDay ? 'today' : 'soon',
      title: overdue ? 'Follow-up is due now' : 'Scheduled follow-up',
      detail: l.follow_up_reason || 'Agreed with the customer',
      at: fu,
    });
  }

  if (!isPaused(l) && stage !== 'won') {
    const lastAi = toDate(l.last_ai_reply_at);
    const answered = lastAi && lastMsg ? lastMsg.getTime() > lastAi.getTime() + 1000 : false;
    if (lastAi && !answered) {
      const tier = l.last_nudge_tier || '';
      if (tier === '') out.push({ kind: 'auto', urgency: 'soon', title: 'Auto nudge 1 of 3', detail: 'AI sends a short message if there is no reply.', at: addMinutes(lastAi, 3) });
      else if (tier === '3min') out.push({ kind: 'auto', urgency: 'soon', title: 'Auto nudge 2 of 3', detail: 'Second short nudge.', at: addMinutes(lastAi, 10) });
      else if (tier === '10min' || tier === '15min') out.push({ kind: 'auto', urgency: 'later', title: 'Auto nudge 3 of 3 (next day)', detail: 'A more useful message the next day.', at: addHours(lastAi, 24) });
      else if (tier === 'nextday_sent') out.push({ kind: 'call', urgency: 'today', title: 'Auto nudges finished, call personally', detail: 'No reply to 3 nudges. Try a call, or move to Nurture.' });
    }
  }

  if (stage === 'won') {
    const total = Number(l.payment_total || 0);
    const got = Number(l.payment_received || 0);
    if (total > got) out.push({ kind: 'money', urgency: 'today', title: `Collect pending ₹${(total - got).toLocaleString('en-IN')}`, detail: 'Payment is below the agreed amount.' });
    else if (!l.work_status || l.work_status === 'not_started') out.push({ kind: 'task', urgency: 'today', title: 'Start the project', detail: 'Work status is not started.' });
    else out.push({ kind: 'none', urgency: 'none', title: 'Project running, share the daily update' });
    return out.sort((a, b) => RANK[a.urgency] - RANK[b.urgency]);
  }

  const missingStart = !l.construction_start || l.construction_start === 'unknown';
  const playbook: Record<string, Action> = {
    new: { kind: 'task', urgency: 'today', title: 'Qualify the lead', detail: 'Find location, plot status and when they plan to start.' },
    contacted: { kind: 'task', urgency: 'today', title: 'Finish qualification', detail: 'Service needed, start timeline, decision maker, main concern.' },
    qualified: { kind: 'task', urgency: 'today', title: 'Fix a meeting', detail: 'Offer two options: a call on one of two days, or visit an ongoing site.' },
    meeting_fixed: { kind: 'task', urgency: 'soon', title: 'Confirm the meeting', detail: 'Remind them a day before and share what to expect.' },
    site_visit: { kind: 'task', urgency: 'soon', title: 'Send the proposal after the visit', detail: 'Within 24 hours, with the next step booked.' },
    proposal_submitted: { kind: 'task', urgency: 'soon', title: 'Follow up with something useful', detail: 'Share proof that matches their concern, ask what is unclear.' },
    negotiation: { kind: 'task', urgency: 'today', title: 'Find the real objection and close', detail: 'Listen, clarify, isolate, answer, then offer two next steps.' },
    nurture: { kind: 'task', urgency: 'later', title: 'Send a monthly value message', detail: 'Project update, a testimonial, or a helpful tip. No pressure.' },
  };
  const step = playbook[stage];
  if (step) out.push(step);

  if (missingStart && ['new', 'contacted', 'qualified'].includes(stage)) {
    out.push({ kind: 'task', urgency: 'soon', title: 'Ask when they plan to start construction', detail: 'This is the most important qualifying question.' });
  }
  if (idleDays >= 2 && ['hot', 'warm'].includes(temp) && !fu) {
    out.push({ kind: 'followup', urgency: 'today', title: `Idle for ${idleDays} days, send a value message`, detail: 'Hot and warm leads should not go quiet. Never ask "any update?".' });
  }
  if (!out.length) out.push({ kind: 'none', urgency: 'none', title: 'No action needed right now' });
  return out.sort((a, b) => RANK[a.urgency] - RANK[b.urgency] || (a.at?.getTime() || 0) - (b.at?.getTime() || 0));
}

export function priorityScore(l: Lead, now = new Date()): number {
  const a = getActions(l, now)[0];
  const t = tempKey(l);
  const tb = t === 'hot' ? 30 : t === 'warm' ? 15 : 0;
  return (4 - RANK[a.urgency]) * 1000 + tb + Number(l.lead_score || 0) / 10;
}

export function money(n?: number | null) {
  const v = Number(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
}
