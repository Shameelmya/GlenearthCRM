import React from 'react';
import { cn } from './Button';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        {
          'border-transparent bg-gray-100 text-gray-800': variant === 'default',
          'border-transparent bg-[var(--color-brand-light)] text-[var(--color-brand-dark)]': variant === 'success',
          'border-transparent bg-yellow-100 text-yellow-800': variant === 'warning',
          'border-transparent bg-red-100 text-red-800': variant === 'danger',
          'text-foreground': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}
