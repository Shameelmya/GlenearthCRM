'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Lead, Message } from '@/types';

export function useLeads(refetchMs = 20000) {
  return useQuery<{ leads: Lead[] }>({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error('Failed to load leads');
      const j = await res.json();
      return { leads: (j.leads || []).filter((l: Lead) => l.phone) };
    },
    refetchInterval: refetchMs,
  });
}

export function useMessages(phone: string) {
  return useQuery<{ messages: Message[] }>({
    queryKey: ['messages', phone],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${encodeURIComponent(phone)}/messages`);
      if (!res.ok) throw new Error('Failed to load messages');
      return res.json();
    },
    refetchInterval: 4000,
  });
}

const NUM_KEYS = ['payment_total', 'payment_received', 'lead_score'];
const STR_KEYS = [
  'name', 'preferred_address', 'preferred_language', 'location', 'plot_status', 'plot_size', 'built_up_area', 'bedrooms',
  'house_style', 'special_requirements', 'plan_status', 'budget', 'budget_fit', 'lead_stage', 'follow_up_reason', 'staff_notes',
  'style_notes', 'contact_number', 'conversation_state', 'work_status', 'lead_source', 'service_type', 'construction_start',
  'family_size', 'occupation_hint', 'decision_maker', 'main_concern', 'lead_temperature', 'lost_reason',
];

/** Sends the FULL editable record (current values merged with the change) so no field is blanked by a partial update. */
export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lead, updates }: { lead: Lead; updates: Partial<Lead> }) => {
      const merged: any = { ...lead, ...updates };
      const body: any = {};
      for (const k of STR_KEYS) body[k] = merged[k] ?? '';
      for (const k of NUM_KEYS) body[k] = merged[k] === '' || merged[k] == null ? null : Number(merged[k]);
      body.follow_up_date = merged.follow_up_date || null;
      const res = await fetch(`/api/leads/${encodeURIComponent(lead.phone)}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) throw new Error(j.error || 'Update failed');
      return j;
    },
    onMutate: async ({ lead, updates }) => {
      await qc.cancelQueries({ queryKey: ['leads'] });
      const prev = qc.getQueryData<{ leads: Lead[] }>(['leads']);
      if (prev) qc.setQueryData(['leads'], { leads: prev.leads.map((l) => (l.phone === lead.phone ? { ...l, ...updates } : l)) });
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['leads'], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useToggleAi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, ai_paused }: { phone: string; ai_paused: boolean }) => {
      const res = await fetch(`/api/leads/${encodeURIComponent(phone)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_paused }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onMutate: async ({ phone, ai_paused }) => {
      const prev = qc.getQueryData<{ leads: Lead[] }>(['leads']);
      if (prev) qc.setQueryData(['leads'], { leads: prev.leads.map((l) => (l.phone === phone ? { ...l, ai_paused } : l)) });
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['leads'], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}
