import { EditorialBanner } from '../components/illustrations/EditorialBanner';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitFork, 
  Boxes, 
  ShieldAlert,
  ArrowUpRight, 
  Activity, 
  Plus, 
  Code2,
  Wrench, 
  GraduationCap, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { api } from '../api/client';
import { Project, SystemHealth, Finding, LearningAnalyticsOverview } from '../types';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { lazy, Suspense } from 'react';
const CodebaseConstellation = lazy(() => import('../components/3d/CodebaseConstellation3D').then(module => ({ default: module.CodebaseConstellation })));
import { EmptyStateIllustration } from '../components/illustrations/EmptyStateIllustration';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [analytics, setAnalytics] = useState<LearningAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listProjects(),
      api.getDbHealth().catch(() => null),
      api.getLearningAnalytics().catch(() => null)
    ]).then(([projs, h, a]) => {
      setProjects(projs);
      setHealth(h);
      setAnalytics(a);

      // If projects exist, fetch findings for the primary project
      if (projs.length > 0) {
        api.getProjectFindings(projs[0].id).then(f => setFindings(f)).catch(() => null);
      }
    }).finally(() => setLoading(false));
  }, []);

  const activeProject = projects.length > 0 ? projects[0] : null;
  const totalComponents = projects.reduce((acc, p) => acc + (p.metadata_json?.components_count || 0), 0);
  const totalApiCalls = projects.reduce((acc, p) => acc + (p.metadata_json?.api_calls_count || 0), 0);
  const verifiedRepairs = analytics?.guided_repairs_verified ?? 0;
  const challengesPassed = analytics?.transfer_challenges_passed ?? 0;

  // Extract component names and routes for 3D constellation
  const discoveredComponents = activeProject?.metadata_json?.components?.map(c => c.name) || [
    'App.tsx', 'Header.tsx', 'InvoiceList.tsx', 'CommentBox.tsx', 'AuthContext.tsx'
  ];
  const discoveredRoutes = [
    ...(activeProject?.metadata_json?.routes?.frontend?.map(r => r.path) || []),
    ...(activeProject?.metadata_json?.routes?.backend?.map(r => `${r.method} ${r.path}`) || [])
  ];
  const finalRoutes = discoveredRoutes.length > 0 ? discoveredRoutes : [
    '/api/v1/invoices/{id}', '/api/v1/users/me', '/api/v1/auth/login', '/api/v1/repairs'
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Engineering Mission Control Header */}
      <div className="relative overflow-hidden rounded-2xl bg-canvas-surface border border-border-subtle p-6 lg:p-8 shadow-card">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              <span>MISSION CONTROL ACTIVE</span>
            </div>
            
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-text-primary font-sans">
              Welcome, {user?.full_name || user?.email.split('@')[0] || 'Engineer'}
            </h1>
            
            <p className="text-xs text-text-secondary max-w-2xl leading-relaxed">
              Real-time codebase intelligence, sandboxed defect reproduction, and automated verification. 
              Transforming AI-generated code into production-grade systems.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/import')}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Import Repository</span>
            </Button>
            
            {activeProject && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/projects/${activeProject.id}/audit`)}
              >
                <ShieldAlert className="w-4 h-4 mr-1.5 text-blue-700" />
                <span>Launch Threat Radar</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <EditorialBanner kind="learning" />

      {/* Engineering Dials & Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-sm">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">ACTIVE WORKSPACES</span>
            <Boxes className="w-4 h-4 text-blue-700" />
          </div>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-text-primary font-mono">{projects.length}</p>
            <span className="text-[11px] font-mono text-blue-700">repositories</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">Tenant isolated database scope</p>
        </div>

        <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-sm">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">CODEBASE NODES</span>
            <Code2 className="w-4 h-4 text-teal-700" />
          </div>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-text-primary font-mono">{totalComponents + totalApiCalls}</p>
            <span className="text-[11px] font-mono text-teal-700">AST elements</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">{totalComponents} components, {totalApiCalls} routes</p>
        </div>

        <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-sm">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">GUIDED REPAIRS</span>
            <Wrench className="w-4 h-4 text-amber-700" />
          </div>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-text-primary font-mono">{verifiedRepairs}</p>
            <span className="text-[11px] font-mono text-amber-700">verified fixed</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">Docker multi-tenant test suites</p>
        </div>

        <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-sm">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">INDEPENDENT TRANSFER</span>
            <GraduationCap className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-text-primary font-mono">{challengesPassed}</p>
            <span className="text-[11px] font-mono text-emerald-700">sealed solves</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">HMAC nonce blind grader</p>
        </div>
      </div>

      {/* Interactive Codebase Constellation 3D */}
      {activeProject && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-semibold font-mono text-text-primary">
                TOPOLOGY RADAR: {activeProject.name}
              </h2>
            </div>
            <Badge variant="blue" size="xs">
              Dynamic Graph
            </Badge>
          </div>
          <Suspense fallback={<div role="status" className="p-8 text-text-muted">Loading repository map…</div>}><CodebaseConstellation
            projectId={activeProject.id}
            repoName={activeProject.name}
            components={discoveredComponents}
            routes={finalRoutes}
            findings={findings.map(f => ({
              id: f.id,
              title: f.title,
              file_path: f.file_path,
              severity: f.severity
            }))}
          /></Suspense>
        </div>
      )}

      {/* Actionable Engineering Work Queue & Analyzed Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Actionable Work Queue */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold font-mono text-text-primary flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-700" />
              <span>ENGINEERING WORK QUEUE</span>
            </h2>
            <Badge variant="silver" size="xs">Live Sequence</Badge>
          </div>

          <div className="space-y-3">
            {activeProject ? (
              <>
                <div 
                  onClick={() => navigate(`/projects/${activeProject.id}/audit`)}
                  className="p-4 rounded-xl bg-canvas-surface border border-border-subtle hover:border-blue-500/40 cursor-pointer transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-700">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-text-primary group-hover:text-blue-700 transition">
                          Run Multi-Scanner Security Audit
                        </h4>
                        <p className="text-[11px] text-text-muted font-mono mt-0.5">
                          Semgrep, Gitleaks, OSV, AST detection fleet
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-blue-700 group-hover:translate-x-1 transition" />
                  </div>
                </div>

                <div 
                  onClick={() => navigate(`/projects/${activeProject.id}/repair`)}
                  className="p-4 rounded-xl bg-canvas-surface border border-border-subtle hover:border-amber-500/40 cursor-pointer transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-text-primary group-hover:text-amber-700 transition">
                          Launch Guided Repair Studio
                        </h4>
                        <p className="text-[11px] text-text-muted font-mono mt-0.5">
                          Socratic hints, diff viewer, container verification
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-amber-700 group-hover:translate-x-1 transition" />
                  </div>
                </div>

                <div 
                  onClick={() => navigate(`/projects/${activeProject.id}/transfer-lab`)}
                  className="p-4 rounded-xl bg-canvas-surface border border-border-subtle hover:border-emerald-500/40 cursor-pointer transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-text-primary group-hover:text-emerald-700 transition">
                          Take Blind Skill Transfer Challenge
                        </h4>
                        <p className="text-[11px] text-text-muted font-mono mt-0.5">
                          Flagship IDOR task microservice in sealed Docker sandbox
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-emerald-700 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 rounded-xl bg-canvas-surface border border-border-subtle text-center text-xs font-mono text-text-muted">
                Import a repository to initialize engineering tasks.
              </div>
            )}
          </div>
        </div>

        {/* Right: Analyzed Repositories Matrix */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold font-mono text-text-primary flex items-center space-x-2">
              <GitFork className="w-4 h-4 text-blue-700" />
              <span>ANALYZED REPOSITORIES</span>
            </h2>
            <span className="text-xs font-mono text-text-muted">{projects.length} registered</span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="p-10 rounded-2xl bg-canvas-surface border border-dashed border-border-subtle text-center space-y-4">
              <div className="flex justify-center">
                <EmptyStateIllustration type="code" className="w-20 h-20" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">No Repositories Imported Yet</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Import a public GitHub repository to extract its components, analyze dependencies, and discover architectural insights.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/import')}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Import First Repository</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.slice(0, 4).map(proj => (
                <div
                  key={proj.id}
                  onClick={() => navigate(`/projects/${proj.id}`)}
                  className="p-4 rounded-xl bg-canvas-surface border border-border-subtle hover:border-blue-500/40 cursor-pointer transition flex flex-col justify-between group shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-semibold text-text-primary group-hover:text-blue-700 transition truncate">
                        {proj.name}
                      </h3>
                      <Badge variant="blue" size="xs">{proj.status}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {proj.framework && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-canvas-elevated text-blue-700 border border-border-subtle font-mono">
                          {proj.framework}
                        </span>
                      )}
                      {proj.language && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-canvas-elevated text-text-secondary border border-border-subtle font-mono">
                          {proj.language}
                        </span>
                      )}
                    </div>

                    {proj.commit_sha && (
                      <p className="text-[10px] font-mono text-text-muted truncate">
                        SHA: <span className="text-text-primary">{proj.commit_sha.slice(0, 7)}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-text-muted">
                    <span>{new Date(proj.created_at).toLocaleDateString()}</span>
                    <span className="text-blue-700 group-hover:translate-x-1 transition flex items-center space-x-1">
                      <span>Explore</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;
