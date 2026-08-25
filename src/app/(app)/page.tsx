'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Lead } from '@/types';
import { Users, PhoneCall, MessageSquare, Flame, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts';
import { format, isPast, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<{ leads: Lead[] }>({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error('Failed to fetch leads');
      return res.json();
    },
    refetchInterval: 60000, // refresh every minute
  });

  if (isLoading) return <div className="p-6 text-center text-gray-500">Loading dashboard...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Failed to load data.</div>;
  if (!data?.leads) return null;

  const leads = data.leads;

  // 1. Counters
  const totalLeads = leads.length;
  const needsYou = leads.filter(l => l.ai_paused).length;
  
  const now = new Date();
  const callbacksDue = leads.filter(l => {
    if (!l.follow_up_date) return false;
    const date = parseISO(l.follow_up_date);
    return isPast(date) || isToday(date) || isTomorrow(date);
  }).length;

  const liveChats = leads.filter(l => {
    const lastMsg = parseISO(l.last_message_at);
    return (now.getTime() - lastMsg.getTime()) < 15 * 60 * 1000; // 15 mins
  }).length;

  const seriousLeads = leads.filter(l => l.lead_score && l.lead_score >= 70).length;

  const hotPipelineValue = leads
    .filter(l => ['quoting', 'negotiation', 'site_visit'].includes(l.lead_stage))
    .reduce((sum, l) => sum + (l.payment_total || 0), 0);

  // 2. Pipeline Breakdown Data
  const stageCounts = leads.reduce((acc, l) => {
    acc[l.lead_stage] = (acc[l.lead_stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const STAGE_COLORS: Record<string, string> = {
    new: '#3b82f6',
    requirement_gathering: '#8b5cf6',
    quoting: '#f59e0b',
    objection_handling: '#ef4444',
    site_visit: '#10b981',
    negotiation: '#f97316',
    won: '#22c55e',
    lost: '#64748b',
    nurture: '#0ea5e9'
  };

  const pipelineData = Object.entries(stageCounts)
    .map(([name, value]) => ({ name: name.replace('_', ' ').toUpperCase(), value, originalName: name }))
    .sort((a, b) => b.value - a.value);

  // 3. Follow-up triage
  const followUpLeads = leads
    .filter(l => l.follow_up_date)
    .sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())
    .slice(0, 10); // top 10

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
      
      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Total Leads" value={totalLeads} icon={Users} />
        <StatCard title="Needs You" value={needsYou} icon={Users} color="text-red-500" />
        <StatCard title="Callbacks Due" value={callbacksDue} icon={PhoneCall} color="text-amber-500" />
        <StatCard title="Live Chats" value={liveChats} icon={MessageSquare} color="text-green-500" />
        <StatCard title="Serious Leads" value={seriousLeads} icon={Flame} color="text-orange-500" />
        <StatCard title="Pipeline Value" value={`₹${(hotPipelineValue / 100000).toFixed(1)}L`} icon={DollarSign} color="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <RechartsTooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STAGE_COLORS[entry.originalName] || '#8884d8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Triage List */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            {followUpLeads.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No upcoming follow-ups.</p>
            ) : (
              <div className="space-y-4">
                {followUpLeads.map(lead => {
                  const date = parseISO(lead.follow_up_date!);
                  const isOverdue = isPast(date) && !isToday(date);
                  return (
                    <Link key={lead.phone} href={`/leads/${lead.phone}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="overflow-hidden">
                        <p className="font-medium truncate">{lead.name || lead.phone}</p>
                        <p className="text-xs text-gray-500 truncate">{lead.follow_up_reason || 'Follow up'}</p>
                      </div>
                      <div className="text-right whitespace-nowrap ml-2">
                        <Badge variant={isOverdue ? 'danger' : (isToday(date) ? 'warning' : 'default')}>
                          {isOverdue ? 'Overdue' : (isToday(date) ? 'Today' : format(date, 'MMM d'))}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = 'text-gray-600' }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
        <Icon className={`h-6 w-6 mb-2 ${color}`} />
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
