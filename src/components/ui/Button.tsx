import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-ios focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)] shadow-soft': variant === 'primary',
            'bg-[var(--color-muted)] text-[var(--color-foreground)] hover:bg-gray-200': variant === 'secondary',
            'bg-red-500 text-white hover:bg-red-600 shadow-soft': variant === 'danger',
            'bg-transparent hover:bg-[var(--color-muted)] text-[var(--color-foreground)]': variant === 'ghost',
            'h-9 px-4 text-sm': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-12 px-8 text-lg rounded-2xl': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
