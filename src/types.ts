export interface Lead {
  id: number;
  createdAt: string;
  updatedAt: string;
  phone: string;
  name: string | null;
  preferred_language?: string | null;
  location?: string | null;
  plot_status?: string | null;
  plot_size?: string | null;
  built_up_area?: string | null;
  bedrooms?: string | null;
  house_style?: string | null;
  special_requirements?: string | null;
  plan_status?: string | null;
  budget?: string | null;
  lead_stage: string;
  follow_up_date?: string | null;
  follow_up_reason?: string | null;
  ai_paused: boolean;
  conversation_summary?: string | null;
  last_message_at: string;
  channel: 'telegram' | 'whatsapp';
  lead_score?: number | null;
  budget_fit?: 'within_range' | 'below_range' | 'above_range' | 'not_discussed' | null;
  work_status?: string | null;
  payment_total?: number | null;
  payment_received?: number | null;
  staff_notes?: string | null;
  style_notes?: string | null;
  contact_number?: string | null;
  preferred_address?: string | null;
  lead_source?: string | null;
  service_type?: string | null;
  construction_start?: string | null;
  family_size?: string | null;
  occupation_hint?: string | null;
  decision_maker?: string | null;
  main_concern?: string | null;
  lead_temperature?: string | null;
  lost_reason?: string | null;
  conversation_state?: string | null;
  last_ai_reply_at?: string | null;
  last_nudge_at?: string | null;
  last_nudge_tier?: string | null;
}

export interface Message {
  id: number;
  phone: string;
  sender: 'customer' | 'ai' | 'human';
  message: string;
  channel: 'telegram' | 'whatsapp';
  sent_at: string;
}
