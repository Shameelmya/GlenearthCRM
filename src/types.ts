export interface Lead {
  id: number;
  createdAt: string;
  updatedAt: string;
  phone: string;
  name: string;
  preferred_language?: string;
  location?: string;
  plot_status?: string;
  plot_size?: string;
  built_up_area?: string;
  bedrooms?: string;
  house_style?: string;
  special_requirements?: string;
  plan_status?: string;
  budget?: string;
  lead_stage: 'new' | 'requirement_gathering' | 'quoting' | 'objection_handling' | 'site_visit' | 'negotiation' | 'won' | 'lost' | 'nurture';
  follow_up_date?: string;
  follow_up_reason?: string;
  ai_paused: boolean;
  conversation_summary?: string;
  last_message_at: string;
  channel: 'telegram' | 'whatsapp';
  lead_score?: number | null;
  budget_fit?: 'within_range' | 'below_range' | 'above_range' | 'not_discussed';
  work_status?: string;
  payment_total?: number;
  payment_received?: number;
  staff_notes?: string;
}

export interface Message {
  id: number;
  phone: string;
  sender: 'customer' | 'ai' | 'human';
  message: string;
  channel: 'telegram' | 'whatsapp';
  sent_at: string;
}
