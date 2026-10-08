'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/ui/Button';
import { LayoutDashboard, Users, Settings, Columns3, Sprout } from 'lucide-react';
import { useLeads } from '@/lib/hooks';
import { getActions, isPaused } from '@/lib/crm';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useLeads(30000);
  const urgent = (data?.leads || []).filter((l) => isPaused(l) || getActions(l)[0].urgency === 'now').length;

  const navItems = [
    { name: 'Today', href: '/', icon: LayoutDashboard, badge: urgent },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Pipeline', href: '/pipeline', icon: Columns3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      <aside className="hidden w-60 flex-col border-r border-[var(--color-border)] bg-[#17231c] text-white md:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10"><Sprout className="h-5 w-5 text-emerald-300" /></span>
          <div className="leading-tight">
            <p className="text-sm font-bold">Gleanearth</p>
            <p className="text-[11px] text-white/50">Relationship desk</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-3">
          {navItems.map((item) => (
            <Link key={item.name} href={item.href} className={cn('flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', active(item.href) ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white')}>
              <span className="flex items-center"><item.icon className="mr-3 h-[18px] w-[18px]" />{item.name}</span>
              {item.badge ? <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold">{item.badge}</span> : null}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-[var(--color-border)] bg-white/90 backdrop-blur-md md:hidden">
        {navItems.map((item) => (
          <Link key={item.name} href={item.href} className={cn('relative flex flex-1 flex-col items-center justify-center gap-0.5', active(item.href) ? 'text-[var(--color-brand-dark)]' : 'text-gray-500')}>
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-semibold">{item.name}</span>
            {item.badge ? <span className="absolute right-[28%] top-1.5 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{item.badge}</span> : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}
