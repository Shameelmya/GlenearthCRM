'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Lead } from '@/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Search, Filter, Phone, Clock, AlertCircle, Users } from 'lucide-react';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [needsYouFilter, setNeedsYouFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const { data, isLoading, error } = useQuery<{ leads: Lead[] }>({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error('Failed to fetch leads');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const filteredLeads = useMemo(() => {
    if (!data?.leads) return [];
    let result = [...data.leads];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(l => 
        (l.name || '').toLowerCase().includes(s) || 
        (l.phone || '').includes(s) || 
        (l.location || '').toLowerCase().includes(s)
      );
    }

    if (stageFilter) {
      result = result.filter(l => l.lead_stage === stageFilter);
    }

    if (needsYouFilter !== 'all') {
      result = result.filter(l => (needsYouFilter === 'yes' ? l.ai_paused : !l.ai_paused));
    }

    result.sort((a, b) => {
      if (sortBy === 'recent') {
        const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return timeB - timeA;
      } else if (sortBy === 'score') {
        return (b.lead_score || 0) - (a.lead_score || 0);
      } else if (sortBy === 'oldest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      }
      return 0;
    });

    return result;
  }, [data, search, stageFilter, needsYouFilter, sortBy]);

  if (isLoading) return <div className="p-6 text-center">Loading leads...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Failed to load leads</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search name, phone, location..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
              <option value="">All Stages</option>
              <option value="new">New</option>
              <option value="requirement_gathering">Requirement Gathering</option>
              <option value="quoting">Quoting</option>
              <option value="site_visit">Site Visit</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="nurture">Nurture</option>
            </Select>
            <Select value={needsYouFilter} onChange={(e) => setNeedsYouFilter(e.target.value)}>
              <option value="all">Any Status</option>
              <option value="yes">Needs You (AI Paused)</option>
              <option value="no">AI Active</option>
            </Select>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="recent">Most Recent Message</option>
              <option value="score">Highest Score</option>
              <option value="oldest">Oldest First</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {filteredLeads.map(lead => (
          <Link key={lead.phone} href={`/leads/${lead.phone}`}>
            <Card className="hover:border-[var(--color-brand)] transition-ios cursor-pointer">
              <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {lead.ai_paused ? (
                      <div className="bg-red-100 p-2 rounded-full" title="Needs You">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                    ) : (
                      <div className="bg-gray-100 p-2 rounded-full">
                        <Users className="h-5 w-5 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{lead.name !== 'unknown' ? lead.name : lead.phone}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone}</span>
                      {lead.location && <span>• {lead.location}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
                  <Badge variant="outline" className="capitalize">{(lead.lead_stage || 'unknown').replace('_', ' ')}</Badge>
                  {lead.lead_score != null && (
                    <Badge variant={lead.lead_score >= 70 ? 'success' : (lead.lead_score >= 40 ? 'warning' : 'default')}>
                      Score: {lead.lead_score}
                    </Badge>
                  )}
                  <div className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {(() => {
                      if (!lead.last_message_at) return 'No messages';
                      const date = parseISO(lead.last_message_at);
                      return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : 'Invalid date';
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filteredLeads.length === 0 && (
          <div className="text-center p-12 text-gray-500 border border-dashed rounded-xl">
            No leads match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
