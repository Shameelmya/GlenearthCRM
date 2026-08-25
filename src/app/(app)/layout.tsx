'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/ui/Button';
import { LayoutDashboard, Users, Settings } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-[var(--color-border)] bg-white md:flex">
        <div className="flex h-16 items-center px-6">
          <h1 className="text-xl font-bold text-[var(--color-brand-dark)]">Gleanearth CRM</h1>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-ios',
                  isActive
                    ? 'bg-[var(--color-brand-light)] text-[var(--color-brand-dark)]'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive ? 'text-[var(--color-brand-dark)]' : 'text-gray-400 group-hover:text-gray-500'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-[var(--color-border)] bg-white/80 backdrop-blur-md md:hidden shadow-float">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center space-y-1 transition-ios',
                isActive ? 'text-[var(--color-brand-dark)]' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
