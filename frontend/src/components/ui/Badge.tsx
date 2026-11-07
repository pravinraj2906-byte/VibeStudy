import React from 'react';
import clsx from 'clsx';

export type BadgeVariant = 
  | 'cyan' 
  | 'blue'
  | 'amber' 
  | 'green' 
  | 'red' 
  | 'violet' 
  | 'silver'
  | 'graphite' 
  | 'critical' 
  | 'high' 
  | 'medium' 
  | 'low'
  | 'ghost';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  pulse?: boolean;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  size = 'xs',
  pulse = false,
  className = '',
  icon: Icon
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    cyan: 'bg-accent-blue/10 text-blue-700 border-accent-blue/20',
    blue: 'bg-accent-blue/10 text-blue-700 border-accent-blue/20',
    amber: 'bg-accent-amber/10 text-amber-700 border-accent-amber/25',
    green: 'bg-accent-emerald/10 text-emerald-700 border-accent-emerald/25',
    red: 'bg-accent-rose/10 text-rose-700 border-accent-rose/25',
    violet: 'bg-accent-teal/10 text-teal-700 border-accent-teal/25',
    silver: 'bg-white/[0.06] text-text-secondary border-white/[0.08]',
    graphite: 'bg-surface-elevated text-text-secondary border-surface-border',
    critical: 'bg-accent-rose/15 text-rose-700 border-accent-rose/30 font-medium',
    high: 'bg-amber-500/15 text-amber-700 border-amber-500/30 font-medium',
    medium: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
    low: 'bg-white/[0.06] text-text-secondary border-white/[0.08]',
    ghost: 'bg-transparent text-text-muted border-white/[0.08]',
  };

  const sizeStyles = {
    xs: 'text-[11px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-mono rounded-md border leading-tight select-none',
        variantStyles[variant] || variantStyles.blue,
        sizeStyles[size],
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {Icon && <Icon className="w-3 h-3 mr-1 shrink-0" />}
      <span>{children}</span>
    </span>
  );
};
