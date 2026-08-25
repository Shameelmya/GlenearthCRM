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
  lead_stage: 'new' | 'requirement_gathering' | 'quoting' | 'objection_handling' | 'site_visit' | 'negotiation' | 'won' | 'lost' | 'nurture';
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
}

export interface Message {
  id: number;
  phone: string;
  sender: 'customer' | 'ai' | 'human';
  message: string;
  channel: 'telegram' | 'whatsapp';
  sent_at: string;
}
