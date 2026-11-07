import React from 'react';
import { Database, Shield, Cpu, Activity } from 'lucide-react';
import clsx from 'clsx';

interface StatusRadarProps {
  dbLatencyMs?: number | null;
  dockerActive?: boolean;
  modelReady?: boolean;
  className?: string;
}

export const StatusRadar: React.FC<StatusRadarProps> = ({
  dbLatencyMs,
  dockerActive = false,
  modelReady = false,
  className = ''
}) => {
  return (
    <div className={clsx('flex items-center space-x-3 text-xs font-mono select-none', className)}>
      {/* Neon DB Indicator */}
      <div 
        title={dbLatencyMs ? `Neon PostgreSQL Serverless (${dbLatencyMs.toFixed(1)}ms roundtrip)` : 'Database Connected'}
        className="flex items-center space-x-1.5 px-2.5 py-1 bg-graphite-850/80 border border-graphite-700/60 rounded-md"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Database className="w-3.5 h-3.5 text-emerald-700" />
        <span className="text-text-secondary font-semibold">NEON</span>
        {dbLatencyMs ? (
          <span className="text-text-muted text-[11px]">{dbLatencyMs.toFixed(0)}ms</span>
        ) : (
          <span className="text-emerald-700 text-[11px]">LIVE</span>
        )}
      </div>

      {/* Docker Engine Sandbox Indicator */}
      <div 
        title={dockerActive ? 'Docker Container Sandbox Active (Hardened WSL 2 Engine)' : 'Docker Offline — Host Execution Blocked'}
        className={clsx(
          'flex items-center space-x-1.5 px-2.5 py-1 rounded-md border',
          dockerActive 
            ? 'bg-graphite-850/80 border-graphite-700/60 text-text-secondary'
            : 'bg-rose-100/40 border-rose-800/50 text-rose-700'
        )}
      >
        <Shield className={clsx('w-3.5 h-3.5', dockerActive ? 'text-cyan-700' : 'text-rose-700')} />
        <span className="font-semibold">SANDBOX</span>
        <span className={clsx('text-[11px]', dockerActive ? 'text-cyan-700' : 'text-rose-700')}>
          {dockerActive ? 'ISOLATED' : 'DISABLED'}
        </span>
      </div>

      {/* Gemini AI Engine Indicator */}
      <div 
        title={modelReady ? 'AI service verified' : 'AI service has not been verified'}
        className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-graphite-850/80 border border-graphite-700/60 rounded-md text-text-secondary"
      >
        <Cpu className="w-3.5 h-3.5 text-teal-700" />
        <span className="font-semibold">GEMINI</span>
        <span className="text-[11px] text-teal-700">{modelReady ? 'READY' : 'UNVERIFIED'}</span>
      </div>
    </div>
  );
};
