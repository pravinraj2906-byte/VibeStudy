import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  LayoutDashboard, 
  GitFork, 
  Boxes, 
  FileCode2, 
  ShieldAlert, 
  Bot, 
  Wrench, 
  GraduationCap, 
  BarChart3,
  ExternalLink,
  X
} from 'lucide-react';

interface CommandItem {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId?: number | null;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  activeProjectId
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const projId = activeProjectId || 1;

  const commands: CommandItem[] = [
    { id: 'dashboard', name: 'Mission Control Dashboard', description: 'Overview of engineering activity & projects', path: '/dashboard', icon: LayoutDashboard, category: 'Core' },
    { id: 'import', name: 'Import Repository', description: 'Ingest GitHub repository for AST analysis', path: '/import', icon: GitFork, category: 'Core' },
    { id: 'overview', name: 'Project Overview', description: 'Repository topology, routes, and stack breakdown', path: `/projects/${projId}`, icon: Boxes, category: 'Codebase' },
    { id: 'explorer', name: 'Codebase Explorer', description: 'Hierarchical file tree and code inspector', path: `/projects/${projId}/explorer`, icon: FileCode2, category: 'Codebase' },
    { id: 'audit', name: 'Threat Radar (Security Audit)', description: 'Deterministic scanner results & vulnerability triage', path: `/projects/${projId}/audit`, icon: ShieldAlert, category: 'Security' },
    { id: 'mentor', name: 'Socratic AI Mentor', description: 'Conversational vulnerability reasoning & hints', path: `/projects/${projId}/mentor`, icon: Bot, category: 'Learn-to-Fix' },
    { id: 'repair', name: 'Guided Repair Studio', description: 'Side-by-side patch editor with Docker verification', path: `/projects/${projId}/repair`, icon: Wrench, category: 'Learn-to-Fix' },
    { id: 'transfer', name: 'Skill Transfer Lab', description: 'Independent unassisted competency challenges', path: `/projects/${projId}/transfer-lab`, icon: GraduationCap, category: 'Learn-to-Fix' },
    { id: 'analytics', name: 'Competency Atlas', description: 'Learning curves, verified badges & defect resolution history', path: '/analytics', icon: BarChart3, category: 'Analytics' },
  ];

  const filtered = commands.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) || 
    c.description.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = useCallback((item: CommandItem) => {
    navigate(item.path);
    onClose();
  }, [navigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          handleSelect(filtered[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, handleSelect, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-canvas/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-canvas-surface rounded-2xl border border-border-subtle shadow-elevated overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Box */}
        <div className="flex items-center px-4 py-3.5 border-b border-border-subtle bg-canvas-elevated/40">
          <Search className="w-4 h-4 text-text-muted mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, views, or tools... (e.g., audit, repair, explorer)"
            className="w-full bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none font-mono"
          />
          <button 
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted font-mono">
              No engineering commands matching "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors font-mono text-xs ${
                    isSelected 
                      ? 'bg-blue-500/15 text-blue-700 border border-blue-500/30'
                      : 'text-text-secondary hover:bg-canvas-elevated hover:text-text-primary border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-blue-500/20 text-blue-700' : 'bg-canvas-elevated text-text-muted'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-text-primary truncate">{item.name}</div>
                      <div className="text-[11px] text-text-muted truncate font-sans">{item.description}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-text-muted bg-canvas px-1.5 py-0.5 rounded border border-border-subtle shrink-0 ml-2">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-border-subtle bg-canvas-elevated/20 flex items-center justify-between text-[11px] font-mono text-text-muted">
          <div className="flex items-center space-x-3">
            <span><kbd className="px-1 py-0.5 rounded bg-canvas border border-border-subtle">↑↓</kbd> navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-canvas border border-border-subtle">↵</kbd> select</span>
            <span><kbd className="px-1 py-0.5 rounded bg-canvas border border-border-subtle">esc</kbd> close</span>
          </div>
          <span>ProofForge Terminal</span>
        </div>
      </div>
    </div>
  );
};
export default CommandPalette;
