import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  GitFork, 
  FileCode2, 
  ShieldAlert, 
  Bot, 
  Wrench, 
  GraduationCap, 
  BarChart3, 
  Boxes, 
  LogOut, 
  ChevronDown,
  Menu,
  X,
  ExternalLink,
  Lock,
  Terminal,
  Activity,
  Sparkles,
  Command,
  ShieldCheck,
  Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Project, SystemHealth } from '../../types';
import { StatusRadar } from '../ui/StatusRadar';
import { Badge } from '../ui/Badge';
import { CommandPalette } from '../ui/CommandPalette';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
  badge?: string;
  shortcut?: string;
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id: routeProjectId } = useParams<{ id?: string }>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => {
    return routeProjectId ? parseInt(routeProjectId, 10) : null;
  });
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    if (user) {
      api.listProjects().then(projs => {
        setProjects(projs);
        if (!selectedProjectId && projs.length > 0) {
          setSelectedProjectId(projs[0].id);
        }
      }).catch(err => console.error("Could not fetch projects:", err));

      api.getDbHealth().then(h => setHealth(h)).catch(() => null);
    }
  }, [user]);

  useEffect(() => {
    if (routeProjectId) {
      setSelectedProjectId(parseInt(routeProjectId, 10));
    }
  }, [routeProjectId]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeId = selectedProjectId || (projects.length > 0 ? projects[0].id : 1);
  const activeProject = projects.find(p => p.id === activeId);

  const navItems: NavItem[] = [
    { name: 'Workspace', path: '/dashboard', icon: LayoutDashboard, section: 'Core' },
    { name: 'Import Repository', path: '/import', icon: GitFork, section: 'Core' },
    { name: 'Project Overview', path: `/projects/${activeId}`, icon: Boxes, section: 'Codebase Intelligence', badge: 'Live' },
    { name: 'Codebase Explorer', path: `/projects/${activeId}/explorer`, icon: FileCode2, section: 'Codebase Intelligence', badge: 'Live' },
    { name: 'Security Audit', path: `/projects/${activeId}/audit`, icon: ShieldAlert, section: 'Security & Verification', badge: 'Live' },
    { name: 'Socratic AI Mentor', path: `/projects/${activeId}/mentor`, icon: Bot, section: 'Security & Verification', badge: 'Live' },
    { name: 'Guided Repair Studio', path: `/projects/${activeId}/repair`, icon: Wrench, section: 'Learn-to-Fix', badge: 'P0' },
    { name: 'Skill Transfer Lab', path: `/projects/${activeId}/transfer-lab`, icon: GraduationCap, section: 'Learn-to-Fix', badge: 'Core' },
    { name: 'Learning Progress', path: '/analytics', icon: BarChart3, section: 'Learn-to-Fix', badge: 'Live' },
  ];

  return (
    <div className="flex h-screen bg-canvas text-text-primary overflow-hidden font-sans selection:bg-blue-500/20 selection:text-blue-700">
      
      <a href="#workspace-main" className="skip-link">Skip to workspace</a>
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-canvas-surface border-r border-border-subtle select-none relative z-20">
        
        {/* Brand Header */}
        <div className="p-4 border-b border-border-subtle bg-canvas-surface">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold tracking-tight text-text-primary text-sm">ProofForge</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-700 border border-blue-500/25">AI</span>
              </div>
              <p className="text-[10px] font-mono text-text-muted">
                Engineering workspace
              </p>
            </div>
          </Link>
        </div>

        {/* Quick Command Trigger Button */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-canvas-elevated border border-border-subtle hover:border-border-muted text-xs text-text-muted hover:text-text-primary transition-colors font-mono"
          >
            <div className="flex items-center space-x-2">
              <Search className="w-3.5 h-3.5" />
              <span>Search actions...</span>
            </div>
            <kbd className="text-[10px] bg-canvas px-1.5 py-0.5 rounded border border-border-subtle">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {['Core', 'Codebase Intelligence', 'Security & Verification', 'Learn-to-Fix'].map(section => {
            const items = navItems.filter(i => i.section === section);
            return (
              <div key={section} className="space-y-1">
                <div className="px-2 text-[10px] font-mono uppercase tracking-widest text-text-muted font-medium">
                  {section}
                </div>
                {items.map(item => {
                  const isActive = location.pathname === item.path || 
                    (item.path.split('/').length > 3 && location.pathname.startsWith(item.path + '/'));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      aria-current={isActive ? 'page' : undefined}
                      to={item.path}
                      className={`flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors group ${
                        isActive
                          ? 'bg-blue-500/10 text-blue-700 font-semibold border border-blue-500/20'
                          : 'text-text-secondary hover:text-text-primary hover:bg-canvas-elevated'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-blue-700' : 'text-text-muted group-hover:text-text-primary'
                        }`} />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {item.badge && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase tracking-wider shrink-0 ml-1.5 ${
                          item.badge === 'Live'
                            ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/25'
                            : 'bg-blue-500/10 text-blue-700 border border-blue-500/25'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* User Session Footer */}
        <div className="p-3 border-t border-border-subtle bg-canvas-surface">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="truncate pr-2">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
                  <p className="text-xs font-medium text-text-primary truncate">
                    {user.full_name || user.email.split('@')[0]}
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="text-[10px] text-text-muted truncate font-mono">{user.email}</span>
                  {user.auth_provider === 'firebase_google' && (
                    <Badge variant="blue" size="xs">Google</Badge>
                  )}
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-text-muted hover:text-rose-700 hover:bg-canvas-elevated rounded-lg transition"
                title="Sign out of workspace"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="block w-full py-2 text-center text-xs font-semibold text-blue-700 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition font-mono"
            >
              Sign In
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-canvas">
        
        {/* Top Header Bar */}
        <header className="h-14 bg-canvas-surface/80 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-4 lg:px-6 z-10">
          <div className="flex items-center space-x-4 min-w-0">
            <button
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-text-secondary hover:text-text-primary rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Project Switcher */}
            {projects.length > 0 ? (
              <div className="flex items-center space-x-2.5">
                <div className="hidden sm:flex items-center space-x-1.5 text-xs font-mono text-text-muted">
                  <Boxes className="w-3.5 h-3.5 text-blue-700" />
                  <span>PROJECT:</span>
                </div>
                <select
                  aria-label="Active project"
                  value={activeId}
                  onChange={(e) => {
                    const nextId = parseInt(e.target.value, 10);
                    setSelectedProjectId(nextId);
                    if (location.pathname.includes('/projects/')) {
                      const suffix = location.pathname.split('/').slice(3).join('/');
                      navigate(`/projects/${nextId}${suffix ? '/' + suffix : ''}`);
                    }
                  }}
                  className="bg-canvas-elevated text-text-primary font-mono text-xs border border-border-subtle hover:border-border-muted rounded-lg px-2.5 py-1 focus:border-blue-500 focus:outline-none transition-colors"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.framework || 'Repository'})
                    </option>
                  ))}
                </select>

                {activeProject?.commit_sha && (
                  <span className="hidden xl:inline-block px-2 py-0.5 text-[10px] font-mono text-text-muted bg-canvas-elevated border border-border-subtle rounded">
                    SHA: {activeProject.commit_sha.slice(0, 7)}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs font-mono text-text-muted flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>No active repository loaded</span>
              </div>
            )}
          </div>

          {/* Right Header Status Telemetry & Links */}
          <div className="flex items-center space-x-3">
            <StatusRadar className="hidden xl:flex"
              dbLatencyMs={health?.latency_ms} 
              dockerActive={false}
              modelReady={false}
            />

            <a
              href="https://github.com/Praveensagar07/ProofForge-AI"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-canvas-elevated hover:bg-canvas-elevated/80 border border-border-subtle text-xs text-text-secondary hover:text-text-primary rounded-lg transition font-mono"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-blue-700" />
            </a>
          </div>
        </header>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-canvas-surface border-b border-border-subtle px-4 py-3 space-y-2 z-20">
            {navItems.map(item => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-canvas-elevated"
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}

        {/* Viewport Content Canvas */}
        <main id="workspace-main" className="flex-1 overflow-y-auto bg-canvas p-4 lg:p-7">
          <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Code execution is unavailable on this hosted version. Reproduction, repair verification, and challenge grading require an isolated worker. Email sign-in and repository analysis remain available.</div>
          {children}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)}
        activeProjectId={activeId}
      />
    </div>
  );
};
export default AppShell;
