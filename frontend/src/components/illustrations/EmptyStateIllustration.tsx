import React from 'react';

export const EmptyStateIllustration: React.FC<{ type?: 'search' | 'shield' | 'code' | 'check'; className?: string }> = ({ 
  type = 'shield', 
  className = 'w-24 h-24' 
}) => {
  return (
    <svg className={className} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="emptyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#eef2ea" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>

      {/* Base Hexagon/Shield Plate */}
      <rect x="12" y="12" width="72" height="72" rx="16" fill="url(#emptyGrad)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <rect x="20" y="20" width="56" height="56" rx="12" fill="none" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />

      {type === 'shield' && (
        <path 
          d="M48 28L60 33V47C60 55 55 62 48 65C41 62 36 55 36 47V33L48 28Z" 
          stroke="#3B82F6" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          fill="rgba(59,130,246,0.08)"
        />
      )}

      {type === 'check' && (
        <path 
          d="M36 48L44 56L60 38" 
          stroke="#10B981" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      )}

      {type === 'code' && (
        <path 
          d="M40 38L32 48L40 58M56 38L64 48L56 58M51 34L45 62" 
          stroke="#397b67"
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      )}

      {type === 'search' && (
        <g stroke="#53665b" strokeWidth="2" strokeLinecap="round">
          <circle cx="45" cy="45" r="11" />
          <line x1="53" y1="53" x2="63" y2="63" />
        </g>
      )}
    </svg>
  );
};
