import React from 'react';

export const WorkflowIllustration: React.FC<{ activeStep?: number; className?: string }> = ({ 
  activeStep = 0, 
  className = 'w-full' 
}) => {
  const steps = [
    { num: '01', title: 'Understand', desc: 'AST & Route Discovery' },
    { num: '02', title: 'Audit', desc: 'Multi-Scanner Pipeline' },
    { num: '03', title: 'Learn', desc: 'AI Socratic Coaching' },
    { num: '04', title: 'Repair', desc: 'Isolated Code Workspace' },
    { num: '05', title: 'Verify', desc: 'Docker Automated Tests' },
    { num: '06', title: 'Transfer', desc: 'Unassisted Challenge' },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ${className}`}>
      {steps.map((step, idx) => {
        const isActive = activeStep === idx;
        return (
          <div 
            key={step.num}
            className={`p-4 rounded-xl border transition-all duration-200 relative overflow-hidden ${
              isActive 
                ? 'bg-surface-elevated border-accent-blue/40 shadow-elevated' 
                : 'bg-surface border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-blue via-accent-teal to-accent-emerald" />
            )}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-accent-blue font-semibold">{step.num}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            </div>
            <h4 className="text-sm font-semibold text-text-primary tracking-tight">{step.title}</h4>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">{step.desc}</p>
          </div>
        );
      })}
    </div>
  );
};
