import React from 'react';
import { motion, HTMLMotionProps, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost' | 'outline';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  shortcut?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  shortcut,
  icon: Icon,
  className = '',
  disabled,
  ...props
}) => {
  const reducedMotion = useReducedMotion();
  const variantStyles: Record<ButtonVariant, string> = {
    primary: 
      'bg-[#244b3e] hover:bg-[#16372c] text-white font-medium shadow-sm border border-transparent',
    secondary: 
      'bg-surface-elevated hover:bg-[#e3ebdf] text-text-primary border border-surface-border-subtle shadow-sm',
    accent: 
      'bg-accent-blue hover:bg-blue-600 text-white font-medium shadow-sm border border-transparent',
    danger: 
      'bg-accent-rose/10 hover:bg-accent-rose/20 text-rose-700 border border-accent-rose/30 shadow-sm',
    ghost: 
      'bg-transparent hover:bg-white/[0.05] text-text-secondary hover:text-text-primary border border-transparent',
    outline: 
      'bg-transparent hover:bg-white/[0.05] text-text-primary border border-surface-border-subtle',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 space-x-1.5 rounded-lg',
    md: 'text-sm px-3.5 py-2 space-x-2 rounded-xl',
    lg: 'text-base px-5 py-2.5 space-x-2.5 rounded-xl font-medium',
  };

  return (
    <motion.button
      whileHover={disabled || loading || reducedMotion ? {} : { scale: 1.01 }}
      whileTap={disabled || loading || reducedMotion ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-sans transition-colors duration-150',
        'focus-visible:ring-2 focus-visible:ring-accent-blue/40 focus-visible:outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <svg 
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="3" 
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
          />
        </svg>
      ) : Icon ? (
        <Icon className={clsx(size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4', 'shrink-0')} />
      ) : null}
      
      <span className="inline-flex items-center justify-center">{children}</span>

      {shortcut && (
        <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/10 text-text-secondary border border-white/10">
          {shortcut}
        </kbd>
      )}
    </motion.button>
  );
};
