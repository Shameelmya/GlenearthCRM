'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, use, useEffect, useRef } from 'react';
import { Lead, Message } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, Send, PauseCircle, PlayCircle, Bot, User, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

export default function LeadDetailPage({ params }: { params: Promise<{ phone: string }> }) {
  const unwrappedParams = use(params);
  const phone = decodeURIComponent(unwrappedParams.phone);
  const queryClient = useQueryClient();

  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: leadsData } = useQuery<{ leads: Lead[] }>({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await fetch('/api/leads');
      return res.json();
    },
  });

  const lead = leadsData?.leads.find(l => l.phone === phone);

  const { data: messagesData, refetch: refetchMessages } = useQuery<{ messages: Message[] }>({
    queryKey: ['messages', phone],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${encodeURIComponent(phone)}/messages`);
      return res.json();
    },
    refetchInterval: 5000, // Poll every 5s
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  // Mutations
  const toggleAiMutation = useMutation({
    mutationFn: async (ai_paused: boolean) => {
      const res = await fetch(`/api/leads/${encodeURIComponent(phone)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_paused }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/leads/${encodeURIComponent(phone)}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: lead?.channel || 'telegram', message: text }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to send message');
      return data;
    },
    onSuccess: () => {
      setMessage('');
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      alert(`Error sending message: ${err.message}`);
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: async (updates: Partial<Lead>) => {
      const res = await fetch(`/api/leads/${encodeURIComponent(phone)}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  if (!lead) return <div className="p-6 text-center">Loading lead details...</div>;

  return (
    <div className="h-full flex flex-col md:flex-row max-w-7xl mx-auto md:p-4 gap-4">
      {/* Left Column: Details */}
      <div className="w-full md:w-1/2 lg:w-5/12 flex flex-col space-y-4 overflow-y-auto p-4 md:p-0">
        <Link href="/leads" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Leads
        </Link>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{lead.name !== 'unknown' ? lead.name : lead.phone}</h2>
                <p className="text-gray-500 text-sm mt-1">{lead.phone} • {lead.channel}</p>
              </div>
              <Badge variant={lead.ai_paused ? 'danger' : 'success'}>
                {lead.ai_paused ? 'AI Paused (You)' : 'AI Active'}
              </Badge>
            </div>

            <div className="flex gap-2 mb-6">
              <Button 
                variant={lead.ai_paused ? 'secondary' : 'danger'} 
                size="sm" 
                className="flex-1"
                onClick={() => toggleAiMutation.mutate(!lead.ai_paused)}
                disabled={toggleAiMutation.isPending}
              >
                {lead.ai_paused ? <><PlayCircle className="mr-2 h-4 w-4" /> Resume AI</> : <><PauseCircle className="mr-2 h-4 w-4" /> Pause AI</>}
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">Sales & Work Status</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Stage</label>
                  <Select 
                    value={lead.lead_stage || 'new'} 
                    onChange={(e) => updateLeadMutation.mutate({ lead_stage: e.target.value as any })}
                  >
                    <option value="new">New</option>
                    <option value="requirement_gathering">Requirement Gathering</option>
                    <option value="quoting">Quoting</option>
                    <option value="site_visit">Site Visit</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                    <option value="nurture">Nurture</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Work Status</label>
                  <Select 
                    value={lead.work_status || 'not_started'} 
                    onChange={(e) => updateLeadMutation.mutate({ work_status: e.target.value })}
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Total Agreed (₹)</label>
                  <Input 
                    type="number" 
                    value={lead.payment_total || 0} 
                    onBlur={(e) => updateLeadMutation.mutate({ payment_total: Number(e.target.value) })}
                    onChange={(e) => {
                      // optimistic or controlled if we want, ignoring for brevity of typing
                    }}
                    defaultValue={lead.payment_total || 0}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Received (₹)</label>
                  <Input 
                    type="number" 
                    value={lead.payment_received || 0} 
                    onBlur={(e) => updateLeadMutation.mutate({ payment_received: Number(e.target.value) })}
                    onChange={(e) => {}}
                    defaultValue={lead.payment_received || 0}
                  />
                </div>
              </div>

              {/* Progress Bar */}
              {lead.payment_total ? (
                <div className="pt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Received: ₹{lead.payment_received || 0}</span>
                    <span className="font-medium text-red-500">Pending: ₹{lead.payment_total - (lead.payment_received || 0)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-[var(--color-brand)] h-2.5 rounded-full" style={{ width: `${Math.min(100, ((lead.payment_received || 0) / lead.payment_total) * 100)}%` }}></div>
                  </div>
                </div>
              ) : null}

            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Requirements & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              <div><span className="text-gray-500">Location:</span> {lead.location || '-'}</div>
              <div><span className="text-gray-500">Plot:</span> {lead.plot_status || '-'} ({lead.plot_size || '-'})</div>
              <div><span className="text-gray-500">Area:</span> {lead.built_up_area || '-'}</div>
              <div><span className="text-gray-500">Beds:</span> {lead.bedrooms || '-'}</div>
              <div><span className="text-gray-500">Style:</span> {lead.house_style || '-'}</div>
              <div><span className="text-gray-500">Budget:</span> {lead.budget || '-'}</div>
            </div>
            
            <div className="pt-2">
              <label className="text-xs text-gray-500">Staff Notes</label>
              <textarea 
                className="w-full mt-1 p-2 border rounded-xl text-sm"
                rows={3}
                defaultValue={lead.staff_notes || ''}
                onBlur={(e) => updateLeadMutation.mutate({ staff_notes: e.target.value })}
                placeholder="Add manual notes here..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Chat */}
      <div className="w-full md:w-1/2 lg:w-7/12 flex flex-col bg-white border border-[var(--color-border)] md:rounded-2xl shadow-soft h-[600px] md:h-[calc(100vh-6rem)]">
        <div className="p-4 border-b bg-gray-50 md:rounded-t-2xl flex items-center justify-between">
          <h3 className="font-semibold flex items-center"><MessageSquare className="mr-2 h-4 w-4" /> Live Conversation</h3>
          <Badge variant="outline">{lead.channel}</Badge>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messagesData?.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'customer' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                msg.sender === 'customer' ? 'bg-gray-100 text-gray-900 rounded-tl-sm' : 
                msg.sender === 'ai' ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-dark)] border border-blue-100 rounded-tr-sm' : 
                'bg-[var(--color-brand-light)] text-[var(--color-brand-dark)] border border-green-100 rounded-tr-sm'
              }`}>
                <div className="flex items-center gap-1 mb-1 opacity-70">
                  {msg.sender === 'customer' ? <User className="h-3 w-3" /> : msg.sender === 'ai' ? <Bot className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                  <span className="text-[10px] font-medium uppercase tracking-wider">{msg.sender}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                <div className="text-[10px] text-right mt-1 opacity-60">
                  {format(parseISO(msg.sent_at), 'h:mm a, MMM d')}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t bg-gray-50 md:rounded-b-2xl">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim()) sendMessageMutation.mutate(message);
            }}
            className="flex gap-2"
          >
            <Input 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sendMessageMutation.isPending}
              className="bg-white"
            />
            <Button type="submit" disabled={sendMessageMutation.isPending || !message.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Ensure the lucide icons used above are imported if they aren't already. Let's add the missing imports.
import { MessageSquare } from 'lucide-react';
